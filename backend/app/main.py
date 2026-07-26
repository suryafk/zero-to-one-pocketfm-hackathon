from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import adapt, frontend_compat, options, pdf, plot_anchor, teaser, transform, video, voice

settings = get_settings()

app = FastAPI(
    title="CultureShift AI",
    description="Multi-Axis Audio Story Adaptation Engine — base backend (PocketFM Hackathon)",
    version="1.0.0",
)

origins = ["*"] if settings.cors_allow_origins.strip() == "*" else [
    o.strip() for o in settings.cors_allow_origins.split(",") if o.strip()
]

print(f"CORS enabled for origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    print("Application startup complete.")


app.include_router(plot_anchor.router)
app.include_router(transform.router)
app.include_router(teaser.router)
app.include_router(voice.router)
app.include_router(adapt.router)
app.include_router(frontend_compat.router)
app.include_router(options.router)
app.include_router(video.router)
app.include_router(pdf.router)


# The Databricks build writes the React bundle here. Keeping API routes above
# this mount ensures /api/* remains handled by FastAPI.
frontend_dir = Path(__file__).resolve().parent / "static"
if frontend_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=frontend_dir / "assets"), name="frontend-assets")


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", tags=["Health"], response_model=None)
def root():
    index_file = frontend_dir / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)
    return {
        "service": "CultureShift AI backend",
        "docs": "/docs",
        "health": "/health",
    }
