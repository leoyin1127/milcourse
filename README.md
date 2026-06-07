# Introduction to Pathology MIL — Course Package

A self-contained course on **Multiple Instance Learning (MIL) for computational pathology**,
aimed at ML engineers. Covers the full pipeline from gigapixel whole-slide images to
interpretable, weakly-supervised slide predictions, with generic methods (ABMIL / CLAM / TransMIL)
and modern foundation-model encoders (UNI2, Virchow2, Prov-GigaPath, CONCH).

**Format:** 50-minute lecture + 10-minute Q&A · one hands-on end-to-end TCGA notebook · NotebookLM quiz.

## Contents

```
milcourse/
├── deck/
│   └── Pathology_MIL_Course.pptx     ← 49-slide deck (upload to Google Drive → opens as Google Slides)
├── notebooks/
│   ├── pathology_mil_tcga.ipynb      ← ONE end-to-end notebook (download→encode→train→infer→heatmap→eval)
│   ├── build_notebook.py             ← regenerates the notebook (embeds the helper modules)
│   ├── mil_models.py                 ← reference MIL aggregators (mean/max, ABMIL, CLAM-SB)
│   ├── mil_tcga.py                   ← TCGA pipeline: GDC download, WSI seg/patch, H-optimus-0, cache
│   ├── mil_utils.py                  ← leakage-safe CV, metrics, train/eval loops
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

## Notebook — real TCGA pipeline (single, end-to-end)

`notebooks/pathology_mil_tcga.ipynb` runs the **whole pipeline in one Colab runtime** on **real
TCGA whole-slide images** (no synthetic data) for NSCLC subtyping — **TCGA-LUAD vs TCGA-LUSC**:

> **GDC download → tissue seg → 20× patching → H-optimus-0 features → train → infer → heatmaps → evaluate**

Because everything runs in one runtime, each section reuses the previous section's in-memory
variables — there's no cross-notebook hand-off. The expensive download+encode is **cached** (to
Google Drive if mounted, else locally under `pathology_mil_tcga/`), so re-running after a runtime
restart skips it. The build step is idempotent — already-cached slides are skipped.

**Encoder:** H-optimus-0 (Bioptimus ViT-G, dim 1536) — open, no gating.

**To run:** open the notebook in Colab → **Runtime → Change runtime type → GPU** → **Run all**.
The first cell installs deps, (optionally) mounts Drive, and writes the helper modules — the
notebook is otherwise self-contained. ⚠️ The download+encode step does real work and takes a while.

```bash
# local (non-Colab) use also works:
cd notebooks && pip install -r requirements.txt   # + the OpenSlide system library
```

**Knobs** (cell "1 · Configuration"): `PER_CLASS` (slides per class, default 15 — lower to go
faster), `MAX_PATCHES` (per-slide patch cap, default 2000), `ENCODER` (default `bioptimus/H-optimus-0`).

## Quiz

Upload `quiz/MIL_quiz_source.md` (optionally with the deck and notebooks) to **NotebookLM** to
generate an audio overview, flashcards, a study guide, and an auto-quiz. The file also contains a
standalone 20-question quiz with a full answer key.

## A note on the numbers

The notebooks now compute metrics on **real TCGA data**, but the default cohort is small
(~30 slides, a *teaching* set), so the figures have wide error bars. For real claims, increase
`PER_CLASS` and validate on an **external cohort** (a different hospital/scanner). Performance
figures on the **slides** remain illustrative diagrams, not measured benchmarks.
