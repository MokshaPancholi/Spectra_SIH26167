"""
SatQuery AI — LangGraph Agentic Orchestration Layer
Team Spectra | Smart India Hackathon 2026

Technologies: Python, PyTorch, LangGraph, Transformers, Rasterio

This module provides the core state machine for routing and executing
specialized Remote Sensing models:
- Model 1: Single-Image Remote Sensing VQA
- Model 2: Optical + SAR Cross-Modal Fusion
- Model 3: Multi-Temporal Change Detection
- Model 4: Evidence Grounding Layer (ViT Attention Hooks, Bounding Boxes)
"""

import os
import json
import random
import gc
import time
import io
import contextlib
import warnings
from datetime import datetime
from typing import TypedDict, Optional, List, Dict, Any, Tuple
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageDraw, ImageFilter
import cv2
import matplotlib.pyplot as plt
try:
    import rasterio
    from rasterio.enums import Resampling
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False
try:
    from langgraph.graph import StateGraph, END
    HAS_LANGGRAPH = True
except ImportError:
    HAS_LANGGRAPH = False

from transformers import (
    Blip2Processor, Blip2ForConditionalGeneration, BitsAndBytesConfig
)
from peft import PeftModel

warnings.filterwarnings("ignore")
def resolve_checkpoints() -> Dict[str, str]:
    """
    Dynamically resolves paths to model adapter checkpoints.
    Searches in:
      1. SATQUERY_ROOT / SATQUERY_CHECKPOINTS env var
      2. Local workspace directories relative to this script:
         - Model1_VQA/model
         - Model2_CrossModal/checkpoints
         - Model3_ChangeDetect/checkpoints
      3. Google Colab Drive paths as fallback
    """
    script_dir = Path(__file__).resolve().parent
    env_root = os.environ.get("SATQUERY_ROOT")
    base_dir = Path(env_root).resolve() if env_root and os.path.isdir(env_root) else script_dir

    candidates = {
        "model1_checkpoint": [
            base_dir / "Model1_VQA" / "model",
            base_dir / "Model1_VQA" / "checkpoints",
            Path("/content/drive/MyDrive/SatQuery_AI/Model1_VQA/model"),
        ],
        "model2_checkpoint": [
            base_dir / "Model2_CrossModal" / "checkpoints",
            base_dir / "Model2_CrossModal" / "model",
            Path("/content/drive/MyDrive/SatQuery_AI/Model2_CrossModal/checkpoints"),
        ],
        "model3_checkpoint": [
            base_dir / "Model3_ChangeDetect" / "checkpoints",
            base_dir / "Model3_ChangeDetect" / "model",
            Path("/content/drive/MyDrive/SatQuery_AI/Model3_ChangeDetect/checkpoints"),
        ],
    }

    resolved = {}
    for key, path_list in candidates.items():
        chosen = None
        for p in path_list:
            if p.exists():
                chosen = str(p)
                break
        resolved[key] = chosen if chosen else str(path_list[-1])

    return resolved

RESOLVED_CKPTS = resolve_checkpoints()
DEFAULT_CONFIG = {
    "model_name": "Salesforce/blip2-opt-2.7b",
    "image_size": 224,
    "max_length": 256,
    "model1_checkpoint": RESOLVED_CKPTS["model1_checkpoint"],
    "model2_checkpoint": RESOLVED_CKPTS["model2_checkpoint"],
    "model3_checkpoint": RESOLVED_CKPTS["model3_checkpoint"],
    "drive_output": os.environ.get("SATQUERY_OUTPUT", str(Path(__file__).resolve().parent / "outputs")),
    "mock_mode": False,
}

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def is_mock_mode(state: Optional[Dict[str, Any]] = None) -> bool:
    """
    Determines if execution should run in Mock/CPU Demonstration Mode.
    Enabled if:
    - State has explicit 'mock': True
    - DEFAULT_CONFIG['mock_mode'] is True
    - SATQUERY_MOCK environment variable is '1' or 'true'
    - CUDA is unavailable (graceful fallback)
    """
    if state and state.get("mock") is not None:
        return bool(state["mock"])
    if os.environ.get("SATQUERY_MOCK", "").lower() in ("1", "true", "yes"):
        return True
    if DEFAULT_CONFIG.get("mock_mode", False):
        return True
    if not torch.cuda.is_available():
        return True
    return False

@contextlib.contextmanager
def get_autocast_context():
    """Safe autocast manager supporting CUDA, CPU, or no-op."""
    if torch.cuda.is_available():
        with torch.cuda.amp.autocast():
            yield
    else:
        yield
def extract_raster_metadata(image_input: Any) -> Optional[Dict[str, Any]]:
    """
    Extracts Coordinate Reference System (CRS), spatial bounds, resolution,
    and band count from a GeoTIFF or satellite raster using Rasterio.
    """
    if not HAS_RASTERIO:
        return None

    if isinstance(image_input, (str, Path)) and os.path.exists(str(image_input)):
        try:
            with rasterio.open(str(image_input)) as src:
                bounds = src.bounds
                return {
                    "is_geotiff": True,
                    "crs": str(src.crs),
                    "driver": src.driver,
                    "width": src.width,
                    "height": src.height,
                    "count": src.count,
                    "bounds": {
                        "left": bounds.left,
                        "bottom": bounds.bottom,
                        "right": bounds.right,
                        "top": bounds.top,
                    },
                    "transform": [round(float(v), 6) for v in src.transform[:6]],
                }
        except Exception:
            pass
    return None


