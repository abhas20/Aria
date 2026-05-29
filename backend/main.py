from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routers import auth, chat, health_log, yoga, timer
from pydantic import field_validator

app = FastAPI(
    title="Aria API",
    description="Aria MVP — AI health companion backend",
    version="0.1.0",
)

@field_validator("CORS_ORIGINS", mode="before")
@classmethod
def parse_cors(cls, v: str | list) -> list:
    if isinstance(v, str):
        import json
        return json.loads(v)
    return v

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(health_log.router, prefix="/log", tags=["log"])
app.include_router(yoga.router, prefix="/yoga", tags=["yoga"])
app.include_router(timer.router, prefix="/timer", tags=["timer"])


@app.get("/health",tags=["meta"])
async def health_check():
    return {"status": "ok"}
