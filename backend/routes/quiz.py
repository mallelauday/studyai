"""
============================================================
StudyAI Backend — Quiz Route
============================================================
POST /api/quiz/generate  — Generate AI quiz questions
POST /api/quiz/submit    — Submit answers and get graded results
GET  /api/quiz           — List quizzes for a user
GET  /api/quiz/<id>      — Get a specific quiz
GET  /api/quiz/results/<result_id> — Get a specific result
"""

from __future__ import annotations

from flask import Blueprint, request, g

from services.groq_service import GroqService, GroqServiceError, GroqUnavailableError
from services.firebase_service import StorageRouter
from services.quiz_engine import process_quiz_submission
from services.analytics_service import record_quiz_result
from models.quiz_result import QuizResult
from middleware.auth_middleware import login_required
from utils.helpers import generate_uuid, success_response, error_response
from utils.validators import (
    validate_required_fields, validate_positive_int,
    validate_difficulty, sanitize_string,
)
from utils.prompts import quiz_prompt, quiz_analysis_prompt, SYSTEM_PROMPT
from utils.logger import get_logger

logger = get_logger(__name__)

quiz_bp = Blueprint("quiz", __name__)
_groq = GroqService()

_VALID_TYPES = {"mcq", "true_false", "short_answer", "mixed"}


# ── POST /api/quiz/generate ───────────────────────────────

@quiz_bp.post("/quiz/generate")
@login_required
def generate_quiz():
    """
    Generate an AI-powered quiz for an uploaded document. Protected.

    Request JSON:
        ``document_id``  (required) — source document ID
        ``count``        (optional) — number of questions, default 10, max 50
        ``difficulty``   (optional) — "easy"|"medium"|"hard", default "medium"
        ``quiz_type``    (optional) — "mcq"|"true_false"|"short_answer"|"mixed"

    Returns:
        ``{ success, quiz_id, count, questions: [...] }``
    """
    body = request.get_json(silent=True) or {}

    ok, err = validate_required_fields(body, ["document_id"])
    if not ok:
        return error_response(err, 400)

    document_id = sanitize_string(body["document_id"])
    user_id     = g.user_id
    count       = int(body.get("count", 10))
    difficulty  = sanitize_string(body.get("difficulty", "medium")).lower()
    quiz_type   = sanitize_string(body.get("quiz_type", "mcq")).lower()

    # Validate
    ok, err = validate_positive_int(count, "count", min_val=1, max_val=50)
    if not ok:
        return error_response(err, 400)

    ok, err = validate_difficulty(difficulty)
    if not ok:
        return error_response(err, 400)

    if quiz_type not in _VALID_TYPES:
        return error_response(
            f"'quiz_type' must be one of: {', '.join(sorted(_VALID_TYPES))}.", 400
        )

    # ── Fetch document ────────────────────────────────────
    doc = StorageRouter("materials").get(document_id)
    if doc is None:
        return error_response(f"Document '{document_id}' not found.", 404)

    if doc.get("user_id") != user_id:
        return error_response("Unauthorized to access this document.", 403)

    content = doc.get("content", "")
    title   = doc.get("title", "Untitled")

    if not content or len(content.strip()) < 50:
        return error_response("Document content is too short to generate a quiz.", 422)

    # ── Generate questions ────────────────────────────────
    try:
        prompt = quiz_prompt(
            text=content,
            count=count,
            difficulty=difficulty,
            quiz_type=quiz_type,
            title=title,
        )
        raw = _groq._chat(prompt, system_prompt=SYSTEM_PROMPT)
        questions = _groq._parse_json_response(raw)
        if not isinstance(questions, list):
            questions = questions.get("questions", [])
    except GroqUnavailableError as exc:
        return error_response(str(exc), 503)
    except GroqServiceError as exc:
        return error_response(f"AI service error: {exc}", 502)
    except Exception as exc:
        logger.exception("Unexpected quiz generation error")
        return error_response(f"Unexpected error: {exc}", 500)

    # Normalise IDs
    for i, q in enumerate(questions):
        if "id" not in q or q["id"] is None:
            q["id"] = i + 1

    # ── Persist quiz ──────────────────────────────────────
    quiz_id = generate_uuid()
    quiz_doc = {
        "id": quiz_id,
        "user_id": user_id,
        "document_id": document_id,
        "document_title": title,
        "questions": questions,
        "count": len(questions),
        "difficulty": difficulty,
        "quiz_type": quiz_type,
        "status": "active",
    }
    StorageRouter("quizzes").create(quiz_id, quiz_doc)

    logger.info(
        "Quiz generated: %d %s questions | doc: %s", len(questions), difficulty, document_id
    )

    return success_response(
        data={
            "quiz_id": quiz_id,
            "document_id": document_id,
            "document_title": title,
            "count": len(questions),
            "difficulty": difficulty,
            "quiz_type": quiz_type,
            "questions": questions,
        },
        message=f"{len(questions)} questions generated successfully.",
        status_code=201,
    )


