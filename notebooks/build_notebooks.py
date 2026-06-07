#!/usr/bin/env python3
"""Build the 5 course notebooks (real TCGA NSCLC pipeline) as .ipynb JSON.

Task: TCGA-LUAD vs TCGA-LUSC subtyping with H-optimus-0 features.
Architecture: notebook 01 downloads + encodes TCGA slides once and caches the
(N x d) feature bags to mounted Google Drive; notebooks 02-05 mount the same
Drive and reuse the cache across separate Colab runtimes.
"""
import json, os, base64, gzip

def md(s):  return {"cell_type": "markdown", "metadata": {}, "source": s.strip("\n").splitlines(keepends=True)}
def code(s): return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": s.strip("\n").splitlines(keepends=True)}
def nb(cells):
    return {"cells": cells,
            "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                          "language_info": {"name": "python", "version": "3.10"},
                          "accelerator": "GPU", "colab": {"provenance": []}},
            "nbformat": 4, "nbformat_minor": 5}

HERE = os.path.dirname(os.path.abspath(__file__))
def _gz64(fn):
    return base64.b64encode(gzip.compress(open(os.path.join(HERE, fn), "rb").read())).decode()
_EMBED = {fn: _gz64(fn) for fn in ("mil_models.py", "mil_utils.py", "mil_tcga.py")}

def setup_cells(kind="use"):
    """kind='build' (nb01: installs WSI deps) or 'use' (nb02-05: load cache only)."""
    L = ["# === Colab setup - RUN THIS CELL FIRST ===",
         "import os, base64, gzip"]
    if kind == "build":
        L += [
            "# WSI pipeline dependencies (OpenSlide + timm for H-optimus-0)",
            "import subprocess",
            "def _sh(c): print('$', c); subprocess.run(c, shell=True)",
            "try:",
            "    import openslide  # noqa",
            "except Exception:",
            "    _sh('apt-get -qq update && apt-get -qq install -y openslide-tools')",
            "    _sh('pip -q install openslide-python timm einops')",
        ]
    L += [
        "# Mount Google Drive for the persistent feature cache (encode once, reuse)",
        "try:",
        "    from google.colab import drive; drive.mount('/content/drive')",
        "    CACHE = '/content/drive/MyDrive/pathology_mil_tcga'",
        "except Exception:",
        "    CACHE = os.path.abspath('./pathology_mil_tcga')   # local fallback",
        "CACHE_BAGS = os.path.join(CACHE, 'bags'); os.makedirs(CACHE_BAGS, exist_ok=True)",
        "MODEL_PATH = os.path.join(CACHE, 'mil_model.pt')",
        "# Write the course helper modules so the notebook is self-contained",
        "_FILES = {",
    ]
    for fn, b in _EMBED.items():
        L.append(f"    '{fn}': '{b}',")
    L += [
        "}",
        "for _n, _b in _FILES.items():",
        "    with open(_n, 'w') as _f:",
        "        _f.write(gzip.decompress(base64.b64decode(_b)).decode('utf-8'))",
        "print('setup complete | feature cache:', CACHE)",
    ]
    note = ("## ⚙️ Colab setup\n\nRun the cell below **first**. It mounts Google Drive (the feature "
            "cache lives there so the expensive download+encode happens once and is reused by every notebook), "
            "and writes the course helper modules. **Use a GPU runtime** (Runtime → Change runtime type → GPU).")
    return [md(note), code("\n".join(L))]

def save(name, cells, kind="use"):
    cells = [cells[0]] + setup_cells(kind) + cells[1:]
    with open(os.path.join(HERE, name), "w") as f:
        json.dump(nb(cells), f, indent=1)
    print("wrote", name, f"({len(cells)} cells)")