def _normalize_raster_array(arr: np.ndarray) -> np.ndarray:
    """Normalizes any raster bit-depth (uint8, uint16, float) to standard 8-bit uint8."""
    if arr.dtype == np.uint8:
        return arr

    arr = np.nan_to_num(arr, nan=0.0, posinf=0.0, neginf=0.0)

    if np.issubdtype(arr.dtype, np.floating) and arr.max() <= 1.0 and arr.min() >= 0.0:
        return np.clip(arr * 255.0, 0, 255).astype(np.uint8)
    p2, p98 = np.percentile(arr, (2, 98))
    if p98 > p2:
        stretched = np.clip((arr - p2) / (p98 - p2) * 255.0, 0, 255)
        return stretched.astype(np.uint8)
    elif arr.max() > 0:
        return ((arr / arr.max()) * 255.0).astype(np.uint8)
    return np.zeros_like(arr, dtype=np.uint8)


def read_geospatial_image(image_input: Any) -> Image.Image:
    """
    Reads any image input: .tiff, .tif, GeoTIFF, .png, .jpg, .jpeg, .bmp, .webp,
    or in-memory PIL Image. Uses rasterio for multi-band/geospatial rasters with
    automatic bit-depth normalization (uint16/float -> uint8).
    """
    if isinstance(image_input, Image.Image):
        return image_input.copy()

    path_str = str(image_input) if image_input is not None else ""
    if path_str and os.path.exists(path_str):
        if HAS_RASTERIO:
            try:
                with rasterio.open(path_str) as src:
                    if src.count >= 3:
                        arr = src.read([1, 2, 3])
                        arr = np.transpose(arr, (1, 2, 0))
                        arr = _normalize_raster_array(arr)
                        return Image.fromarray(arr)
                    elif src.count == 1:
                        arr = src.read(1)
                        arr = _normalize_raster_array(arr)
                        return Image.fromarray(arr, mode="L")
            except Exception:
                pass
        try:
            with Image.open(path_str) as img:
                if img.mode in ("I;16", "I", "F"):
                    arr = np.array(img)
                    arr = _normalize_raster_array(arr)
                    return Image.fromarray(arr)
                return img.convert("RGB")
        except Exception:
            pass

    return safe_load_image(image_input)
def create_synthetic_satellite_image(modality="optical", cls_name="Forest",
                                     is_t2=False, base_img=None) -> Image.Image:
    """Generates realistic 224x224 satellite imagery for testing."""
    size = (DEFAULT_CONFIG["image_size"], DEFAULT_CONFIG["image_size"])

    if is_t2:
        if base_img is None:
            base_img = create_synthetic_satellite_image(modality="optical", cls_name=cls_name)
        arr = np.array(base_img.convert("RGB")).copy()
        h, w = arr.shape[:2]
        x1, y1 = int(w * 0.25), int(h * 0.25)
        x2, y2 = int(w * 0.75), int(h * 0.75)
        arr[y1:y2, x1:x2] = np.random.randint(140, 185, (y2 - y1, x2 - x1, 3))
        mid_y = y1 + (y2 - y1) // 2
        mid_x = x1 + (x2 - x1) // 2
        arr[mid_y - 3 : mid_y + 3, x1:x2] = [50, 50, 50]
        arr[y1:y2, mid_x - 3 : mid_x + 3] = [50, 50, 50]
        return Image.fromarray(arr)

    if modality.lower() == "sar":
        base = np.random.normal(110, 25, size)
        speckle = np.random.gamma(shape=4, scale=0.25, size=size)
        sar = np.clip(base * speckle, 0, 255).astype(np.uint8)
        cls_lower = cls_name.lower()
        if any(w in cls_lower for w in ["river", "water", "sea", "lake"]):
            sar[70:150, :] = (sar[70:150, :] * 0.2).astype(np.uint8)
        elif any(w in cls_lower for w in ["highway", "road", "industrial", "urban"]):
            sar[95:125, :] = np.clip(sar[95:125, :] * 1.7, 0, 255).astype(np.uint8)
        return Image.fromarray(sar, mode="L")
    else:
        cls_lower = cls_name.lower()
        arr = np.zeros((size[0], size[1], 3), dtype=np.uint8)
        if any(w in cls_lower for w in ["forest", "tree", "wood"]):
            arr[:, :, 0] = np.random.randint(25, 55, size)
            arr[:, :, 1] = np.random.randint(100, 160, size)
            arr[:, :, 2] = np.random.randint(25, 55, size)
        elif any(w in cls_lower for w in ["crop", "agriculture", "pasture"]):
            arr[:, :, 0] = np.random.randint(110, 160, size)
            arr[:, :, 1] = np.random.randint(130, 175, size)
            arr[:, :, 2] = np.random.randint(40, 75, size)
        elif any(w in cls_lower for w in ["river", "water", "sea"]):
            arr[:, :, 0] = np.random.randint(15, 35, size)
            arr[:, :, 1] = np.random.randint(45, 85, size)
            arr[:, :, 2] = np.random.randint(110, 180, size)
        else:
            arr[:, :, 0] = np.random.randint(120, 150, size)
            arr[:, :, 1] = np.random.randint(120, 150, size)
            arr[:, :, 2] = np.random.randint(120, 150, size)
            arr[100:124, :] = [60, 60, 60]

        return Image.fromarray(arr).filter(ImageFilter.GaussianBlur(radius=0.8))