# ── POST /api/quiz/submit ─────────────────────────────────

@quiz_bp.post("/quiz/submit")
@login_required
def submit_quiz():
    """
    Submit quiz answers and receive a graded result with AI analysis. Protected.

    Request JSON:
        ``quiz_id``  (required) — ID of the quiz being submitted
        ``answers``  (required) — list of ``{ question_id, answer }``

    Returns:
        ``{ score, grade, performance, weak_topics, recommendations, ... }``
    """
    body = request.get_json(silent=True) or {}

    ok, err = validate_required_fields(body, ["quiz_id", "answers"])
    if not ok:
        return error_response(err, 400)

    quiz_id  = sanitize_string(body["quiz_id"])
    answers  = body["answers"]
    user_id  = g.user_id

    if not isinstance(answers, list) or len(answers) == 0:
        return error_response("'answers' must be a non-empty list.", 400)

    # ── Fetch quiz ────────────────────────────────────────
    quiz_doc = StorageRouter("quizzes").get(quiz_id)
    if quiz_doc is None:
        return error_response(f"Quiz '{quiz_id}' not found.", 404)

    if quiz_doc.get("user_id") != user_id:
        return error_response("Unauthorized to submit this quiz.", 403)

    questions = quiz_doc.get("questions", [])
    if not questions:
        return error_response("Quiz has no questions.", 422)

    # ── Grade answers ─────────────────────────────────────
    grading_result = process_quiz_submission(questions, answers)
    score_data  = grading_result["score_data"]
    weak_topics = grading_result["weak_topics"]
    all_topics  = grading_result["all_topics"]

    # ── AI analysis (optional — skip if Groq unavailable) ─
    ai_analysis: dict = {}
    try:
        analysis_prompt = quiz_analysis_prompt(
            questions=questions,
            answers=grading_result["graded_answers"],
            score=score_data["score"],
        )
        raw = _groq._chat(analysis_prompt, system_prompt=SYSTEM_PROMPT)
        ai_analysis = _groq._parse_json_response(raw)
    except GroqUnavailableError:
        logger.info("Groq unavailable — skipping AI analysis for quiz submission.")
    except GroqServiceError as exc:
        logger.warning("AI analysis failed (non-fatal): %s", exc)
    except Exception as exc:
        logger.warning("Unexpected AI analysis error (non-fatal): %s", exc)

    # ── Build QuizResult ──────────────────────────────────
    result = QuizResult(
        user_id=user_id,
        quiz_id=quiz_id,
        document_id=quiz_doc.get("document_id", ""),
        document_title=quiz_doc.get("document_title", ""),
        score=score_data["score"],
        grade=score_data["grade"],
        performance=score_data["performance"],
        total_questions=score_data["total_questions"],
        correct=score_data["correct"],
        incorrect=score_data["incorrect"],
        points_earned=score_data["points_earned"],
        points_possible=score_data["points_possible"],
        graded_answers=grading_result["graded_answers"],
        weak_topics=weak_topics,
        all_topics=all_topics,
        ai_analysis=ai_analysis,
    )

    # ── Persist result ────────────────────────────────────
    full_result = {
        **result.to_dict(),
        "score_data": score_data,
    }
    saved = record_quiz_result(user_id, quiz_id, full_result)

    # Mark quiz as completed
    StorageRouter("quizzes").update(quiz_id, {"status": "completed"})

    logger.info(
        "Quiz submitted: %s | score: %.1f%% (%s) | weak topics: %d",
        quiz_id, score_data["score"], score_data["grade"], len(weak_topics),
    )

    # ── Build recommendations from AI analysis ─────────────
    recommendations = ai_analysis.get("recommendations", [])
    if not recommendations and weak_topics:
        recommendations = [
            {
                "action": f"Review and practise {t['topic']}",
                "topic": t["topic"],
                "resource_type": "flashcards",
            }
            for t in weak_topics[:3]
        ]

    return success_response(
        data={
            "result_id": result.id,
            "quiz_id": quiz_id,
            "score": score_data["score"],
            "grade": score_data["grade"],
            "performance": score_data["performance"],
            "correct": score_data["correct"],
            "total_questions": score_data["total_questions"],
            "percentage": score_data["score"],
            "passed": result.passed,
            "weak_topics": weak_topics,
            "all_topics": all_topics,
            "recommendations": recommendations,
            "graded_answers": grading_result["graded_answers"],
            "ai_analysis": ai_analysis,
        },
        message="Quiz submitted and graded successfully.",
        status_code=201,
    )


