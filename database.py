"""
SatQuery AI — Database & Persistence Layer
PostgreSQL integration with resilient SQLite fallback.
Models for Users, Sessions, Chat History, and Stored Satellite/Evidence Images.
"""

import os
import sys
import uuid
import json
import secrets
import hashlib
import datetime
from typing import Optional, Dict, Any, Generator

from dotenv import load_dotenv
import jwt
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Float,
    Boolean,
    event,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

# ── Database URL Resolution ──────────────────────────────────────────────────
# Default to PostgreSQL, with graceful fallback to SQLite
DEFAULT_PG_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/satquery_db",
)
SQLITE_FALLBACK_URL = "sqlite:///./satquery.db"

load_dotenv()

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(64), nullable=False)
    email = Column(String(128), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    salt = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sessions = relationship("AnalysisSession", back_populates="user", cascade="all, delete-orphan")


class AnalysisSession(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(256), default="Geospatial Analysis Session")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    user = relationship("User", back_populates="sessions")
    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )
    images = relationship(
        "StoredImage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="StoredImage.created_at",
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False, index=True)
    role = Column(String(32), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    routing_decision = Column(String(64), nullable=True)
    routing_confidence = Column(Float, nullable=True)
    routing_reason = Column(Text, nullable=True)
    latency = Column(Float, nullable=True)
    mock = Column(Boolean, default=False)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("AnalysisSession", back_populates="messages")
    images = relationship("StoredImage", back_populates="message")


class StoredImage(Base):
    __tablename__ = "stored_images"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False, index=True)
    message_id = Column(String(36), ForeignKey("chat_messages.id"), nullable=True, index=True)
    image_type = Column(String(64), nullable=False)  # 'input1', 'input2', 'evidence_artifact', 'map_snapshot'
    name = Column(String(128), nullable=True)
    data_uri = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)  # Store coordinates, bounding boxes, sensor data
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("AnalysisSession", back_populates="images")
    message = relationship("ChatMessage", back_populates="images")


# ── Engine Initialization & Fallback ─────────────────────────────────────────
engine = None
SessionLocal = None
ACTIVE_DIALECT = "unknown"


def init_db(database_url: Optional[str] = None):
    """Initializes the database engine and creates all required tables."""
    global engine, SessionLocal, ACTIVE_DIALECT

    target_url = database_url or DEFAULT_PG_URL
    is_postgres = target_url.startswith("postgresql")

    try:
        if is_postgres:
            # Test PostgreSQL connection with a short timeout
            test_engine = create_engine(target_url, pool_pre_ping=True, connect_args={"connect_timeout": 3})
            with test_engine.connect() as conn:
                pass
            engine = test_engine
            ACTIVE_DIALECT = "postgresql"
            print(f"[Database] [OK] Connected to PostgreSQL at {target_url.split('@')[-1]}")
        else:
            engine = create_engine(target_url, connect_args={"check_same_thread": False})
            ACTIVE_DIALECT = "sqlite"
            print(f"[Database] [OK] Using SQLite database: {target_url}")

    except Exception as pg_err:
        print(f"[Database] [ERROR] PostgreSQL connection failed: {type(pg_err).__name__}: {pg_err}")
        print(f"[Database] [WARN] Falling back to SQLite: {SQLITE_FALLBACK_URL}")
        engine = create_engine(SQLITE_FALLBACK_URL, connect_args={"check_same_thread": False})
        ACTIVE_DIALECT = "sqlite"

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    print(f"[Database] [OK] Tables initialized successfully on {ACTIVE_DIALECT.upper()}.")


def get_db() -> Generator[Session, None, None]:
    """Yields a database session."""
    if SessionLocal is None:
        init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Password & Token Security ────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "satquery-geoai-secret-key-2026-secure")
JWT_ALGORITHM = "HS256"


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Hashes password with PBKDF2 HMAC SHA-256 and unique salt."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations=100000,
    )
    return key.hex(), salt


def verify_password(password: str, password_hash: str, salt: str) -> bool:
    """Verifies a password against the stored hash and salt."""
    calc_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(calc_hash, password_hash)


def create_access_token(data: dict, expires_days: int = 7) -> str:
    """Generates a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=expires_days)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        return None