def safe_load_image(path_or_image: Any, modality="optical", cls_name="Forest",
                    is_t2=False, base_img=None) -> Image.Image:
    """Loads image safely or synthesizes sample if file is missing."""
    if isinstance(path_or_image, Image.Image):
        return path_or_image.copy()

    path_str = str(path_or_image) if path_or_image is not None else ""
    if path_str and os.path.exists(path_str):
        try:
            return Image.open(path_str)
        except Exception:
            pass

    is_sar = (modality.lower() == "sar") or ("sar" in path_str.lower())
    effective_modality = "sar" if is_sar else "optical"
    img = create_synthetic_satellite_image(
        modality=effective_modality,
        cls_name=cls_name,
        is_t2=is_t2,
        base_img=base_img
    )

    if path_str:
        try:
            os.makedirs(os.path.dirname(os.path.abspath(path_str)), exist_ok=True)
            img.save(path_str)
        except Exception:
            pass

    return img
class DualStreamBLIP2(nn.Module):
    """Dual-stream BLIP-2 wrapper for Model 2 and Model 3."""
    def __init__(self, blip2_model):
        super().__init__()
        self.model = blip2_model

    def _extract_qformer_tokens(self, pixel_values):
        _m = self.model
        while hasattr(_m, "model"):
            _m = _m.model

        vit_out = _m.vision_model(pixel_values=pixel_values, return_dict=True)
        img_embeds = vit_out.last_hidden_state
        img_atts = torch.ones(img_embeds.size()[:-1], dtype=torch.long, device=img_embeds.device)

        query_tokens = _m.query_tokens.expand(img_embeds.shape[0], -1, -1)
        qformer_out = _m.qformer(
            query_embeds=query_tokens,
            encoder_hidden_states=img_embeds,
            encoder_attention_mask=img_atts,
            return_dict=True,
        )
        query_output = qformer_out.last_hidden_state
        lang_tokens = _m.language_projection(query_output)
        return lang_tokens, query_output, img_embeds

    def generate_with_evidence(self, stream1_pixel_values, stream2_pixel_values,
                               input_ids, attention_mask=None, max_new_tokens=128,
                               num_beams=3, repetition_penalty=1.2, **kwargs):
        _m = self.model
        while hasattr(_m, "model"):
            _m = _m.model

        s1_lang, s1_query, s1_vit = self._extract_qformer_tokens(stream1_pixel_values)
        s2_lang, s2_query, s2_vit = self._extract_qformer_tokens(stream2_pixel_values)

        combined_img_tokens = torch.cat([s1_lang, s2_lang], dim=1)
        combined_atts = torch.ones(combined_img_tokens.size()[:-1], dtype=torch.long, device=combined_img_tokens.device)

        text_embeds = _m.language_model.get_input_embeddings()(input_ids)
        combined_embeds = torch.cat([combined_img_tokens, text_embeds], dim=1)

        if attention_mask is not None:
            full_atts = torch.cat([combined_atts, attention_mask], dim=1)
        else:
            full_atts = None

        gen_out = _m.language_model.generate(
            inputs_embeds=combined_embeds,
            attention_mask=full_atts,
            max_new_tokens=max_new_tokens,
            num_beams=num_beams,
            repetition_penalty=repetition_penalty,
            do_sample=False,
            **kwargs,
        )
        return gen_out, s1_query, s2_query, s1_vit, s2_vit


_runtime = {
    "model": None,
    "model_type": None,
    "processor": None,
}

def unload_model():
    """Frees GPU memory."""
    if _runtime["model"] is not None:
        del _runtime["model"]
        _runtime["model"] = None
        _runtime["model_type"] = None
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

def get_processor():
    """Loads and caches shared BLIP-2 processor."""
    if is_mock_mode():
        return None
    if _runtime["processor"] is None:
        _runtime["processor"] = Blip2Processor.from_pretrained(DEFAULT_CONFIG["model_name"])
    return _runtime["processor"]

def load_model(model_type: str):
    """Loads model with LoRA adapter weights dynamically."""
    if is_mock_mode():
        return None

    if _runtime["model_type"] == model_type and _runtime["model"] is not None:
        return _runtime["model"]

    unload_model()
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    base = Blip2ForConditionalGeneration.from_pretrained(
        DEFAULT_CONFIG["model_name"],
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.float16,
    )

    ckpt_map = {
        "vqa": DEFAULT_CONFIG["model1_checkpoint"],
        "crossmodal": DEFAULT_CONFIG["model2_checkpoint"],
        "change_detect": DEFAULT_CONFIG["model3_checkpoint"],
    }
    ckpt_path = ckpt_map[model_type]
    model = PeftModel.from_pretrained(base, ckpt_path)

    if model_type in ("crossmodal", "change_detect"):
        model = DualStreamBLIP2(model)

    model.eval()
    _runtime["model"] = model
    _runtime["model_type"] = model_type
    return model