# =====================================================================
# 01 - DATA PREPARATION (build the TCGA feature cache)
# =====================================================================
n1 = [
md(r"""
# 01 · Data Preparation — build the TCGA feature cache

**Introduction to Pathology MIL — Notebook 1 of 5 · real TCGA data**

We build feature *bags* from **real TCGA whole-slide images** for NSCLC subtyping —
**TCGA-LUAD (0) vs TCGA-LUSC (1)** — following the standard pipeline:

> **GDC query → download .svs → tissue segmentation → 20× patching → H-optimus-0 features → cache (N×d) bag**

The slides come from the public [GDC data portal](https://portal.gdc.cancer.gov) (open-access
diagnostic slides, no token needed). Features are extracted with **H-optimus-0** (Bioptimus,
ViT-G, embedding dim 1536) — an open foundation model, no gating.

⚠️ **This notebook does real work:** it downloads multi-hundred-MB slides and runs a large
encoder, so **use a GPU runtime** and expect it to take a while. Slides are processed one at a
time and deleted after encoding, so disk stays small; only the tiny `(N×d)` bags are kept on
**Google Drive**, where notebooks 02–05 read them.
"""),
md("## 1 · Configuration"),
code(r"""
import torch
from mil_tcga import build_cohort, load_bags, LABEL_NAME

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
if DEVICE != "cuda":
    print("⚠️  No GPU detected. H-optimus-0 is very slow on CPU — switch to a GPU runtime "
          "(Runtime → Change runtime type → GPU) before running the build.")

PER_CLASS    = 15      # slides per class (LUAD / LUSC). ~30 total. Lower this to go faster.
MAX_PATCHES  = 2000    # cap patches/slide to bound encode time & memory
ENCODER      = "bioptimus/H-optimus-0"
print(f"device={DEVICE} | per_class={PER_CLASS} | cache={CACHE}")
"""),
md(r"""
## 2 · Build (or resume) the cohort

`build_cohort` queries the GDC for the smallest qualifying diagnostic slides per class (one
slide per patient to avoid leakage), then for each slide: downloads → segments tissue (Otsu on
the saturation channel) → grids 256-px patches at 20× → encodes with H-optimus-0 → saves the
bag to Drive. It is **idempotent**: already-cached slides are skipped, so if Colab disconnects
you can just re-run this cell to resume.
"""),
code(r"""
rows = build_cohort(CACHE_BAGS, per_class=PER_CLASS, device=DEVICE,
                    encoder=ENCODER, max_patches=MAX_PATCHES)
"""),
md("## 3 · Inspect the cached cohort"),
code(r"""
data = load_bags(CACHE_BAGS)
import numpy as np
n_pos = sum(d["label"] == 1 for d in data)
print(f"{len(data)} bags cached | LUSC={n_pos}  LUAD={len(data)-n_pos}")
print(f"feature dim d = {data[0]['features'].shape[1]} (H-optimus-0)")
print(f"patches/slide: min={min(len(d['features']) for d in data)}, "
      f"max={max(len(d['features']) for d in data)}, "
      f"median={int(np.median([len(d['features']) for d in data]))}")
"""),
code(r"""
# Show one LUAD and one LUSC thumbnail from the cache (no slide re-download needed)
import matplotlib.pyplot as plt
fig, ax = plt.subplots(1, 2, figsize=(11, 5))
for a, lab in zip(ax, [0, 1]):
    d = next(x for x in data if x["label"] == lab)
    a.imshow(d["thumb"]); a.set_title(f"{LABEL_NAME[lab]}  ({len(d['features'])} patches)")
    a.axis("off")
plt.tight_layout(); plt.show()
"""),
md(r"""
### ✅ Takeaways
- A bag is `(N × d)`: `N` tissue patches per slide, each a 1536-d H-optimus-0 embedding.
- Feature extraction is the one GPU-heavy step — we **cache it to Drive** and reuse everywhere.
- The cache (`manifest.csv` + per-slide `.pt`) is what notebooks 02–05 load.

**Next:** `02 · Training` — train an attention MIL aggregator on these real bags.
"""),
]

