#!/usr/bin/env python3
"""Build the 5 course notebooks as .ipynb JSON (no external deps)."""
import json, os

def md(s):  return {"cell_type": "markdown", "metadata": {}, "source": s.strip("\n").splitlines(keepends=True)}
def code(s): return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": s.strip("\n").splitlines(keepends=True)}
def nb(cells):
    return {"cells": cells,
            "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                          "language_info": {"name": "python", "version": "3.10"}},
            "nbformat": 4, "nbformat_minor": 5}

HERE = os.path.dirname(os.path.abspath(__file__))

# --- embed the helper modules (base64 = robust against any quoting) ---
import base64
def _b64(fn):
    return base64.b64encode(open(os.path.join(HERE, fn), "rb").read()).decode()
_MODELS_B64 = _b64("mil_models.py")
_UTILS_B64  = _b64("mil_utils.py")

def setup_cells(ensure="helpers"):
    """A self-contained Colab setup: writes the helper modules and (optionally)
    regenerates prerequisite data/model so each notebook runs standalone."""
    lines = [
        "# === Colab setup — RUN THIS CELL FIRST ===",
        "# Makes the notebook self-contained: writes the helper modules used below.",
        "# Colab already ships torch / numpy / matplotlib, so no pip install is needed.",
        "import os, base64",
        "",
        "_FILES = {",
        f"    'mil_models.py': '{_MODELS_B64}',",
        f"    'mil_utils.py': '{_UTILS_B64}',",
        "}",
        "for _name, _b in _FILES.items():",
        "    with open(_name, 'w') as _f:",
        "        _f.write(base64.b64decode(_b).decode('utf-8'))",
        "print('helper modules written:', list(_FILES))",
    ]
    if ensure in ("data", "model"):
        lines += [
            "",
            "# regenerate the synthetic feature bags if this notebook is run on its own",
            "import pickle",
            "if not os.path.exists('synthetic_bags.pkl'):",
            "    from mil_utils import make_synthetic_dataset",
            "    _d, _ = make_synthetic_dataset(n_patients=80, in_dim=512, seed=1)",
            "    pickle.dump(_d, open('synthetic_bags.pkl', 'wb'))",
            "    print('generated synthetic_bags.pkl')",
        ]
    if ensure == "model":
        lines += [
            "",
            "# quick-train a model if mil_model.pt is missing (so this notebook stands alone)",
            "if not os.path.exists('mil_model.pt'):",
            "    import torch, numpy as np",
            "    from mil_models import build_model",
            "    from mil_utils import train_one",
            "    _data = pickle.load(open('synthetic_bags.pkl', 'rb'))",
            "    _IN = _data[0]['features'].shape[1]",
            "    _idx = np.arange(len(_data)); np.random.shuffle(_idx); _c = int(0.85 * len(_idx))",
            "    _m = build_model('clam_sb', _IN, 2)",
            "    _m, _ = train_one(_m, _data, _idx[:_c].tolist(), _idx[_c:].tolist(), epochs=20, device='cpu')",
            "    torch.save({'state_dict': _m.state_dict(), 'model': 'clam_sb', 'in_dim': _IN, 'n_classes': 2}, 'mil_model.pt')",
            "    print('trained mil_model.pt')",
        ]
    setup_md = md("## ⚙️ Colab setup\n\nRun the cell below **first**. It writes the helper modules (`mil_models.py`, "
                  "`mil_utils.py`) and regenerates any prerequisite data, so this notebook runs **standalone** in "
                  "Google Colab — just choose *Runtime → Run all*. Colab already includes torch, numpy and matplotlib.")
    return [setup_md, code("\n".join(lines))]

def save(name, cells, ensure="helpers"):
    cells = [cells[0]] + setup_cells(ensure) + cells[1:]   # title md, then setup, then body
    with open(os.path.join(HERE, name), "w") as f:
        json.dump(nb(cells), f, indent=1)
    print("wrote", name, f"({len(cells)} cells)")

