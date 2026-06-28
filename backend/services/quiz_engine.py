"""
============================================================
StudyAI Backend — Quiz Engine Service
============================================================
Handles quiz grading, score calculation, weak topic
detection, and answer validation.

Works independently of the AI layer — the AI generates
questions; this service grades student submissions.
"""

from __future__ import annotations

from typing import Any
from utils.logger import get_logger

logger = get_logger(__name__)


# ══════════════════════════════════════════════════════════
# Answer Grading
# ══════════════════════════════════════════════════════════

def grade_answer(
    question: dict,
    student_answer: str,
) -> dict:
    """
    Grade a single question.

    Args:
        question:       Question dict (must have ``correct_answer``,
                        ``type``, ``points``).
        student_answer: The student's submitted answer string.

    Returns:
        Dict with:
          ``is_correct``      — bool
          ``points_earned``   — int
          ``points_possible`` — int
          ``correct_answer``  — str
          ``student_answer``  — str
          ``feedback``        — str
    """
    q_type = question.get("type", "mcq")
    correct = str(question.get("correct_answer", "")).strip()
    submitted = str(student_answer or "").strip()
    points_possible = int(question.get("points", 1))

    is_correct = _check_answer(q_type, correct, submitted)
    points_earned = points_possible if is_correct else 0

    feedback = (
        f"Correct! {question.get('explanation', '')}"
        if is_correct
        else f"Incorrect. The correct answer is: {correct}. {question.get('explanation', '')}"
    )

    return {
        "question_id": question.get("id"),
        "is_correct": is_correct,
        "points_earned": points_earned,
        "points_possible": points_possible,
        "correct_answer": correct,
        "student_answer": submitted,
        "feedback": feedback.strip(),
        "topic": question.get("topic", "Unknown"),
        "difficulty": question.get("difficulty", "medium"),
    }


def _check_answer(q_type: str, correct: str, submitted: str) -> bool:
    """
    Compare correct answer to submitted answer based on question type.

    MCQ / True-False: exact letter/word match (case-insensitive).
    Short answer: flexible — submitted must contain the key answer words.
    """
    correct_lower = correct.lower().strip()
    submitted_lower = submitted.lower().strip()

    if q_type in ("mcq", "true_false"):
        # Allow "A" to match "A) ..." style options
        return correct_lower.startswith(submitted_lower) or submitted_lower.startswith(correct_lower[:1])

    if q_type == "short_answer":
        if not submitted_lower:
            return False
        # Accept if submitted contains all significant words from correct answer
        key_words = [w for w in correct_lower.split() if len(w) > 3]
        if not key_words:
            return correct_lower in submitted_lower
        return sum(w in submitted_lower for w in key_words) >= max(1, len(key_words) // 2)

    # Default: exact match
    return correct_lower == submitted_lower


# ══════════════════════════════════════════════════════════
# Quiz Scoring
# ══════════════════════════════════════════════════════════

def calculate_score(graded_answers: list[dict]) -> dict:
    """
    Calculate overall quiz score from a list of graded answers.

    Args:
        graded_answers: Output of :func:`grade_answer` for each question.

    Returns:
        Dict with:
          ``total_questions`` — int
          ``correct``         — int
          ``incorrect``       — int
          ``points_earned``   — int
          ``points_possible`` — int
          ``score``           — float (0-100)
          ``grade``           — str (A/B/C/D/F)
          ``performance``     — str label
    """
    if not graded_answers:
        return {
            "total_questions": 0,
            "correct": 0,
            "incorrect": 0,
            "points_earned": 0,
            "points_possible": 0,
            "score": 0.0,
            "grade": "F",
            "performance": "no_data",
        }

    total = len(graded_answers)
    correct = sum(1 for a in graded_answers if a["is_correct"])
    incorrect = total - correct
    points_earned = sum(a["points_earned"] for a in graded_answers)
    points_possible = sum(a["points_possible"] for a in graded_answers)
    score = round((points_earned / points_possible * 100) if points_possible else 0.0, 2)

    return {
        "total_questions": total,
        "correct": correct,
        "incorrect": incorrect,
        "points_earned": points_earned,
        "points_possible": points_possible,
        "score": score,
        "grade": _score_to_grade(score),
        "performance": _score_to_performance(score),
    }


def _score_to_grade(score: float) -> str:
    if score >= 90: return "A"
    if score >= 80: return "B"
    if score >= 70: return "C"
    if score >= 60: return "D"
    return "F"


def _score_to_performance(score: float) -> str:
    if score >= 90: return "excellent"
    if score >= 75: return "good"
    if score >= 60: return "average"
    if score >= 40: return "needs_improvement"
    return "struggling"


# ══════════════════════════════════════════════════════════
# Weak Topic Detection
# ══════════════════════════════════════════════════════════

def identify_weak_topics_from_answers(graded_answers: list[dict]) -> list[dict]:
    """
    Identify weak topics from a set of graded answers without AI.

    Groups answers by topic and calculates mastery per topic.

    Args:
        graded_answers: List of graded answer dicts.

    Returns:
        List of topic dicts sorted by mastery ascending (weakest first):
          ``topic``              — str
          ``total_questions``    — int
          ``correct``            — int
          ``mastery_percentage`` — float
          ``is_weak``            — bool (mastery < 60%)
    """
    topic_map: dict[str, dict] = {}

    for answer in graded_answers:
        topic = answer.get("topic", "Unknown")
        if topic not in topic_map:
            topic_map[topic] = {"correct": 0, "total": 0}
        topic_map[topic]["total"] += 1
        if answer["is_correct"]:
            topic_map[topic]["correct"] += 1

    results = []
    for topic, data in topic_map.items():
        mastery = round(data["correct"] / data["total"] * 100, 1) if data["total"] else 0.0
        results.append({
            "topic": topic,
            "total_questions": data["total"],
            "correct": data["correct"],
            "mastery_percentage": mastery,
            "is_weak": mastery < 60.0,
        })

    return sorted(results, key=lambda x: x["mastery_percentage"])


# ══════════════════════════════════════════════════════════
# Full Quiz Submission Processor
# ══════════════════════════════════════════════════════════

def process_quiz_submission(
    questions: list[dict],
    student_answers: list[dict],
) -> dict:
    """
    Process a full quiz submission end-to-end.

    Args:
        questions:       Original quiz questions (from AI).
        student_answers: List of ``{"question_id": ..., "answer": ...}`` dicts.

    Returns:
        Comprehensive result dict including:
          ``graded_answers``, ``score_data``, ``weak_topics``
    """
    # Build a lookup map: question_id → question
    q_map: dict[Any, dict] = {q.get("id"): q for q in questions}

    graded: list[dict] = []
    for sub in student_answers:
        q_id = sub.get("question_id")
        question = q_map.get(q_id)
        if question is None:
            logger.warning("Question ID %s not found in quiz — skipping.", q_id)
            continue
        graded.append(grade_answer(question, sub.get("answer", "")))

    score_data = calculate_score(graded)
    weak_topics = identify_weak_topics_from_answers(graded)

    logger.info(
        "Quiz graded: %d/%d correct | score: %.1f%%",
        score_data["correct"],
        score_data["total_questions"],
        score_data["score"],
    )

    return {
        "graded_answers": graded,
        "score_data": score_data,
        "weak_topics": [t for t in weak_topics if t["is_weak"]],
        "all_topics": weak_topics,
    }
