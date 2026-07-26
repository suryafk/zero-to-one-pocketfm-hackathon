"""
Pydantic models shared across routers.

These map directly onto the feature contracts in the BRD:
  - PlotInvariants        -> Feature 1 output
  - TransformResponse     -> Feature 2 & 3 output
  - Teaser / TeaserResponse -> Feature 5 output
  - VoiceRequest/Response -> Feature 4 (stubbed TTS layer)
  - AdaptRequest/Response -> full pipeline (Entertainment CEO Agent orchestration)
"""
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Genre(str, Enum):
    horror = "Horror"
    comedy = "Comedy"
    thriller = "Thriller"
    romance = "Romance"
    sci_fi = "Sci-Fi"
    drama = "Drama"


class Region(str, Enum):
    rural_bhojpuri = "Rural Bhojpuri"
    texas_country = "Texas Country"
    south_london_grime = "South London Grime"
    street_lagos_pidgin = "Street Lagos Pidgin"
    mumbai_tapri = "Mumbai Tapri"
    seoul_underground = "Seoul Underground"
    rio_favela = "Rio Favela"
    delhi = "Delhi NCR"
    punjab = "Punjab"
    gujarat = "Gujarat"
    rajasthan = "Rajasthan"
    west_bengal = "West Bengal"
    odisha = "Odisha"
    assam = "Assam"
    tamil_nadu = "Tamil Nadu"
    andhra_telangana = "Andhra Pradesh / Telangana"
    karnataka = "Karnataka"
    kerala = "Kerala"
    jammu_kashmir = "Jammu & Kashmir"


REGION_LANGUAGES: dict[Region, tuple[str, ...]] = {
    Region.rural_bhojpuri: ("Hindi", "English"),
    Region.mumbai_tapri: ("Marathi", "Hindi", "English"),
    Region.texas_country: ("English", "French", "Spanish", "Italian"),
    Region.south_london_grime: ("English", "French", "Spanish", "Italian"),
    Region.street_lagos_pidgin: ("Yoruba", "English", "French", "Spanish", "Italian"),
    Region.seoul_underground: ("Korean", "English", "French", "Spanish", "Italian"),
    Region.rio_favela: ("Portuguese", "English", "French", "Spanish", "Italian"),
    Region.delhi: ("Hindi", "Urdu", "English"),
    Region.punjab: ("Punjabi", "Hindi", "English"),
    Region.gujarat: ("Gujarati", "Hindi", "English"),
    Region.rajasthan: ("Hindi", "English"),
    Region.west_bengal: ("Bengali", "English"),
    Region.odisha: ("Odia", "English"),
    Region.assam: ("Assamese", "Hindi", "English"),
    Region.tamil_nadu: ("Tamil", "English"),
    Region.andhra_telangana: ("Telugu", "English"),
    Region.karnataka: ("Kannada", "English"),
    Region.kerala: ("Malayalam", "English"),
    Region.jammu_kashmir: ("Urdu", "Hindi", "English"),
}


def language_supported_for_region(region: Region, language: str) -> bool:
    return language in REGION_LANGUAGES[region]


# ---------- Feature 1: Core Plot Anchor ----------

class PlotInvariants(BaseModel):
    inciting_incident: str
    key_plot_beats: str
    character_motivations: str
    climax: str
    narrative_resolution: str


class PlotAnchorRequest(BaseModel):
    story_text: str = Field(..., min_length=20, description="Raw base story text or transcript")


class PlotAnchorResponse(BaseModel):
    invariants: PlotInvariants


# ---------- Feature 2 & 3: Multi-Axis Transformation + Idiom Mapper ----------

class TransformRequest(BaseModel):
    story_text: str = Field(..., min_length=20)
    genre: Genre
    region: Region
    invariants: Optional[PlotInvariants] = Field(
        default=None,
        description="If omitted, the server will extract invariants first (Feature 1) before transforming.",
    )


class TransformResponse(BaseModel):
    invariants: PlotInvariants
    genre: Genre
    region: Region
    transformed_script: str


# ---------- Feature 5: Dynamic Suspense Teaser ----------

class Teaser(BaseModel):
    hook: str
    plot_glimpse: str
    rising_tension: str
    cliffhanger: str


class TeaserRequest(BaseModel):
    transformed_script: str = Field(..., min_length=20)
    genre: Genre
    region: Region
    target_language: str = "English"


class TeaserResponse(BaseModel):
    teaser: Teaser


# ---------- Feature 4: Regional Voice & Accent Synthesizer ----------

class VoiceRequest(BaseModel):
    text: str = Field(..., min_length=1)
    region: Region
    voice_id: Optional[str] = Field(default=None, description="Override the default voice mapped to this region")


class VoiceResponse(BaseModel):
    provider: str
    region: Region
    voice_id: str
    audio_format: str
    audio_base64: Optional[str] = None
    audio_url: Optional[str] = None
    note: Optional[str] = None


class VoiceStyle(BaseModel):
    """Narration controls supplied with an adaptation request."""
    accent: str
    emotional_range: str
    intonation: str
    impressions: str
    speed_of_speech: str
    tone: str
    whispering: str


# ---------- Full pipeline (Entertainment CEO Agent) ----------

class AdaptRequest(BaseModel):
    story_text: str = Field(..., min_length=20)
    genre: Genre
    region: Region
    synthesize_voice: bool = False


class AdaptResponse(BaseModel):
    invariants: PlotInvariants
    genre: Genre
    region: Region
    transformed_script: str
    teaser: Teaser
    voice: Optional[VoiceResponse] = None
    teaser_voice: Optional[VoiceResponse] = None
    source_transcript: Optional[str] = None
    voice_style: Optional[VoiceStyle] = None