# =====================================================================
# 02 - TRAINING
# =====================================================================
n2 = [
md(r"""
# 02 · Training — MIL aggregator on real TCGA bags

**Notebook 2 of 5.** We train the aggregator on the cached H-optimus-0 bags (LUAD vs LUSC):
a **mean-pool baseline**, **ABMIL**, and **CLAM-SB**, with **patient-stratified k-fold** CV,
reported as **mean ± std**. Requires the Drive cache built by notebook 01.
"""),
code(r"""
import numpy as np, torch
from mil_tcga import load_bags
from mil_utils import patient_stratified_kfold, train_one, evaluate
from mil_models import build_model

torch.manual_seed(0); np.random.seed(0)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
data = load_bags(CACHE_BAGS)                 # raises a clear error if you skipped notebook 01
IN_DIM = data[0]["features"].shape[1]
print(f"{len(data)} bags | dim={IN_DIM} | LUSC={sum(d['label']==1 for d in data)} | device={DEVICE}")
"""),
md(r"""
## 1 · Class weights + the models

`mil_models.py` holds compact implementations (mean/max pool, gated **ABMIL**, **CLAM-SB**
with the instance-clustering auxiliary loss). With a small cohort we weight cross-entropy by
inverse class frequency and report balanced accuracy alongside AUROC.
"""),
code(r"""
import inspect, mil_models
print(inspect.getsource(mil_models.GatedAttention))
labels = np.array([d["label"] for d in data])
cw = labels.size / (2.0 * np.maximum(np.bincount(labels, minlength=2), 1))
print("class counts:", np.bincount(labels, minlength=2), "| weights:", cw.round(3))
"""),
md(r"""
## 2 · Patient-stratified cross-validation

**Split by patient, never by slide.** With only ~30 slides these numbers are *illustrative*
(wide error bars) — the point is the methodology and beating the mean-pool baseline.
"""),
code(r"""
N_FOLDS, EPOCHS = 4, 25
results = {m: [] for m in ["mean", "abmil", "clam_sb"]}
for fold, (tr, va) in enumerate(patient_stratified_kfold(data, n_folds=N_FOLDS, seed=2)):
    assert not ({data[i]['patient_id'] for i in tr} & {data[i]['patient_id'] for i in va})
    for name in results:
        model = build_model(name, IN_DIM, n_classes=2)
        model, _ = train_one(model, data, tr, va, epochs=EPOCHS, lr=2e-4,
                             class_weights=cw, device=DEVICE, patience=8)
        results[name].append(evaluate(model, data, va, device=DEVICE)["auroc"])
    print(f"fold {fold}: " + " | ".join(f"{n}={results[n][-1]:.3f}" for n in results))

print("\n=== cross-validated AUROC (mean ± std) ===")
for name, aucs in results.items():
    print(f"  {name:9s}: {np.nanmean(aucs):.3f} ± {np.nanstd(aucs):.3f}")
"""),
md("## 3 · Train a final CLAM-SB on all data and cache it to Drive"),
code(r"""
idx = np.arange(len(data)); np.random.shuffle(idx)
cut = int(0.8 * len(idx)); tr, va = idx[:cut].tolist(), idx[cut:].tolist()
final = build_model("clam_sb", IN_DIM, n_classes=2)
final, hist = train_one(final, data, tr, va, epochs=40, lr=2e-4,
                        class_weights=cw, device=DEVICE, patience=10, verbose=True)
torch.save({"state_dict": final.state_dict(), "model": "clam_sb",
            "in_dim": IN_DIM, "n_classes": 2}, MODEL_PATH)
print("saved model ->", MODEL_PATH, "| best val AUROC:", round(max(hist), 3))
"""),
md(r"""
### ✅ Takeaways
- Training the aggregator on cached features is fast — the encoder already did the heavy lifting.
- Patient-level splits + mean ± std + a mean-pool baseline = honest numbers (even on a tiny cohort).
- The trained model is cached to Drive for notebooks 03–04.

**Next:** `03 · Inference`.
"""),
]

