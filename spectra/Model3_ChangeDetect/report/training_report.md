# SatQuery AI — Model 3 : Multi-Temporal Change Detection VQA Training Report

**Generated:** 2026-09-12 19:37:53
**Team:** Spectra | SIH 2026

---

## Architecture
- **Model:** Dual-Stream BLIP-2 OPT-2.7B (4-bit quantized)
- **Innovation:** Shared ViT + Q-Former processes T1 (before) & T2 (after)
  independently, query outputs concatenated (32+32=64 visual tokens) → LoRA OPT
- **Fine-tuning:** QLoRA (rank 16, ~5,242,880 trainable params)
- **Training Time:** 109.5 minutes on Colab T4

## Dataset
- **Bi-Temporal Pairs:** 204
- **T1 Source:** EuroSAT (Sentinel-2), 10 classes
- **T2 Source:** Synthesized with 6 change types (urbanisation, deforestation, flooding, seasonal crop, fire/burn, no-change)
- **Change-Detection QA Pairs:** 1020 (816 train / 204 val)
- **Question Types:** 5 temporal reasoning categories

## Results
| Metric | Score |
|--------|-------|
| BLEU-1 | 0.499 |
| BLEU-4 | 0.4623 |
| ROUGE-L | 0.6043 |

- Best epoch: 8 (val_loss = 0.0213)

### Per Change Type
| Change Type | BLEU-1 | ROUGE-L | Samples |
|-------------|--------|---------|---------|
| deforestation | 0.4602 | 0.5687 | 34 |
| fire_burn | 0.4954 | 0.5921 | 38 |
| flooding | 0.4838 | 0.5875 | 37 |
| no_change | 0.4874 | 0.6105 | 32 |
| seasonal_crop | 0.5054 | 0.6335 | 24 |
| urbanisation | 0.5666 | 0.6465 | 39 |

## Key Innovation
- **Temporal change detection via visual language model:** The dual-stream
  architecture captures temporal differences by encoding T1 and T2 through
  the same shared vision backbone, allowing the language model to reason
  about **what changed, when, how much, and what the implications are**.
- Model generates **natural-language** answers requiring **temporal reasoning**
  across 6 distinct change categories.
