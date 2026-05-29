from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    conversation_id: uuid.UUID | None = None
    language: str = "en"


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    reply: str


class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    language: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: uuid.UUID
    title: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailResponse(BaseModel):
    id: uuid.UUID
    title: str | None
    created_at: datetime
    messages: list[MessageResponse]

    model_config = {"from_attributes": True}


class TTSRequest(BaseModel):
    text: str
    language: str = "en"