"""
============================================================
StudyAI Backend — Schedule Route
============================================================
POST /api/schedule — Generate a personalised study schedule
GET  /api/schedule — List schedules for a user
GET  /api/schedule/<id> — Retrieve a specific schedule
"""

from __future__ import annotations

from flask import Blueprint, request, g

from services.groq_service import GroqService, GroqServiceError, GroqUnavailableError
from services.firebase_service import StorageRouter
from models.study_schedule import StudySchedule
from middleware.auth_middleware import login_required
from utils.helpers import generate_uuid, success_response, error_response
from utils.validators import validate_required_fields, sanitize_string
from utils.prompts import schedule_prompt, SYSTEM_PROMPT
from utils.logger import get_logger

logger = get_logger(__name__)

schedule_bp = Blueprint("schedule", __name__)
_groq = GroqService()


@schedule_bp.post("/schedule")
@login_required
def generate_schedule():
    """
    Generate an AI-powered study schedule. Protected.

    Request JSON:
        ``document_id``  (required) — source document ID
        ``subject``      (optional) — defaults to inferred subject
        ``study_goals``  (optional) — stated goals
        ``days``         (optional) — default 7
        ``hours_per_day``(optional) — default 2.0
        ``exam_date``    (optional) — default "7 days from now"
        ``proficiency``  (optional) — default "intermediate"

    Returns:
        ``{ success, schedule_id, days: [...] }``
    """
    body = request.get_json(silent=True) or {}

    ok, err = validate_required_fields(body, ["document_id"])
    if not ok:
        return error_response(err, 400)

    document_id = sanitize_string(body["document_id"])
    user_id = g.user_id
    subject = sanitize_string(body.get("subject", ""))
    study_goals = sanitize_string(body.get("study_goals", "Prepare for exams and master topics."))
    days = int(body.get("days", 7))
    hours_per_day = float(body.get("hours_per_day", 2.0))
    exam_date = sanitize_string(body.get("exam_date", "7 days from now"))
    proficiency = sanitize_string(body.get("proficiency", "intermediate"))

    # ── Fetch source document summary ─────────────────────
    doc = StorageRouter("materials").get(document_id)
    if doc is None:
        return error_response(f"Document '{document_id}' not found.", 404)

    if doc.get("user_id") != user_id:
        return error_response("Unauthorized to access this document.", 403)

    title = doc.get("title", "Untitled")
    if not subject:
        subject = title

    # Get summary preview or full text if not summarised
    content_preview = doc.get("content", "")[:2000]

    # Fetch weak topics from user's history
    results = StorageRouter("results").filter_by_user(user_id)
    weak_topics_list = []
    for r in results:
        for wt in r.get("weak_topics", []):
            if wt.get("topic") and wt.get("topic") not in weak_topics_list:
                weak_topics_list.append(wt["topic"])

    # ── Generate schedule via AI ──────────────────────────
    try:
        prompt = schedule_prompt(
            subject=subject,
            material_summary=content_preview,
            weak_topics=weak_topics_list[:5],
            study_goals=study_goals,
            days=days,
            hours_per_day=hours_per_day,
            exam_date=exam_date,
            proficiency=proficiency,
        )
        raw = _groq._chat(prompt, system_prompt=SYSTEM_PROMPT)
        schedule_data = _groq._parse_json_response(raw)
    except GroqUnavailableError as exc:
        return error_response(str(exc), 503)
    except GroqServiceError as exc:
        return error_response(f"AI service error: {exc}", 502)
    except Exception as exc:
        logger.exception("Unexpected schedule generation error")
        return error_response(f"Unexpected error: {exc}", 500)

    # ── Persist ───────────────────────────────────────────
    schedule_id = generate_uuid()
    schedule_model = StudySchedule(
        id=schedule_id,
        user_id=user_id,
        document_id=document_id,
        subject=subject,
        title=schedule_data.get("title", f"{subject} Study Plan"),
        total_days=days,
        total_hours=days * hours_per_day,
        exam_date=exam_date,
        strategy=schedule_data.get("strategy", ""),
        revision_strategy=schedule_data.get("revision_strategy", "mixed"),
        days=schedule_data.get("days", []),
        weekly_tips=schedule_data.get("weekly_tips", []),
        weak_topics=weak_topics_list,
    )

    StorageRouter("schedules").create(schedule_id, schedule_model.to_dict())

    logger.info("Schedule generated: %s for user: %s", schedule_id, user_id)

    return success_response(
        data=schedule_model.to_dict(),
        message="Personalised study schedule generated successfully.",
        status_code=201,
    )


