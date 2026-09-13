# SatQuery AI — Model 4: Evidence Grounding Layer Report

**Generated:** 2026-09-12 20:52:29
**Team:** Spectra | SIH 2026

---

## Overview

The Evidence Grounding Layer provides **visual explainability** for all 3
SatQuery AI models. It generates attention heatmaps, change masks, bounding
boxes, and modality contribution analysis alongside text answers.

**No training was required** — this is a pure inference-time evidence layer
built on top of the trained Model 1, 2, and 3 checkpoints.

---

## Grounding Techniques

### Model 1 — VQA Attention Heatmaps
- **Method:** ViT spatial token L2 norms from the final encoder layer
- **Output:** Turbo-coloured heatmap overlaid on the satellite image
- **Spatial Analysis:** Top-5 attended patches with quadrant identification

### Model 2 — Cross-Modal Dual Heatmaps + Modality Contribution
- **Method:** Independent ViT attention capture for optical and SAR streams
- **Modality Ratio:** Q-Former query token L2 norm comparison
- **Output:** Dual heatmaps + pie chart showing optical vs SAR contribution

### Model 3 — Radiometric Change Mask + Bounding Boxes
- **Method:** Pixel-wise absolute difference → Gaussian blur → Otsu threshold
  → morphological cleanup → contour extraction
- **Output:** Binary change mask + bounding boxes on T2 + dual attention maps
- **Quantification:** Change percentage, number of regions, sector analysis

---

## Evidence Results Summary

### VQA Evidence (Model 1)

**Sample 1:**
- Question: What is the dominant feature in this scene?
- Answer: The dominant feature is orchard trees, characteristic of permanent crop plantati
- Confidence: 1.464
- Model attention is broadly distributed (concentration ratio: 1.46). Primary focus: south-east quadrant (activation stren

**Sample 2:**
- Question: What type of land cover is shown in this image?
- Answer: The image primarily displays open water with surrounding water body. This falls 
- Confidence: 1.337
- Model attention is broadly distributed (concentration ratio: 1.34). Primary focus: north-east quadrant (activation stren

### Cross-Modal Evidence (Model 2)

**Sample 1:**
- Question: If clouds obscured the optical image, what could the SAR still determine?
- Answer: Question SAR penetrates clouds and reveals uniform volume scattering from multip
- Optical: 49.5% | SAR: 50.5%
- Dominant: SAR
- The model relied primarily on sar data (optical: 49.5%, SAR: 50.5%). Optical attention is distributed (concentration: 1.

**Sample 2:**
- Question: What additional information does the SAR image provide beyond the optical?
- Answer: Question: While the optical image shows surface appearance through light green r
- Optical: 49.5% | SAR: 50.5%
- Dominant: SAR
- The model relied primarily on sar data (optical: 49.5%, SAR: 50.5%). Optical attention is distributed (concentration: 1.

### Change Detection Evidence (Model 3)

**Sample 1:**
- Question: What type of land-cover change has occurred between T1 and T2?
- Answer: Question type of change is classified as urbanisation. The T1 observation shows 
- Change: 24.9% | Regions: 1
- Attention Shift: 0.1710
- Detected 1 distinct change region in the southern-eastern sector, covering 24.9% of the scene. Attention shift between T

**Sample 2:**
- Question: Is T2 more recent than T1? What evidence suggests this?
- Answer: Question is yes, T2 appears to be the more recent observation. The progression s
- Change: 24.9% | Regions: 1
- Attention Shift: 0.1631
- Detected 1 distinct change region in the southern-eastern sector, covering 24.9% of the scene. Attention shift between T

---

## Unified Interface

```python
from satquery_grounding import generate_evidence

# Single-image VQA
result = generate_evidence("vqa", "What is here?", image_path="satellite.jpg")

# Cross-modal fusion
result = generate_evidence("crossmodal", "Compare sensors",
                            optical_path="optical.jpg", sar_path="sar.jpg")

# Change detection
result = generate_evidence("change_detect", "What changed?",
                            t1_path="before.jpg", t2_path="after.jpg")
```

---

## Key Innovation
The Evidence Grounding Layer transforms SatQuery AI from a black-box VQA
system into an **explainable AI platform** that provides:
1. **Spatial grounding:** Where the model looked (ViT attention heatmaps)
2. **Sensor attribution:** Which data source contributed (modality norms)
3. **Change localisation:** Where changes occurred (radiometric masks + bboxes)
4. **Natural-language explanations:** Human-readable spatial descriptions

This directly fulfils the SIH proposal promise of **"Explainable answers:
Text + Evidence"** and addresses the risk of **"Hallucination / wrong answer"**
through visual verification and confidence metrics.
