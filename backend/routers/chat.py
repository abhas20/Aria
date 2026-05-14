from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.firebase import get_current_user
from models.conversations import Conversations
from models.messages import Message
from models.user import User
from schemas.chat import (
    ChatRequest,
    ChatResponse,
    ConversationDetailResponse,
    ConversationResponse,
    MessageResponse,
)
from services.ai import get_aria_response

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_user(firebase_uid: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "user_not_found"},
        )
    return user


async def _get_conversation(
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> Conversations:
    result = await db.execute(
        select(Conversations).where(
            Conversations.id == conversation_id,
            Conversations.user_id == user_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "conversation_not_found"},
        )
    return conversation


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/message", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    user = await _get_user(firebase_claims["uid"], db)

    # Get or create conversation
    if payload.conversation_id:
        conversation = await _get_conversation(
            payload.conversation_id, user.id, db
        )
    else:
        conversation = Conversations(user_id=user.id) 
        db.add(conversation)
        await db.flush()

    # Fetch last 10 messages for context
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    recent = list(reversed(result.scalars().all()))
    history = [{"role": m.role, "content": m.content} for m in recent]


    aria_reply = await get_aria_response(
        user_message=payload.message,
        history=history,
        health_concerns=user.health_concerns or [],
        preferred_language=payload.language or user.preferred_language,
    )

    
    db.add(Message(
        conversation_id=conversation.id, 
        role="user",
        content=payload.message,
        language=payload.language or user.preferred_language,
    ))
    db.add(Message(
        conversation_id=conversation.id, 
        role="model",
        content=aria_reply,
        language=payload.language or user.preferred_language,
    ))

    # Auto-title from first message
    if not conversation.title:       
        conversation.title = payload.message[:80]

    return ChatResponse(
        conversation_id=conversation.id,
        reply=aria_reply,
    )


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationResponse]:
    user = await _get_user(firebase_claims["uid"], db)

    result = await db.execute(
        select(Conversations)
        .where(Conversations.user_id == user.id)
        .order_by(Conversations.created_at.desc())
    )
    return [
        ConversationResponse.model_validate(c)
        for c in result.scalars().all()
    ]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetailResponse:
    user = await _get_user(firebase_claims["uid"], db)

    result = await db.execute(
        select(Conversations)
        .where(
            Conversations.id == conversation_id,
            Conversations.user_id == user.id,
        )
        .options(selectinload(Conversations.messages))
    )
    conversation = result.scalar_one_or_none() 
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "conversation_not_found"},
        )
    return ConversationDetailResponse.model_validate(conversation)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
async def get_messages(
    conversation_id: uuid.UUID,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MessageResponse]:
    user = await _get_user(firebase_claims["uid"], db)
    await _get_conversation(conversation_id, user.id, db)

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    return [MessageResponse.model_validate(m) for m in result.scalars().all()]


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_conversation(
    conversation_id: uuid.UUID,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    user = await _get_user(firebase_claims["uid"], db)
    conversation = await _get_conversation(conversation_id, user.id, db) 
    await db.delete(conversation)