@schedule_bp.get("/schedule")
@login_required
def list_schedules():
    """
    List all schedules for the authenticated user. Protected.
    """
    user_id = g.user_id
    schedules = StorageRouter("schedules").filter_by_user(user_id)
    return success_response(
        data={"schedules": schedules, "count": len(schedules)},
        message=f"Found {len(schedules)} schedule(s).",
    )


@schedule_bp.get("/schedule/<schedule_id>")
@login_required
def get_schedule(schedule_id: str):
    """Retrieve a specific study schedule. Protected."""
    schedule = StorageRouter("schedules").get(schedule_id)
    if schedule is None:
        return error_response(f"Schedule '{schedule_id}' not found.", 404)

    if schedule.get("user_id") != g.user_id:
        return error_response("Unauthorized to access this study schedule.", 403)

    return success_response(data=schedule, message="Schedule retrieved successfully.")


@schedule_bp.delete("/schedule/<schedule_id>")
@login_required
def delete_schedule(schedule_id: str):
    """Delete a schedule. Protected."""
    router = StorageRouter("schedules")
    schedule = router.get(schedule_id)
    if schedule is None:
        return error_response(f"Schedule '{schedule_id}' not found.", 404)

    if schedule.get("user_id") != g.user_id:
        return error_response("Unauthorized to delete this study schedule.", 403)

    router.delete(schedule_id)
    return success_response(message="Schedule deleted successfully.")


# ============================================================
# POST /api/study-plan/generate
# ============================================================

@schedule_bp.post("/study-plan/generate")
@login_required
def generate_study_plan_route():
    """
    Generate and save a study plan.
    Request body:
        { "subject": "...", "exam_date": "...", "difficulty": "..." }
    """
    logger.info("GENERATE STUDY PLAN route hit: uid=%s", g.user_id)
    from flask import jsonify
    import datetime

    body = request.get_json(silent=True) or {}

    ok, err = validate_required_fields(body, ["subject", "exam_date", "difficulty"])
    if not ok:
        return error_response(err, 400)

    subject = sanitize_string(body["subject"])
    exam_date = sanitize_string(body["exam_date"])
    difficulty = sanitize_string(body["difficulty"])

    # Determine current date & tomorrow
    current_date = body.get("current_date")
    if not current_date:
        current_date = datetime.date.today().strftime("%Y-%m-%d")
        
    try:
        current_date_obj = datetime.datetime.strptime(current_date, "%Y-%m-%d").date()
    except Exception:
        current_date_obj = datetime.date.today()
        current_date = current_date_obj.strftime("%Y-%m-%d")
        
    tomorrow_obj = current_date_obj + datetime.timedelta(days=1)
    tomorrow_str = tomorrow_obj.strftime("%Y-%m-%d")

    # Hard constraint: exam date boundary
    try:
        exam_date_obj = datetime.datetime.strptime(exam_date, "%Y-%m-%d").date()
        delta = (exam_date_obj - current_date_obj).days
        num_days = max(1, min(delta, 14)) # Cap at 14 days of study plan
    except Exception:
        num_days = 7

    # Generate plan using Groq service
    try:
        prompt = f"""
Create a structured study plan based on the following details:
Subject: {subject}
Target Exam Date: {exam_date}
Difficulty Level: {difficulty}
Current Date: {current_date}

You MUST generate exactly {num_days} daily entries starting from tomorrow ({tomorrow_str}) up to the exam date (or the next {num_days} days).
For each day, provide a list of concrete tasks to cover the subject step-by-step according to the '{difficulty}' difficulty.
Ensure tasks are evenly distributed and no day is left empty.
Return a JSON array of objects, where each object represents a day.
Return ONLY valid JSON. Follow this exact schema:
[
  {{
    "date": "YYYY-MM-DD",
    "tasks": ["Task description 1", "Task description 2"],
    "completed": false
  }}
]
"""
        raw = _groq._chat(prompt, system_prompt="You are StudyAI, an expert educational planner. Respond ONLY with valid JSON.")
        plan_data = _groq._parse_json_response(raw)

        # Normalize and validate AI output
        days_list = []
        if isinstance(plan_data, list):
            days_list = plan_data
        elif isinstance(plan_data, dict):
            if "days" in plan_data:
                days_list = plan_data["days"]
            elif "plan" in plan_data:
                days_list = plan_data["plan"]
            elif "schedule" in plan_data:
                days_list = plan_data["schedule"]

        if not isinstance(days_list, list):
            raise ValueError("AI response did not contain a valid list of days.")

        normalized_days = []
        for day in days_list:
            if not isinstance(day, dict):
                continue
            entry_date = day.get("date")
            tasks = day.get("tasks")
            if not entry_date or not isinstance(tasks, list):
                continue
            
            entry_date = str(entry_date).strip()
            clean_tasks = [str(t).strip() for t in tasks if t]
            if not clean_tasks:
                continue
                
            normalized_days.append({
                "date": entry_date,
                "tasks": clean_tasks,
                "completed": bool(day.get("completed", False))
            })

        if not normalized_days:
            raise ValueError("No valid structured days could be parsed from AI response.")

        # Save to database
        plan_id = generate_uuid()
        from utils.helpers import utc_now_iso
        plan_doc = {
            "id": plan_id,
            "user_id": g.user_id,
            "subject": subject,
            "exam_date": exam_date,
            "difficulty": difficulty,
            "days": normalized_days,
            "created_at": utc_now_iso(),
            "updated_at": utc_now_iso()
        }
        StorageRouter("study_plans").create(plan_id, plan_doc)
        
        logger.info("Study plan generated successfully: %s for user %s", plan_id, g.user_id)
        
        return jsonify({
            "success": True,
            "plan": normalized_days,
            "data": {
                "plan": normalized_days,
                "days": normalized_days
            },
            "error": None
        })

    except Exception as e:
        logger.exception("Failed to generate study plan for user %s", g.user_id)
        return jsonify({
            "success": False,
            "data": None,
            "error": f"Failed to generate study plan: {str(e)}"
        }), 500


