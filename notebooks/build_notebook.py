#!/usr/bin/env python3
"""Build the single end-to-end course notebook (real TCGA NSCLC pipeline).

One notebook, one Colab runtime: download+encode TCGA once, then train -> infer
-> heatmaps -> evaluate, all sharing in-memory variables (no cross-notebook
Drive hand-off). Features are still cached to disk/Drive so a runtime restart
skips the re-download.
"""
import json, os

def md(s):  return {"cell_type": "markdown", "metadata": {}, "source": s.strip("\n").splitlines(keepends=True)}
def code(s): return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": s.strip("\n").splitlines(keepends=True)}
def nb(cells):
    return {"cells": cells,
            "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                          "language_info": {"name": "python", "version": "3.10"},
                          "accelerator": "GPU", "colab": {"provenance": []}},
            "nbformat": 4, "nbformat_minor": 5}

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_URL = "https://github.com/leoyin1127/milcourse.git"

def setup_code():
    return f"""# === Colab setup - RUN THIS CELL FIRST (use a GPU runtime) ===
import os, sys, subprocess
def _sh(c): print('$', c); subprocess.run(c, shell=True)

# 1) WSI pipeline dependencies (OpenSlide + transformers for Midnight-12k)
try:
    import openslide  # noqa
except Exception:
    _sh('apt-get -qq update && apt-get -qq install -y openslide-tools')
    _sh('pip -q install openslide-python "transformers>=4.40"')

# 2) Course helper modules: use the local copy if present (running inside the repo),
#    otherwise clone the public repo and add it to the path.
try:
    import mil_tcga  # noqa
except Exception:
    if not os.path.isdir('/content/milcourse'):
        _sh('git clone -q {REPO_URL} /content/milcourse')
    sys.path.append('/content/milcourse/notebooks')

# 3) Optional Google Drive cache so a runtime restart skips the re-download
try:
    from google.colab import drive; drive.mount('/content/drive')
    CACHE = '/content/drive/MyDrive/pathology_mil_tcga'
except Exception:
    CACHE = os.path.abspath('./pathology_mil_tcga')   # local fallback
CACHE_BAGS = os.path.join(CACHE, 'bags'); os.makedirs(CACHE_BAGS, exist_ok=True)
MODEL_PATH = os.path.join(CACHE, 'mil_model.pt')
print('setup complete | feature cache:', CACHE)"""