# =====================================================================
# 01 — DATA PREPARATION
# =====================================================================
n1 = [
md(r"""
# 01 · Data Preparation — from a WSI to a feature bag

**Introduction to Pathology MIL — Notebook 1 of 5**

Goal: turn one gigapixel whole-slide image (WSI) into the `(N × d)` tensor of patch
features that every MIL model consumes — a *bag*. We follow the standard CLAM-style
pipeline:

> **WSI → tissue segmentation → patching → frozen foundation encoder → bag tensor**

This notebook shows the **real TCGA/OpenSlide pipeline** *and* a **synthetic fallback**
so you can run the rest of the course with no slide download and no GPU.
"""),
md(r"""
## 0 · Environment

Real pipeline needs: `openslide-python` (+ the OpenSlide C library), `opencv-python`,
`torch`, `timm`, `huggingface_hub`, and access to a foundation encoder
(e.g. `MahmoodLab/UNI2-h` or `MahmoodLab/CONCH`, which are gated — request access on
the Hugging Face Hub and `huggingface-cli login`).

```bash
pip install openslide-python opencv-python torch timm huggingface_hub h5py numpy matplotlib
# system: apt-get install openslide-tools   (or: brew install openslide)
```
"""),
code(r"""
import numpy as np, os
import matplotlib.pyplot as plt

# Toggle: set to True if you have OpenSlide + a real .svs slide + GPU access.
USE_REAL_WSI = False

# Real pipeline config (edit paths to your environment)
WSI_PATH   = "/data/TCGA/TCGA-XX-XXXX.svs"   # a TCGA diagnostic slide (GDC portal)
ENCODER_ID = "MahmoodLab/UNI2-h"             # gated; or "MahmoodLab/CONCH"
TARGET_MPP = 0.5      # 20x  (microns per pixel)
PATCH_PX   = 256      # tile size at the target magnification
OUT_DIR    = "bags"; os.makedirs(OUT_DIR, exist_ok=True)
"""),
md(r"""
## 1 · Open the WSI and read its pyramid

A WSI is a multi-resolution pyramid. **Always read the true microns-per-pixel (mpp)** —
"20×" differs between scanners. We compute the pyramid level whose downsample gets us
closest to `TARGET_MPP`.
"""),
code(r"""
def open_wsi(path):
    import openslide
    slide = openslide.OpenSlide(path)
    mpp_x = float(slide.properties.get(openslide.PROPERTY_NAME_MPP_X, "nan"))
    print("levels:", slide.level_count, "| dims L0:", slide.dimensions,
          "| downsamples:", [round(d, 1) for d in slide.level_downsamples])
    print("native mpp_x:", mpp_x)
    return slide, mpp_x

if USE_REAL_WSI:
    slide, base_mpp = open_wsi(WSI_PATH)
    # patch size in level-0 pixels so that the *physical* tile == PATCH_PX @ TARGET_MPP
    patch_l0 = int(round(PATCH_PX * (TARGET_MPP / base_mpp)))
    print("patch size in level-0 px:", patch_l0)
"""),
md(r"""
## 2 · Tissue segmentation (skip the glass)

CLAM recipe: downsample → HSV → Otsu-threshold the **saturation** channel → median blur
+ morphological close → contours. This bounds where we sample patches.
"""),
code(r"""
def segment_tissue(slide, seg_downsample=64, sthresh=8, mthresh=7, close=4, min_area_frac=1e-3):
    import cv2, openslide
    # pick a level near the requested downsample
    level = min(range(slide.level_count),
                key=lambda l: abs(slide.level_downsamples[l] - seg_downsample))
    img = np.array(slide.read_region((0, 0), level, slide.level_dimensions[level]))[..., :3]
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    sat = cv2.medianBlur(hsv[..., 1], mthresh)
    _, mask = cv2.threshold(sat, sthresh, 255, cv2.THRESH_OTSU + cv2.THRESH_BINARY)
    kernel = np.ones((close, close), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    min_area = min_area_frac * mask.size
    contours = [c for c in contours if cv2.contourArea(c) > min_area]
    scale = slide.level_downsamples[level]   # map contour coords back to level 0
    return mask, contours, scale

if USE_REAL_WSI:
    mask, contours, seg_scale = segment_tissue(slide)
    print("tissue contours kept:", len(contours))
    plt.imshow(mask, cmap="gray"); plt.title("tissue mask"); plt.axis("off"); plt.show()
"""),
md(r"""
## 3 · Patching — tile the tissue into instances

We lay a non-overlapping grid over the slide and keep tiles whose centre falls inside a
tissue contour. **Coords-first**: store `(x, y)` level-0 coordinates, lazy-load pixels at
encode time (CLAM's fast, disk-light trick).
"""),
code(r"""
def grid_coords(slide, contours, seg_scale, patch_l0):
    import cv2
    W, H = slide.dimensions
    coords = []
    for y in range(0, H - patch_l0, patch_l0):
        for x in range(0, W - patch_l0, patch_l0):
            cx, cy = (x + patch_l0 / 2) / seg_scale, (y + patch_l0 / 2) / seg_scale
            if any(cv2.pointPolygonTest(c, (cx, cy), False) >= 0 for c in contours):
                coords.append((x, y))
    return np.array(coords, dtype=np.int64)

if USE_REAL_WSI:
    coords = grid_coords(slide, contours, seg_scale, patch_l0)
    print("patches in tissue:", len(coords))
"""),
md(r"""
## 4 · Feature extraction — patches → embeddings (the expensive step)

Each tile is read at level 0, resized to `PATCH_PX`, normalised, and pushed through a
**frozen** foundation encoder. This is the one GPU-bound pass; cache the result.
Embedding dim `d` depends on the encoder (UNI2 = 1536, Virchow2 = 2560, CONCH v1.5 = 768).
"""),
code(r"""
def build_encoder(encoder_id):
    import torch, timm
    from huggingface_hub import login  # ensure you've logged in & accepted the licence
    # UNI / UNI2 load via timm; see the model card for the exact init args.
    model = timm.create_model(f"hf-hub:{encoder_id}", pretrained=True,
                              num_classes=0, dynamic_img_size=True)
    model.eval().requires_grad_(False)
    return model

def extract_features(slide, coords, model, patch_l0, patch_px=256, batch=128, device="cuda"):
    import torch
    from torchvision import transforms
    tfm = transforms.Compose([
        transforms.ToTensor(),
        transforms.Resize(patch_px, antialias=True),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    model.to(device)
    feats = []
    with torch.no_grad():
        for i in range(0, len(coords), batch):
            tiles = []
            for (x, y) in coords[i:i + batch]:
                im = slide.read_region((int(x), int(y)), 0, (patch_l0, patch_l0)).convert("RGB")
                tiles.append(tfm(im))
            out = model(torch.stack(tiles).to(device))      # (B, d)
            feats.append(out.float().cpu())
    return torch.cat(feats)                                  # (N, d)

if USE_REAL_WSI:
    import torch
    enc = build_encoder(ENCODER_ID)
    bag = extract_features(slide, coords, enc, patch_l0)
    print("bag tensor:", tuple(bag.shape))
    slide_id = os.path.splitext(os.path.basename(WSI_PATH))[0]
    torch.save({"features": bag, "coords": torch.from_numpy(coords)},
               os.path.join(OUT_DIR, f"{slide_id}.pt"))
    print("saved", f"{slide_id}.pt")
"""),
md(r"""
## 5 · Synthetic fallback — make bags without a slide

So the rest of the course is runnable anywhere, `mil_utils.make_synthetic_dataset`
generates `(N × d)` bags that behave like real encoder output: most patches are
background, and **positive** slides contain a small planted "tumor" focus — exactly the
MIL assumption (bag positive ⇔ ≥1 positive instance).
"""),
code(r"""
from mil_utils import make_synthetic_dataset

data, tumor_dir = make_synthetic_dataset(n_patients=80, in_dim=512, seed=1)
print(f"{len(data)} slides | positives: {sum(d['label'] for d in data)}")
d0 = next(d for d in data if d['label'] == 1)
print("example positive bag:", d0['features'].shape,
      "| tumor patches:", int(d0['tumor_mask'].sum()), "/", len(d0['tumor_mask']))

# persist for the next notebooks
import pickle
with open("synthetic_bags.pkl", "wb") as f:
    pickle.dump(data, f)
print("saved synthetic_bags.pkl")
"""),
code(r"""
# Visualise a bag: project features to 2-D and colour the planted tumor patches
X = d0['features']; m = d0['tumor_mask']
Xc = X - X.mean(0)
U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
pc = Xc @ Vt[:2].T
plt.figure(figsize=(5, 4))
plt.scatter(pc[~m, 0], pc[~m, 1], s=8, alpha=.4, label="benign")
plt.scatter(pc[m, 0],  pc[m, 1],  s=18, c="crimson", label="tumor (planted)")
plt.legend(); plt.title("One bag in feature space (PCA)"); plt.xlabel("PC1"); plt.ylabel("PC2")
plt.tight_layout(); plt.show()
"""),
md(r"""
### ✅ Takeaways
- A bag is `(N × d)`: `N` tissue patches, each a `d`-dim embedding from a **frozen** encoder.
- Segmentation + coords-first patching make this fast and disk-light.
- Feature extraction is the only GPU-heavy step — **cache it** and every later notebook reuses it.

**Next:** `02 · Training` — train an attention MIL aggregator on these bags.
"""),
]
save("01_data_preparation.ipynb", n1, ensure="helpers")

