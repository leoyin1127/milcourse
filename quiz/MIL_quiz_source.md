# Introduction to Pathology MIL — Quiz & Study Guide (NotebookLM source)

**How to use this with NotebookLM:** Create a new notebook, upload this file (and optionally
the slide deck PDF and the five course notebooks) as sources. NotebookLM will let you generate
an **Audio Overview**, **flashcards**, a **study guide**, and an auto-quiz. The 20 questions
below (with an answer key) also work as a standalone self-test.

---

## Part A — One-paragraph recap of the course

Whole-slide images (WSIs) are gigapixel (up to ~10⁹ pixels, tens of thousands of tiles) but
carry only a single weak label per slide or patient. **Multiple Instance Learning (MIL)** solves
this by decomposing a slide into a *bag* of patches, encoding each patch with a **frozen
foundation model**, and learning a **permutation-invariant pooling** operator that aggregates
patch embeddings into one slide prediction — supervised by the slide label alone. Every MIL model
is three boxes: **encode → pool → classify**, `Ŷ = g(σ(f(x₁…x_N)))`. The pooling σ is where the
design lives: mean/max (fixed), **ABMIL** (learned gated attention), **CLAM** (attention + an
instance-clustering auxiliary loss), and **TransMIL** (self-attention across patches). The
standard pipeline is **WSI → tissue segmentation → patching at 20×/256px → feature extraction →
MIL training**, with features cached once so training the small aggregator is fast. Honest
evaluation requires **patient-level splits**, **mean ± std over folds**, beating a **mean-pool
baseline**, and **external-cohort** validation, plus attention heatmaps for interpretability.

---

## Part B — Key terms (flashcard fuel)