cells = [
md(r"""
# Introduction to Pathology MIL — hands-on (real TCGA, end-to-end)

A single self-contained notebook that runs the **whole MIL pipeline** on **real TCGA
whole-slide images** for NSCLC subtyping — **TCGA-LUAD vs TCGA-LUSC**:

> **GDC download → tissue seg → 20× patching → Midnight-12k features → train → infer → heatmaps → evaluate**

Everything runs in **one Colab runtime**, so each section reuses the variables from the previous
one — no cross-notebook data hand-off. The expensive download+encode is cached (to Google Drive
if mounted, else locally), so re-running after a restart skips it.

**Encoder:** Midnight-12k (`kaiko-ai/midnight`, MIT, ViT-g, 3072-d) — open, no gating, and the
top non-gated pathology FM (beats gated H-optimus-0 / GigaPath / UNI on Kaiko's benchmark).
**Run it:** Runtime → Change runtime type → **GPU**, then **Runtime → Run all**.
⚠️ Notebook 01-style download+encode is real work — expect the build step to take a while.
"""),
md("## ⚙️ Setup — run first"),
code(setup_code()),

md("## 1 · Configuration"),
code(r"""
import torch
from mil_tcga import build_cohort, load_bags, LABEL_NAME

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
if DEVICE != "cuda":
    print("⚠️  No GPU detected — Midnight-12k is very slow on CPU. "
          "Runtime → Change runtime type → GPU, then re-run.")

PER_CLASS   = 50      # slides per class (LUAD / LUSC); ~100 total. Lower to go faster (heavy download+encode).
MAX_PATCHES = 2000    # cap patches/slide to bound encode time & memory
ENCODER     = "kaiko-ai/midnight"
print(f"device={DEVICE} | per_class={PER_CLASS} | cache={CACHE}")
"""),

md(r"""
## 2 · Build the TCGA feature cache  *(the one heavy step)*

`build_cohort` queries the public GDC portal for the smallest open-access diagnostic slides per
class (one slide per patient → no leakage), then for each slide: download → segment tissue
(Otsu on saturation) → 256-px patches at 20× → encode with Midnight-12k → cache the `(N×d)` bag.
It is **idempotent** — already-cached slides are skipped, so if Colab disconnects just re-run.
Slides are deleted right after encoding, so only the small bags accumulate.
"""),
code(r"""
build_cohort(CACHE_BAGS, per_class=PER_CLASS, device=DEVICE,
             encoder=ENCODER, max_patches=MAX_PATCHES)

data = load_bags(CACHE_BAGS)          # in-memory dataset reused by every section below
IN_DIM = data[0]["features"].shape[1]
import numpy as np
print(f"{len(data)} bags | dim={IN_DIM} | "
      f"LUSC={sum(d['label']==1 for d in data)}  LUAD={sum(d['label']==0 for d in data)}")
"""),
code(r"""
# Peek: one LUAD and one LUSC thumbnail, with the extracted patches overlaid
import matplotlib.pyplot as plt
fig, ax = plt.subplots(1, 2, figsize=(12, 5.5))
for a, lab in zip(ax, [0, 1]):
    d = next(x for x in data if x["label"] == lab)
    a.imshow(d["thumb"])
    tx, ty = d["coords"][:, 0] / d["thumb_ds"], d["coords"][:, 1] / d["thumb_ds"]
    a.scatter(tx, ty, s=8, marker="s", facecolors="none", edgecolors="tab:blue", linewidths=0.4, alpha=0.6)
    a.set_title(f"{LABEL_NAME[lab]}  ({len(d['features'])} patches)"); a.axis("off")
plt.suptitle("blue squares = the 256-px tissue patches that were tiled & encoded")
plt.tight_layout(); plt.show()
"""),

md(r"""
## 3 · Train the MIL aggregators

Compact implementations live in `mil_models.py` (mean/max pool, gated **ABMIL**, **CLAM-SB**
with the instance-clustering loss). We use **patient-stratified** CV and weighted cross-entropy,
and report **mean ± std AUROC**. With ~100 slides the folds are larger so the metric is far less
jumpy than a tiny cohort, but these are still *illustrative* numbers — the point is
the methodology and beating the mean-pool baseline.
"""),
code(r"""
import inspect, mil_models, numpy as np, torch
from mil_utils import patient_stratified_kfold, train_one, evaluate, compute_metrics
from mil_models import build_model
torch.manual_seed(0); np.random.seed(0)
print(inspect.getsource(mil_models.GatedAttention))

labels = np.array([d["label"] for d in data])
cw = labels.size / (2.0 * np.maximum(np.bincount(labels, minlength=2), 1))
print("class counts:", np.bincount(labels, minlength=2), "| weights:", cw.round(3))
"""),
code(r"""
results = {m: [] for m in ["mean", "abmil", "clam_sb"]}
for fold, (tr, va) in enumerate(patient_stratified_kfold(data, n_folds=4, seed=2)):
    assert not ({data[i]['patient_id'] for i in tr} & {data[i]['patient_id'] for i in va})
    for name in results:
        model = build_model(name, IN_DIM, 2)
        model, _ = train_one(model, data, tr, va, epochs=25, lr=2e-4,
                             class_weights=cw, device=DEVICE, patience=8)
        results[name].append(evaluate(model, data, va, device=DEVICE)["auroc"])
    print(f"fold {fold}: " + " | ".join(f"{n}={results[n][-1]:.3f}" for n in results))
print("\n=== cross-validated AUROC (mean ± std) ===")
for name, aucs in results.items():
    print(f"  {name:9s}: {np.nanmean(aucs):.3f} ± {np.nanstd(aucs):.3f}")
"""),
code(r"""
# Final CLAM-SB on all data, kept in memory (and cached to Drive) for the sections below
idx = np.arange(len(data)); np.random.shuffle(idx)
cut = int(0.8 * len(idx)); tr, va = idx[:cut].tolist(), idx[cut:].tolist()
final = build_model("clam_sb", IN_DIM, 2)
final, hist = train_one(final, data, tr, va, epochs=40, lr=2e-4,
                        class_weights=cw, device=DEVICE, patience=10, verbose=True)
torch.save({"state_dict": final.state_dict(), "model": "clam_sb",
            "in_dim": IN_DIM, "n_classes": 2}, MODEL_PATH)
print("final model trained | best val AUROC:", round(max(hist), 3))
"""),

md("## 4 · Inference — score a slide (reuses the in-memory `final` model)"),
code(r"""
sample = data[-1]
feats  = torch.from_numpy(sample["features"]).to(DEVICE)
final.eval()
with torch.no_grad():
    logits, attn, _ = final(feats)
prob = torch.softmax(logits, 1)[0].cpu().numpy(); attn = attn.cpu().numpy()
print(f"slide {sample['slide_id'][:8]} | true = {LABEL_NAME[sample['label']]}")
print(f"P(LUAD)={prob[0]:.3f}  P(LUSC)={prob[1]:.3f}  ->  pred = {LABEL_NAME[int(prob.argmax())]}")
def decision(p, lo=0.4, hi=0.6):
    return "LUSC" if p[1] >= hi else "LUAD" if p[1] <= lo else "UNCERTAIN — route to pathologist"
print("call:", decision(prob))
"""),

md(r"""
## 5 · Post-processing — attention heatmap, top-k, case aggregation

> ⚠️ Attention *localises* but does not *prove* causation — a hypothesis for the pathologist.
"""),
code(r"""
thumb, ds, coords = sample["thumb"], sample["thumb_ds"], sample["coords"]
tx, ty = coords[:, 0] / ds, coords[:, 1] / ds
a = (attn - attn.min()) / (np.ptp(attn) + 1e-8)   # np.ptp: ndarray.ptp() was removed in NumPy 2.0
fig, ax = plt.subplots(1, 2, figsize=(12, 5))
ax[0].imshow(thumb); ax[0].set_title(f"{LABEL_NAME[sample['label']]} slide"); ax[0].axis("off")
ax[1].imshow(thumb); sc = ax[1].scatter(tx, ty, c=a, cmap="magma", s=14, alpha=0.6)
ax[1].set_title("attention heatmap"); ax[1].axis("off")
plt.colorbar(sc, ax=ax[1], fraction=0.046, label="attention"); plt.tight_layout(); plt.show()
"""),
code(r"""
# Top-k attended patches + slide -> patient aggregation
from collections import defaultdict
top = np.argsort(-attn)[:8]
print("top-k patch (x,y)@level0 and attention:")
for i in top: print(f"  ({coords[i,0]:>7d},{coords[i,1]:>7d})  a={attn[i]:.4f}")

@torch.no_grad()
def slide_prob(d):
    return torch.softmax(final(torch.from_numpy(d["features"]).to(DEVICE))[0], 1)[0, 1].item()
by_patient = defaultdict(list)
for d in data: by_patient[d["patient_id"]].append((slide_prob(d), d["label"]))
print(f"\n{'patient':14s} {'p(LUSC)':>8s} {'call':>6s}  truth")
for pid, rec in list(by_patient.items())[:12]:
    cp = max(p for p, _ in rec)
    print(f"{pid:14s} {cp:8.2f} {LABEL_NAME[int(cp>=0.5)]:>6s}  {LABEL_NAME[max(l for _,l in rec)]}")
"""),

md("## 6 · Evaluation — out-of-fold metrics, ROC, confusion, UMAP"),
code(r"""
oof_y, oof_p, per_fold = [], [], []
for tr, va in patient_stratified_kfold(data, n_folds=4, seed=2):
    m = build_model("clam_sb", IN_DIM, 2)
    m, _ = train_one(m, data, tr, va, epochs=25, class_weights=cw, device=DEVICE, patience=8)
    mm, y, p = evaluate(m, data, va, device=DEVICE, return_probs=True)
    per_fold.append(mm); oof_y += y.tolist(); oof_p += p.tolist()
oof_y, oof_p = np.array(oof_y), np.array(oof_p)
print("per-fold (mean ± std):")
for k in ["auroc", "auprc", "balanced_acc"]:
    v = [m[k] for m in per_fold]; print(f"  {k:12s}: {np.nanmean(v):.3f} ± {np.nanstd(v):.3f}")
print("pooled OOF:", {k: round(v, 3) for k, v in compute_metrics(oof_y, oof_p).items()})
"""),
code(r"""
def roc_pts(y, p):
    thr = np.unique(np.concatenate([[0], p, [1]]))[::-1]
    P, Nn = max(y.sum(), 1), max((1 - y).sum(), 1)
    return (np.array([((p>=t)&(y==0)).sum()/Nn for t in thr]),
            np.array([((p>=t)&(y==1)).sum()/P for t in thr]))
fpr, tpr = roc_pts(oof_y, oof_p); auc = compute_metrics(oof_y, oof_p)["auroc"]
fig, ax = plt.subplots(1, 2, figsize=(11, 4.4))
ax[0].plot(fpr, tpr, lw=2, label=f"AUROC={auc:.3f}"); ax[0].plot([0,1],[0,1],"--",c="gray")
ax[0].set_xlabel("FPR"); ax[0].set_ylabel("TPR"); ax[0].set_title("ROC (out-of-fold)"); ax[0].legend()
pred = (oof_p >= 0.5).astype(int)
cmx = np.array([[((pred==j)&(oof_y==i)).sum() for j in (0,1)] for i in (0,1)])
ax[1].imshow(cmx, cmap="Purples")
for i in range(2):
    for j in range(2):
        ax[1].text(j, i, cmx[i,j], ha="center", va="center", fontsize=14,
                   color="white" if cmx[i,j] > cmx.max()/2 else "black")
ax[1].set_xticks([0,1], ["pred LUAD","pred LUSC"]); ax[1].set_yticks([0,1], ["LUAD","LUSC"])
ax[1].set_title("confusion @0.5"); plt.tight_layout(); plt.show()
"""),
code(r"""
# UMAP of Midnight-12k patch embeddings (falls back to PCA if umap-learn absent)
rng = np.random.default_rng(0); feats, lab = [], []
for d in data:
    n = min(80, len(d["features"])); sel = rng.choice(len(d["features"]), n, replace=False)
    feats.append(d["features"][sel]); lab.append(np.full(n, d["label"]))
X = np.concatenate(feats); lab = np.concatenate(lab)
try:
    import umap
    emb = umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=0).fit_transform(X); ttl = "UMAP"
except Exception:
    Xc = X - X.mean(0); _, _, Vt = np.linalg.svd(Xc, full_matrices=False)
    emb = Xc @ Vt[:2].T; ttl = "PCA (pip install umap-learn for UMAP)"
plt.figure(figsize=(6, 5))
for c, nm in [(0,"LUAD"), (1,"LUSC")]:
    plt.scatter(emb[lab==c,0], emb[lab==c,1], s=8, alpha=.4, label=nm)
plt.legend(); plt.title(f"{ttl} of patch embeddings"); plt.tight_layout(); plt.show()
"""),

md(r"""
## ✅ Recap
- One runtime, end-to-end: **download → encode → train → infer → heatmap → evaluate**.
- Frozen **Midnight-12k** features + a small trainable **CLAM-SB** head.
- Honest evaluation: **patient-level** splits, **mean ± std**, beat **mean-pool**, inspect attention + UMAP.
- ⚠️ ~100 slides is still a small *teaching* cohort — for real claims raise `PER_CLASS` further and validate on an **external cohort**.
"""),
]

with open(os.path.join(HERE, "pathology_mil_tcga.ipynb"), "w") as f:
    json.dump(nb(cells), f, indent=1)
print(f"wrote pathology_mil_tcga.ipynb ({len(cells)} cells)")
