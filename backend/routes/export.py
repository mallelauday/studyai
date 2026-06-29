"""
============================================================
StudyAI Backend — Export Route
============================================================
GET /api/export/pdf — Export a study plan or summary to PDF
"""

from __future__ import annotations

import io
from flask import Blueprint, request, send_file, g, jsonify

from middleware.auth_middleware import login_required
from services.firebase_service import StorageRouter
from utils.logger import get_logger

logger = get_logger(__name__)

export_bp = Blueprint("export", __name__)


@export_bp.route("/export/pdf", methods=["GET"])
@export_bp.route("/api/export/pdf", methods=["GET"])
def export_pdf():
    """
    Export study plan or summary to a beautifully formatted PDF.
    Expects query parameters:
        type: "study-plan" | "summary"
        id: (optional) document ID. Latest active is used if omitted.
    """
    import io
    import html
    from utils.jwt_utils import decode_access_token, extract_bearer_token

    # Attempt to extract token and authenticate, but do not fail if missing
    token = extract_bearer_token(request)
    user_id = None
    if token:
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub")
        except Exception:
            pass

    # If no user_id, fall back to mock PDF generation (simple placeholder)
    if not user_id:
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []

            story.append(Paragraph("<b>StudyAI Study Plan</b>", styles["Title"]))
            story.append(Spacer(1, 20))
            story.append(Paragraph("Generated Schedule", styles["Normal"]))

            doc.build(story)
            buffer.seek(0)
            return send_file(
                buffer,
                mimetype="application/pdf",
                as_attachment=True,
                download_name="study-plan.pdf"
            )
        except Exception as exc:
            logger.error("Mock PDF generation failed: %s", exc)
            return jsonify({"success": False, "error": f"Failed to generate PDF: {str(exc)}"}), 500

    # User is logged in, process real PDF export
    g.user_id = user_id
    export_type = request.args.get("type", "study-plan")
    doc_id = request.args.get("id")
    
    logger.info("PDF export triggered. type=%s, id=%s, user=%s", export_type, doc_id, g.user_id)

    # ── Fetch active item ─────────────────────────────────
    if not doc_id:
        if export_type == "study-plan":
            items = StorageRouter("study_plans").filter_by_user(g.user_id)
            if not items:
                return {"success": False, "error": "No study plan found to export."}, 404
            items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            item = items[0]
        else:
            items = StorageRouter("summaries").filter_by_user(g.user_id)
            if not items:
                return {"success": False, "error": "No summaries found to export."}, 404
            items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            item = items[0]
    else:
        if export_type == "study-plan":
            item = StorageRouter("study_plans").get(doc_id)
        else:
            item = StorageRouter("summaries").get(doc_id)
            
        if not item:
            return {"success": False, "error": f"{export_type} not found."}, 404
            
        if item.get("user_id") != g.user_id:
            return {"success": False, "error": "Unauthorized access to this document."}, 403

    # ── Generate PDF via ReportLab ─────────────────────────
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )
        
        styles = getSampleStyleSheet()
        story = []
        
        # Colors: SLEEK INDIGO (#4F46E5) & GRAY (#6B7280)
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=24,
            leading=28,
            textColor='#4F46E5',
            spaceAfter=15
        )
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor='#6B7280',
            spaceAfter=25
        )
        h2_style = ParagraphStyle(
            'H2Style',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor='#1F2937',
            spaceBefore=12,
            spaceAfter=8
        )
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=10,
            leading=15,
            textColor='#374151',
            spaceAfter=8
        )
        task_style = ParagraphStyle(
            'TaskStyle',
            parent=styles['Normal'],
            fontSize=10,
            leading=15,
            textColor='#374151',
            leftIndent=20,
            firstLineIndent=-10,
            spaceAfter=5
        )

        if export_type == "study-plan":
            subject = html.escape(item.get("subject", "General Subject"))
            exam_date = html.escape(str(item.get("exam_date", "N/A")))
            difficulty = html.escape(item.get("difficulty", "medium"))
            days = item.get("days", [])
            
            story.append(Paragraph(f"Study Plan: {subject}", title_style))
            story.append(Paragraph(f"Exam Date: {exam_date} | Difficulty: {difficulty.upper()} | Generated by StudyAI", subtitle_style))
            story.append(Spacer(1, 10))
            
            for day in days:
                date_str = html.escape(day.get("date", ""))
                tasks = day.get("tasks", [])
                completed = " (Completed)" if day.get("completed") else ""
                
                story.append(Paragraph(f"<b>Date: {date_str}</b>{completed}", h2_style))
                for task in tasks:
                    story.append(Paragraph(f"• {html.escape(task)}", task_style))
                story.append(Spacer(1, 10))
        else:
            title = html.escape(item.get("document_title", "Untitled Summary"))
            summary_content = item.get("summary", {})
            
            story.append(Paragraph(f"Study Summary: {title}", title_style))
            story.append(Paragraph("Generated by StudyAI summarization engine", subtitle_style))
            story.append(Spacer(1, 10))
            
            overview = summary_content.get("overview", "")
            if overview:
                story.append(Paragraph("Overview", h2_style))
                story.append(Paragraph(html.escape(overview), body_style))
                story.append(Spacer(1, 10))
                
            key_points = summary_content.get("key_points", [])
            if key_points:
                story.append(Paragraph("Key Points", h2_style))
                for pt in key_points:
                    story.append(Paragraph(f"• {html.escape(pt)}", task_style))
                story.append(Spacer(1, 10))
                
            concepts = summary_content.get("important_concepts", [])
            if concepts:
                story.append(Paragraph("Important Concepts", h2_style))
                for concept in concepts:
                    term = html.escape(concept.get("term", ""))
                    definition = html.escape(concept.get("definition", ""))
                    story.append(Paragraph(f"<b>{term}</b>: {definition}", task_style))
                story.append(Spacer(1, 10))

        doc.build(story)
        buffer.seek(0)
        
        filename = f"{export_type}_{g.user_id[:6]}.pdf"
        logger.info("Successfully generated PDF: %s", filename)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype="application/pdf"
        )
        
    except Exception as exc:
        logger.error("PDF generation failed: %s", exc)
        return {"success": False, "error": f"Failed to generate PDF: {str(exc)}"}, 500