def extract_vit_attention(vit_hidden_states, target_size=224):
    """Extracts spatial activation map from ViT encoder tokens."""
    token_norms = torch.norm(vit_hidden_states[:, 1:, :].float(), dim=-1)
    B, N = token_norms.shape
    grid_size = int(np.sqrt(N))
    spatial = token_norms.view(B, 1, grid_size, grid_size)
    upsampled = F.interpolate(spatial, size=(target_size, target_size),
                              mode="bicubic", align_corners=False)
    maps = []
    for b in range(B):
        m = upsampled[b, 0].cpu().numpy()
        m_norm = (m - m.min()) / (m.max() - m.min() + 1e-8)
        maps.append(m_norm)
    return np.array(maps)

def create_heatmap_overlay(pil_image, attention_map, alpha=0.5, colormap="turbo"):
    """Overlays attention heatmap on satellite image."""
    img_arr = np.array(pil_image.convert("RGB"))
    h, w = img_arr.shape[:2]
    if attention_map.shape != (h, w):
        attention_map = cv2.resize(attention_map, (w, h))

    cmap = plt.get_cmap(colormap)
    heat_rgba = cmap(attention_map)
    heat_rgb = (heat_rgba[:, :, :3] * 255).astype(np.uint8)
    blended = (alpha * heat_rgb + (1.0 - alpha) * img_arr).astype(np.uint8)
    return Image.fromarray(blended)

