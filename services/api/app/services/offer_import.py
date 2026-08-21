from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from app.schemas.offer import OfferImportRequest

ROOT = Path(__file__).resolve().parents[4]
CRAWLER_DIR = ROOT / "services" / "crawler"
IMPORT_SCRIPT = CRAWLER_DIR / "scripts" / "import-offerqingbaoju.mjs"


def _build_env(payload: OfferImportRequest, api_base: str) -> dict[str, str]:
    env = os.environ.copy()
    env["OFFER_IMPORT_LIMIT"] = str(payload.limit)
    env["OFFER_PAGE_LIMIT"] = str(payload.page_limit)
    env["OFFER_TOTAL_LIMIT"] = str(payload.total_limit)
    env["CAREER_API_BASE"] = api_base
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
    return env


async def run_offer_import(payload: OfferImportRequest, api_base: str) -> dict:
    command = ["node", str(IMPORT_SCRIPT), "--write"]
    completed = subprocess.run(
        command,
        cwd=str(CRAWLER_DIR),
        env=_build_env(payload, api_base),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if completed.returncode != 0 and not completed.stdout.strip():
        raise RuntimeError((completed.stderr or completed.stdout).strip() or "offer import failed")
    return json.loads(completed.stdout.strip())