# =====================================================================
# 02 — TRAINING
# =====================================================================
n2 = [
md(r"""
# 02 · Training Protocols — train a MIL aggregator

**Introduction to Pathology MIL — Notebook 2 of 5**

We train the small aggregator on cached bags (the **frozen encoder** already did the heavy
lifting). Covered here:
- a **mean-pool baseline** (you must beat it),
- **ABMIL** (gated attention) and **CLAM-SB** (attention + instance-clustering loss),
- **patient-stratified k-fold** CV (leakage-safe),
- weighted cross-entropy + early stopping, reported as **mean ± std** over folds.

Requires `torch`. Bags come from notebook 01 (real) or the synthetic fallback.
"""),
code(r"""
import numpy as np, pickle, torch
from mil_utils import patient_stratified_kfold, train_one, evaluate
from mil_models import build_model

torch.manual_seed(0); np.random.seed(0)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

with open("synthetic_bags.pkl", "rb") as f:   # produced by notebook 01
    data = pickle.load(f)
IN_DIM = data[0]['features'].shape[1]
print(f"{len(data)} slides | dim={IN_DIM} | positives={sum(d['label'] for d in data)} | device={DEVICE}")
"""),
md(r"""
## 1 · The models

See `mil_models.py` for compact, commented implementations. The key object is the
**gated attention** module: `a_i = softmax_i( wᵀ [tanh(V h_i) ⊙ sigmoid(U h_i)] )`.
CLAM-SB adds an instance-clustering auxiliary loss over the top-/bottom-k attended patches.
"""),
code(r"""
import inspect, mil_models
print(inspect.getsource(mil_models.GatedAttention))
"""),
md(r"""
## 2 · Class weights for imbalance

Pathology cohorts are often imbalanced. We weight the cross-entropy by inverse class
frequency and report **balanced accuracy** alongside AUROC.
"""),
code(r"""
labels = np.array([d['label'] for d in data])
counts = np.bincount(labels, minlength=2)
class_weights = counts.sum() / (2.0 * np.maximum(counts, 1))
print("class counts:", counts, "| weights:", class_weights.round(3))
"""),
md(r"""
## 3 · Patient-stratified cross-validation

**Split by patient, never by slide** — otherwise two slides from the same patient leak
across train/val. We compare mean-pool, ABMIL, and CLAM-SB over the same folds.
"""),
code(r"""
N_FOLDS, EPOCHS = 5, 25
results = {m: [] for m in ["mean", "abmil", "clam_sb"]}

for fold, (tr, va) in enumerate(patient_stratified_kfold(data, n_folds=N_FOLDS, seed=2)):
    # sanity: no patient appears in both splits
    assert not ({data[i]['patient_id'] for i in tr} & {data[i]['patient_id'] for i in va})
    for name in results:
        model = build_model(name, IN_DIM, n_classes=2)
        model, _ = train_one(model, data, tr, va, epochs=EPOCHS, lr=2e-4,
                             class_weights=class_weights, device=DEVICE, patience=8)
        m = evaluate(model, data, va, device=DEVICE)
        results[name].append(m['auroc'])
    print(f"fold {fold}: " + " | ".join(f"{n}={results[n][-1]:.3f}" for n in results))
"""),
code(r"""
print("\n=== Cross-validated AUROC (mean ± std over folds) ===")
for name, aucs in results.items():
    print(f"  {name:9s}: {np.mean(aucs):.3f} ± {np.std(aucs):.3f}")
print("\nRule of thumb: if the attention models can't beat 'mean', something is wrong.")
"""),
md(r"""
## 4 · Train a final model on all data and save it

For deployment / the inference notebook, refit on the full set with early stopping on a
held-out slice, then persist weights + the config needed to rebuild the model.
"""),
code(r"""
idx = np.arange(len(data)); np.random.shuffle(idx)
cut = int(0.85 * len(idx)); tr, va = idx[:cut].tolist(), idx[cut:].tolist()

final = build_model("clam_sb", IN_DIM, n_classes=2)
final, hist = train_one(final, data, tr, va, epochs=40, lr=2e-4,
                        class_weights=class_weights, device=DEVICE, patience=10, verbose=True)
print("best val AUROC:", round(max(hist), 3))

torch.save({"state_dict": final.state_dict(), "model": "clam_sb",
            "in_dim": IN_DIM, "n_classes": 2}, "mil_model.pt")
print("saved mil_model.pt")
"""),
code(r"""
import matplotlib.pyplot as plt
plt.plot(hist, marker="o"); plt.xlabel("epoch"); plt.ylabel("val AUROC")
plt.title("CLAM-SB validation curve"); plt.grid(alpha=.3); plt.show()
"""),
md(r"""
### ✅ Takeaways
- Training the aggregator on cached features is fast (CPU-feasible).
- **Patient-level** splits + **mean ± std** over folds + a **mean-pool baseline** = honest numbers.
- CLAM-SB's instance loss usually sharpens attention and edges out plain ABMIL.

**Next:** `03 · Inference` — score a new slide with the saved model.
"""),
]
save("02_training.ipynb", n2, ensure="data")

