import type { Question } from "@/lib/types";

/**
 * 20 multiple-choice questions adapted from the "Introduction to Pathology MIL"
 * course quiz. Correct answers and explanations follow the course answer key
 * (quiz/MIL_quiz_source.md); distractors were authored to be clearly wrong.
 */
export const questions: Question[] = [
  {
    id: 1,
    category: "Background",
    question:
      "Why can't you simply downsample a whole-slide image and train a standard CNN on it?",
    options: [
      "Whole-slide images are stored in proprietary formats that CNNs cannot read without conversion.",
      "Standard CNNs require square inputs, and whole-slide images are never square.",
      "Downsampling destroys the cellular detail that carries the diagnosis, full-resolution end-to-end training is computationally infeasible (~10⁹ pixels), and patch-level CNNs need per-patch labels that don't exist.",
      "CNNs can only process grayscale images at gigapixel scale, so color slides fail.",
    ],
    answer: 2,
    explanation:
      "Three problems at once: lost diagnostic detail, intractable compute, and missing per-patch labels. MIL sidesteps all three by working on a bag of patches with a single slide-level label.",
  },
  {
    id: 2,
    category: "MIL formulation",
    question:
      "State the standard (binary) MIL assumption relating a bag's label to its instances.",
    options: [
      "A bag is positive if and only if the majority of its instances are positive.",
      "A bag is positive if and only if at least one instance is positive; it is negative only if all instances are negative.",
      "A bag is positive if and only if every instance is positive.",
      "A bag's label is the average of its instance labels.",
    ],
    answer: 1,
    explanation:
      "One positive instance makes the whole bag positive — exactly the 'a small focus of tumor makes the slide positive' intuition.",
  },
  {
    id: 3,
    category: "MIL formulation",
    question:
      "In the three-stage MIL master equation, what does each component represent?",
    code: "Ŷ = g( σ( f(x₁), …, f(x_N) ) )",
    options: [
      "f = frozen patch encoder, σ = permutation-invariant pooling (the learnable heart), g = classifier.",
      "f = data augmentation, σ = softmax normalization, g = gradient descent.",
      "f = pooling, σ = patch encoder, g = a segmentation head.",
      "f = classifier, σ = loss function, g = the optimizer.",
    ],
    answer: 0,
    explanation:
      "Encode → pool → classify. f embeds each patch (frozen foundation model), σ aggregates the set permutation-invariantly (where the design lives), g maps the slide embedding to a prediction.",
  },
  {
    id: 4,
    category: "MIL formulation",
    question: "Why must the pooling operator σ be permutation-invariant for WSIs?",
    options: [
      "Because GPUs process patches in random order and the model must tolerate it.",
      "Because permutation invariance reduces the parameter count of the pooling layer.",
      "Patches form an unordered set with no canonical ordering, so the prediction must not change when they are shuffled.",
      "Because patches arrive as a time series and ordering would cause overfitting.",
    ],
    answer: 2,
    explanation:
      "A slide has no natural patch sequence. Mean, max, and attention-weighted sums are all invariant to shuffling, which is why they're valid pooling operators.",
  },
  {
    id: 5,
    category: "Training",
    question:
      "In modern MIL, which component is frozen and which is trained — and why does that make training cheap?",
    options: [
      "The aggregator is frozen and the encoder is fine-tuned every epoch, which is cheap because encoders are small.",
      "The encoder is frozen and its features are cached once; only the small aggregator (<~1M params) is trained, so the expensive GPU pass runs a single time and the aggregator trains in minutes.",
      "Both are trained jointly end-to-end, made cheap by mixed precision.",
      "The classifier is frozen and the encoder plus pooling are retrained per fold.",
    ],
    answer: 1,
    explanation:
      "Precompute embeddings once, then train a tiny aggregator on the cached (N×d) bags — fast enough to run even on CPU.",
  },
  {
    id: 6,
    category: "Architecture",
    question:
      "What does the sigmoid 'gate' branch in ABMIL's gated attention add over plain tanh attention?",
    code: "a_i = softmax_i( wᵀ [ tanh(V·h_i) ⊙ sigmoid(U·h_i) ] ),   z = Σ_i a_i·h_i",
    options: [
      "Nothing functional; the sigmoid simply normalizes the attention weights to sum to 1.",
      "It converts attention into a hard 0/1 mask that selects tumor patches.",
      "It replaces softmax so that attention weights can exceed 1.",
      "Multiplied element-wise with the tanh branch, it adds a learnable nonlinearity that can suppress or pass feature dimensions before scoring — a small but consistent gain (CLAM's default).",
    ],
    answer: 3,
    explanation:
      "The sigmoid gate gives the attention network more expressive, per-dimension control than plain tanh attention.",
  },
  {
    id: 7,
    category: "Architecture",
    question: "What exactly is the 'clustering' in CLAM? (Correct the common misconception.)",
    options: [
      "An instance-level clustering auxiliary loss: top-k attended patches are pseudo-labeled positive, bottom-k negative, and a small instance classifier is trained on them to sharpen attention. There is no k-means preprocessing.",
      "K-means clustering of patch features into tissue types before training.",
      "Hierarchical clustering of slides into patient groups for cross-validation.",
      "Clustering of attention heads to reduce transformer cost.",
    ],
    answer: 0,
    explanation:
      "The misconception is that CLAM runs k-means on features. It doesn't — 'clustering' is an auxiliary instance classifier supervised by the most- and least-attended patches.",
  },
  {
    id: 8,
    category: "Architecture",
    question: "What is the difference between CLAM-SB and CLAM-MB?",
    options: [
      "CLAM-SB does single-bag training; CLAM-MB does multi-bag (multi-slide) training.",
      "CLAM-SB uses a small backbone; CLAM-MB is a multi-backbone ensemble.",
      "CLAM-SB uses a single attention branch (binary / one-vs-rest); CLAM-MB uses one attention branch per class for multi-class problems.",
      "CLAM-SB is single-block; CLAM-MB is a multi-block transformer.",
    ],
    answer: 2,
    explanation: "SB = single branch; MB = multi-branch, with one attention head per class.",
  },
  {
    id: 9,
    category: "Architecture",
    question:
      "How does TransMIL differ from ABMIL/CLAM, and what computational problem must it solve?",
    options: [
      "TransMIL adds convolutional layers; the problem is vanishing gradients, solved with residual connections.",
      "ABMIL/CLAM score each patch independently; TransMIL uses self-attention so patches attend to each other. Full self-attention is O(N²) — infeasible for N≈10⁴ — so it uses the Nyström approximation (plus a CLS token and the PPEG positional module).",
      "TransMIL uses an RNN over patches; the problem is sequence length, solved by truncation.",
      "TransMIL fine-tunes the encoder jointly; the problem is memory, solved with gradient checkpointing.",
    ],
    answer: 1,
    explanation:
      "Self-attention captures inter-patch context but costs O(N²); the Nyström approximation makes it near-linear so it scales to tens of thousands of patches.",
  },
  {
    id: 10,
    category: "Data preparation",
    question: "What are the five stages of the standard CLAM-style data-preparation pipeline, in order?",
    options: [
      "Stain-normalize → augment → patch → train a CNN → ensemble.",
      "Download → annotate pixels → crop tumor → train → validate.",
      "Segment nuclei → count mitoses → grade → patch → train.",
      "Open the WSI / read the pyramid → tissue segmentation → patching (grid at 20× / 256px) → feature extraction with a frozen encoder → MIL training on the cached (N×d) bags.",
    ],
    answer: 3,
    explanation:
      "The canonical pipeline. Features are cached after step 4, so training the small aggregator afterward is fast.",
  },
  {
    id: 11,
    category: "Data preparation",
    question: "Why is '20×' not a reliable specification on its own, and what should you read instead?",
    options: [
      "Because 20× refers to file compression, not zoom; read the bit depth instead.",
      "Because 20× is the eyepiece magnification only; read the objective's numerical aperture.",
      "Scanners differ, so the same nominal '20×' can have different physical resolution. Read the slide's true microns-per-pixel (mpp) — 20× ≈ 0.5 mpp.",
      "Because magnification changes with viewer zoom; read the JPEG quality factor.",
    ],
    answer: 2,
    explanation: "Trust the mpp recorded in the slide metadata, not the nominal magnification label.",
  },
  {
    id: 12,
    category: "Data preparation",
    question: "What does 'coords-first' patching mean, and why is it efficient?",
    options: [
      "Store only each patch's (x, y) coordinates during patching and lazy-load the actual pixels at feature-extraction time — fast and disk-light, with no need to write millions of tile images.",
      "Sort patches by coordinate so the encoder can batch spatially adjacent tiles.",
      "Store patches as coordinate-compressed JPEGs to halve disk usage.",
      "Encode (x, y) as positional features appended to each patch embedding.",
    ],
    answer: 0,
    explanation:
      "Save coordinates, read pixels on demand. It's CLAM's fast, low-disk patching strategy.",
  },
  {
    id: 13,
    category: "Encoders",
    question: "Which set lists pathology foundation tile encoders with correct embedding dimensions?",
    options: [
      "ResNet-50 (2048), VGG-16 (4096), Inception-v3 (1000) — general ImageNet CNNs.",
      "UNI (1024), Virchow2 (2560), CONCH v1.5 (768) — pathology foundation tile encoders pretrained self-supervised on WSIs.",
      "UNI (256), Virchow2 (128), CONCH (64).",
      "CLIP (512), DINO (384), SAM (256).",
    ],
    answer: 1,
    explanation:
      "Pathology tile encoders include UNI / UNI2-h (1536), Virchow2 (2560), Prov-GigaPath (1536), CONCH v1.5 (768), H-optimus — frozen ViTs used as feature extractors.",
  },
  {
    id: 14,
    category: "Encoders",
    question: "Why is it safe to benchmark UNI / UNI2 / CONCH on TCGA and CAMELYON?",
    options: [
      "Because TCGA and CAMELYON are synthetic datasets with no real patients.",
      "Because foundation models generalize, so leakage wouldn't affect AUROC anyway.",
      "Because these encoders were explicitly not trained on public benchmark collections (TCGA, CPTAC, CAMELYON, PANDA), so evaluating on them is free of training-data leakage.",
      "Because those benchmarks only test segmentation, not classification.",
    ],
    answer: 2,
    explanation:
      "The encoders' pretraining sets deliberately exclude the public benchmarks, so downstream evaluation on them isn't contaminated.",
  },
  {
    id: 15,
    category: "Evaluation",
    question: "Why must cross-validation splits be made at the patient level rather than the slide level?",
    options: [
      "A patient can contribute multiple slides; if some land in train and others in test, information leaks and metrics become optimistic. Split by patient (and stratify folds by label).",
      "Slide-level splits create class imbalance that patient-level splits avoid.",
      "Patient-level splits are faster to compute than slide-level splits.",
      "Slide IDs aren't unique across hospitals, so patient IDs are required.",
    ],
    answer: 0,
    explanation:
      "Same-patient slides share biology and artifacts; splitting by patient prevents that leakage.",
  },
  {
    id: 16,
    category: "Evaluation",
    question: "Under heavy class imbalance, why is accuracy misleading, and which metrics should you report instead?",
    options: [
      "Accuracy is fine — just report training and validation accuracy.",
      "Report precision at a fixed 0.5 threshold; recall is redundant under imbalance.",
      "Report top-1 and top-5 accuracy as in ImageNet.",
      "With rare positives a majority-class predictor scores high accuracy while being useless. Report AUROC (and AUPRC) plus balanced accuracy (the mean of per-class recall).",
    ],
    answer: 3,
    explanation:
      "Accuracy rewards always predicting the majority class. AUROC / AUPRC and balanced accuracy reflect real performance under imbalance.",
  },
  {
    id: 17,
    category: "Training",
    question: "Two losses are used to train CLAM. What are they and what is each one's role?",
    options: [
      "A reconstruction loss (autoencode patches) and a contrastive loss across slides.",
      "A bag classification loss — cross-entropy on the slide logits (the primary signal, weighted for imbalance) — and an instance-clustering loss — auxiliary supervision on the top/bottom-k attended patches (λ≈0.3) that sharpens attention.",
      "A triplet loss on patches and a Dice loss on tumor masks.",
      "An MSE on attention weights and a KL divergence to a uniform prior.",
    ],
    answer: 1,
    explanation:
      "CLAM = primary bag (slide) cross-entropy + auxiliary instance-clustering loss.",
  },
  {
    id: 18,
    category: "Post-processing",
    question:
      "How do you turn a trained attention model into an interpretable heatmap, and what is the key caveat?",
    options: [
      "Backpropagate gradients to the input pixels (Grad-CAM) on the frozen encoder; caveat: it needs pixel-level labels.",
      "Threshold patch probabilities at 0.5 and color positives red; caveat: it requires per-patch annotation.",
      "Scatter each patch's attention weight back to its (x, y) coordinate, normalize, apply a colormap, and alpha-blend over the slide thumbnail. Caveat: attention localizes but does not prove causation — it's a hypothesis for the pathologist, not ground truth.",
      "Run k-means on the attention values and color the clusters; caveat: clusters equal tumor grade.",
    ],
    answer: 2,
    explanation:
      "Map attention back to space for a heatmap — but high attention flags 'the model looked here,' not 'this caused the diagnosis.'",
  },
  {
    id: 19,
    category: "Post-processing",
    question:
      "A patient has three slides with tumor probabilities [0.82, 0.12, 0.67]. Under 'max' case aggregation with a threshold of 0.5, what is the patient-level call?",
    options: [
      "Benign (negative), because two of the three slides are below 0.5.",
      "Tumor (positive): max(0.82, 0.12, 0.67) = 0.82 ≥ 0.5.",
      "Borderline, because the mean is 0.54 — defer to a pathologist.",
      "Undetermined without the patient-level prevalence.",
    ],
    answer: 1,
    explanation:
      "Max aggregation takes the highest slide probability: 0.82 ≥ 0.5 → positive. One positive slide makes the patient positive — the MIL assumption at the case level.",
  },
  {
    id: 20,
    category: "Evaluation",
    question:
      "Your model gets AUROC 0.93 on internal CV but 0.74 on an external hospital's slides. Most likely cause and two mitigations?",
    options: [
      "Stain / scanner domain shift (and batch effects — the model learned the site, not the biology). Mitigate with stain normalization / augmentation and scanner-diverse training data (plus robust encoders and always reporting an external-cohort number).",
      "Overfitting to the test set; mitigate by deleting the external cohort and retraining.",
      "The external hospital studied a different disease; mitigate by relabeling their slides.",
      "Random-seed variance; mitigate by averaging two runs.",
    ],
    answer: 0,
    explanation:
      "A large internal-to-external drop is the classic signature of domain shift. Normalize / augment stains, train on diverse scanners, and always report external performance.",
  },
];
