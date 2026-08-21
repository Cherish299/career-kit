from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from app.schemas.offer import OfferPreviewRequest

ROOT = Path(__file__).resolve().parents[4]
CRAWLER_DIR = ROOT / "services" / "crawler"
PREVIEW_SCRIPT = CRAWLER_DIR / "scripts" / "preview-offerqingbaoju.mjs"


def _build_env(payload: OfferPreviewRequest) -> dict[str, str]:
    env = os.environ.copy()
    env["OFFER_PREVIEW_LIMIT"] = str(payload.limit)
    env["OFFER_PAGE_LIMIT"] = str(payload.page_limit)
    env["OFFER_TOTAL_LIMIT"] = str(payload.total_limit)
    if payload.navigation_names:
        env["OFFER_NAVIGATION_NAMES"] = ",".join(payload.navigation_names)
    if payload.title_keywords:
        env["OFFER_TITLE_KEYWORDS"] = ",".join(payload.title_keywords)
    if payload.any_keywords:
        env["OFFER_JOB_KEYWORDS"] = ",".join(payload.any_keywords)
    if payload.company_keywords:
        env["OFFER_COMPANY_KEYWORDS"] = ",".join(payload.company_keywords)
    if payload.location_keywords:
        env["OFFER_LOCATION_KEYWORDS"] = ",".join(payload.location_keywords)
    if payload.graduate_years:
        env["OFFER_GRADUATE_YEARS"] = ",".join(payload.graduate_years)
    if payload.batch_keywords:
        env["OFFER_BATCH_KEYWORDS"] = ",".join(payload.batch_keywords)
    env["OFFER_REPORT_FORMAT"] = payload.report_format
    return env


async def build_offer_preview(payload: OfferPreviewRequest) -> dict:
    command = ["node", str(PREVIEW_SCRIPT)]
    completed = subprocess.run(
        command,
        cwd=str(CRAWLER_DIR),
        env=_build_env(payload),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError((completed.stderr or completed.stdout).strip() or "offer preview failed")

    output = completed.stdout.strip()
    if payload.report_format in {"md", "markdown", "csv"}:
        return {
            "source": "offerqingbaoju-info-summary",
            "limit": payload.total_limit,
            "selectors": {
                "navigationNames": payload.navigation_names,
                "titleKeywords": payload.title_keywords,
                "anyKeywords": payload.any_keywords,
                "companyKeywords": payload.company_keywords,
                "locationKeywords": payload.location_keywords,
                "graduateYears": payload.graduate_years,
                "batchKeywords": payload.batch_keywords,
                "pageLimit": payload.page_limit,
                "totalLimit": payload.total_limit,
            },
            "count": _count_report_rows(output, payload.report_format),
            "generated_at": "",
            "rows": None,
            "report_text": output,
        }

    return json.loads(output)


def _count_report_rows(text: str, report_format: str) -> int:
    if report_format == "csv":
        lines = [line for line in text.splitlines() if line.strip()]
        return max(0, len(lines) - 1)
    return text.count("\n### ") + (1 if "### " in text else 0)
