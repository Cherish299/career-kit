from fastapi import APIRouter, Request

from app.schemas import OfferImportRequest, OfferImportResponse, OfferPreviewRequest, OfferPreviewResponse
from app.services import offer_import, offer_preview

router = APIRouter()


@router.post("/preview", response_model=OfferPreviewResponse)
async def preview_offer_jobs(payload: OfferPreviewRequest) -> OfferPreviewResponse:
    return OfferPreviewResponse(**(await offer_preview.build_offer_preview(payload)))


@router.post("/import", response_model=OfferImportResponse)
async def import_offer_jobs(payload: OfferImportRequest, request: Request) -> OfferImportResponse:
    api_base = str(request.base_url).rstrip("/")
    return OfferImportResponse(**(await offer_import.run_offer_import(payload, api_base)))
