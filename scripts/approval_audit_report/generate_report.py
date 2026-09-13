"""Generate the 5-page Contract Approval & Audit Report.

Usage:
  python generate_report.py --input payload.json --output report.pdf
  python generate_report.py --input payload.json   # writes PDF bytes to stdout
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

NAVY = colors.HexColor("#152A4A")
TEAL = colors.HexColor("#0E7C86")
GREEN = colors.HexColor("#1F9D55")
GREEN_SOFT = colors.HexColor("#E8F7EE")
ORANGE = colors.HexColor("#E8871E")
RED = colors.HexColor("#D64545")
ZEBRA = colors.HexColor("#F3F4F6")
SLATE = colors.HexColor("#374151")
MUTED = colors.HexColor("#6B7280")
WHITE = colors.white
LINE = colors.HexColor("#D1D5DB")
ARROW_GRAY = colors.HexColor("#9CA3AF")

PAGE_W, PAGE_H = letter
MARGIN = 0.65 * inch
HEADER_H = 36
FOOTER_H = 28
CONTENT_W = PAGE_W - (2 * MARGIN)


def load_payload(path: str) -> dict:
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def fmt_generated(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%B %d, %Y")
    except ValueError:
        return iso[:10]


def fit_text(text: str, font: str, size: float, max_w: float) -> str:
    value = (text or "—").replace("\n", " ")
    if pdfmetrics.stringWidth(value, font, size) <= max_w:
        return value
    ellipsis = "…"
    while value and pdfmetrics.stringWidth(value + ellipsis, font, size) > max_w:
        value = value[:-1]
    return (value + ellipsis) if value else ellipsis


def wrap_lines(text: str, font: str, size: float, max_w: float, max_lines: int) -> list[str]:
    words = (text or "—").replace("\n", " ").split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if pdfmetrics.stringWidth(trial, font, size) <= max_w:
            current = trial
            continue
        if current:
            lines.append(current)
        current = word
        if len(lines) == max_lines - 1:
            break
    if current and len(lines) < max_lines:
        lines.append(current)
    if len(lines) == max_lines and words and " ".join(lines) != " ".join(words):
        lines[-1] = fit_text(lines[-1], font, size, max_w)
    return lines or ["—"]


def outcome_color(outcome: str) -> colors.Color:
    if outcome == "ok":
        return GREEN
    if outcome == "warn":
        return ORANGE
    if outcome == "fail":
        return RED
    return TEAL


def pill_color(label: str) -> colors.Color:
    key = (label or "").upper()
    if any(token in key for token in ("ACTIVAT", "COMPLETE", "APPROV", "SUCCESS", "ON TRACK")):
        return GREEN
    if any(token in key for token in ("PENDING", "REVIEW", "WARN", "AT RISK", "CHANGE")):
        return ORANGE
    if any(token in key for token in ("REJECT", "FAIL", "BREACH")):
        return RED
    return TEAL


def draw_chrome(c: canvas.Canvas, doc: BaseDocTemplate, payload: dict) -> None:
    c.saveState()
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN, PAGE_H - 23, payload.get("companyName") or "CAALM")
    c.setFont("Helvetica", 8)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 23, "CONFIDENTIAL — INTERNAL USE")

    # Light footer: rule + muted metadata (matches Image #3)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(MARGIN, FOOTER_H - 2, PAGE_W - MARGIN, FOOTER_H - 2)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.5)
    footer = payload.get("footerLine") or (
        f"Approval & Audit Report • {payload.get('reportTitle') or ''} • "
        f"Generated {fmt_generated(payload.get('generatedAt') or '')}"
    )
    c.drawString(MARGIN, 10, fit_text(footer, "Helvetica", 7.5, CONTENT_W - 60))
    c.drawRightString(PAGE_W - MARGIN, 10, f"Page {doc.page}")
    c.restoreState()


class SectionHeading(Flowable):
    def __init__(self, number: int | None, title: str, description: str | None = None):
        super().__init__()
        self.number = number
        self.title = title
        self.description = description or ""
        self._desc_height = 0

    def wrap(self, avail_width, avail_height):
        self.width = avail_width
        self._desc_height = 0
        if self.description:
            # Approximate wrapped description height
            words = self.description.split()
            lines = 1
            current = ""
            for word in words:
                trial = word if not current else f"{current} {word}"
                if pdfmetrics.stringWidth(trial, "Helvetica", 9) <= avail_width:
                    current = trial
                else:
                    lines += 1
                    current = word
            self._desc_height = 4 + lines * 12
        self.height = 22 + self._desc_height
        return avail_width, self.height

    def draw(self):
        label = f"{self.number}. {self.title}" if self.number is not None else self.title
        self.canv.setFillColor(NAVY)
        self.canv.setFont("Helvetica-Bold", 12)
        self.canv.drawString(0, self.height - 12, label)
        self.canv.setStrokeColor(TEAL)
        self.canv.setLineWidth(1.5)
        self.canv.line(0, self.height - 18, self.width, self.height - 18)
        if self.description:
            self.canv.setFillColor(SLATE)
            self.canv.setFont("Helvetica", 9)
            y = self.height - 32
            for line in wrap_lines(self.description, "Helvetica", 9, self.width, 6):
                self.canv.drawString(0, y, line)
                y -= 12


class StatusPills(Flowable):
    def __init__(self, pills: list[str]):
        super().__init__()
        self.pills = pills or []
        self.height = 22

    def wrap(self, avail_width, avail_height):
        self.width = avail_width
        return avail_width, self.height

    def draw(self):
        x = 0
        for label in self.pills:
            text = fit_text(label, "Helvetica-Bold", 7, 140)
            width = pdfmetrics.stringWidth(text, "Helvetica-Bold", 7) + 16
            fill = pill_color(label)
            self.canv.setFillColor(fill)
            self.canv.roundRect(x, 4, width, 16, 8, fill=1, stroke=0)
            self.canv.setFillColor(WHITE)
            self.canv.setFont("Helvetica-Bold", 7)
            self.canv.drawString(x + 8, 8, text)
            x += width + 8


class FactsGrid(Flowable):
    """Borderless 2-column label/value grid (Image #1)."""

    def __init__(self, facts: list[dict]):
        super().__init__()
        self.facts = facts or []
        rows = (len(self.facts) + 1) // 2
        self.height = max(rows * 36, 36)

    def wrap(self, avail_width, avail_height):
        self.width = avail_width
        rows = (len(self.facts) + 1) // 2
        self.height = max(rows * 36, 36)
        return self.width, self.height

    def draw(self):
        col_w = self.width / 2
        for i in range(0, len(self.facts), 2):
            row = i // 2
            y = self.height - (row + 1) * 36 + 8
            for col, fact in enumerate(self.facts[i : i + 2]):
                x = col * col_w
                label = (fact.get("label") or "").upper()
                value = fact.get("value") or "—"
                self.canv.setFillColor(MUTED)
                self.canv.setFont("Helvetica", 7)
                self.canv.drawString(x, y + 16, fit_text(label, "Helvetica", 7, col_w - 16))
                self.canv.setFillColor(NAVY)
                self.canv.setFont("Helvetica-Bold", 10)
                for li, line in enumerate(wrap_lines(value, "Helvetica-Bold", 10, col_w - 16, 2)):
                    self.canv.drawString(x, y + 2 - li * 11, line)


class PipelineDiagram(Flowable):
    """Four stage cards with green caps and thick gray arrows (Image #5)."""

    def __init__(self, stages: list[dict]):
        super().__init__()
        self.stages = (stages or [])[:4]
        self.width = CONTENT_W
        self.height = 148

    def wrap(self, avail_width, avail_height):
        self.width = min(CONTENT_W, avail_width)
        return self.width, self.height

    def draw(self):
        box_w = 112
        box_h = 122
        gap = 18
        total = 4 * box_w + 3 * gap
        x0 = max(0, (self.width - total) / 2)
        y0 = 8

        for index in range(4):
            stage = self.stages[index] if index < len(self.stages) else {}
            x = x0 + index * (box_w + gap)
            status = str(stage.get("status") or "PENDING")
            complete = any(t in status.upper() for t in ("COMPLETE", "ACTIVAT", "APPROV"))

            # Card
            self.canv.setStrokeColor(LINE)
            self.canv.setFillColor(WHITE)
            self.canv.setLineWidth(0.8)
            self.canv.roundRect(x, y0, box_w, box_h, 5, fill=1, stroke=1)

            # Green top bar
            self.canv.setFillColor(GREEN if complete else pill_color(status))
            self.canv.rect(x + 0.5, y0 + box_h - 6, box_w - 1, 5.5, fill=1, stroke=0)

            # Number badge
            badge = str(stage.get("number") or index + 1)
            self.canv.setFillColor(NAVY)
            self.canv.circle(x + 14, y0 + box_h - 22, 8, fill=1, stroke=0)
            self.canv.setFillColor(WHITE)
            self.canv.setFont("Helvetica-Bold", 8)
            self.canv.drawCentredString(x + 14, y0 + box_h - 25, badge)

            # Title (uppercase, centered)
            name = str(stage.get("name") or "").upper()
            self.canv.setFillColor(NAVY)
            self.canv.setFont("Helvetica-Bold", 8)
            self.canv.drawCentredString(
                x + box_w / 2,
                y0 + box_h - 28,
                fit_text(name, "Helvetica-Bold", 8, box_w - 28),
            )

            # Status pill
            pill_text = fit_text(status.upper(), "Helvetica-Bold", 7, box_w - 24)
            pw = pdfmetrics.stringWidth(pill_text, "Helvetica-Bold", 7) + 12
            px = x + (box_w - pw) / 2
            self.canv.setFillColor(GREEN_SOFT if complete else colors.Color(0.95, 0.95, 0.95))
            self.canv.roundRect(px, y0 + box_h - 48, pw, 12, 6, fill=1, stroke=0)
            self.canv.setFillColor(GREEN if complete else pill_color(status))
            self.canv.setFont("Helvetica-Bold", 7)
            self.canv.drawCentredString(x + box_w / 2, y0 + box_h - 45, pill_text)

            # Assignees
            self.canv.setFillColor(colors.HexColor("#111827"))
            self.canv.setFont("Helvetica-Bold", 8)
            self.canv.drawCentredString(
                x + box_w / 2,
                y0 + 48,
                fit_text(str(stage.get("assignees") or "—"), "Helvetica-Bold", 8, box_w - 16),
            )
            # Role
            self.canv.setFillColor(MUTED)
            self.canv.setFont("Helvetica", 7)
            self.canv.drawCentredString(
                x + box_w / 2,
                y0 + 36,
                fit_text(str(stage.get("role") or "—"), "Helvetica", 7, box_w - 16),
            )
            # Divider
            self.canv.setStrokeColor(LINE)
            self.canv.setLineWidth(0.6)
            self.canv.line(x + 16, y0 + 28, x + box_w - 16, y0 + 28)
            # Timestamp
            self.canv.setFillColor(MUTED)
            self.canv.setFont("Helvetica", 7)
            self.canv.drawCentredString(
                x + box_w / 2,
                y0 + 16,
                fit_text(str(stage.get("timestamp") or "—"), "Helvetica", 7, box_w - 16),
            )

            # Thick gray arrow between cards
            if index < 3:
                ax = x + box_w + 2
                ay = y0 + box_h / 2
                self.canv.setFillColor(ARROW_GRAY)
                self.canv.setStrokeColor(ARROW_GRAY)
                self.canv.setLineWidth(3)
                self.canv.line(ax, ay, ax + gap - 10, ay)
                path = self.canv.beginPath()
                path.moveTo(ax + gap - 4, ay)
                path.lineTo(ax + gap - 12, ay + 5)
                path.lineTo(ax + gap - 12, ay - 5)
                path.close()
                self.canv.drawPath(path, fill=1, stroke=0)


class TimelineGraphic(Flowable):
    def __init__(self, events: list[dict]):
        super().__init__()
        self.events = self._pick(events or [])
        self.width = CONTENT_W
        self.height = 168 if len(self.events) <= 4 else 336

    def _pick(self, events: list[dict]) -> list[dict]:
        if len(events) <= 8:
            return events
        count = 8
        last = len(events) - 1
        indexes = sorted({round(i * last / (count - 1)) for i in range(count)})
        return [events[i] for i in indexes]

    def wrap(self, avail_width, avail_height):
        self.width = min(CONTENT_W, avail_width)
        return self.width, self.height

    def _draw_row(self, events: list[dict], mid_y: float) -> None:
        left = 24
        right = self.width - 24
        self.canv.setStrokeColor(LINE)
        self.canv.setLineWidth(1.6)
        self.canv.line(left, mid_y, right, mid_y)
        n = len(events)
        if n == 0:
            return
        span = right - left
        card_w = min(118, span / max(n, 1) - 8)
        card_h = 56
        for i, event in enumerate(events):
            x = left if n == 1 else left + (span * i / (n - 1))
            color = outcome_color(event.get("outcome") or "info")
            self.canv.setFillColor(color)
            self.canv.circle(x, mid_y, 4.5, fill=1, stroke=0)
            above = i % 2 == 0
            card_x = max(0, min(self.width - card_w, x - card_w / 2))
            card_y = mid_y + 14 if above else mid_y - 14 - card_h
            stem_to = card_y if above else card_y + card_h
            self.canv.setStrokeColor(color)
            self.canv.setLineWidth(0.8)
            self.canv.line(x, mid_y + (5 if above else -5), x, stem_to)
            # Soft tint fill
            r, g, b = color.red, color.green, color.blue
            self.canv.setFillColor(colors.Color(r, g, b, alpha=0.08))
            self.canv.setStrokeColor(color)
            self.canv.roundRect(card_x, card_y, card_w, card_h, 4, fill=1, stroke=1)
            self.canv.setFillColor(color)
            self.canv.rect(card_x, card_y, 2.5, card_h, fill=1, stroke=0)

            pad = 7
            inner = card_w - pad - 6
            self.canv.setFillColor(colors.HexColor("#111827"))
            self.canv.setFont("Helvetica-Bold", 6.5)
            self.canv.drawString(
                card_x + pad,
                card_y + 42,
                fit_text(str(event.get("at") or ""), "Helvetica-Bold", 6.5, inner),
            )
            action_lines = wrap_lines(str(event.get("action") or ""), "Helvetica-Bold", 7, inner, 2)
            self.canv.setFillColor(color)
            self.canv.setFont("Helvetica-Bold", 7)
            self.canv.drawString(card_x + pad, card_y + 30, action_lines[0])
            if len(action_lines) > 1:
                self.canv.drawString(card_x + pad, card_y + 20, action_lines[1])
            self.canv.setFillColor(MUTED)
            self.canv.setFont("Helvetica", 6.5)
            self.canv.drawString(
                card_x + pad,
                card_y + 8,
                fit_text(str(event.get("actor") or ""), "Helvetica", 6.5, inner),
            )

    def draw(self):
        events = self.events
        if not events:
            self.canv.setFillColor(MUTED)
            self.canv.setFont("Helvetica-Oblique", 9)
            self.canv.drawString(0, self.height / 2, "No timeline events recorded.")
            return
        if len(events) <= 4:
            self._draw_row(events, 84)
            return
        self._draw_row(events[:4], 252)
        self._draw_row(events[4:], 84)


def styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ReportTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=NAVY,
            alignment=TA_LEFT,
            spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "ReportSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=SLATE,
            spaceAfter=10,
        ),
        "body": ParagraphStyle(
            "ReportBody",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=SLATE,
        ),
        "flag_intro": ParagraphStyle(
            "ReportFlagIntro",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=13,
            textColor=SLATE,
            spaceBefore=4,
            spaceAfter=2,
        ),
        "flag_inline": ParagraphStyle(
            "ReportFlagInline",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=SLATE,
        ),
        "status_line": ParagraphStyle(
            "StatusLine",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=11,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceBefore=4,
            spaceAfter=6,
        ),
        "notif_head": ParagraphStyle(
            "NotifHead",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=TEAL,
            spaceAfter=6,
        ),
        "sod": ParagraphStyle(
            "SodNote",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=MUTED,
            spaceBefore=8,
        ),
        "cell": ParagraphStyle(
            "ReportCell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10.5,
            textColor=SLATE,
        ),
        "cell_head": ParagraphStyle(
            "ReportCellHead",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10.5,
            textColor=WHITE,
        ),
        "ok": ParagraphStyle(
            "ResultOk",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10.5,
            textColor=GREEN,
        ),
        "fail": ParagraphStyle(
            "ResultFail",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10.5,
            textColor=RED,
        ),
    }