# =====================================================================
# 03 — INFERENCE
# =====================================================================
n3 = [
md(r"""
# 03 · Inference — score a new slide

**Introduction to Pathology MIL — Notebook 3 of 5**

Inference = the training pipeline run **forward, no grad**. The same prep + frozen encoder
produce the bag; one forward pass yields **both** the class probability **and** the
per-patch attention vector (used for heatmaps in notebook 04).
"""),
code(r"""
import numpy as np, pickle, torch
from mil_models import build_model

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
ckpt = torch.load("mil_model.pt", map_location=DEVICE)
model = build_model(ckpt["model"], ckpt["in_dim"], ckpt["n_classes"])
model.load_state_dict(ckpt["state_dict"]); model.to(DEVICE).eval()
print("loaded", ckpt["model"], "| in_dim", ckpt["in_dim"])
"""),
md(r"""
## 1 · Build the bag for the new slide

Real pipeline: reuse notebook 01 (`segment_tissue → grid_coords → extract_features`) on the
new WSI — **identical mpp / patch size / encoder**. Here we pull an unseen synthetic slide.
"""),
code(r"""
with open("synthetic_bags.pkl", "rb") as f:
    data = pickle.load(f)
sample = data[-1]                      # pretend this is a freshly scanned slide
feats  = torch.from_numpy(sample["features"]).to(DEVICE)
coords = sample["coords"]
print("bag:", tuple(feats.shape), "| true label (hidden in practice):", sample["label"])
"""),
md("""
## 2 · Forward pass → probability + attention
"""),
code(r"""
@torch.no_grad()
def predict(model, feats):
    logits, attn, _ = model(feats)
    prob = torch.softmax(logits, dim=1)[0]
    return prob.cpu().numpy(), attn.cpu().numpy()

prob, attn = predict(model, feats)
pred = int(prob.argmax())
print(f"P(benign)={prob[0]:.3f}   P(tumor)={prob[1]:.3f}")
print(f"predicted class: {pred}  ({'tumor' if pred==1 else 'benign'})")
print(f"attention vector: shape={attn.shape}, sum={attn.sum():.3f} (≈1), "
      f"max patch weight={attn.max():.3f}")
"""),
md(r"""
## 3 · A simple confidence / abstention gate

In deployment, calibrate probabilities and **abstain** on low-confidence or
out-of-distribution slides, routing them to a human.
"""),
code(r"""
def decision(prob, low=0.35, high=0.65):
    p = float(prob[1])
    if p >= high:  return "TUMOR (review recommended)"
    if p <= low:   return "BENIGN"
    return "UNCERTAIN — route to pathologist"

print(decision(prob))
"""),
md(r"""
### ✅ Takeaways
- Inference reuses the exact prep + frozen encoder; the head is sub-second.
- One pass gives the probability **and** the attention map.
- Add calibration + abstention before anything touches a clinic.

**Next:** `04 · Post-processing` — turn that attention vector into a heatmap and evidence panel.
"""),
]
save("03_inference.ipynb", n3, ensure="model")

