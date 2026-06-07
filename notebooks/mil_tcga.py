"""
mil_tcga.py — Real TCGA data pipeline for the Pathology MIL course.

Builds feature *bags* from real TCGA whole-slide images (no synthetic data):

    GDC query  →  download .svs  →  tissue segmentation  →  20x patching
               →  Midnight-12k feature extraction  →  cache (N×d) bag to disk

Task: NSCLC subtyping — TCGA-LUAD (label 0) vs TCGA-LUSC (label 1).

Designed for Google Colab with the feature cache on mounted Google Drive, so the
expensive download+encode happens **once** and notebooks 02–05 reuse the cached
bags across separate runtimes.

Disk-safe: slides are processed one at a time and the .svs is deleted right after
its bag is cached, so only the small (N×d) tensors accumulate.
"""
from __future__ import annotations
import os, io, csv, json, time
import numpy as np

GDC_FILES = "https://api.gdc.cancer.gov/files"
GDC_DATA  = "https://api.gdc.cancer.gov/data"
PROJECT_LABEL = {"TCGA-LUAD": 0, "TCGA-LUSC": 1}     # NSCLC subtypes
LABEL_NAME    = {0: "LUAD", 1: "LUSC"}


# ---------------------------------------------------------------------------
# 1. GDC: find and download open-access TCGA diagnostic slides
# ---------------------------------------------------------------------------
def gdc_query_slides(projects=("TCGA-LUAD", "TCGA-LUSC"), per_class=15, seed=0,
                     max_bytes=1_200_000_000):
    """Return a balanced, deterministic list of slide metadata dicts:
        {file_id, file_name, file_size, patient_id, project, label}
    Picks the *smallest* qualifying slides (faster to download) per class.
    """
    import requests
    filters = {"op": "and", "content": [
        {"op": "in", "content": {"field": "cases.project.project_id", "value": list(projects)}},
        {"op": "in", "content": {"field": "data_format", "value": ["SVS"]}},
        {"op": "in", "content": {"field": "experimental_strategy", "value": ["Diagnostic Slide"]}},
        {"op": "in", "content": {"field": "access", "value": ["open"]}},
    ]}
    params = {
        "filters": filters,
        "fields": "file_id,file_name,file_size,cases.submitter_id,cases.project.project_id",
        "format": "JSON", "size": "5000", "sort": "file_size:asc",
    }
    hits = requests.post(GDC_FILES, json=params, timeout=120).json()["data"]["hits"]

    by_class = {p: [] for p in projects}
    seen_patients = {p: set() for p in projects}
    for h in hits:
        case = h["cases"][0]
        proj = case["project"]["project_id"]
        pid = case["submitter_id"]
        size = int(h.get("file_size", 0))
        if proj not in by_class or size > max_bytes:
            continue
        if pid in seen_patients[proj]:          # one slide per patient (avoid leakage)
            continue
        seen_patients[proj].add(pid)
        by_class[proj].append({"file_id": h["file_id"], "file_name": h["file_name"],
                               "file_size": size, "patient_id": pid,
                               "project": proj, "label": PROJECT_LABEL[proj]})

    chosen = []
    for p in projects:
        chosen.extend(by_class[p][:per_class])   # already size-sorted ascending
    chosen.sort(key=lambda d: d["file_id"])      # deterministic order
    return chosen


def gdc_download(file_id, dest_path, retries=3):
    """Stream one open-access file from the GDC to dest_path."""
    import requests
    for attempt in range(retries):
        try:
            with requests.get(f"{GDC_DATA}/{file_id}", stream=True, timeout=600) as r:
                r.raise_for_status()
                with open(dest_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1 << 20):
                        if chunk:
                            f.write(chunk)
            return dest_path
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(5 * (attempt + 1))


