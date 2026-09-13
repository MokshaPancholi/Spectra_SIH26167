"""
SatQuery AI — Geospatial AI Workspace Backend Server
FastAPI server connecting modern React frontend to LangGraph Agent pipeline.
"""

import os
import sys
import io
import time
import uuid
import json
import base64
import asyncio
from typing import Optional, Dict, Any, List
from pathlib import Path

# Ensure UTF-8 output on Windows consoles to prevent cp1252 charmap crashes
if sys.platform == "win32":
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from PIL import Image
import numpy as np
import torch
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ── Database & Persistence Integration ──────────────────────────────────────
import database
from database import (
    init_db,
    get_db,
    User,
    AnalysisSession,
    ChatMessage,
    StoredImage,
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    ACTIVE_DIALECT,
)

def get_current_user_id(request: Request) -> Optional[str]:
    """Extracts user ID from Bearer token if provided."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    return payload.get("sub") if payload else None

# ── Import SatQuery Agent (spectra package) ────────────────────────────────
import spectra.satquery_agent as satquery_agent
from spectra.satquery_agent import (
    run_satquery,
    is_mock_mode,
    create_synthetic_satellite_image,
    router_node,
    vqa_node,
    crossmodal_node,
    change_detect_node,
    geospatial_knowledge_node,
    evidence_grounding_node,
    synthesizer_node,
)

# ── FastAPI App Initialization ───────────────────────────────────────────────
app = FastAPI(
    title="SatQuery AI Workspace API",
    description="Conversational Multi-Modal Remote Sensing AI Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store
SESSIONS: Dict[str, Dict[str, Any]] = {}


# ── Helper Functions ────────────────────────────────────────────────────────
def pil_to_base64_data_url(img: Image.Image, format: str = "PNG") -> str:
    """Converts a PIL Image to a base64 Data URL string."""
    buffered = io.BytesIO()
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")
    img.save(buffered, format=format)
    encoded = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/{format.lower()};base64,{encoded}"


def decode_base64_image(data_uri: str) -> Image.Image:
    """Decodes a base64 Data URI string into a PIL Image."""
    if "," in data_uri:
        data_uri = data_uri.split(",", 1)[1]
    image_data = base64.b64decode(data_uri)
    return Image.open(io.BytesIO(image_data)).convert("RGB")


# Pre-generate sample preset scenes for quick 1-click exploration
CACHED_PRESETS: Dict[str, Dict[str, Any]] = {}


def init_presets():
    """Generates synthetic benchmark scenes for instant UI demonstration."""
    try:
        # Preset 1: Urban VQA
        urban_opt = create_synthetic_satellite_image(modality="optical", cls_name="Urban")
        # Preset 2: Optical-SAR CrossModal
        coastal_opt = create_synthetic_satellite_image(modality="optical", cls_name="River")
        coastal_sar = create_synthetic_satellite_image(modality="sar", cls_name="River")
        # Preset 3: Bi-temporal Change Detection
        t1_forest = create_synthetic_satellite_image(modality="optical", cls_name="Forest")
        t2_forest = create_synthetic_satellite_image(
            modality="optical", cls_name="Forest", is_t2=True, base_img=t1_forest
        )

        CACHED_PRESETS["urban_vqa"] = {
            "id": "urban_vqa",
            "title": "Urban Infrastructure & Port",
            "category": "Visual Question Answering (VQA)",
            "description": "High-resolution optical scene over urban grid, commercial blocks, and road network.",
            "recommended_query": "What type of infrastructure and building density is visible in this area?",
            "image1": pil_to_base64_data_url(urban_opt),
            "image2": None,
            "image1_label": "Sentinel-2 Optical (10m)",
            "image2_label": None,
        }

        CACHED_PRESETS["crossmodal_coastal"] = {
            "id": "crossmodal_coastal",
            "title": "Coastal Estuary (Optical + SAR)",
            "category": "Optical-SAR Cross-Modal Fusion",
            "description": "Dual-sensor acquisition with cloud-penetrating Sentinel-1 SAR backscatter and Sentinel-2 RGB.",
            "recommended_query": "Compare optical and SAR radar information to verify water-land boundaries.",
            "image1": pil_to_base64_data_url(coastal_opt),
            "image2": pil_to_base64_data_url(coastal_sar),
            "image1_label": "Optical Multispectral (RGB)",
            "image2_label": "SAR Sentinel-1 (VV/VH Polarimetry)",
        }

        CACHED_PRESETS["bitemporal_change"] = {
            "id": "bitemporal_change",
            "title": "Industrial Expansion (T1 vs T2)",
            "category": "Bi-Temporal Change Detection",
            "description": "Two temporal acquisitions monitoring vegetation clearing and ground construction.",
            "recommended_query": "What significant changes occurred between these two temporal acquisitions?",
            "image1": pil_to_base64_data_url(t1_forest),
            "image2": pil_to_base64_data_url(t2_forest),
            "image1_label": "Pre-Acquisition (T1)",
            "image2_label": "Post-Acquisition (T2)",
        }
        print("[SatQuery] [OK] Preset scenes generated successfully.")
    except Exception as e:
        print(f"[SatQuery] [WARN] Preset generation warning: {e}. Presets may be unavailable.")


# ── Request / Response Models ───────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    query: str
    image1: Optional[str] = None  # Base64 data URL
    image2: Optional[str] = None  # Base64 data URL
    image1_name: Optional[str] = None
    image2_name: Optional[str] = None
    forced_model: Optional[str] = None  # None = AUTO, or 'vqa', 'crossmodal', 'change_detect', 'geospatial_qa'
    mock: Optional[bool] = None


class SessionResetRequest(BaseModel):
    session_id: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class SessionCreateRequest(BaseModel):
    title: Optional[str] = None


# ── API Endpoints ───────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    print("[SatQuery] Starting SatQuery AI Backend...")
    try:
        init_db()
    except Exception as dbe:
        print(f"[SatQuery] [WARN] Database init warning: {dbe}")
    init_presets()


@app.get("/api/health")
def health_check():
    """Returns system status, GPU/CPU availability, loaded checkpoints, and database engine."""
    ckpts = satquery_agent.resolve_checkpoints()
    return {
        "status": "online",
        "hardware": "CUDA GPU" if torch.cuda.is_available() else "CPU (Mock Demonstration)",
        "cuda_available": torch.cuda.is_available(),
        "mock_mode": is_mock_mode(),
        "database": database.ACTIVE_DIALECT,
        "checkpoints": {k: os.path.exists(v) if v else False for k, v in ckpts.items()},
        "timestamp": time.time(),
    }


# ── Auth Endpoints ──────────────────────────────────────────────────────────
@app.post("/api/auth/register")
def register(req: RegisterRequest):
    """Registers a new user and returns a JWT token."""
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if not req.password or len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    db = next(database.get_db())
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email already exists.")

        pwd_hash, salt = hash_password(req.password)
        new_user = User(
            id=str(uuid.uuid4()),
            username=req.username.strip() or email.split("@")[0],
            email=email,
            password_hash=pwd_hash,
            salt=salt,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        token = create_access_token({"sub": new_user.id, "email": new_user.email, "username": new_user.username})
        return {
            "token": token,
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
            },
        }
    finally:
        db.close()


@app.post("/api/auth/login")
def login(req: LoginRequest):
    """Authenticates user credentials and returns a JWT token."""
    email = req.email.strip().lower()
    db = next(database.get_db())
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(req.password, user.password_hash, user.salt):
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        token = create_access_token({"sub": user.id, "email": user.email, "username": user.username})
        return {
            "token": token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
        }
    finally:
        db.close()


@app.get("/api/auth/me")
def get_me(request: Request):
    """Returns currently authenticated user profile."""
    user_id = get_current_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    db = next(database.get_db())
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        }
    finally:
        db.close()


# ── Session Management Endpoints ────────────────────────────────────────────
@app.get("/api/sessions")
def list_sessions(request: Request):
    """Lists saved analysis sessions from database."""
    user_id = get_current_user_id(request)
    db = next(database.get_db())
    try:
        query = db.query(AnalysisSession)
        if user_id:
            query = query.filter((AnalysisSession.user_id == user_id) | (AnalysisSession.user_id.is_(None)))
        sessions = query.order_by(AnalysisSession.updated_at.desc()).limit(25).all()
        return [
            {
                "id": s.id,
                "title": s.title,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
                "message_count": len(s.messages),
            }
            for s in sessions
        ]
    finally:
        db.close()


@app.post("/api/sessions")
def create_session(req: SessionCreateRequest, request: Request):
    """Creates a new analysis session stored in the database."""
    user_id = get_current_user_id(request)
    db = next(database.get_db())
    try:
        new_session = AnalysisSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=req.title or "New Analysis Session",
        )
        db.add(new_session)
        db.commit()
        return {
            "id": new_session.id,
            "title": new_session.title,
            "created_at": new_session.created_at.isoformat(),
        }
    finally:
        db.close()


@app.get("/api/sessions/{session_id}/messages")
def get_session_messages(session_id: str):
    """Retrieves full conversation history and evidence artifacts for a session."""
    db = next(database.get_db())
    try:
        session = db.query(AnalysisSession).filter(AnalysisSession.id == session_id).first()
        if not session:
            return []

        result = []
        for msg in session.messages:
            artifacts = {}
            for img in msg.images:
                if img.image_type == "evidence_artifact":
                    artifacts[img.name or "Artifact"] = img.data_uri

            result.append({
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "routingDecision": msg.routing_decision,
                "routingConfidence": msg.routing_confidence,
                "routingReason": msg.routing_reason,
                "latency": msg.latency,
                "mock": msg.mock,
                "explanation": msg.explanation,
                "evidenceArtifacts": artifacts,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            })
        return result
    finally:
        db.close()


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    """Deletes an analysis session and all attached chat/evidence records."""
    db = next(database.get_db())
    try:
        session = db.query(AnalysisSession).filter(AnalysisSession.id == session_id).first()
        if session:
            db.delete(session)
            db.commit()
        return {"deleted": True}
    finally:
        db.close()


@app.get("/api/presets")
def get_presets():
    """Returns pre-packaged benchmark scenes for instant UI exploration."""
    if not CACHED_PRESETS:
        init_presets()
    return list(CACHED_PRESETS.values())


@app.post("/api/session/new")
def new_session(req: Optional[SessionResetRequest] = None):
    """Creates a new conversation session or clears an existing one."""
    sess_id = req.session_id if req and req.session_id else str(uuid.uuid4())
    SESSIONS[sess_id] = {
        "history": [],
        "image1": None,
        "image2": None,
        "image1_name": None,
        "image2_name": None,
        "last_routing": None,
    }
    return {"session_id": sess_id, "status": "created"}


def execute_agent_with_stages(
    query: str,
    img1: Optional[Image.Image],
    img2: Optional[Image.Image],
    forced_model: Optional[str] = None,
    mock: Optional[bool] = None,
    session_history: Optional[List[Dict[str, str]]] = None,
):
    """
    Executes the LangGraph nodes step-by-step to yield progressive execution states
    corresponding to real pipeline stages.
    """
    start_time = time.time()
    effective_mock = mock if mock is not None else is_mock_mode()

    # Stage 1: Understanding query
    yield {
        "stage": "understanding_query",
        "message": "Parsing geospatial prompt, intent keywords, and image modalities...",
        "progress": 20,
    }

    initial_state = {
        "query": query,
        "image1": img1,
        "image2": img2,
        "image_count": (1 if img1 else 0) + (1 if img2 else 0),
        "raster_metadata": None,
        "routing_decision": "",
        "routing_confidence": 0.0,
        "routing_reason": "",
        "raw_answer": "",
        "explanation": "",
        "evidence_artifacts": {},
        "final_response": "",
        "latency": 0.0,
        "mock": effective_mock,
    }

    # If user selected a forced model in Advanced options
    if forced_model and forced_model != "auto":
        router_out = {
            "routing_decision": forced_model,
            "routing_confidence": 1.0,
            "routing_reason": f"Manual override: user explicitly selected {forced_model.upper()}.",
            "image_count": initial_state["image_count"],
        }
    else:
        router_out = router_node(initial_state)

    state = {**initial_state, **router_out}
    decision = state["routing_decision"]

    # Stage 2: Selecting model
    model_labels = {
        "vqa": "Visual Question Answering (Model 1 — BLIP-2 LoRA)",
        "crossmodal": "Optical-SAR Cross-Modal Fusion (Model 2 — Dual-Stream Attention)",
        "change_detect": "Bi-Temporal Change Detection (Model 3 — Siamese Difference)",
        "geospatial_qa": "Earth Observation Geospatial Knowledge (Model 4)",
    }
    yield {
        "stage": "selecting_model",
        "message": f"Routed to {model_labels.get(decision, decision)} ({state['routing_confidence']*100:.0f}% confidence)",
        "decision": decision,
        "confidence": state["routing_confidence"],
        "reason": state["routing_reason"],
        "progress": 40,
    }

    # Stage 3: Analysing imagery
    yield {
        "stage": "analysing_imagery",
        "message": f"Extracting spatial feature representations via {decision.upper()} pipeline...",
        "progress": 65,
    }

    if decision == "vqa":
        model_out = vqa_node(state)
    elif decision == "crossmodal":
        model_out = crossmodal_node(state)
    elif decision == "change_detect":
        model_out = change_detect_node(state)
    else:
        model_out = geospatial_knowledge_node(state)

    state.update(model_out)

    # Stage 4: Generating evidence
    yield {
        "stage": "generating_evidence",
        "message": "Generating visual attention heatmaps, spatial attributions, and change masks...",
        "progress": 85,
    }

    if decision != "geospatial_qa":
        evidence_out = evidence_grounding_node(state)
        state.update(evidence_out)

    # Stage 5: Preparing response
    yield {
        "stage": "preparing_response",
        "message": "Synthesizing multimodal response and grounding evidence...",
        "progress": 95,
    }

    synth_out = synthesizer_node(state)
    state.update(synth_out)
    state["latency"] = round(time.time() - start_time, 3)

    # Package clean serializable output
    serialized_artifacts = {}
    for key, val in state["evidence_artifacts"].items():
        if isinstance(val, Image.Image):
            serialized_artifacts[key] = pil_to_base64_data_url(val)
        elif isinstance(val, np.ndarray):
            if val.size <= 200:
                serialized_artifacts[key] = val.tolist()
            # Do not send massive raw float arrays over JSON
        elif isinstance(val, (int, float, str, list, dict, bool)):
            serialized_artifacts[key] = val

    result = {
        "stage": "complete",
        "query": state["query"],
        "routing_decision": state["routing_decision"],
        "routing_confidence": float(state["routing_confidence"]),
        "routing_reason": state["routing_reason"],
        "raw_answer": state["raw_answer"],
        "explanation": state["explanation"],
        "evidence_artifacts": serialized_artifacts,
        "final_response": state["final_response"],
        "latency": state["latency"],
        "mock": state["mock"],
    }
    yield result


@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """Synchronous chat endpoint returning the complete analysis payload."""
    try:
        session_id = req.session_id or str(uuid.uuid4())
        session = SESSIONS.setdefault(
            session_id,
            {"history": [], "image1": None, "image2": None, "image1_name": None, "image2_name": None},
        )

        img1 = None
        img2 = None

        if req.image1:
            img1 = decode_base64_image(req.image1)
            session["image1"] = req.image1
            session["image1_name"] = req.image1_name or "Image 1"
        elif session.get("image1"):
            img1 = decode_base64_image(session["image1"])

        if req.image2:
            img2 = decode_base64_image(req.image2)
            session["image2"] = req.image2
            session["image2_name"] = req.image2_name or "Image 2"
        elif session.get("image2"):
            img2 = decode_base64_image(session["image2"])

        final_result = None
        for step in execute_agent_with_stages(
            query=req.query,
            img1=img1,
            img2=img2,
            forced_model=req.forced_model,
            mock=req.mock,
            session_history=session["history"],
        ):
            if step.get("stage") == "complete":
                final_result = step

        if not final_result:
            raise HTTPException(status_code=500, detail="Agent pipeline did not produce a completion state.")

        session["history"].append({"user": req.query, "assistant": final_result["raw_answer"]})
        final_result["session_id"] = session_id
        return final_result

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Analysis could not be completed: {str(e)}. Please verify uploaded imagery or try rephrasing your question.",
        )


@app.post("/api/chat/stream")
async def chat_stream_endpoint(req: ChatRequest, request: Request):
    """
    SSE streaming endpoint for real-time stage progress updates followed by the final response,
    persisting messages and evidence artifacts to PostgreSQL/database.
    """
    user_id = get_current_user_id(request)

    async def event_generator():
        try:
            session_id = req.session_id or str(uuid.uuid4())
            session = SESSIONS.setdefault(
                session_id,
                {"history": [], "image1": None, "image2": None, "image1_name": None, "image2_name": None},
            )

            # Persist incoming user message & input imagery to DB
            user_msg_id = str(uuid.uuid4())
            db = next(database.get_db())
            try:
                db_session = db.query(AnalysisSession).filter(AnalysisSession.id == session_id).first()
                if not db_session:
                    db_session = AnalysisSession(
                        id=session_id,
                        user_id=user_id,
                        title=req.query[:45] + ("..." if len(req.query) > 45 else ""),
                    )
                    db.add(db_session)
                    db.commit()

                user_msg = ChatMessage(
                    id=user_msg_id,
                    session_id=session_id,
                    role="user",
                    content=req.query,
                )
                db.add(user_msg)

                if req.image1:
                    db.add(StoredImage(
                        id=str(uuid.uuid4()),
                        session_id=session_id,
                        message_id=user_msg_id,
                        image_type="input1",
                        name=req.image1_name or "Observation Image",
                        data_uri=req.image1,
                    ))
                if req.image2:
                    db.add(StoredImage(
                        id=str(uuid.uuid4()),
                        session_id=session_id,
                        message_id=user_msg_id,
                        image_type="input2",
                        name=req.image2_name or "Comparison Image",
                        data_uri=req.image2,
                    ))
                db.commit()
            except Exception as dbe:
                print(f"[DB] Error logging user message: {dbe}")
            finally:
                db.close()

            img1 = None
            img2 = None

            if req.image1:
                img1 = decode_base64_image(req.image1)
                session["image1"] = req.image1
                session["image1_name"] = req.image1_name or "Image 1"
            elif session.get("image1"):
                img1 = decode_base64_image(session["image1"])

            if req.image2:
                img2 = decode_base64_image(req.image2)
                session["image2"] = req.image2
                session["image2_name"] = req.image2_name or "Image 2"
            elif session.get("image2"):
                img2 = decode_base64_image(session["image2"])

            for step in execute_agent_with_stages(
                query=req.query,
                img1=img1,
                img2=img2,
                forced_model=req.forced_model,
                mock=req.mock,
                session_history=session["history"],
            ):
                if step.get("stage") == "complete":
                    step["session_id"] = session_id
                    session["history"].append({"user": req.query, "assistant": step["raw_answer"]})

                    # Persist assistant response & evidence artifacts to DB
                    db = next(database.get_db())
                    try:
                        asst_msg_id = str(uuid.uuid4())
                        asst_msg = ChatMessage(
                            id=asst_msg_id,
                            session_id=session_id,
                            role="assistant",
                            content=step.get("raw_answer", ""),
                            routing_decision=step.get("routing_decision"),
                            routing_confidence=step.get("routing_confidence"),
                            routing_reason=step.get("routing_reason"),
                            latency=step.get("latency"),
                            mock=step.get("mock", False),
                            explanation=step.get("explanation"),
                        )
                        db.add(asst_msg)

                        # Save artifacts
                        artifacts = step.get("evidence_artifacts") or {}
                        for a_name, a_val in artifacts.items():
                            if isinstance(a_val, str) and a_val.startswith("data:image"):
                                db.add(StoredImage(
                                    id=str(uuid.uuid4()),
                                    session_id=session_id,
                                    message_id=asst_msg_id,
                                    image_type="evidence_artifact",
                                    name=a_name,
                                    data_uri=a_val,
                                ))
                        db.commit()
                    except Exception as dbe:
                        print(f"[DB] Error logging assistant response: {dbe}")
                    finally:
                        db.close()

                data_str = json.dumps(step)
                yield f"data: {data_str}\n\n"
                await asyncio.sleep(0.06)

        except Exception as e:
            import traceback
            traceback.print_exc()
            err_data = json.dumps({
                "stage": "error",
                "message": f"Geospatial analysis paused: {str(e)}. Please check image inputs or rephrase query."
            })
            yield f"data: {err_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# Mount static build if present
static_dist = Path(__file__).parent / "frontend" / "dist"
if static_dist.exists():
    app.mount("/", StaticFiles(directory=str(static_dist), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    print("=" * 70)
    print("SATQUERY AI - GEOSPATIAL ANALYSIS WORKSPACE BACKEND")
    print("=" * 70)
    print(f"CUDA Available: {torch.cuda.is_available()}")
    print(f"Mock Mode:      {is_mock_mode()}")
    print("Starting FastAPI on http://127.0.0.1:8000 ...")
    print("=" * 70)
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
