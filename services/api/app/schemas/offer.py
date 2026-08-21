from pydantic import BaseModel, Field


class OfferPreviewRequest(BaseModel):
    limit: int = Field(default=20, ge=1, le=20)
    page_limit: int = Field(default=1, ge=1, le=20)
    total_limit: int = Field(default=20, ge=1, le=400)
    navigation_names: list[str] = Field(default_factory=list)
    title_keywords: list[str] = Field(default_factory=list)
    any_keywords: list[str] = Field(default_factory=list)
    company_keywords: list[str] = Field(default_factory=list)
    location_keywords: list[str] = Field(default_factory=list)
    graduate_years: list[str] = Field(default_factory=list)
    batch_keywords: list[str] = Field(default_factory=list)
    report_format: str = Field(default="json")


class OfferImportRequest(OfferPreviewRequest):
    pass


class OfferPreviewResponse(BaseModel):
    source: str
    limit: int
    selectors: dict
    count: int
    generated_at: str
    rows: list[dict] | None = None
    report_text: str | None = None


class OfferImportResponse(BaseModel):
    source: str
    api_base: str
    limit: int
    selectors: dict
    selected: int
    written: bool
    imported: int
    failed: int | None = None
    skipped: int | None = None
    results: list[dict]
    summary: dict
