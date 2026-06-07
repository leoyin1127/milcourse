"""
mil_models.py — Reference MIL aggregators for the Pathology MIL course.

These are compact, readable, *correct* implementations meant for teaching, not
a drop-in replacement for the original CLAM repo. Every model maps a bag of
patch features  H ∈ R^{N×d}  to slide logits, and (where applicable) returns
the per-patch attention vector used for heatmaps.

    logits, attn, extra = model(H)        # H: (N, d)  →  logits: (1, n_classes)

Operates on real TCGA feature bags cached by notebook 01 (see mil_tcga.load_bags).
"""
from __future__ import annotations
import torch
import torch.nn as nn
import torch.nn.functional as F


# ---------------------------------------------------------------------------
# 0. Baseline: mean / max pooling  (no learnable pooling parameters)
# ---------------------------------------------------------------------------
class PoolMIL(nn.Module):
    """Mean- or max-pool the bag, then a linear classifier. The baseline to beat."""

    def __init__(self, in_dim: int, n_classes: int = 2, mode: str = "mean", hidden: int = 512):
        super().__init__()
        assert mode in {"mean", "max"}
        self.mode = mode
        self.proj = nn.Sequential(nn.Linear(in_dim, hidden), nn.ReLU(), nn.Dropout(0.25))
        self.classifier = nn.Linear(hidden, n_classes)

    def forward(self, H: torch.Tensor):
        h = self.proj(H)                       # (N, hidden)
        z = h.max(dim=0).values if self.mode == "max" else h.mean(dim=0)  # (hidden,)
        logits = self.classifier(z.unsqueeze(0))                          # (1, C)
        # uniform "attention" so downstream heatmap code still works
        attn = torch.full((H.shape[0],), 1.0 / H.shape[0], device=H.device)
        return logits, attn, {}


# ---------------------------------------------------------------------------
# 1. ABMIL — attention-based MIL (Ilse et al., 2018), gated variant
# ---------------------------------------------------------------------------
class GatedAttention(nn.Module):
    """a_i = softmax_i( w^T [ tanh(V h_i) ⊙ sigmoid(U h_i) ] )."""

    def __init__(self, in_dim: int, hidden: int = 256, dropout: float = 0.25):
        super().__init__()
        self.V = nn.Sequential(nn.Linear(in_dim, hidden), nn.Tanh(), nn.Dropout(dropout))
        self.U = nn.Sequential(nn.Linear(in_dim, hidden), nn.Sigmoid(), nn.Dropout(dropout))
        self.w = nn.Linear(hidden, 1)

    def forward(self, h: torch.Tensor):           # h: (N, in_dim)
        a = self.w(self.V(h) * self.U(h))         # (N, 1) unnormalized scores
        a = torch.softmax(a, dim=0)               # (N, 1) sum to 1 over the bag
        return a


class ABMIL(nn.Module):
    """Gated attention pooling + linear classifier."""

    def __init__(self, in_dim: int, n_classes: int = 2, hidden: int = 512, attn_hidden: int = 256):
        super().__init__()
        self.proj = nn.Sequential(nn.Linear(in_dim, hidden), nn.ReLU(), nn.Dropout(0.25))
        self.attn = GatedAttention(hidden, attn_hidden)
        self.classifier = nn.Linear(hidden, n_classes)

    def forward(self, H: torch.Tensor):
        h = self.proj(H)                          # (N, hidden)
        a = self.attn(h)                          # (N, 1)
        z = (a * h).sum(dim=0, keepdim=True)      # (1, hidden) attention-weighted sum
        logits = self.classifier(z)               # (1, C)
        return logits, a.squeeze(1), {}


# ---------------------------------------------------------------------------
# 2. CLAM-SB — gated attention + instance-clustering auxiliary loss
#    (Lu et al., Nature Biomedical Engineering 2021)
# ---------------------------------------------------------------------------
class CLAM_SB(nn.Module):
    """
    Single-branch CLAM. Adds an *instance classifier* supervised by the top-k and
    bottom-k attended patches (pseudo-labelled positive / negative). The resulting
    instance loss regularises and sharpens the attention map. Note: there is NO
    k-means preprocessing — the "clustering" is this auxiliary instance task.
    """

    def __init__(self, in_dim: int, n_classes: int = 2, hidden: int = 512,
                 attn_hidden: int = 256, k_sample: int = 8):
        super().__init__()
        self.k_sample = k_sample
        self.n_classes = n_classes
        self.proj = nn.Sequential(nn.Linear(in_dim, hidden), nn.ReLU(), nn.Dropout(0.25))
        self.attn = GatedAttention(hidden, attn_hidden)
        self.classifier = nn.Linear(hidden, n_classes)
        # one binary instance classifier per class (in/out of class)
        self.instance_classifiers = nn.ModuleList([nn.Linear(hidden, 2) for _ in range(n_classes)])

    def _instance_loss(self, h, a, class_idx):
        """Top-k attended → pseudo-positive, bottom-k → pseudo-negative."""
        N = h.shape[0]
        k = min(self.k_sample, N // 2 if N > 1 else 1)
        if k < 1:
            return h.new_zeros(())
        a = a.view(-1)
        top = torch.topk(a, k).indices
        bot = torch.topk(-a, k).indices
        idx = torch.cat([top, bot])
        targets = torch.cat([torch.ones(k, dtype=torch.long, device=h.device),
                             torch.zeros(k, dtype=torch.long, device=h.device)])
        logits = self.instance_classifiers[class_idx](h[idx])     # (2k, 2)
        return F.cross_entropy(logits, targets)

    def forward(self, H: torch.Tensor, label: int | None = None):
        h = self.proj(H)                           # (N, hidden)
        a = self.attn(h)                           # (N, 1)
        z = (a * h).sum(dim=0, keepdim=True)       # (1, hidden)
        logits = self.classifier(z)                # (1, C)
        # instance-clustering loss for the (true, when training) class branch
        inst_loss = h.new_zeros(())
        if label is not None:
            inst_loss = self._instance_loss(h, a, int(label))
        return logits, a.squeeze(1), {"instance_loss": inst_loss}


def build_model(name: str, in_dim: int, n_classes: int = 2, **kw):
    name = name.lower()
    if name in {"mean", "meanpool"}:
        return PoolMIL(in_dim, n_classes, mode="mean")
    if name in {"max", "maxpool"}:
        return PoolMIL(in_dim, n_classes, mode="max")
    if name == "abmil":
        return ABMIL(in_dim, n_classes, **kw)
    if name in {"clam", "clam_sb"}:
        return CLAM_SB(in_dim, n_classes, **kw)
    raise ValueError(f"unknown model '{name}'")
