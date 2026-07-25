from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import adapt, frontend_compat, options, plot_anchor, teaser, transform, voice

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


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", tags=["Health"])
def root() -> dict[str, str]:
    return {
        "service": "CultureShift AI backend",
        "docs": "/docs",
        "health": "/health",
    }
