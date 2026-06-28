"""
============================================================
StudyAI Backend — Prompt Engineering Library
============================================================
Centralised, optimised LLM prompts for all AI-powered
features. Each prompt is designed for educational contexts
and exam-oriented output using Llama 3.3-70B Versatile.

All prompts are functions so parameters are embedded via
f-string formatting at call time.
"""

from __future__ import annotations


# ══════════════════════════════════════════════════════════
# SYSTEM PROMPT
# ══════════════════════════════════════════════════════════

SYSTEM_PROMPT = (
    "You are StudyAI, an expert educational assistant and academic tutor. "
    "You specialise in breaking down complex study material into clear, "
    "structured learning content tailored for students preparing for exams. "
    "ALWAYS respond with valid, parseable JSON. Never include markdown fences, "
    "explanatory text, or any content outside the JSON structure."
)


# ══════════════════════════════════════════════════════════
# SUMMARISATION PROMPT
# ══════════════════════════════════════════════════════════

def summary_prompt(text: str, title: str = "") -> str:
    """
    Build the summarisation prompt.

    Args:
        text:  Extracted study material text (max ~8000 chars).
        title: Optional document title for context.

    Returns:
        Formatted prompt string.
    """
    title_line = f"Document Title: {title}\n" if title else ""
    return f"""
{title_line}Analyse the following study material and generate a comprehensive, exam-focused summary.

Return ONLY a JSON object with this exact structure:
{{
  "title": "concise, descriptive title",
  "topic_overview": "2-3 sentence high-level overview of the subject matter",
  "key_concepts": [
    {{"concept": "name", "explanation": "clear, concise explanation"}}
  ],
  "important_definitions": [
    {{"term": "term name", "definition": "precise definition"}}
  ],
  "core_principles": ["principle 1", "principle 2"],
  "revision_notes": ["revision point 1", "revision point 2"],
  "exam_tips": ["exam tip 1", "exam tip 2"],
  "difficulty_level": "beginner | intermediate | advanced",
  "estimated_study_time_minutes": 30,
  "related_topics": ["topic 1", "topic 2"]
}}

Study Material:
---
{text[:8000]}
---
""".strip()


# ══════════════════════════════════════════════════════════
# FLASHCARD GENERATION PROMPT
# ══════════════════════════════════════════════════════════

def flashcards_prompt(text: str, count: int = 10, title: str = "") -> str:
    """
    Build the flashcard generation prompt.

    Args:
        text:  Study material text.
        count: Number of flashcards to generate.
        title: Optional document title.

    Returns:
        Formatted prompt string.
    """
    title_line = f"Document: {title}\n" if title else ""
    return f"""
{title_line}Create exactly {count} high-quality study flashcards from the following material.
Focus on the most important and exam-relevant concepts.

Return ONLY a JSON array with this exact structure:
[
  {{
    "id": 1,
    "question": "clear, specific question",
    "answer": "concise, accurate answer",
    "topic": "topic or section this belongs to",
    "difficulty": "easy | medium | hard",
    "hint": "optional hint to help a struggling student",
    "explanation": "deeper explanation to aid understanding"
  }}
]

Rules:
- Mix difficulty levels: ~30% easy, ~50% medium, ~20% hard
- Use varied question formats: definitions, applications, comparisons
- Ensure answers are self-contained (no "see above" references)
- Cover all major topics in the material

Study Material:
---
{text[:8000]}
---
""".strip()


# ══════════════════════════════════════════════════════════
# QUIZ GENERATION PROMPT
# ══════════════════════════════════════════════════════════

def quiz_prompt(
    text: str,
    count: int = 10,
    difficulty: str = "medium",
    quiz_type: str = "mcq",
    title: str = "",
) -> str:
    """
    Build the quiz generation prompt.

    Args:
        text:       Study material text.
        count:      Number of questions.
        difficulty: "easy", "medium", or "hard".
        quiz_type:  "mcq", "true_false", "short_answer", or "mixed".
        title:      Optional document title.

    Returns:
        Formatted prompt string.
    """
    title_line = f"Document: {title}\n" if title else ""

    type_instructions = {
        "mcq": "ALL questions must be multiple-choice with exactly 4 options (A, B, C, D).",
        "true_false": "ALL questions must be True/False with options ['True', 'False'].",
        "short_answer": "ALL questions must be short-answer (no options needed, set options to []).",
        "mixed": "Mix question types: ~60% MCQ, ~25% True/False, ~15% Short Answer.",
    }
    type_note = type_instructions.get(quiz_type, type_instructions["mcq"])

    return f"""
{title_line}Generate a {count}-question quiz on the following study material.
Overall difficulty: {difficulty.upper()}
Question type: {type_note}

Return ONLY a JSON array with this exact structure:
[
  {{
    "id": 1,
    "type": "mcq | true_false | short_answer",
    "question": "question text",
    "options": ["A) option", "B) option", "C) option", "D) option"],
    "correct_answer": "A",
    "explanation": "why this answer is correct and others are wrong",
    "topic": "specific topic being tested",
    "difficulty": "easy | medium | hard",
    "points": 1
  }}
]

Rules:
- Make questions test understanding, not just recall
- Ensure plausible distractors for MCQ options
- Cover diverse topics from the material
- For short_answer, set options to [] and correct_answer to the expected answer
- For true_false, set options to ["True", "False"]

Study Material:
---
{text[:8000]}
---
""".strip()


# ══════════════════════════════════════════════════════════
# QUIZ RESULT ANALYSIS PROMPT
# ══════════════════════════════════════════════════════════

