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

## Notebooks — real TCGA pipeline (Google Colab)

The notebooks use **real TCGA whole-slide images** (no synthetic data) for NSCLC subtyping:
**TCGA-LUAD vs TCGA-LUSC**. Built for **Google Colab + Google Drive**.

**Task & encoder:** LUAD vs LUSC · features from **H-optimus-0** (Bioptimus ViT-G, open, no gating).

**How data flows across the notebooks.** In Colab each notebook runs in its own runtime, so they
share data through a **feature cache on Google Drive** (`MyDrive/pathology_mil_tcga/`):

1. **`01_data_preparation`** — queries the public GDC portal, downloads ~30 open-access diagnostic
   slides (~15 LUAD + 15 LUSC, one slide per patient), segments tissue, patches at 20×/256px,
   encodes every patch with H-optimus-0, and **caches each `(N×d)` bag to Drive**. Slides are
   processed one at a time and deleted after encoding, so disk stays small. This is the one
   GPU-heavy, time-consuming step — run it once.
2. **`02_training`** — loads the cached bags, trains mean-pool / ABMIL / CLAM-SB with
   patient-stratified CV, and saves the model to Drive.
3. **`03_inference`**, **`04_postprocessing`** — load the cached bags + model from Drive.
4. **`05_evaluation_visualization`** — loads the cached bags (trains its own CV models).

Because the cache lives on Drive, you only run `01` once; `02–05` then work in any fresh runtime.
If you open `02–05` before `01`, they raise a clear "run notebook 01 first" message.

**To run:** open each `.ipynb` in Colab (**Runtime → Change runtime type → GPU**), then
**Runtime → Run all**. The first cell mounts Drive, installs deps (notebook 01), and writes the
helper modules — the notebooks are otherwise self-contained.

```bash
# local (non-Colab) use also works:
cd notebooks && pip install -r requirements.txt   # + the OpenSlide system library
```

**Knobs** (top of notebook 01): `PER_CLASS` (slides per class, default 15 — lower it to go faster),
`MAX_PATCHES` (per-slide patch cap, default 2000), `ENCODER` (default `bioptimus/H-optimus-0`).

## Quiz

Upload `quiz/MIL_quiz_source.md` (optionally with the deck and notebooks) to **NotebookLM** to
generate an audio overview, flashcards, a study guide, and an auto-quiz. The file also contains a
standalone 20-question quiz with a full answer key.

## A note on the numbers

The notebooks now compute metrics on **real TCGA data**, but the default cohort is small
(~30 slides, a *teaching* set), so the figures have wide error bars. For real claims, increase
`PER_CLASS` and validate on an **external cohort** (a different hospital/scanner). Performance
figures on the **slides** remain illustrative diagrams, not measured benchmarks.
