# SatQuery AI — Model 1 : RS-VQA Training Report

**Generated:** 2026-09-12 08:05:03
**Team:** Spectra | Smart India Hackathon 2026

---

## Configuration
| Key | Value |
|-----|-------|
| Model | `Salesforce/blip2-opt-2.7b` |
| Fine-tuning | QLoRA  rank=16  alpha=32 |
| Train samples | 800 |
| Val samples | 200 |
| Optical images | 100 |
| SAR images | 100 (Synthetic (EuroSAT + Speckle)) |
| QA/image | 5 |
| Epochs trained | 8 / 8 |
| Best epoch | 8 |
| Training time | 64.2 min |

## Results
| Metric | Overall | Optical | SAR |
|--------|---------|---------|-----|
| BLEU-1 | 0.3166 | 0.365 | 0.2693 |
| BLEU-4 | 0.2615 | 0.331 | 0.1934 |
| ROUGE-L | 0.4225 | 0.4967 | 0.3498 |

## Per-Epoch Loss
| Epoch | Train | Val |
|-------|-------|-----|
| 1 | 2.5829 | 0.2457 |
| 2 | 0.1612 | 0.0799 |
| 3 | 0.0828 | 0.0659 |
| 4 | 0.0676 | 0.0614 |
| 5 | 0.0601 | 0.0573 |
| 6 | 0.0568 | 0.0544 |
| 7 | 0.0536 | 0.0507 |
| 8 | 0.0527 | 0.0502 |

## Saved Artefacts
```
/content/drive/MyDrive/SatQuery_AI/Model1_VQA/
├── model/           ← LoRA adapter + processor
├── results/         ← metrics, plots, logs
├── dataset/         ← train/val QA JSONs
└── report/          ← this report
```

## Notes
- Prototype trained on ~200 images for SIH demonstration.
- For production: use BigEarthNet-S1 or Sentinel-1 for real SAR.
- Model generates **natural-language** answers (not classification labels).