def quiz_analysis_prompt(
    questions: list[dict],
    answers: list[dict],
    score: float,
) -> str:
    """
    Build the quiz result analysis prompt.

    Args:
        questions: List of quiz question dicts.
        answers:   List of student answer dicts with correctness.
        score:     Overall score percentage.

    Returns:
        Formatted prompt string.
    """
    import json
    q_summary = []
    for q, a in zip(questions, answers):
        q_summary.append({
            "topic": q.get("topic", "Unknown"),
            "correct": a.get("is_correct", False),
            "student_answer": a.get("student_answer", ""),
            "correct_answer": q.get("correct_answer", ""),
        })

    return f"""
A student scored {score:.1f}% on a quiz. Analyse the results and identify learning gaps.

Detailed results:
{json.dumps(q_summary, indent=2)}

Return ONLY a JSON object:
{{
  "overall_score": {score:.1f},
  "performance_level": "excellent | good | average | needs_improvement",
  "weak_topics": [
    {{
      "topic": "topic name",
      "questions_wrong": 2,
      "mastery_percentage": 40,
      "priority": "high | medium | low"
    }}
  ],
  "strong_topics": ["topic 1", "topic 2"],
  "recommendations": [
    {{
      "action": "specific study action",
      "topic": "related topic",
      "resource_type": "flashcards | re-read | practice | video"
    }}
  ],
  "study_focus": "2-3 sentence personalised advice for this student",
  "estimated_improvement_time_hours": 3
}}
""".strip()


# ══════════════════════════════════════════════════════════
# STUDY SCHEDULE GENERATION PROMPT
# ══════════════════════════════════════════════════════════

def schedule_prompt(
    subject: str,
    material_summary: str,
    weak_topics: list[str],
    study_goals: str,
    days: int = 7,
    hours_per_day: float = 2.0,
    exam_date: str = "7 days from now",
    proficiency: str = "intermediate",
) -> str:
    """
    Build the personalised study schedule prompt.

    Args:
        subject:          Subject name.
        material_summary: Brief summary of the study material.
        weak_topics:      List of identified weak areas.
        study_goals:      Student's stated study goals.
        days:             Number of days in the schedule (default 7).
        hours_per_day:    Available study hours per day.
        exam_date:        Target exam date string.
        proficiency:      Student's current level.

    Returns:
        Formatted prompt string.
    """
    weak_str = ", ".join(weak_topics) if weak_topics else "None identified yet"
    return f"""
Create a detailed {days}-day personalised study schedule for a student.

Subject: {subject}
Current proficiency: {proficiency}
Exam date: {exam_date}
Available study time: {hours_per_day} hours/day
Weak topics needing extra attention: {weak_str}
Study goals: {study_goals}

Material overview: {material_summary[:1000]}

Return ONLY a JSON object:
{{
  "title": "Study Schedule title",
  "subject": "{subject}",
  "total_hours": {days * hours_per_day},
  "exam_date": "{exam_date}",
  "strategy": "2-3 sentence overall study strategy",
  "days": [
    {{
      "day": 1,
      "date_label": "Day 1 (e.g. Monday)",
      "theme": "main focus theme for the day",
      "total_minutes": {int(hours_per_day * 60)},
      "sessions": [
        {{
          "time_slot": "09:00 - 10:00",
          "duration_minutes": 60,
          "topic": "specific topic",
          "activity": "read | flashcards | quiz | practice | review | rest",
          "description": "what to do in this session",
          "priority": "high | medium | low",
          "resources": ["resource 1"]
        }}
      ],
      "daily_goals": ["goal 1", "goal 2"],
      "motivation_tip": "short motivational tip for the day"
    }}
  ],
  "weekly_tips": ["tip 1", "tip 2", "tip 3"],
  "revision_strategy": "spaced repetition | active recall | mixed"
}}

Generate all {days} days. Allocate more time to weak topics.
""".strip()


# ══════════════════════════════════════════════════════════
# WEAK TOPIC IDENTIFICATION PROMPT
# ══════════════════════════════════════════════════════════

def weak_topics_prompt(all_results: list[dict]) -> str:
    """
    Build the weak topic identification prompt from multiple quiz results.

    Args:
        all_results: List of quiz result dicts.

    Returns:
        Formatted prompt string.
    """
    import json
    return f"""
Analyse this student's quiz history to identify persistent learning gaps and weak areas.

Quiz history:
{json.dumps(all_results, indent=2)}

Return ONLY a JSON object:
{{
  "overall_mastery": 72.5,
  "weak_topics": [
    {{
      "topic": "topic name",
      "average_score": 45.0,
      "quiz_count": 3,
      "trend": "improving | declining | stable",
      "priority_level": "critical | high | medium | low",
      "recommended_actions": ["action 1", "action 2"]
    }}
  ],
  "mastered_topics": ["topic 1", "topic 2"],
  "study_streak_insight": "observation about consistency",
  "improvement_plan": "personalised 2-3 sentence plan"
}}
""".strip()


# ══════════════════════════════════════════════════════════
# RECOMMENDATION GENERATION PROMPT
# ══════════════════════════════════════════════════════════

def recommendations_prompt(
    performance_data: dict,
    subject: str,
) -> str:
    """
    Generate personalised study recommendations from performance analytics.

    Args:
        performance_data: Dict containing scores, weak topics, streaks, etc.
        subject:          Subject name.

    Returns:
        Formatted prompt string.
    """
    import json
    return f"""
Based on this student's performance data for {subject}, generate personalised study recommendations.

Performance data:
{json.dumps(performance_data, indent=2)}

Return ONLY a JSON array:
[
  {{
    "priority": 1,
    "category": "content | technique | time_management | motivation",
    "recommendation": "specific, actionable recommendation",
    "expected_impact": "high | medium | low",
    "time_required_hours": 1.5,
    "topic": "specific topic (or 'general')"
  }}
]

Generate 5-8 highly specific, actionable recommendations ordered by priority.
""".strip()