def simple_table(
    headers: list[str],
    rows: list[list],
    s: dict[str, ParagraphStyle],
    col_widths: list[float],
) -> Table:
    data = [[Paragraph(h, s["cell_head"]) for h in headers]]
    for row in rows:
        data.append(row)
    table = Table(data, colWidths=col_widths, repeatRows=1)
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
    ]
    for r in range(1, len(data)):
        if r % 2 == 0:
            cmds.append(("BACKGROUND", (0, r), (-1, r), ZEBRA))
    table.setStyle(TableStyle(cmds))
    return table


def section_meta(payload: dict, key: str, fallback_num: int, fallback_title: str) -> tuple:
    sections = payload.get("sections") or {}
    meta = sections.get(key) or {}
    return (
        meta.get("number", fallback_num),
        meta.get("title") or fallback_title,
        meta.get("description"),
    )


def build_story(payload: dict) -> list:
    s = styles()
    cover = payload.get("cover") or {}
    details = payload.get("details") or {}
    story: list = []

    story.append(Paragraph(cover.get("title") or payload.get("reportTitle") or "", s["title"]))
    story.append(Paragraph(cover.get("subtitle") or "", s["subtitle"]))
    story.append(StatusPills(cover.get("statusPills") or []))
    story.append(Spacer(1, 10))
    story.append(FactsGrid(cover.get("facts") or []))
    story.append(Spacer(1, 8))
    story.append(SectionHeading(None, "Executive Summary"))
    story.append(Spacer(1, 4))
    story.append(Paragraph(cover.get("executiveSummary") or "", s["body"]))
    story.append(
        Paragraph(
            cover.get("flaggingIntro")
            or "For the executive meeting, the three items worth flagging are:",
            s["flag_intro"],
        )
    )
    flags = cover.get("flagging") or []
    flag_text = " ".join(f"({i + 1}) {item}" for i, item in enumerate(flags[:3]))
    if flag_text:
        story.append(Paragraph(flag_text, s["flag_inline"]))

    story.append(PageBreak())
    num, title, desc = section_meta(payload, "workflow", 1, "Approval Workflow")
    story.append(SectionHeading(num, title, desc))
    story.append(Spacer(1, 6))
    story.append(PipelineDiagram(payload.get("stages") or []))
    story.append(Spacer(1, 8))
    if payload.get("workflowStatusLine"):
        story.append(Paragraph(payload["workflowStatusLine"], s["status_line"]))
    story.append(Paragraph("Notification & Eligibility Detail", s["notif_head"]))
    stage_rows = []
    for stage in payload.get("stages") or []:
        stage_rows.append([
            Paragraph(str(stage.get("name") or ""), s["cell"]),
            Paragraph(str(stage.get("eligible") or "—"), s["cell"]),
            Paragraph(str(stage.get("assigned") or "—"), s["cell"]),
            Paragraph(str(stage.get("notified") or "—"), s["cell"]),
            Paragraph(str(stage.get("sla") or "—"), s["cell"]),
        ])
    story.append(
        simple_table(
            ["Stage", "Eligible Approvers", "Assigned", "Notified", "SLA"],
            stage_rows,
            s,
            [CONTENT_W * w for w in (0.18, 0.34, 0.18, 0.18, 0.12)],
        )
    )

    story.append(PageBreak())
    num, title, desc = section_meta(payload, "timeline", 2, "Approval Timeline")
    story.append(SectionHeading(num, title, desc))
    story.append(Spacer(1, 6))
    story.append(TimelineGraphic(payload.get("timeline") or []))
    story.append(Spacer(1, 8))
    story.append(Paragraph(payload.get("timelineTakeaway") or "", s["body"]))

    story.append(PageBreak())
    num, title, desc = section_meta(payload, "details", 3, "Contract Details")
    story.append(SectionHeading(num, title, desc))
    story.append(Spacer(1, 6))
    story.append(FactsGrid(details.get("facts") or []))
    story.append(Spacer(1, 10))
    num, title, desc = section_meta(payload, "parties", 4, "Parties & Roles")
    story.append(SectionHeading(num, title, desc))
    story.append(Spacer(1, 6))
    party_rows = []
    for party in details.get("parties") or []:
        party_rows.append([
            Paragraph(str(party.get("name") or ""), s["cell"]),
            Paragraph(str(party.get("email") or ""), s["cell"]),
            Paragraph(str(party.get("role") or ""), s["cell"]),
            Paragraph(str(party.get("function") or ""), s["cell"]),
        ])
    story.append(
        simple_table(
            ["Name", "Email", "Role", "Function in This Approval"],
            party_rows,
            s,
            [CONTENT_W * w for w in (0.22, 0.30, 0.22, 0.26)],
        )
    )
    if details.get("sodNote"):
        story.append(Spacer(1, 8))
        sod = details["sodNote"]
        if not sod.lower().startswith("segregation"):
            sod = f"<b>Segregation-of-duties note:</b> {sod}"
        else:
            # Bold the prefix
            parts = sod.split(":", 1)
            if len(parts) == 2:
                sod = f"<b>{parts[0]}:</b>{parts[1]}"
        story.append(Paragraph(sod, s["sod"]))

    story.append(PageBreak())
    num, title, desc = section_meta(payload, "audit", 5, "Full Audit Trail")
    story.append(SectionHeading(num, title, desc))
    story.append(Spacer(1, 6))
    audit_rows = []
    for row in payload.get("audit") or []:
        result = str(row.get("result") or "Success")
        result_style = s["fail"] if result.lower() == "failed" else s["ok"]
        audit_rows.append([
            Paragraph(str(row.get("at") or ""), s["cell"]),
            Paragraph(str(row.get("actor") or ""), s["cell"]),
            Paragraph(str(row.get("action") or ""), s["cell"]),
            Paragraph(result, result_style),
            Paragraph(str(row.get("detail") or ""), s["cell"]),
        ])
    story.append(
        simple_table(
            ["Timestamp", "Actor", "Action", "Result", "Detail"],
            audit_rows,
            s,
            [CONTENT_W * w for w in (0.22, 0.16, 0.18, 0.12, 0.32)],
        )
    )
    return story


