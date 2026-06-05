# Introduction to Pathology MIL — Course Package

A self-contained course on **Multiple Instance Learning (MIL) for computational pathology**,
aimed at ML engineers. Covers the full pipeline from gigapixel whole-slide images to
interpretable, weakly-supervised slide predictions, with generic methods (ABMIL / CLAM / TransMIL)
and modern foundation-model encoders (UNI2, Virchow2, Prov-GigaPath, CONCH).

**Format:** 50-minute lecture + 10-minute Q&A · 5 hands-on notebooks · NotebookLM quiz.

## Contents

```
milcourse/
├── deck/
│   └── Pathology_MIL_Course.pptx     ← 49-slide deck (upload to Google Drive → opens as Google Slides)
├── notebooks/
│   ├── 01_data_preparation.ipynb     ← WSI → tissue → patches → features → bag
│   ├── 02_training.ipynb             ← ABMIL / CLAM-SB, patient-stratified CV, baselines
│   ├── 03_inference.ipynb            ← score a new slide (prob + attention)
│   ├── 04_postprocessing.ipynb       ← attention heatmaps, top-k tiles, case aggregation
│   ├── 05_evaluation_visualization.ipynb  ← AUROC/AUPRC/bAcc, ROC, confusion matrix, UMAP
│   ├── mil_models.py                 ← reference MIL aggregators (mean/max, ABMIL, CLAM-SB)
│   ├── mil_utils.py                  ← synthetic bags, leakage-safe CV, metrics, train/eval loops
│   └── requirements.txt
└── quiz/
    └── MIL_quiz_source.md            ← 20-question quiz + study guide (NotebookLM source)
```

## Slides

`deck/Pathology_MIL_Course.pptx` — drag it into Google Drive and it opens as a fully editable
Google Slides deck (for sharing/co-editing). Speaker notes are included on every content slide.
Sections: Background · MIL formulation · Data preparation · Foundation encoders · Model
architecture · Training protocols · Inference · Post-processing · Evaluation & visualization ·
Conclusion + quiz.

## Notebooks

Each notebook ships with **two paths**:
- a **real WSI pipeline** (TCGA `.svs` via OpenSlide + a foundation encoder from Hugging Face) —
  set `USE_REAL_WSI = True` in notebook 01 and edit the paths; needs a GPU and gated model access;
- a **synthetic fallback** (default) that generates realistic `(N×d)` feature bags so the entire
  course — training, inference, heatmaps, metrics, UMAP — runs anywhere with just `torch`,
  `numpy`, `matplotlib`. No slide download, no GPU required.

Run them in order; notebook 01 writes `synthetic_bags.pkl`, which the rest consume.

```bash
cd notebooks
pip install -r requirements.txt
jupyter lab            # then run 01 → 05
```

For the **real** pipeline you also need `openslide-python` (+ the OpenSlide system library),
`opencv-python`, `timm`, and `huggingface_hub` with access to a gated encoder
(e.g. `MahmoodLab/UNI2-h`). See notebook 01, section 0.

## Quiz

Upload `quiz/MIL_quiz_source.md` (optionally with the deck and notebooks) to **NotebookLM** to
generate an audio overview, flashcards, a study guide, and an auto-quiz. The file also contains a
standalone 20-question quiz with a full answer key.

## A note on the numbers

Performance figures shown in the slides and produced by the synthetic notebooks are
**illustrative** — they demonstrate the methodology and relative behavior of the models, not
measured benchmark results. Plug in real TCGA bags to get real numbers.