# =====================================================================
# 03 - INFERENCE
# =====================================================================
n3 = [
md(r"""
# 03 · Inference — score a slide

**Notebook 3 of 5.** Load the cached model + bags from Drive and score a held-out slide:
one forward pass yields the class probability **and** the per-patch attention (used in 04).
"""),
code(r"""
import numpy as np, torch
from mil_tcga import load_bags, LABEL_NAME
from mil_models import build_model

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
ckpt = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
model = build_model(ckpt["model"], ckpt["in_dim"], ckpt["n_classes"])
model.load_state_dict(ckpt["state_dict"]); model.to(DEVICE).eval()
data = load_bags(CACHE_BAGS)
print("loaded", ckpt["model"], "| dim", ckpt["in_dim"], "| bags", len(data))
"""),
md("## 1 · Forward pass → probability + attention"),
code(r"""
sample = data[-1]                                  # a slide to score
feats  = torch.from_numpy(sample["features"]).to(DEVICE)

@torch.no_grad()
def predict(model, feats):
    logits, attn, _ = model(feats)
    return torch.softmax(logits, 1)[0].cpu().numpy(), attn.cpu().numpy()

prob, attn = predict(model, feats)
print(f"slide {sample['slide_id'][:8]} | true = {LABEL_NAME[sample['label']]}")
print(f"P(LUAD)={prob[0]:.3f}   P(LUSC)={prob[1]:.3f}  ->  pred = {LABEL_NAME[int(prob.argmax())]}")
print(f"attention: {attn.shape[0]} patches, sums to {attn.sum():.2f}, max weight {attn.max():.3f}")
"""),
md("## 2 · Confidence / abstention gate"),
code(r"""
def decision(prob, low=0.4, high=0.6):
    p = float(prob[1])
    if p >= high: return "LUSC"
    if p <= low:  return "LUAD"
    return "UNCERTAIN — route to pathologist"
print("call:", decision(prob))
"""),
md(r"""
### ✅ Takeaways
- Inference reuses the cached features; the head is sub-second.
- One pass gives the probability **and** the attention map.

**Next:** `04 · Post-processing` — attention heatmaps & case aggregation.
"""),
]