- **Bag / instance:** a slide is a bag; each patch is an instance. Labels exist only at bag level.
- **Standard MIL assumption (binary):** a bag is positive iff at least one instance is positive.
- **Permutation invariance:** patches are an unordered set; shuffling them must not change the output. Mean, max, and attention-weighted sums all satisfy this.
- **Weak / slide-level supervision:** one label per slide (from the pathology report), inherited noisily by every patch.
- **Foundation (tile) encoder:** a large ViT pretrained self-supervised on millions of WSIs (UNI2, Virchow2, Prov-GigaPath, CONCH, H-optimus). Frozen and used as a feature extractor.
- **Embedding dim d:** UNI=1024, UNI2-h=1536, Virchow2=2560, Prov-GigaPath=1536, CONCH v1.5=768.
- **ABMIL gated attention:** `a_i = softmax_i( wᵀ [tanh(V h_i) ⊙ sigmoid(U h_i)] )`; `z = Σ_i a_i h_i`.
- **CLAM-SB vs CLAM-MB:** single attention branch (binary) vs one attention branch per class.
- **CLAM instance-clustering loss:** an auxiliary task that pseudo-labels the top-k attended patches positive and bottom-k negative and trains an instance classifier — it sharpens attention. (There is **no** k-means preprocessing.)
- **TransMIL:** Transformer self-attention over patches (so patches attend to each other), made near-linear with the **Nyström** approximation, plus a CLS token and a PPEG positional module.
- **mpp:** microns per pixel; 20× ≈ 0.5 mpp, 40× ≈ 0.25 mpp. Always read the slide's true mpp.
- **Coords-first patching:** store patch (x,y) coordinates, lazy-load pixels at encode time (CLAM's fast pipeline).
- **Slide encoder:** a *pretrained aggregator* (TITAN, PRISM, GigaPath slide encoder, CHIEF) that maps the whole bag to one slide embedding.
- **Leakage-safe split:** split by **patient**, not slide. Stratify folds by label.
- **Metrics:** AUROC (headline), balanced accuracy and AUPRC (under imbalance), reported as mean ± std and on an external cohort.
- **Toolkits:** CLAM and TRIDENT (Mahmood Lab) for segmentation + patching + feature extraction.

---

## Part C — 20-question quiz

**Q1.** Why can't you simply downsample a whole-slide image and train a standard CNN on it?

**Q2.** State the standard (binary) MIL assumption relating a bag's label to its instances.

**Q3.** Write the three-stage MIL master equation and name each component.

**Q4.** Why must the pooling operator σ be permutation-invariant for WSIs?

**Q5.** In modern MIL, which component is frozen and which is trained — and why does that make training cheap?

**Q6.** Give the gated-attention formula used in ABMIL and explain what the sigmoid "gate" branch adds over plain tanh attention.

**Q7.** What exactly is the "clustering" in CLAM? (Correct the common misconception.)

**Q8.** What is the difference between CLAM-SB and CLAM-MB?

**Q9.** How does TransMIL differ from ABMIL/CLAM, and what is the computational problem it must solve (and how)?

**Q10.** List the five stages of the standard CLAM-style data-preparation pipeline in order.

**Q11.** Why is "20×" not a reliable specification on its own, and what should you read instead?

**Q12.** What does "coords-first" patching mean and why is it efficient?

**Q13.** Name three pathology foundation tile encoders and give one's embedding dimension.

**Q14.** Why is it safe to benchmark UNI/UNI2/CONCH on TCGA and CAMELYON?

**Q15.** Why must cross-validation splits be made at the patient level rather than the slide level?

**Q16.** Under heavy class imbalance, why is accuracy misleading, and which two metrics should you report instead?

**Q17.** Two losses are used to train CLAM. Name them and give the role of each.

**Q18.** How do you turn a trained attention model's output into an interpretable heatmap, and what is the key caveat about attention?

**Q19.** A patient has three slides with tumor probabilities [0.82, 0.12, 0.67]. Under "max" case aggregation with threshold 0.5, what is the patient-level call?

**Q20.** Your model gets AUROC 0.93 on internal CV but 0.74 on an external hospital's slides. Name the most likely cause and two mitigations.

---

## Part D — Answer key

**A1.** Downsampling destroys the cellular detail (nuclei, mitoses) that carries the diagnosis; full-resolution end-to-end training is computationally impossible (~10⁹ pixels per slide); and patch-supervised CNNs need per-patch labels that don't exist. MIL avoids all three.

**A2.** A bag is positive if and only if **at least one** of its instances is positive; it is negative only if **all** instances are negative.

**A3.** `Ŷ = g( σ( { f(x₁), …, f(x_N) } ) )` — **f** = patch encoder (frozen foundation model), **σ** = permutation-invariant pooling (the learnable heart), **g** = classifier (a linear layer).

**A4.** Patches form an unordered **set**, not a sequence — the slide has no canonical patch ordering, so the prediction must be invariant to shuffling the patches.

**A5.** The **encoder is frozen** (features precomputed/cached once), and only the small **aggregator** is trained. Because the expensive GPU pass is done once and reused, the aggregator (<~1M params) trains in minutes, even on CPU.

**A6.** `a_i = softmax_i( wᵀ [ tanh(V h_i) ⊙ sigmoid(U h_i) ] )`, then `z = Σ_i a_i h_i`. The sigmoid gate (element-wise multiplied with the tanh branch) adds a learnable, more expressive nonlinearity, letting the network suppress/pass feature dimensions before scoring — usually a small but consistent improvement; it's CLAM's default.

**A7.** CLAM's "clustering" is an **instance-level clustering auxiliary loss**: after computing attention, the top-k attended patches are pseudo-labeled positive and the bottom-k negative, and a small instance classifier is trained on them. This sharpens attention discriminability. There is **no k-means preprocessing** of features.

**A8.** **CLAM-SB** uses a single attention branch (binary/one-vs-rest); **CLAM-MB** uses one attention branch per class for multi-class problems.

**A9.** ABMIL/CLAM score each patch **independently**; **TransMIL** uses Transformer **self-attention** so patches attend to each other (capturing inter-patch/morphological context). Full self-attention is O(N²) — infeasible for N≈10⁴ — so TransMIL uses the **Nyström** approximation for near-linear cost, plus a CLS token and the PPEG positional module.

**A10.** (1) Open WSI / read pyramid, (2) tissue segmentation, (3) patching (grid at 20×/256px), (4) feature extraction with a frozen encoder, (5) MIL training on the cached `(N×d)` bags.

**A11.** Scanners differ, so the same nominal "20×" can have different physical resolution. Read the slide's true **microns-per-pixel (mpp)** from its metadata (20× ≈ 0.5 mpp).

**A12.** Store only the patch **(x,y) coordinates** during patching and lazy-load the actual pixels at feature-extraction time. It's fast and disk-light (no need to write millions of tile images).

**A13.** Examples: **UNI** (1024), **UNI2-h** (1536), **Virchow2** (2560), **Prov-GigaPath** (1536), **CONCH v1.5** (768), **H-optimus-0** (1536). (Any three with one correct dim.)

**A14.** These models were **explicitly not trained** on public benchmark collections (TCGA, CPTAC, CAMELYON, PANDA, etc.), so evaluating on those datasets is free of training-data leakage.

**A15.** A patient can contribute multiple slides; if some land in train and others in test, information **leaks** and metrics are optimistic. Splitting by patient (and stratifying by label) prevents this.

**A16.** With rare positives, a classifier predicting the majority class scores high accuracy while being useless. Report **AUROC** (and **AUPRC**) plus **balanced accuracy** (mean of per-class recall).

**A17.** (1) **Bag classification loss** — cross-entropy on slide logits (the primary signal; weighted for imbalance). (2) **Instance-clustering loss** — auxiliary supervision on top-/bottom-k attended patches (weight λ≈0.3) that sharpens attention.

**A18.** Scatter each patch's attention weight back to its (x,y) coordinate, normalize, apply a colormap, and alpha-blend over the slide thumbnail → hotspots show what drove the prediction. **Caveat:** attention **localizes** but does not **prove** causation; high attention is a hypothesis for the pathologist, not ground truth.

**A19.** max(0.82, 0.12, 0.67) = 0.82 ≥ 0.5 → patient-level call is **TUMOR (positive)**.

**A20.** Most likely **stain/scanner domain shift** (and possible batch effects — the model learned the site rather than biology). Mitigations: stain normalization/augmentation, scanner-diverse training data, more robust encoders, and always reporting an external-cohort number with subgroup analysis.

---

## Part E — Suggested NotebookLM prompts

- "Generate an audio overview aimed at a software engineer new to digital pathology."
- "Create 15 flashcards covering MIL architectures and the data-prep pipeline."
- "Quiz me with 10 multiple-choice questions, then explain each answer."
- "Summarize the differences between ABMIL, CLAM, and TransMIL in a table."
