"""
mil_utils.py — Shared, model-agnostic helpers for the Pathology MIL course.

Provides:
  * patient_stratified_kfold — leakage-safe CV splitter (split by patient).
  * train_one / evaluate     — minimal MIL train / eval loops.
  * compute_metrics          — AUROC, balanced accuracy, AUPRC, etc.

These operate on the dict-list dataset format produced by `mil_tcga.load_bags`
(one dict per slide: {slide_id, patient_id, label, features (N×d), coords, ...}).
The data is real TCGA features cached by notebook 01 — there is no synthetic data.
"""
from __future__ import annotations
import numpy as np
# NOTE: torch is imported lazily inside the training/eval functions so that the
# metrics / split helpers work in a torch-free environment.


# ---------------------------------------------------------------------------
# Leakage-safe cross-validation: split by PATIENT, stratified by label
# ---------------------------------------------------------------------------
def patient_stratified_kfold(data, n_folds=5, seed=0):
    """Yield (train_idx, val_idx) over slide indices, never splitting a patient."""
    rng = np.random.default_rng(seed)
    # patient -> label (a patient's slides share the label here)
    patients = {}
    for i, d in enumerate(data):
        patients.setdefault(d["patient_id"], {"label": d["label"], "idx": []})
        patients[d["patient_id"]]["idx"].append(i)
    pids = list(patients)
    labels = np.array([patients[p]["label"] for p in pids])

    folds = [[] for _ in range(n_folds)]
    for lab in np.unique(labels):
        grp = [pids[i] for i in np.where(labels == lab)[0]]
        rng.shuffle(grp)
        for j, pid in enumerate(grp):
            folds[j % n_folds].append(pid)

    for f in range(n_folds):
        val_pids = set(folds[f])
        train_idx, val_idx = [], []
        for i, d in enumerate(data):
            (val_idx if d["patient_id"] in val_pids else train_idx).append(i)
        yield train_idx, val_idx


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------
def compute_metrics(y_true, y_prob):
    """AUROC, AUPRC, balanced accuracy, accuracy at 0.5. Pure-numpy, no sklearn dep."""
    y_true = np.asarray(y_true).astype(int)
    y_prob = np.asarray(y_prob, dtype=float)

    def auroc(y, p):
        # Mann–Whitney U statistic with tie-averaged ranks (== sklearn roc_auc_score).
        n_pos, n_neg = int(y.sum()), int((1 - y).sum())
        if n_pos == 0 or n_neg == 0:
            return float("nan")
        order = np.argsort(p, kind="mergesort")
        sp = p[order]
        ranks_sorted = np.arange(1, len(p) + 1, dtype=float)
        j = 0                                  # average ranks within tie groups
        while j < len(sp):
            k = j
            while k + 1 < len(sp) and sp[k + 1] == sp[j]:
                k += 1
            ranks_sorted[j:k + 1] = (j + 1 + k + 1) / 2.0
            j = k + 1
        ranks = np.empty(len(p), dtype=float)
        ranks[order] = ranks_sorted            # realign ranks to original order
        return (ranks[y == 1].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg)

    def auprc(y, p):
        order = np.argsort(-p)
        y = y[order]
        tp = np.cumsum(y)
        fp = np.cumsum(1 - y)
        prec = tp / np.maximum(tp + fp, 1)
        rec = tp / max(y.sum(), 1)
        rec = np.concatenate([[0], rec]); prec = np.concatenate([[1], prec])
        # trapezoidal area (manual: np.trapz is deprecated in NumPy 2.0)
        return float(np.sum(np.diff(rec) * (prec[1:] + prec[:-1]) / 2.0))

    pred = (y_prob >= 0.5).astype(int)
    tp = int(((pred == 1) & (y_true == 1)).sum())
    tn = int(((pred == 0) & (y_true == 0)).sum())
    fp = int(((pred == 1) & (y_true == 0)).sum())
    fn = int(((pred == 0) & (y_true == 1)).sum())
    sens = tp / max(tp + fn, 1)
    spec = tn / max(tn + fp, 1)
    return dict(
        auroc=float(auroc(y_true, y_prob)),
        auprc=float(auprc(y_true, y_prob)),
        balanced_acc=float((sens + spec) / 2),
        accuracy=float((tp + tn) / max(len(y_true), 1)),
        sensitivity=float(sens), specificity=float(spec),
    )


# ---------------------------------------------------------------------------
# Minimal MIL train / eval loops  (batch size = 1 bag)
# ---------------------------------------------------------------------------
def _forward(model, feats, label=None):
    """Uniform call signature across PoolMIL / ABMIL / CLAM_SB."""
    try:                       # CLAM accepts the label for the instance loss
        return model(feats, label=label)
    except TypeError:
        return model(feats)


def train_one(model, data, train_idx, val_idx, *, epochs=30, lr=2e-4, wd=1e-5,
              inst_weight=0.3, class_weights=None, device="cpu", patience=8, verbose=False):
    import torch
    import torch.nn.functional as F
    model.to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=wd)
    if class_weights is not None:
        class_weights = torch.tensor(class_weights, dtype=torch.float32, device=device)
    best_auc, best_state, wait = -1.0, None, 0
    history = []
    for ep in range(epochs):
        model.train()
        order = np.random.permutation(train_idx)
        for i in order:
            d = data[i]
            feats = torch.from_numpy(d["features"]).to(device)
            y = torch.tensor([d["label"]], device=device)
            logits, _, extra = _forward(model, feats, label=d["label"])
            loss = F.cross_entropy(logits, y, weight=class_weights)
            if "instance_loss" in extra:
                loss = loss + inst_weight * extra["instance_loss"]
            opt.zero_grad(); loss.backward(); opt.step()
        val = evaluate(model, data, val_idx, device=device)
        history.append(val["auroc"])
        if val["auroc"] > best_auc:
            best_auc = val["auroc"]; best_state = {k: v.detach().cpu().clone()
                                                   for k, v in model.state_dict().items()}; wait = 0
        else:
            wait += 1
        if verbose:
            print(f"  epoch {ep:02d}  val AUROC={val['auroc']:.3f}  bAcc={val['balanced_acc']:.3f}")
        if wait >= patience:
            break
    if best_state is not None:
        model.load_state_dict(best_state)
    return model, history


def evaluate(model, data, idx, device="cpu", return_probs=False):
    import torch
    model.eval()
    ys, ps = [], []
    with torch.no_grad():
        for i in idx:
            d = data[i]
            feats = torch.from_numpy(d["features"]).to(device)
            logits, _, _ = _forward(model, feats, label=None)
            ps.append(torch.softmax(logits, dim=1)[0, 1].item())
            ys.append(d["label"])
    m = compute_metrics(ys, ps)
    if return_probs:
        return m, np.array(ys), np.array(ps)
    return m
