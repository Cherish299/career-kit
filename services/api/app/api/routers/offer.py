from fastapi import APIRouter

from app.schemas import OfferPreviewRequest, OfferPreviewResponse
from app.services import offer_preview

router = APIRouter()


@router.post("/preview", response_model=OfferPreviewResponse)
async def preview_offer_jobs(payload: OfferPreviewRequest) -> OfferPreviewResponse:
    return OfferPreviewResponse(**(await offer_preview.build_offer_preview(payload)))