# =====================================================================
# 04 - POST-PROCESSING
# =====================================================================
n4 = [
md(r"""
# 04 · Post-processing — heatmaps, top-k, case aggregation

**Notebook 4 of 5.** Turn the attention vector into an interpretable **heatmap** overlaid on the
cached slide thumbnail, pull the **top-k attended patches**, and aggregate **slide → patient**.

> ⚠️ Attention *localises* but does not *prove* causation — treat hotspots as a hypothesis for
> the pathologist, not ground truth.
"""),
code(r"""
import numpy as np, torch
import matplotlib.pyplot as plt
from mil_tcga import load_bags, LABEL_NAME
from mil_models import build_model

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
ckpt = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
model = build_model(ckpt["model"], ckpt["in_dim"], ckpt["n_classes"])
model.load_state_dict(ckpt["state_dict"]); model.to(DEVICE).eval()
data = load_bags(CACHE_BAGS)

sample = data[0]
with torch.no_grad():
    _, attn, _ = model(torch.from_numpy(sample["features"]).to(DEVICE))
attn = attn.cpu().numpy()
"""),
md("## 1 · Attention heatmap over the slide thumbnail"),
code(r"""
thumb, ds = sample["thumb"], sample["thumb_ds"]    # cached in notebook 01
coords = sample["coords"]
tx, ty = coords[:, 0] / ds, coords[:, 1] / ds      # level-0 coords -> thumbnail pixels
a = (attn - attn.min()) / (attn.ptp() + 1e-8)

fig, ax = plt.subplots(1, 2, figsize=(12, 5))
ax[0].imshow(thumb); ax[0].set_title(f"{LABEL_NAME[sample['label']]} slide"); ax[0].axis("off")
ax[1].imshow(thumb)
sc = ax[1].scatter(tx, ty, c=a, cmap="magma", s=14, alpha=0.6)
ax[1].set_title("attention heatmap"); ax[1].axis("off")
plt.colorbar(sc, ax=ax[1], fraction=0.046, label="attention")
plt.tight_layout(); plt.show()
"""),
md("## 2 · Top-k attended patches (evidence panel)"),
code(r"""
k = 8
top = np.argsort(-attn)[:k]
print("top-k patch (x,y) at level 0 and attention weight:")
for i in top:
    print(f"  ({coords[i,0]:>7d},{coords[i,1]:>7d})  a={attn[i]:.4f}")
# On real data you can re-open the slide and crop these coords to display the tiles.
"""),
md("## 3 · Slide → patient aggregation"),
code(r"""
from collections import defaultdict
@torch.no_grad()
def slide_prob(d):
    logits, _, _ = model(torch.from_numpy(d["features"]).to(DEVICE))
    return torch.softmax(logits, 1)[0, 1].item()

by_patient = defaultdict(list)
for d in data:
    by_patient[d["patient_id"]].append((slide_prob(d), d["label"]))

print(f"{'patient':14s} {'p(LUSC)':>8s} {'call':>6s}  truth")
for pid, rec in list(by_patient.items())[:12]:
    case_p = max(p for p, _ in rec); truth = LABEL_NAME[max(l for _, l in rec)]
    print(f"{pid:14s} {case_p:8.2f} {LABEL_NAME[int(case_p>=0.5)]:>6s}  {truth}")
"""),
md(r"""
### ✅ Takeaways
- The heatmap shows which regions drove the call — review it against the morphology.
- Top-k tiles give a fast, auditable evidence panel.
- Report at the patient level when a patient has multiple slides.

**Next:** `05 · Evaluation & Visualization`.
"""),
]