# =====================================================================
# 04 — POST-PROCESSING
# =====================================================================
n4 = [
md(r"""
# 04 · Post-processing — heatmaps, top-k, case aggregation

**Introduction to Pathology MIL — Notebook 4 of 5**

The attention vector is the interpretability payoff. Here we:
1. scatter attention back to patch coordinates → an **attention heatmap**,
2. pull the **top-k attended tiles** as an evidence panel,
3. **aggregate slides → patient** for the clinical decision.

> ⚠️ Attention *localises* but does not *prove* causation — treat hotspots as a hypothesis
> for the pathologist, not ground truth.
"""),
code(r"""
import numpy as np, pickle, torch
import matplotlib.pyplot as plt
from matplotlib import cm
from mil_models import build_model

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
ckpt = torch.load("mil_model.pt", map_location=DEVICE)
model = build_model(ckpt["model"], ckpt["in_dim"], ckpt["n_classes"])
model.load_state_dict(ckpt["state_dict"]); model.to(DEVICE).eval()

with open("synthetic_bags.pkl", "rb") as f:
    data = pickle.load(f)
sample = next(d for d in data if d["label"] == 1)     # a positive slide
feats  = torch.from_numpy(sample["features"]).to(DEVICE)
coords = sample["coords"]; tumor = sample["tumor_mask"]

with torch.no_grad():
    _, attn, _ = model(feats)
attn = attn.cpu().numpy()
"""),
md(r"""
## 1 · Attention heatmap

Each patch has a coordinate and an attention weight; scatter them and colour by weight.
On a real slide you would `alpha`-blend this over the level-3 thumbnail.
"""),
code(r"""
a = (attn - attn.min()) / (attn.ptp() + 1e-8)        # normalise to [0,1]
fig, ax = plt.subplots(1, 2, figsize=(11, 4.6))
sc = ax[0].scatter(coords[:, 0], -coords[:, 1], c=a, cmap="magma", s=14)
ax[0].set_title("Attention heatmap"); ax[0].axis("equal"); ax[0].axis("off")
plt.colorbar(sc, ax=ax[0], fraction=.046, label="attention")

ax[1].scatter(coords[~tumor, 0], -coords[~tumor, 1], c="lightgray", s=14, label="benign")
ax[1].scatter(coords[tumor, 0],  -coords[tumor, 1],  c="crimson",  s=20, label="tumor (truth)")
ax[1].set_title("Ground-truth tumor patches"); ax[1].axis("equal"); ax[1].axis("off"); ax[1].legend()
plt.tight_layout(); plt.show()
"""),
code(r"""
# Quantitative check: does attention concentrate on the planted tumor patches?
print(f"mean attention — tumor : {attn[tumor].mean():.2e}")
print(f"mean attention — benign: {attn[~tumor].mean():.2e}")
print(f"ratio (tumor / benign) : {attn[tumor].mean() / attn[~tumor].mean():.1f}×")
"""),
md("""
## 2 · Top-k evidence panel

Surface the highest-attention tiles so a pathologist can audit the model in seconds.
"""),
code(r"""
k = 8
top = np.argsort(-attn)[:k]
print("top-k patch indices:", top.tolist())
print("their attention   :", np.round(attn[top], 4).tolist())
print(f"of the top-{k} tiles, {int(tumor[top].sum())} are truly tumor patches")
# On real data you'd read these coords from the WSI and show the tile images:
#   tiles = [slide.read_region(tuple(coords[i]), 0, (P, P)) for i in top]
"""),
md(r"""
## 3 · Slide → patient aggregation

A patient may have several slides/blocks. Roll slide probabilities up to a patient
decision (max = "any positive slide ⇒ positive"), then threshold at a validation-chosen
operating point.
"""),
code(r"""
from collections import defaultdict
@torch.no_grad()
def slide_prob(d):
    logits, _, _ = model(torch.from_numpy(d["features"]).to(DEVICE))
    return torch.softmax(logits, 1)[0, 1].item()

by_patient = defaultdict(list)
for d in data:
    by_patient[d["patient_id"]].append((d["slide_id"], slide_prob(d), d["label"]))

THRESH = 0.5
print(f"{'patient':8s} {'slide probs':28s} {'case p(max)':>11s} {'call':>8s} truth")
for pid, slides in list(by_patient.items())[:8]:
    probs = [p for _, p, _ in slides]
    case_p = max(probs); truth = max(l for *_, l in slides)
    call = "TUMOR" if case_p >= THRESH else "benign"
    print(f"{pid:8s} {str([round(p,2) for p in probs]):28s} {case_p:11.2f} {call:>8s} {truth}")
"""),
md(r"""
### ✅ Takeaways
- The heatmap should concentrate on tumor — quantify it (tumor/benign attention ratio).
- Top-k tiles = a fast human-auditable evidence panel.
- Report at the level the clinic acts on — usually the **patient**.

**Next:** `05 · Evaluation & Visualization` — metrics, ROC curves, and UMAP.
"""),
]
save("04_postprocessing.ipynb", n4, ensure="model")