# ============================================================
# GET /api/study-plan
# ============================================================

@schedule_bp.get("/study-plan")
@login_required
def get_study_plan():
    """Retrieve the user's latest study plan."""
    logger.info("GET STUDY PLAN route hit: uid=%s", g.user_id)
    from flask import jsonify

    try:
        plans = StorageRouter("study_plans").filter_by_user(g.user_id)
        if plans:
            plans.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            latest_plan = plans[0]
            days = latest_plan.get("days", [])
            return jsonify({
                "success": True,
                "plan": days,
                "data": {
                    "plan": days,
                    "days": days
                },
                "error": None
            })
        return jsonify({
            "success": True,
            "plan": [],
            "data": {
                "plan": [],
                "days": []
            },
            "error": None
        })
    except Exception as e:
        logger.exception("Failed to retrieve study plan for user %s", g.user_id)
        return jsonify({
            "success": False,
            "data": None,
            "error": f"Failed to retrieve study plan: {str(e)}"
        }), 500


# ============================================================
# PUT /api/study-plan
# ============================================================

@schedule_bp.put("/study-plan")
@login_required
def update_study_plan():
    """
    Update the user's study plan (e.g. mark tasks as completed).
    Request body:
        { "days": [ ... ] }
    """
    logger.info("UPDATE STUDY PLAN route hit: uid=%s", g.user_id)
    from flask import jsonify

    body = request.get_json(silent=True) or {}
    days = body.get("days")

    if not isinstance(days, list):
        return jsonify({
            "success": False,
            "error": "Request body must contain 'days' list.",
            "data": None
        }), 400

    try:
        plans = StorageRouter("study_plans").filter_by_user(g.user_id)
        if not plans:
            return jsonify({
                "success": False,
                "error": "No active study plan found to update.",
                "data": None
            }), 404
            
        plans.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        plan_doc = plans[0]

        # Update in database
        plan_doc["days"] = days
        StorageRouter("study_plans").update(plan_doc["id"], {"days": days})

        logger.info("Study plan updated successfully: %s", plan_doc["id"])
        return jsonify({
            "success": True,
            "plan": days,
            "data": {
                "plan": days,
                "days": days
            },
            "error": None
        })

    except Exception as e:
        logger.exception("Failed to update study plan for user %s", g.user_id)
        return jsonify({
            "success": False,
            "data": None,
            "error": f"Update failed: {str(e)}"
        }), 500