# =====================================================================
# 05 - EVALUATION & VISUALIZATION
# =====================================================================
n5 = [
md(r"""
# 05 · Evaluation & Visualization

**Notebook 5 of 5.** Honest metrics (**AUROC / AUPRC / balanced accuracy**) over patient-stratified
folds, a **ROC curve**, a **confusion matrix**, and a **UMAP** of the H-optimus-0 patch embeddings.
"""),
code(r"""
import numpy as np, torch
import matplotlib.pyplot as plt
from mil_tcga import load_bags, LABEL_NAME
from mil_models import build_model
from mil_utils import patient_stratified_kfold, train_one, evaluate, compute_metrics

torch.manual_seed(0); np.random.seed(0)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
data = load_bags(CACHE_BAGS)
IN_DIM = data[0]["features"].shape[1]
"""),
md("## 1 · Out-of-fold metrics (every slide scored by a model that didn't see it)"),
code(r"""
labels = np.array([d["label"] for d in data])
cw = labels.size / (2.0 * np.maximum(np.bincount(labels, minlength=2), 1))
oof_y, oof_p, per_fold = [], [], []
for tr, va in patient_stratified_kfold(data, n_folds=4, seed=2):
    model = build_model("clam_sb", IN_DIM, 2)
    model, _ = train_one(model, data, tr, va, epochs=25, class_weights=cw, device=DEVICE, patience=8)
    m, y, p = evaluate(model, data, va, device=DEVICE, return_probs=True)
    per_fold.append(m); oof_y += y.tolist(); oof_p += p.tolist()
oof_y, oof_p = np.array(oof_y), np.array(oof_p)
print("per-fold (mean ± std):")
for k in ["auroc", "auprc", "balanced_acc"]:
    v = [m[k] for m in per_fold]; print(f"  {k:12s}: {np.nanmean(v):.3f} ± {np.nanstd(v):.3f}")
print("pooled out-of-fold:", {k: round(v, 3) for k, v in compute_metrics(oof_y, oof_p).items()})
"""),
md("## 2 · ROC curve and confusion matrix"),
code(r"""
def roc_points(y, p):
    thr = np.unique(np.concatenate([[0], p, [1]]))[::-1]
    P, Nn = max(y.sum(), 1), max((1 - y).sum(), 1)
    tpr = [((p >= t) & (y == 1)).sum() / P for t in thr]
    fpr = [((p >= t) & (y == 0)).sum() / Nn for t in thr]
    return np.array(fpr), np.array(tpr)

fpr, tpr = roc_points(oof_y, oof_p)
auc = compute_metrics(oof_y, oof_p)["auroc"]
fig, ax = plt.subplots(1, 2, figsize=(11, 4.4))
ax[0].plot(fpr, tpr, lw=2, label=f"AUROC={auc:.3f}"); ax[0].plot([0,1],[0,1],"--",c="gray")
ax[0].set_xlabel("FPR"); ax[0].set_ylabel("TPR"); ax[0].set_title("ROC (out-of-fold)"); ax[0].legend()
pred = (oof_p >= 0.5).astype(int)
cm = np.array([[((pred==j)&(oof_y==i)).sum() for j in (0,1)] for i in (0,1)])
ax[1].imshow(cm, cmap="Purples")
for i in range(2):
    for j in range(2):
        ax[1].text(j, i, cm[i,j], ha="center", va="center", fontsize=14,
                   color="white" if cm[i,j] > cm.max()/2 else "black")
ax[1].set_xticks([0,1], ["pred LUAD","pred LUSC"]); ax[1].set_yticks([0,1], ["LUAD","LUSC"])
ax[1].set_title("confusion @0.5")
plt.tight_layout(); plt.show()
"""),
md("## 3 · UMAP of H-optimus-0 patch embeddings (coloured by slide label)"),
code(r"""
rng = np.random.default_rng(0)
feats, lab = [], []
for d in data:
    n = min(80, len(d["features"]))
    sel = rng.choice(len(d["features"]), n, replace=False)
    feats.append(d["features"][sel]); lab.append(np.full(n, d["label"]))
X = np.concatenate(feats); lab = np.concatenate(lab)
try:
    import umap
    emb = umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=0).fit_transform(X)
    title = "UMAP of patch embeddings"
except Exception:
    Xc = X - X.mean(0); _, _, Vt = np.linalg.svd(Xc, full_matrices=False)
    emb = Xc @ Vt[:2].T; title = "PCA of patch embeddings (pip install umap-learn for UMAP)"
plt.figure(figsize=(6, 5))
for c, name in [(0, "LUAD"), (1, "LUSC")]:
    plt.scatter(emb[lab==c, 0], emb[lab==c, 1], s=8, alpha=.4, label=name)
plt.legend(); plt.title(title); plt.tight_layout(); plt.show()
"""),
md(r"""
### ✅ Honest-evaluation checklist
- ✅ Split by **patient**, report **mean ± std** across folds.
- ✅ Beat a **mean-pool baseline** (notebook 02).
- ✅ Report **AUROC + balanced accuracy + AUPRC** (small/imbalanced cohorts mislead on accuracy).
- ✅ Inspect **attention overlays** (notebook 04) and the **UMAP** above.
- ⚠️ ~30 slides is a *teaching* cohort — quote an **external cohort** for real claims.

That completes the TCGA pipeline: **download → encode → train → infer → post-process → evaluate.**
"""),
]

save("01_data_preparation.ipynb", n1, kind="build")
save("02_training.ipynb", n2, kind="use")
save("03_inference.ipynb", n3, kind="use")
save("04_postprocessing.ipynb", n4, kind="use")
save("05_evaluation_visualization.ipynb", n5, kind="use")
print("\nAll TCGA notebooks built.")
