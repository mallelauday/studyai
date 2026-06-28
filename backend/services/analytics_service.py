"""
============================================================
StudyAI Backend — Analytics Service
============================================================
Aggregates cross-collection data to produce learning
performance dashboards.

Reads from:
  - materials   (uploaded documents)
  - summaries
  - flashcards
  - quizzes
  - results     (quiz submissions)
  - schedules
  - weak_topics
"""

from __future__ import annotations

from collections import defaultdict
from utils.logger import get_logger
from utils.helpers import utc_now_iso
from services.firebase_service import StorageRouter

logger = get_logger(__name__)


def get_analytics(user_id: str) -> dict:
    """
    Build a comprehensive analytics snapshot for *user_id*.

    Args:
        user_id: The student's user ID.

    Returns:
        Dict matching the ``GET /api/analytics`` response schema.
    """
    logger.info("Building analytics for user: %s", user_id)

    # ── Fetch all relevant data ───────────────────────────
    materials   = StorageRouter("materials").filter_by_user(user_id)
    summaries   = StorageRouter("summaries").filter_by_user(user_id)
    flashcards  = StorageRouter("flashcards").filter_by_user(user_id)
    quizzes     = StorageRouter("quizzes").filter_by_user(user_id)
    results     = StorageRouter("results").filter_by_user(user_id)
    schedules   = StorageRouter("schedules").filter_by_user(user_id)
    weak_topics = StorageRouter("weak_topics").filter_by_user(user_id)

    # ── Core counts ───────────────────────────────────────
    docs_uploaded   = len(materials)
    quizzes_taken   = len(results)
    schedules_count = len(schedules)

    # ── Score metrics ─────────────────────────────────────
    scores = [r.get("score", 0) for r in results if r.get("score") is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    highest_score = max(scores, default=0.0)
    lowest_score = min(scores, default=0.0)

    # ── Flashcard mastery ────────────────────────────────
    fc_mastered = sum(
        1 for fc in flashcards if fc.get("mastered") is True
    )
    fc_total = sum(len(fc.get("cards", [])) for fc in flashcards)

    # ── Weak topics (aggregated across all results) ───────
    topic_scores: dict[str, list[float]] = defaultdict(list)
    for result in results:
        for wt in result.get("weak_topics", []):
            topic = wt.get("topic", "Unknown")
            mastery = wt.get("mastery_percentage", 0)
            topic_scores[topic].append(mastery)

    aggregated_weak = []
    for topic, scores_list in topic_scores.items():
        avg = sum(scores_list) / len(scores_list)
        if avg < 70:
            aggregated_weak.append({
                "topic": topic,
                "average_mastery": round(avg, 1),
                "occurrences": len(scores_list),
            })
    aggregated_weak.sort(key=lambda x: x["average_mastery"])

    # ── Study streak ─────────────────────────────────────
    study_streak = _calculate_streak(results)

    # ── Performance trend ────────────────────────────────
    performance_trend = _build_performance_trend(results)

    # ── Score distribution ────────────────────────────────
    distribution = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    for s in scores:
        g = _score_to_grade(s)
        distribution[g] += 1

    analytics = {
        "user_id": user_id,
        "generated_at": utc_now_iso(),
        # Core stats
        "documents_uploaded": docs_uploaded,
        "summaries_generated": len(summaries),
        "flashcard_sets": len(flashcards),
        "flashcards_total": fc_total,
        "flashcards_mastered": fc_mastered,
        "quizzes_taken": quizzes_taken,
        "schedules_created": schedules_count,
        # Score metrics
        "average_score": avg_score,
        "highest_score": highest_score,
        "lowest_score": lowest_score,
        "score_distribution": distribution,
        # Weak areas
        "weak_topics": aggregated_weak[:10],
        # Streaks & trends
        "study_streak": study_streak,
        "performance_trend": performance_trend,
        # Summary sentence
        "insight": _generate_insight(avg_score, study_streak, aggregated_weak),
    }

    logger.info(
        "Analytics built for %s: %d docs, %d quizzes, avg score %.1f%%",
        user_id, docs_uploaded, quizzes_taken, avg_score,
    )
    return analytics


# ── Private helpers ───────────────────────────────────────

def _score_to_grade(score: float) -> str:
    if score >= 90: return "A"
    if score >= 80: return "B"
    if score >= 70: return "C"
    if score >= 60: return "D"
    return "F"


def _calculate_streak(results: list[dict]) -> int:
    """
    Calculate study streak (consecutive days with at least one quiz taken).

    Returns:
        Number of consecutive days (most recent streak).
    """
    from datetime import date, timedelta

    if not results:
        return 0

    # Collect unique dates from quiz results
    dates = set()
    for r in results:
        created = r.get("created_at", "")
        if created:
            try:
                d = date.fromisoformat(created[:10])
                dates.add(d)
            except ValueError:
                continue

    if not dates:
        return 0

    sorted_dates = sorted(dates, reverse=True)
    today = date.today()
    streak = 0

    # Walk backwards from today
    check_date = today
    for d in sorted_dates:
        if d == check_date or d == check_date - timedelta(days=1):
            streak += 1
            check_date = d
        else:
            break

    return streak


def _build_performance_trend(results: list[dict], max_points: int = 10) -> list[dict]:
    """
    Build a time-series of quiz scores for charting.

    Returns the last *max_points* quiz results sorted oldest→newest.
    """
    if not results:
        return []

    sorted_results = sorted(
        results, key=lambda r: r.get("created_at", "")
    )[-max_points:]

    return [
        {
            "date": r.get("created_at", "")[:10],
            "score": r.get("score", 0),
            "quiz_id": r.get("quiz_id", ""),
            "document_title": r.get("document_title", ""),
        }
        for r in sorted_results
    ]


def _generate_insight(avg_score: float, streak: int, weak_topics: list[dict]) -> str:
    """Generate a one-sentence insight about the student's progress."""
    if avg_score == 0 and streak == 0:
        return "Start uploading study materials and taking quizzes to see your insights!"
    parts = []
    if avg_score >= 80:
        parts.append(f"Great work — your average score is {avg_score:.0f}%.")
    elif avg_score >= 60:
        parts.append(f"You're making progress with an average score of {avg_score:.0f}%.")
    else:
        parts.append(f"Keep practising — your current average is {avg_score:.0f}%.")
    if streak > 1:
        parts.append(f"You have a {streak}-day study streak!")
    if weak_topics:
        parts.append(f"Focus on: {weak_topics[0]['topic']}.")
    return " ".join(parts)


def record_quiz_result(user_id: str, quiz_id: str, result_data: dict) -> dict:
    """
    Persist a quiz result and update the weak_topics collection.

    Args:
        user_id:     The student's user ID.
        quiz_id:     The quiz document ID.
        result_data: The full graded result dict.

    Returns:
        The saved result document.
    """
    from utils.helpers import generate_uuid

    result_id = generate_uuid()
    result_doc = {
        "user_id": user_id,
        "quiz_id": quiz_id,
        "score": result_data.get("score_data", {}).get("score", 0),
        "grade": result_data.get("score_data", {}).get("grade", "F"),
        "performance": result_data.get("score_data", {}).get("performance", ""),
        "total_questions": result_data.get("score_data", {}).get("total_questions", 0),
        "correct": result_data.get("score_data", {}).get("correct", 0),
        "weak_topics": result_data.get("weak_topics", []),
        "all_topics": result_data.get("all_topics", []),
        "graded_answers": result_data.get("graded_answers", []),
        "ai_analysis": result_data.get("ai_analysis", {}),
        "document_title": result_data.get("document_title", ""),
    }

    saved = StorageRouter("results").create(result_id, result_doc)
    logger.info("Result saved: %s (score: %.1f%%)", result_id, result_doc["score"])
    return saved