def compute_change_mask_and_boxes(t1_img, t2_img, min_area_pct=1.0):
    """Computes radiometric difference mask and bounding boxes."""
    t1 = np.array(t1_img.convert("RGB")).astype(np.float32) / 255.0
    t2 = np.array(t2_img.convert("RGB")).astype(np.float32) / 255.0
    h, w = min(t1.shape[0], t2.shape[0]), min(t1.shape[1], t2.shape[1])
    t1, t2 = t1[:h, :w], t2[:h, :w]

    diff_gray = np.mean(np.abs(t2 - t1), axis=2)
    diff_blur = cv2.GaussianBlur((diff_gray * 255).astype(np.uint8), (5, 5), 2.0)
    _, binary = cv2.threshold(diff_blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    total_area = h * w
    min_area = total_area * (min_area_pct / 100.0)
    sig_contours = [c for c in contours if cv2.contourArea(c) > min_area]

    boxes = []
    overlay = np.array(t2_img.convert("RGB")).copy()[:h, :w]
    cv2.drawContours(overlay, sig_contours, -1, (255, 60, 60), 2)

    for i, cnt in enumerate(sig_contours):
        x, y, bw, bh = cv2.boundingRect(cnt)
        pct = round(cv2.contourArea(cnt) / total_area * 100, 2)
        boxes.append({"x1": x, "y1": y, "x2": x + bw, "y2": y + bh, "area_pct": pct})
        cv2.rectangle(overlay, (x, y), (x + bw, y + bh), (50, 255, 50), 2)
        cv2.putText(overlay, f"R{i+1}: {pct}%", (x, max(y - 5, 15)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (50, 255, 50), 1)

    change_pct = float((binary > 0).sum() / total_area * 100)
    return Image.fromarray(binary), Image.fromarray(overlay), boxes, change_pct


def generate_synthetic_attention_map(image: Image.Image, target_size: int = 224) -> np.ndarray:
    """
    Generates a realistic ViT spatial attention activation map based on image saliency.
    Uses edge and luminance contrast to place attention focus on actual scene features.
    """
    gray = np.array(image.convert("L").resize((target_size, target_size)), dtype=np.float32)
    grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    grad_mag = np.sqrt(grad_x**2 + grad_y**2)
    blurred = cv2.GaussianBlur(grad_mag, (21, 21), 5.0)

    y, x = np.ogrid[:target_size, :target_size]
    cy, cx = target_size / 2, target_size / 2
    center_prior = np.exp(-((x - cx)**2 + (y - cy)**2) / (2 * (target_size / 3)**2))

    attn = blurred * 0.7 + center_prior * (blurred.max() * 0.3 + 1e-5)
    attn_norm = (attn - attn.min()) / (attn.max() - attn.min() + 1e-8)
    return attn_norm.astype(np.float32)


def mock_vqa_inference(img: Image.Image, query: str) -> Tuple[str, str, np.ndarray, Image.Image]:
    """Generates realistic VQA response and spatial attention overlay in CPU/Mock mode."""
    q_lower = query.lower()
    attn_map = generate_synthetic_attention_map(img, DEFAULT_CONFIG["image_size"])
    overlay = create_heatmap_overlay(img, attn_map, alpha=0.5, colormap="turbo")

    arr = np.array(img.resize((64, 64)))
    mean_rgb = arr.mean(axis=(0, 1))
    is_green = (mean_rgb[1] > mean_rgb[0] * 1.08) and (mean_rgb[1] > mean_rgb[2] * 1.08)
    is_blue = (mean_rgb[2] > mean_rgb[0] * 1.08) and (mean_rgb[2] > mean_rgb[1] * 1.02)

    if any(w in q_lower for w in ["how many", "count", "number of"]):
        if any(w in q_lower for w in ["plane", "aircraft"]):
            ans = "There are 3 aircraft parked on the apron."
        elif any(w in q_lower for w in ["ship", "vessel", "boat"]):
            ans = "There are 2 maritime vessels docked along the pier."
        elif any(w in q_lower for w in ["building", "structure", "house"]):
            ans = "Approximately 6 distinct structures are visible in the designated quadrant."
        else:
            ans = "4 key objects matching the query are identified across the scene."
    elif any(w in q_lower for w in ["what type", "what kind", "classify", "land cover", "what is"]):
        if is_green or "forest" in q_lower or "vegetation" in q_lower:
            ans = "Dense canopy forest and mixed agricultural vegetation."
        elif is_blue or "water" in q_lower or "river" in q_lower:
            ans = "Open surface water body with surrounding riparian embankment."
        elif "airport" in q_lower or "runway" in q_lower:
            ans = "Aviation airfield with concrete runway strip and taxiways."
        else:
            ans = "Mixed urban and semi-industrial developed terrain."
    elif any(w in q_lower for w in ["is there", "are there", "presence", "does"]):
        ans = "Yes, targeted features are confirmed in the central observation field."
    else:
        ans = "The scene exhibits developed infrastructure bordered by natural terrain features."

    explanation = "Model 1 VQA (Mock/CPU Engine) generated scene answer with synthesized ViT spatial attention grounding."
    return ans, explanation, attn_map, overlay


def mock_crossmodal_inference(opt_img: Image.Image, sar_img: Image.Image, query: str) -> Tuple[str, str, Image.Image, Image.Image, float, float]:
    """Generates cross-modal sensor attribution and dual attention overlays."""
    opt_arr = np.array(opt_img.convert("L"), dtype=np.float32)
    sar_arr = np.array(sar_img.convert("L"), dtype=np.float32)

    opt_energy = float(np.var(opt_arr) + 1e-5)
    sar_energy = float(np.var(sar_arr) + 1e-5)
    tot = opt_energy + sar_energy
    raw_opt_pct = round(opt_energy / tot * 100, 1)

    opt_pct = max(35.0, min(65.0, raw_opt_pct))
    sar_pct = round(100.0 - opt_pct, 1)

    opt_attn = generate_synthetic_attention_map(opt_img, DEFAULT_CONFIG["image_size"])
    sar_attn = generate_synthetic_attention_map(sar_img, DEFAULT_CONFIG["image_size"])

    opt_overlay = create_heatmap_overlay(opt_img, opt_attn, alpha=0.5, colormap="turbo")
    sar_overlay = create_heatmap_overlay(sar_img, sar_attn, alpha=0.5, colormap="inferno")

    ans = f"Cross-modal fusion confirmed: Optical spectrum highlights spectral reflectance ({opt_pct}%), while SAR radar backscatter ({sar_pct}%) verifies structural geometry and surface roughness through atmospheric interference."
    explanation = f"Cross-modal sensor attribution: {opt_pct}% Optical vs {sar_pct}% SAR."
    return ans, explanation, opt_overlay, sar_overlay, opt_pct, sar_pct


def mock_change_detect_inference(t1_img: Image.Image, t2_img: Image.Image, query: str) -> Tuple[str, str, Image.Image, Image.Image, float, List[Dict[str, Any]]]:
    """Runs actual radiometric change analysis and bounding box extraction."""
    mask_img, overlay_img, boxes, change_pct = compute_change_mask_and_boxes(t1_img, t2_img)

    if change_pct > 1.0:
        ans = f"Multi-temporal change verified: {change_pct:.1f}% surface alteration detected across {len(boxes)} key bounding area(s), indicating localized structural or land-use disturbance."
    else:
        ans = f"Minimal radiometric change detected ({change_pct:.1f}%). The landscape maintains high temporal stability between acquisition dates."

    explanation = f"Radiometric change detected: {change_pct:.1f}% across {len(boxes)} bounding region(s)."
    return ans, explanation, mask_img, overlay_img, change_pct, boxes
class SatQueryState(TypedDict):
    """LangGraph State Dictionary tracking execution across graph nodes."""
    query: str
    image1: Optional[Any]
    image2: Optional[Any]
    image_count: int
    raster_metadata: Optional[Dict[str, Any]]
    routing_decision: str
    routing_confidence: float
    routing_reason: str
    raw_answer: str
    explanation: str
    evidence_artifacts: Dict[str, Any]
    final_response: str
    latency: float
    mock: Optional[bool]
def router_node(state: SatQueryState) -> Dict[str, Any]:
    """
    Node 1: Intent & Modality Classifier.
    Determines which model or tool should be dispatched.
    """
    has_img1 = state.get("image1") is not None
    has_img2 = state.get("image2") is not None
    img_count = int(has_img1) + int(has_img2)
    q = state.get("query", "").lower()

    change_keywords = [
        "change", "difference", "before", "after", "temporal", "between",
        "urbanization", "deforestation", "flood", "destroyed", "built", "transition"
    ]
    crossmodal_keywords = [
        "sar", "radar", "optical", "modality", "sensor", "penetrate", "penetration",
        "cloud", "all-weather", "day/night", "scatter", "complementary", "fusion"
    ]
    meta = None
    if has_img1:
        meta = extract_raster_metadata(state["image1"])
    if not meta and has_img2:
        meta = extract_raster_metadata(state["image2"])

    if img_count == 0:
        decision = "geospatial_qa"
        confidence = 0.99
        reason = "No satellite imagery provided. Dispatched to Geospatial Knowledge Base."
    elif img_count == 1:
        decision = "vqa"
        confidence = 0.96
        reason = "Single satellite observation provided. Routed to Model 1 (Remote Sensing VQA)."
    else:
        is_chg = any(k in q for k in change_keywords)
        is_cm = any(k in q for k in crossmodal_keywords)
        if is_chg and not is_cm:
            decision = "change_detect"
            confidence = 0.95
            reason = "Dual imagery with temporal change query. Routed to Model 3 (Change Detection)."
        elif is_cm and not is_chg:
            decision = "crossmodal"
            confidence = 0.95
            reason = "Dual imagery with cross-sensor query. Routed to Model 2 (Optical+SAR Fusion)."
        else:
            decision = "change_detect"
            confidence = 0.85
            reason = "Dual satellite imagery provided. Defaulted to bi-temporal change detection."

    return {
        "image_count": img_count,
        "raster_metadata": meta,
        "routing_decision": decision,
        "routing_confidence": confidence,
        "routing_reason": reason,
    }


def vqa_node(state: SatQueryState) -> Dict[str, Any]:
    """
    Node 2A: Single-Image Remote Sensing VQA (Model 1).
    """
    img = read_geospatial_image(state["image1"]).convert("RGB")
    query = state.get("query", "")

    if is_mock_mode(state):
        answer, expl, attn_map, overlay = mock_vqa_inference(img, query)
        return {
            "raw_answer": answer,
            "explanation": expl,
            "evidence_artifacts": {
                "Original Image": img,
                "Attention Heatmap": overlay,
                "attention_map_raw": attn_map,
            }
        }

    model = load_model("vqa")
    processor = get_processor()
    prompt = f"Question: {query} Answer:"
    enc = processor(images=img, text=prompt, return_tensors="pt",
                    padding="max_length", max_length=DEFAULT_CONFIG["max_length"],
                    truncation=True)

    with torch.no_grad(), get_autocast_context():
        _m = model
        while hasattr(_m, "model"):
            _m = _m.model
        pv = enc["pixel_values"].to(device)
        vit_out = _m.vision_model(pixel_values=pv, return_dict=True)
        vit_features = vit_out.last_hidden_state

        gen = model.generate(
            pixel_values=pv,
            input_ids=enc["input_ids"].to(device),
            attention_mask=enc["attention_mask"].to(device),
            max_new_tokens=128, do_sample=False, num_beams=3, repetition_penalty=1.2,
        )
        answer = processor.batch_decode(gen, skip_special_tokens=True)[0].strip()
        if "Answer:" in answer:
            answer = answer.split("Answer:")[-1].strip()

    attn_map = extract_vit_attention(vit_features, DEFAULT_CONFIG["image_size"])[0]
    overlay = create_heatmap_overlay(img, attn_map, alpha=0.5)

    return {
        "raw_answer": answer,
        "explanation": "Model 1 VQA generated scene answer with ViT spatial attention grounding.",
        "evidence_artifacts": {
            "Original Image": img,
            "Attention Heatmap": overlay,
            "attention_map_raw": attn_map,
        }
    }


def crossmodal_node(state: SatQueryState) -> Dict[str, Any]:
    """
    Node 2B: Optical + SAR Cross-Modal Fusion (Model 2).
    """
    opt_img = read_geospatial_image(state["image1"]).convert("RGB")
    sar_raw = read_geospatial_image(state["image2"]).convert("L") if state.get("image2") is not None else safe_load_image(None, modality="sar").convert("L")
    sar_img = Image.merge("RGB", [sar_raw, sar_raw, sar_raw])
    query = state.get("query", "")

    if is_mock_mode(state):
        answer, expl, opt_overlay, sar_overlay, opt_pct, sar_pct = mock_crossmodal_inference(opt_img, sar_img, query)
        return {
            "raw_answer": answer,
            "explanation": expl,
            "evidence_artifacts": {
                "Optical Image": opt_img,
                "Optical Heatmap": opt_overlay,
                "SAR Image": sar_img,
                "SAR Heatmap": sar_overlay,
                "optical_pct": opt_pct,
                "sar_pct": sar_pct,
            }
        }

    model = load_model("crossmodal")
    processor = get_processor()

    opt_enc = processor(images=opt_img, text="", return_tensors="pt")
    sar_enc = processor(images=sar_img, text="", return_tensors="pt")

    prompt = f"Question: {query} Answer:"
    txt_enc = processor.tokenizer(prompt, return_tensors="pt",
                                   padding="max_length", max_length=DEFAULT_CONFIG["max_length"],
                                   truncation=True)

    with torch.no_grad(), get_autocast_context():
        gen_out, opt_query, sar_query, opt_vit, sar_vit = model.generate_with_evidence(
            stream1_pixel_values=opt_enc["pixel_values"].to(device),
            stream2_pixel_values=sar_enc["pixel_values"].to(device),
            input_ids=txt_enc["input_ids"].to(device),
            attention_mask=txt_enc["attention_mask"].to(device),
            max_new_tokens=128, do_sample=False, num_beams=3, repetition_penalty=1.2,
        )
        answer = processor.batch_decode(gen_out, skip_special_tokens=True)[0].strip()
        if "Answer:" in answer:
            answer = answer.split("Answer:")[-1].strip()

    opt_attn = extract_vit_attention(opt_vit, DEFAULT_CONFIG["image_size"])[0]
    sar_attn = extract_vit_attention(sar_vit, DEFAULT_CONFIG["image_size"])[0]

    opt_overlay = create_heatmap_overlay(opt_img, opt_attn, alpha=0.5, colormap="turbo")
    sar_overlay = create_heatmap_overlay(sar_img, sar_attn, alpha=0.5, colormap="inferno")

    opt_norm = torch.norm(opt_query.float(), dim=-1).mean().item()
    sar_norm = torch.norm(sar_query.float(), dim=-1).mean().item()
    tot = opt_norm + sar_norm
    opt_pct = round(opt_norm / tot * 100, 1) if tot > 0 else 50.0
    sar_pct = round(sar_norm / tot * 100, 1) if tot > 0 else 50.0

    return {
        "raw_answer": answer,
        "explanation": f"Cross-modal sensor attribution: {opt_pct}% Optical vs {sar_pct}% SAR.",
        "evidence_artifacts": {
            "Optical Image": opt_img,
            "Optical Heatmap": opt_overlay,
            "SAR Image": sar_img,
            "SAR Heatmap": sar_overlay,
            "optical_pct": opt_pct,
            "sar_pct": sar_pct,
        }
    }


def change_detect_node(state: SatQueryState) -> Dict[str, Any]:
    """
    Node 2C: Multi-Temporal Change Detection (Model 3).
    """
    t1_img = read_geospatial_image(state["image1"]).convert("RGB")
    t2_img = read_geospatial_image(state["image2"]).convert("RGB") if state.get("image2") is not None else safe_load_image(None, modality="optical", is_t2=True, base_img=t1_img).convert("RGB")
    query = state.get("query", "")

    if is_mock_mode(state):
        answer, expl, mask_img, overlay_img, change_pct, boxes = mock_change_detect_inference(t1_img, t2_img, query)
        return {
            "raw_answer": answer,
            "explanation": expl,
            "evidence_artifacts": {
                "Before (T1)": t1_img,
                "After (T2)": t2_img,
                "Change Mask": mask_img,
                "Bounding Boxes": overlay_img,
                "change_pct": change_pct,
                "boxes": boxes,
            }
        }

    model = load_model("change_detect")
    processor = get_processor()

    t1_enc = processor(images=t1_img, text="", return_tensors="pt")
    t2_enc = processor(images=t2_img, text="", return_tensors="pt")

    prompt = f"Question: {query} Answer:"
    txt_enc = processor.tokenizer(prompt, return_tensors="pt",
                                   padding="max_length", max_length=DEFAULT_CONFIG["max_length"],
                                   truncation=True)

    with torch.no_grad(), get_autocast_context():
        gen_out, t1_query, t2_query, t1_vit, t2_vit = model.generate_with_evidence(
            stream1_pixel_values=t1_enc["pixel_values"].to(device),
            stream2_pixel_values=t2_enc["pixel_values"].to(device),
            input_ids=txt_enc["input_ids"].to(device),
            attention_mask=txt_enc["attention_mask"].to(device),
            max_new_tokens=128, do_sample=False, num_beams=3, repetition_penalty=1.2,
        )
        answer = processor.batch_decode(gen_out, skip_special_tokens=True)[0].strip()
        if "Answer:" in answer:
            answer = answer.split("Answer:")[-1].strip()

    mask_img, overlay_img, boxes, change_pct = compute_change_mask_and_boxes(t1_img, t2_img)

    return {
        "raw_answer": answer,
        "explanation": f"Radiometric change detected: {change_pct:.1f}% across {len(boxes)} bounding region(s).",
        "evidence_artifacts": {
            "Before (T1)": t1_img,
            "After (T2)": t2_img,
            "Change Mask": mask_img,
            "Bounding Boxes": overlay_img,
            "change_pct": change_pct,
            "boxes": boxes,
        }
    }


def geospatial_knowledge_node(state: SatQueryState) -> Dict[str, Any]:
    """
    Node 2D: Earth Observation Knowledge Base (Zero Images).
    """
    q = state.get("query", "").lower()
    if "sentinel-2" in q or "sentinel 2" in q:
        ans = ("Sentinel-2 is an ESA multispectral mission featuring 13 bands from visible/NIR to SWIR, "
               "spatial resolutions of 10m/20m/60m, and a 5-day global revisit time.")
    elif "sar" in q or "synthetic aperture radar" in q:
        ans = ("SAR is an active microwave remote sensing technique that transmits radar pulses and measures backscatter. "
               "Operating in C-band (Sentinel-1) or L-band, it penetrates cloud cover, fog, and smoke day and night.")
    elif "ndvi" in q:
        ans = ("NDVI (Normalized Difference Vegetation Index) = (NIR - Red) / (NIR + Red). "
               "Healthy dense green canopy typically exhibits values between 0.6 and 0.9.")
    else:
        ans = (f"SatQuery AI Earth Observation Engine: Regarding '{state.get('query')}', remote sensing combines "
               f"optical spectral bands and active radar backscatter to deliver continuous, all-weather planetary intelligence.")

    return {
        "raw_answer": ans,
        "explanation": "Direct Earth Observation domain knowledge synthesis (no imagery required).",
        "evidence_artifacts": {},
    }


def evidence_grounding_node(state: SatQueryState) -> Dict[str, Any]:
    """
    Node 3: Evidence Grounding Layer (Model 4 Integration).
    Enhances explanation with spatial attribution and geospatial coordinates if available.
    """
    explanation = state.get("explanation", "")
    meta = state.get("raster_metadata")

    if meta and meta.get("is_geotiff"):
        explanation += f" [Geospatial Bounds: {meta['bounds']} | CRS: {meta['crs']}]"

    return {"explanation": explanation}


def synthesizer_node(state: SatQueryState) -> Dict[str, Any]:
    """
    Node 4: Agent Response Synthesizer.
    Formats the final evidence-grounded response.
    """
    tool_name = {
        "vqa": "Model 1: Remote Sensing VQA",
        "crossmodal": "Model 2: Optical + SAR Fusion",
        "change_detect": "Model 3: Multi-Temporal Change Detection",
        "geospatial_qa": "Geospatial Knowledge Base",
    }.get(state["routing_decision"], "Specialized RS Model")

    mode_badge = " [CPU Demonstration Engine]" if state.get("mock") else ""

    formatted = f"""### SatQuery AI Response{mode_badge}
**Answer:** {state['raw_answer']}

---
* **Orchestrator Routing:** `{tool_name}` (Confidence: `{int(state['routing_confidence']*100)}%`)
* **Routing Rationale:** {state['routing_reason']}
* **Grounding Evidence:** {state['explanation']}
"""
    return {"final_response": formatted}
def route_condition(state: SatQueryState) -> str:
    """Conditional routing edge function."""
    return state["routing_decision"]


def build_satquery_graph():
    """Compiles and returns the LangGraph workflow."""
    if not HAS_LANGGRAPH:
        return None

    workflow = StateGraph(SatQueryState)
    workflow.add_node("router", router_node)
    workflow.add_node("vqa", vqa_node)
    workflow.add_node("crossmodal", crossmodal_node)
    workflow.add_node("change_detect", change_detect_node)
    workflow.add_node("geospatial_qa", geospatial_knowledge_node)
    workflow.add_node("evidence_grounding", evidence_grounding_node)
    workflow.add_node("synthesizer", synthesizer_node)
    workflow.set_entry_point("router")
    workflow.add_conditional_edges(
        "router",
        route_condition,
        {
            "vqa": "vqa",
            "crossmodal": "crossmodal",
            "change_detect": "change_detect",
            "geospatial_qa": "geospatial_qa",
        }
    )
    workflow.add_edge("vqa", "evidence_grounding")
    workflow.add_edge("crossmodal", "evidence_grounding")
    workflow.add_edge("change_detect", "evidence_grounding")
    workflow.add_edge("geospatial_qa", "synthesizer")
    workflow.add_edge("evidence_grounding", "synthesizer")
    workflow.add_edge("synthesizer", END)

    return workflow.compile()
satquery_app = build_satquery_graph() if HAS_LANGGRAPH else None
def run_satquery(query: str, image1=None, image2=None, mock: Optional[bool] = None) -> SatQueryState:
    """
    Standard entrypoint for invoking the SatQuery AI Agent.
    Compatible with FastAPI, CLI, and interactive frontends.
    """
    start = time.time()
    effective_mock = mock if mock is not None else is_mock_mode()
    initial_state = {
        "query": query,
        "image1": image1,
        "image2": image2,
        "image_count": 0,
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

    if satquery_app is not None:
        final_state = satquery_app.invoke(initial_state)
    else:
        st = {**initial_state, **router_node(initial_state)}
        dec = st["routing_decision"]
        if dec == "vqa":
            st.update(vqa_node(st))
            st.update(evidence_grounding_node(st))
        elif dec == "crossmodal":
            st.update(crossmodal_node(st))
            st.update(evidence_grounding_node(st))
        elif dec == "change_detect":
            st.update(change_detect_node(st))
            st.update(evidence_grounding_node(st))
        else:
            st.update(geospatial_knowledge_node(st))
        st.update(synthesizer_node(st))
        final_state = st

    final_state["latency"] = round(time.time() - start, 2)
    return final_state


if __name__ == "__main__":
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    print("\n" + "=" * 60)
    print("[SatQuery AI] Agent Self-Test (LangGraph Orchestration)")
    print("=" * 60)
    print(f"CUDA Available: {torch.cuda.is_available()}")
    print(f"Mock Mode:      {is_mock_mode()}")
    print(f"Model1 Ckpt:    {DEFAULT_CONFIG['model1_checkpoint']}")
    print(f"Model2 Ckpt:    {DEFAULT_CONFIG['model2_checkpoint']}")
    print(f"Model3 Ckpt:    {DEFAULT_CONFIG['model3_checkpoint']}")
    print("-" * 60)

    test_q = "What is the spatial resolution and revisit rate of Sentinel-2 satellites?"
    res = run_satquery(query=test_q)
    print(res["final_response"])
    print(f"Latency: {res['latency']}s")
    print("=" * 60 + "\n")