# ---------------------------------------------------------------------------
# 2. Tissue segmentation + patching (CLAM-style)
# ---------------------------------------------------------------------------
def segment_tissue(slide, seg_downsample=64, sthresh=8, mthresh=7, close=4, min_area_frac=2e-3):
    import cv2
    level = min(range(slide.level_count),
                key=lambda l: abs(slide.level_downsamples[l] - seg_downsample))
    img = np.array(slide.read_region((0, 0), level, slide.level_dimensions[level]))[..., :3]
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    sat = cv2.medianBlur(hsv[..., 1], mthresh)
    _, mask = cv2.threshold(sat, sthresh, 255, cv2.THRESH_OTSU + cv2.THRESH_BINARY)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((close, close), np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    contours = [c for c in contours if cv2.contourArea(c) > min_area_frac * mask.size]
    return mask, contours, slide.level_downsamples[level]


def grid_coords(slide, contours, seg_scale, patch_l0, max_patches=None, seed=0):
    import cv2
    W, H = slide.dimensions
    coords = []
    for y in range(0, H - patch_l0, patch_l0):
        for x in range(0, W - patch_l0, patch_l0):
            cx, cy = (x + patch_l0 / 2) / seg_scale, (y + patch_l0 / 2) / seg_scale
            if any(cv2.pointPolygonTest(c, (cx, cy), False) >= 0 for c in contours):
                coords.append((x, y))
    coords = np.array(coords, dtype=np.int64)
    if max_patches and len(coords) > max_patches:          # cap to bound encode cost
        rng = np.random.default_rng(seed)
        coords = coords[np.sort(rng.choice(len(coords), max_patches, replace=False))]
    return coords


def base_mpp(slide):
    """Microns-per-pixel at level 0 (falls back to 0.5 if unspecified)."""
    import openslide
    for k in (openslide.PROPERTY_NAME_MPP_X, "aperio.MPP", "openslide.mpp-x"):
        v = slide.properties.get(k)
        if v:
            try:
                return float(v)
            except ValueError:
                pass
    return 0.5


def thumbnail(slide, max_side=1024):
    """Small RGB thumbnail + its downsample factor (for heatmaps without the slide)."""
    W, H = slide.dimensions
    ds = max(1, int(max(W, H) / max_side))
    thumb = slide.get_thumbnail((W // ds, H // ds))
    return np.array(thumb)[..., :3], float(W / thumb.size[0])


# ---------------------------------------------------------------------------
# 3. Midnight-12k patch encoder (kaiko-ai/midnight; open MIT, NO gating; ViT-g)
#    Top non-gated pathology FM — beats H-optimus-0 / GigaPath / UNI on Kaiko's
#    benchmark. Loads via HuggingFace transformers (no token). The classification
#    embedding is concat(CLS, mean patch tokens) -> 3072-d.
# ---------------------------------------------------------------------------
def load_encoder(name="kaiko-ai/midnight", device="cuda"):
    import torch
    from transformers import AutoModel
    from torchvision import transforms
    model = AutoModel.from_pretrained(name).eval().to(device)
    tfm = transforms.Compose([                              # per the Midnight model card
        transforms.Resize(224),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=(0.5, 0.5, 0.5), std=(0.5, 0.5, 0.5)),
    ])
    return model, tfm


def extract_features(slide, coords, model, tfm, patch_l0, batch=32, device="cuda"):
    import torch
    feats = []
    autocast = torch.autocast("cuda", dtype=torch.float16) if device == "cuda" else _nullctx()
    with torch.inference_mode(), autocast:
        for i in range(0, len(coords), batch):
            tiles = [tfm(slide.read_region((int(x), int(y)), 0, (patch_l0, patch_l0)).convert("RGB"))
                     for (x, y) in coords[i:i + batch]]
            out = model(torch.stack(tiles).to(device)).last_hidden_state   # (B, 1+P, H)
            emb = torch.cat([out[:, 0, :], out[:, 1:, :].mean(1)], dim=-1)  # CLS+mean -> (B, 3072)
            feats.append(emb.float().cpu())
    import torch as _t
    return _t.cat(feats).half().numpy()                          # store fp16 to save space


class _nullctx:
    def __enter__(self): return None
    def __exit__(self, *a): return False


# ---------------------------------------------------------------------------
# 4. Orchestration: build / load the cached cohort
# ---------------------------------------------------------------------------
def process_slide(meta, cache_dir, model, tfm, target_mpp=0.5, patch_px=256,
                  max_patches=2000, device="cuda", tmp_dir="/content/_svs"):
    """Download → segment → patch → encode → cache one slide's bag. Returns bag path
    or None on failure. Deletes the .svs afterwards to keep disk usage low."""
    import openslide, torch
    os.makedirs(cache_dir, exist_ok=True); os.makedirs(tmp_dir, exist_ok=True)
    out_path = os.path.join(cache_dir, f"{meta['file_id']}.pt")
    if os.path.exists(out_path):
        print(f"  [cached] {LABEL_NAME[meta['label']]}  {meta['file_name']}  (already encoded — skipping)")
        return out_path
    svs = os.path.join(tmp_dir, meta["file_name"])
    try:
        gdc_download(meta["file_id"], svs)
        slide = openslide.OpenSlide(svs)
        mpp = base_mpp(slide)
        patch_l0 = int(round(patch_px * (target_mpp / mpp)))
        _, contours, seg_scale = segment_tissue(slide)
        coords = grid_coords(slide, contours, seg_scale, patch_l0, max_patches=max_patches)
        if len(coords) < 16:
            print(f"  [skip] {meta['file_name']}: too little tissue ({len(coords)} patches)")
            return None
        feats = extract_features(slide, coords, model, tfm, patch_l0, device=device)
        thumb, thumb_ds = thumbnail(slide)
        torch.save({"slide_id": meta["file_id"], "patient_id": meta["patient_id"],
                    "label": meta["label"], "project": meta["project"],
                    "features": feats, "coords": coords,
                    "thumb": thumb, "thumb_ds": thumb_ds}, out_path)
        print(f"  [ok]  {LABEL_NAME[meta['label']]}  {meta['file_name']}  "
              f"-> {feats.shape[0]} patches x {feats.shape[1]}")
        return out_path
    except Exception as e:
        print(f"  [fail] {meta['file_name']}: {e}")
        return None
    finally:
        if os.path.exists(svs):
            os.remove(svs)                                       # free disk immediately


def build_cohort(cache_dir, per_class=15, device="cuda", encoder="kaiko-ai/midnight",
                 max_patches=2000, max_bytes=1_200_000_000):
    """Build (or resume) the cached TCGA cohort under cache_dir. Idempotent: already-cached
    slides are skipped, so re-running resumes after an interruption."""
    metas = gdc_query_slides(per_class=per_class, max_bytes=max_bytes)
    print(f"selected {len(metas)} slides "
          f"({sum(m['label']==0 for m in metas)} LUAD / {sum(m['label']==1 for m in metas)} LUSC)")
    model, tfm = load_encoder(encoder, device=device)
    rows = []
    for i, m in enumerate(metas, 1):
        print(f"[{i}/{len(metas)}] {LABEL_NAME[m['label']]}  {m['file_name']} "
              f"({m['file_size']/1e6:.0f} MB)")
        p = process_slide(m, cache_dir, model, tfm, max_patches=max_patches, device=device)
        if p:
            rows.append({"slide_id": m["file_id"], "patient_id": m["patient_id"],
                         "label": m["label"], "project": m["project"]})
    write_manifest(cache_dir, rows)
    print(f"\ncohort ready: {len(rows)} bags cached in {cache_dir}")
    return rows


def write_manifest(cache_dir, rows):
    with open(os.path.join(cache_dir, "manifest.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["slide_id", "patient_id", "label", "project"])
        w.writeheader(); w.writerows(rows)


def load_bags(cache_dir):
    """Load cached bags into the dict-list format the training utilities expect.
    Raises a clear error if the cache is empty (run notebook 01 first)."""
    import torch
    man = os.path.join(cache_dir, "manifest.csv")
    if not os.path.exists(man):
        raise FileNotFoundError(
            f"No feature cache at {cache_dir}. Run notebook 01 first to build the "
            f"TCGA bags on your Google Drive, then re-run this notebook.")
    data = []
    with open(man) as f:
        for r in csv.DictReader(f):
            d = torch.load(os.path.join(cache_dir, f"{r['slide_id']}.pt"), weights_only=False)
            d["features"] = np.asarray(d["features"], dtype=np.float32)   # fp16 -> fp32
            d["label"] = int(d["label"])
            data.append(d)
    if not data:
        raise RuntimeError(f"Manifest at {cache_dir} is empty — re-run notebook 01.")
    return data