# ── GET /api/quiz ─────────────────────────────────────────

@quiz_bp.get("/quiz")
@login_required
def list_quizzes():
    """
    List all quizzes for the authenticated user. Protected.
    """
    user_id = g.user_id
    quizzes = StorageRouter("quizzes").filter_by_user(user_id)

    lightweight = [
        {
            "quiz_id": q["id"],
            "document_id": q.get("document_id"),
            "document_title": q.get("document_title"),
            "count": q.get("count", 0),
            "difficulty": q.get("difficulty"),
            "quiz_type": q.get("quiz_type"),
            "status": q.get("status"),
            "created_at": q.get("created_at"),
        }
        for q in quizzes
    ]

    return success_response(
        data={"quizzes": lightweight, "count": len(lightweight)},
        message=f"Found {len(lightweight)} quiz/quizzes.",
    )


@quiz_bp.get("/quiz/<quiz_id>")
@login_required
def get_quiz(quiz_id: str):
    """Get a specific quiz (with questions). Protected."""
    quiz = StorageRouter("quizzes").get(quiz_id)
    if quiz is None:
        return error_response(f"Quiz '{quiz_id}' not found.", 404)

    if quiz.get("user_id") != g.user_id:
        return error_response("Unauthorized to access this quiz.", 403)

    return success_response(data=quiz, message="Quiz retrieved successfully.")


@quiz_bp.get("/quiz/results/<result_id>")
@login_required
def get_quiz_result(result_id: str):
    """Get a specific graded quiz result. Protected."""
    result = StorageRouter("results").get(result_id)
    if result is None:
        return error_response(f"Result '{result_id}' not found.", 404)

    if result.get("user_id") != g.user_id:
        return error_response("Unauthorized to access this quiz result.", 403)

    return success_response(data=result, message="Result retrieved successfully.")


@quiz_bp.get("/quiz/results")
@login_required
def list_results():
    """
    List all quiz results for the authenticated user. Protected.
    """
    user_id = g.user_id
    results = StorageRouter("results").filter_by_user(user_id)

    summaries = []
    for r in results:
        result_obj = QuizResult.from_dict(r)
        summaries.append(result_obj.to_summary_dict())

    return success_response(
        data={"results": summaries, "count": len(summaries)},
        message=f"Found {len(summaries)} result(s).",
    )