def generate(payload: dict, output: str | None) -> bytes:
    buffer_path = output or str(Path.cwd() / "_approval_report_tmp.pdf")
    doc = BaseDocTemplate(
        buffer_path,
        pagesize=letter,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=HEADER_H + 16,
        bottomMargin=FOOTER_H + 12,
        title=payload.get("reportTitle") or "Contract Approval & Audit Report",
        author=payload.get("companyName") or "CAALM",
    )
    frame = Frame(
        MARGIN,
        FOOTER_H + 12,
        CONTENT_W,
        PAGE_H - HEADER_H - FOOTER_H - 28,
        id="normal",
        showBoundary=0,
    )
    doc.addPageTemplates(
        [PageTemplate(id="main", frames=[frame], onPage=lambda c, d: draw_chrome(c, d, payload))]
    )
    doc.build(build_story(payload))
    data = Path(buffer_path).read_bytes()
    if output is None:
        Path(buffer_path).unlink(missing_ok=True)
    return data


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate the Contract Approval & Audit Report")
    parser.add_argument("--input", required=True, help="Path to JSON payload")
    parser.add_argument("--output", help="Destination PDF path (stdout if omitted)")
    args = parser.parse_args()
    payload = load_payload(args.input)
    pdf = generate(payload, args.output)
    if not args.output:
        sys.stdout.buffer.write(pdf)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