# =====================================================================
# 05 — EVALUATION & VISUALIZATION
# =====================================================================
n5 = [
md(r"""
# 05 · Evaluation & Visualization

**Introduction to Pathology MIL — Notebook 5 of 5**

Measure performance *honestly* and *see* what the model learned:
- metrics table (**AUROC, AUPRC, balanced accuracy**) with **mean ± std** over folds,
- **ROC curve** and **confusion matrix**,
- **UMAP** of patch embeddings (PCA fallback if `umap-learn` isn't installed),
- recap of the attention-overlay sanity check.
"""),
code(r"""
import numpy as np, pickle, torch
import matplotlib.pyplot as plt
from mil_models import build_model
from mil_utils import patient_stratified_kfold, train_one, evaluate, compute_metrics

torch.manual_seed(0); np.random.seed(0)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
with open("synthetic_bags.pkl", "rb") as f:
    data = pickle.load(f)
IN_DIM = data[0]["features"].shape[1]
"""),
md(r"""
## 1 · Cross-validated metrics, collected out-of-fold

We gather **out-of-fold** predictions so every slide is scored by a model that didn't see
it, then compute metrics on the pooled predictions and per-fold.
"""),
code(r"""
labels = np.array([d["label"] for d in data])
cw = labels.size / (2.0 * np.maximum(np.bincount(labels, minlength=2), 1))

oof_y, oof_p, per_fold = [], [], []
for tr, va in patient_stratified_kfold(data, n_folds=5, seed=2):
    model = build_model("clam_sb", IN_DIM, 2)
    model, _ = train_one(model, data, tr, va, epochs=25, class_weights=cw,
                         device=DEVICE, patience=8)
    m, y, p = evaluate(model, data, va, device=DEVICE, return_probs=True)
    per_fold.append(m); oof_y += y.tolist(); oof_p += p.tolist()

oof_y, oof_p = np.array(oof_y), np.array(oof_p)
print("=== per-fold (mean ± std) ===")
for key in ["auroc", "auprc", "balanced_acc"]:
    vals = [m[key] for m in per_fold]
    print(f"  {key:12s}: {np.mean(vals):.3f} ± {np.std(vals):.3f}")
print("\n=== pooled out-of-fold ===")
pooled = compute_metrics(oof_y, oof_p)
print({k: round(v, 3) for k, v in pooled.items()})
"""),
md("## 2 · ROC curve and confusion matrix"),
code(r"""
def roc_points(y, p):
    thr = np.unique(np.concatenate([[0], p, [1]]))[::-1]
    tpr, fpr = [], []
    P, Nn = y.sum(), (1 - y).sum()
    for t in thr:
        pred = p >= t
        tpr.append((pred & (y == 1)).sum() / max(P, 1))
        fpr.append((pred & (y == 0)).sum() / max(Nn, 1))
    return np.array(fpr), np.array(tpr)

fpr, tpr = roc_points(oof_y, oof_p)
fig, ax = plt.subplots(1, 2, figsize=(11, 4.4))
ax[0].plot(fpr, tpr, lw=2, label=f"AUROC = {pooled['auroc']:.3f}")
ax[0].plot([0, 1], [0, 1], "--", c="gray"); ax[0].set_xlabel("FPR"); ax[0].set_ylabel("TPR")
ax[0].set_title("ROC (out-of-fold)"); ax[0].legend()

pred = (oof_p >= 0.5).astype(int)
cm = np.array([[((pred == j) & (oof_y == i)).sum() for j in (0, 1)] for i in (0, 1)])
im = ax[1].imshow(cm, cmap="Purples")
for i in range(2):
    for j in range(2):
        ax[1].text(j, i, cm[i, j], ha="center", va="center",
                   color="white" if cm[i, j] > cm.max()/2 else "black", fontsize=14)
ax[1].set_xticks([0, 1], ["pred benign", "pred tumor"])
ax[1].set_yticks([0, 1], ["true benign", "true tumor"])
ax[1].set_title("Confusion matrix @0.5")
plt.tight_layout(); plt.show()
"""),
md(r"""
## 3 · UMAP of patch embeddings

Project pooled patch features to 2-D and colour by tissue type (here: planted-tumor vs
benign). Reveals whether the **encoder** separates tissue — a sanity check independent of
the MIL head. Falls back to PCA if `umap-learn` is unavailable.
"""),
code(r"""
# pool a manageable sample of patches across slides
feats, kind = [], []
rng = np.random.default_rng(0)
for d in rng.choice(data, size=40, replace=False):
    n = min(60, len(d["features"]))
    sel = rng.choice(len(d["features"]), n, replace=False)
    feats.append(d["features"][sel]); kind.append(d["tumor_mask"][sel])
X = np.concatenate(feats); kind = np.concatenate(kind)

try:
    import umap
    emb = umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=0).fit_transform(X)
    title = "UMAP of patch embeddings"
except Exception:
    Xc = X - X.mean(0); _, _, Vt = np.linalg.svd(Xc, full_matrices=False)
    emb = Xc @ Vt[:2].T; title = "PCA of patch embeddings (install umap-learn for UMAP)"

plt.figure(figsize=(6, 5))
plt.scatter(emb[~kind, 0], emb[~kind, 1], s=8, alpha=.4, label="benign")
plt.scatter(emb[kind, 0],  emb[kind, 1],  s=14, c="crimson", label="tumor")
plt.legend(); plt.title(title); plt.tight_layout(); plt.show()
"""),
md(r"""
## 4 · The honest-evaluation checklist

- ✅ Split by **patient**, report **mean ± std** across folds.
- ✅ Beat a **mean-pool baseline**.
- ✅ Headline **AUROC**, but also **balanced accuracy / AUPRC** under imbalance.
- ✅ Inspect **attention overlays** (catch shortcut learning) and **UMAP** (encoder quality).
- ✅ Quote an **external-cohort** number (different hospital/scanner) — internal CV is optimistic.

That completes the course pipeline: **data → train → infer → post-process → evaluate.**
Run the **NotebookLM quiz** (`quiz/MIL_quiz_source.md`) to test yourself.
"""),
]
save("05_evaluation_visualization.ipynb", n5, ensure="data")
print("\nAll notebooks built.")
