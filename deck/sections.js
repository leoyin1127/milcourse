module.exports = function (ctx) {
  const { pres, C, FH, FB, W, H, mkShadow, footer, contentHeader, card, numCircle, divider, bullets } = ctx;
  const FM = "Courier New"; // mono for code/eqs (metric-compatible, renders everywhere)

  // Draw a line between two points with ALWAYS-positive extents (negative w/h on a
  // LINE shape emits a negative <a:ext> that PowerPoint rejects and strips). Direction
  // is chosen via flipV so the correct diagonal of the bounding box is used.
  function seg(slide, x1, y1, x2, y2, color = C.muted, width = 2) {
    const x = Math.min(x1, x2), y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    const flipV = (x2 - x1) * (y2 - y1) < 0;
    slide.addShape(pres.shapes.LINE, { x, y, w, h, flipV, line: { color, width } });
  }

  // ---- local helpers ----
  function stat(slide, x, y, w, big, label, col = C.eosin) {
    slide.addText(big, { x, y, w, h: 0.85, fontSize: 44, bold: true, color: col, fontFace: FH, align: "left", margin: 0 });
    slide.addText(label, { x, y: y + 0.82, w, h: 0.6, fontSize: 15, color: C.muted, fontFace: FB, align: "left", margin: 0 });
  }
  function codeBox(slide, x, y, w, h, lines, opts = {}) {
    slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: opts.bg || "2B2138" }, line: { color: C.hema2, width: 1 } });
    const arr = lines.map((l, i) => ({ text: l, options: { breakLine: true, color: l.startsWith("#") ? "9A8CB0" : (opts.fg || "EDE6F5"), fontSize: (opts.fs || 12.5) + 2, fontFace: FM, paraSpaceAfter: 2 } }));
    slide.addText(arr, { x: x + 0.18, y: y + 0.12, w: w - 0.34, h: h - 0.24, valign: "top", margin: 0 });
  }
  function eqBox(slide, x, y, w, h, eq, caption) {
    slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: "FFFFFF" }, line: { color: C.eosinSoft, width: 1.5 }, shadow: mkShadow() });
    slide.addText(eq, { x: x + 0.2, y: y + 0.1, w: w - 0.4, h: h - (caption ? 0.5 : 0.2), align: "center", valign: "middle", fontSize: 19, color: C.hema, fontFace: FM, margin: 0 });
    if (caption) slide.addText(caption, { x: x + 0.2, y: y + h - 0.42, w: w - 0.4, h: 0.32, align: "center", fontSize: 13, italic: true, color: C.muted, fontFace: FB, margin: 0 });
  }
  // 3-col / 2-col icon cards
  function infoCard(slide, x, y, w, h, head, body, accent) {
    card(slide, x, y, w, h, { accent });
    slide.addText(head, { x: x + 0.28, y: y + 0.16, w: w - 0.45, h: 0.4, fontSize: 17, bold: true, color: C.hema, fontFace: FB, margin: 0 });
    slide.addText(body, { x: x + 0.28, y: y + 0.6, w: w - 0.45, h: h - 0.74, fontSize: 16.5, color: C.ink, fontFace: FB, valign: "top", margin: 0 });
  }

  // =====================================================================
  // SECTION 1 — BACKGROUND
  // =====================================================================
  divider("1", "Background", "Why we build MIL systems for whole-slide pathology", false);

  // 1.1 the scale problem
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Background · the problem", "A whole-slide image is a gigapixel haystack");
    stat(s, 0.7, 1.7, 3.0, "100k²", "pixels per slide at 40× — up to ~10 gigapixels", C.eosin);
    stat(s, 4.0, 1.7, 3.0, "1–4 GB", "compressed on disk; 20–60 GB uncompressed in RAM", C.hema);
    stat(s, 7.3, 1.7, 3.0, "10⁴–10⁵", "256-px tiles of tissue per slide", C.teal);
    stat(s, 10.3, 1.7, 2.6, "1", "label — for the entire slide", C.amber);
    card(s, 0.7, 3.7, 6.0, 3.1, { accent: C.eosin });
    s.addText("The mismatch", { x: 0.95, y: 3.85, w: 5.5, h: 0.4, fontSize: 18, bold: true, color: C.hema, fontFace: FB, margin: 0 });
    bullets(s, 0.95, 4.3, 5.55, 2.4, [
      "The diagnostic signal may live in a few hundred pixels — a small focus of tumor inside a vast field of benign tissue.",
      "Pixel-level annotation by pathologists is expensive, slow, and doesn't scale to millions of slides.",
      "Labels are cheap only at the slide / patient level (diagnosis, subtype, outcome).",
    ], { fontSize: 16, spaceAfter: 10 });
    // visual: needle in haystack grid
    card(s, 7.0, 3.7, 5.9, 3.1, {});
    s.addText("One slide ≈ a grid of tiles; only a few matter", { x: 7.2, y: 3.82, w: 5.5, h: 0.3, fontSize: 13.5, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    const gx = 7.35, gy = 4.25, cell = 0.34, cols = 15, rows = 6;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const isTumor = (r === 2 && c === 9) || (r === 3 && c === 9) || (r === 2 && c === 10) || (r === 4 && c === 3);
      s.addShape(pres.shapes.RECTANGLE, { x: gx + c * cell, y: gy + r * cell, w: cell - 0.04, h: cell - 0.04, fill: { color: isTumor ? C.eosin : "EAE2F2" }, line: { color: "FFFFFF", width: 0.5 } });
    }
    const ly = gy + rows * cell + 0.12;
    s.addShape(pres.shapes.RECTANGLE, { x: gx, y: ly, w: 0.22, h: 0.22, fill: { color: C.eosin } });
    s.addText("tumor tile", { x: gx + 0.3, y: ly - 0.03, w: 1.6, h: 0.28, fontSize: 13, color: C.muted, fontFace: FB, valign: "middle", margin: 0 });
    s.addShape(pres.shapes.RECTANGLE, { x: gx + 1.9, y: ly, w: 0.22, h: 0.22, fill: { color: "EAE2F2" }, line: { color: C.line, width: 1 } });
    s.addText("benign tile", { x: gx + 2.2, y: ly - 0.03, w: 1.6, h: 0.28, fontSize: 13, color: C.muted, fontFace: FB, valign: "middle", margin: 0 });
    footer(s);
    s.addNotes("Frame the central tension. A 40x WSI is on the order of 10 gigapixels and tens of thousands of tiles, yet supervision usually exists only at the slide level. The diagnostic evidence can be a tiny fraction of the tissue. This scale + weak-label combination is exactly what MIL is built for.");
  })();

  // 1.2 why naive fails
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Background · naive approaches", "Why you can't just train a CNN on the slide");
    const cards = [
      ["Downsample the whole slide", "Shrink 100k² → 1024². You destroy exactly the cellular detail (nuclei, mitoses) that carries the diagnosis. Throws the signal away.", C.eosin],
      ["End-to-end on full resolution", "A 10-gigapixel forward pass doesn't fit in any GPU. Back-prop through millions of pixels per slide is intractable.", C.hema],
      ["Patch-level supervised CNN", "Requires per-patch labels. Pathologists would have to annotate millions of tiles — the cost MIL exists to avoid.", C.teal],
    ];
    const cw = 3.94, gap = 0.3, x0 = 0.7;
    cards.forEach((cc, i) => {
      const x = x0 + i * (cw + gap);
      infoCard(s, x, 1.65, cw, 2.6, cc[0], cc[1], cc[2]);
      s.addShape(pres.shapes.OVAL, { x: x + cw - 0.62, y: 1.78, w: 0.42, h: 0.42, fill: { color: "F6E9F0" } });
      s.addText("✕", { x: x + cw - 0.62, y: 1.78, w: 0.42, h: 0.42, align: "center", valign: "middle", fontSize: 18, bold: true, color: C.eosin, fontFace: FB, margin: 0 });
    });
    card(s, 0.7, 4.45, 11.93, 2.35, { accent: C.teal, fill: "EEF6F6" });
    s.addText("The MIL answer", { x: 0.98, y: 4.6, w: 11, h: 0.4, fontSize: 18, bold: true, color: C.teal, fontFace: FB, margin: 0 });
    s.addText([
      { text: "Decompose ", options: { fontFace: FB, fontSize: 16.5, color: C.ink } },
      { text: "the slide into thousands of small patches (a ", options: { fontFace: FB, fontSize: 16.5, color: C.ink } },
      { text: "bag", options: { fontFace: FB, fontSize: 16.5, bold: true, color: C.teal } },
      { text: "), encode each patch independently with a frozen feature extractor, then ", options: { fontFace: FB, fontSize: 16.5, color: C.ink } },
      { text: "learn how to pool", options: { fontFace: FB, fontSize: 16.5, bold: true, color: C.teal } },
      { text: " patch features into one slide prediction — supervised by the slide label alone. The pooling step learns which patches matter, giving you interpretability for free.", options: { fontFace: FB, fontSize: 16.5, color: C.ink } },
    ], { x: 0.98, y: 5.05, w: 11.4, h: 1.6, valign: "top", margin: 0, lineSpacingMultiple: 1.12 });
    footer(s);
    s.addNotes("Walk through three intuitive-but-broken approaches: downsampling kills resolution, full-res end-to-end is computationally impossible, and patch-supervised needs labels we don't have. MIL threads the needle: patch-decompose, encode, and learn the pooling under slide-level supervision.");
  })();

  // 1.3 weak supervision label reality
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Background · supervision", "The labels we actually have are weak");
    bullets(s, 0.7, 1.7, 6.0, 3.4, [
      "Strong supervision = a label for every pixel/region. Exists for tiny research sets; never at population scale.",
      "Weak supervision = one label per slide or per patient, pulled from the pathology report or registry.",
      ["Slide label propagates to ALL its patches as a noisy, bag-level signal.", 0],
      ["Most patches in a positive slide are still benign — the label is 'at least one' positive.", 0],
      "MIL is the formalism for learning from these bag-level labels without instance annotations.",
    ], { fontSize: 16.5, spaceAfter: 9 });
    // visual: report -> slide -> patches cascade
    card(s, 7.0, 1.65, 5.9, 5.1, {});
    s.addText("From one report to thousands of weak signals", { x: 7.2, y: 1.78, w: 5.5, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    // report
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.2, y: 2.25, w: 1.6, h: 0.95, fill: { color: C.hema }, rectRadius: 0.06 });
    s.addText("Pathology\nreport", { x: 9.2, y: 2.25, w: 1.6, h: 0.95, align: "center", valign: "middle", fontSize: 13.5, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
    s.addText("“invasive carcinoma”", { x: 8.6, y: 3.2, w: 2.8, h: 0.3, align: "center", fontSize: 12.5, italic: true, color: C.eosin, fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.LINE, { x: 10.0, y: 3.5, w: 0, h: 0.45, line: { color: C.muted, width: 1.5, endArrowType: "triangle" } });
    // slide = label
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.0, y: 4.0, w: 2.0, h: 0.7, fill: { color: C.eosin }, rectRadius: 0.06 });
    s.addText("Slide label  Y = 1", { x: 9.0, y: 4.0, w: 2.0, h: 0.7, align: "center", valign: "middle", fontSize: 14.5, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.LINE, { x: 10.0, y: 4.72, w: 0, h: 0.4, line: { color: C.muted, width: 1.5, endArrowType: "triangle" } });
    // patches grid
    const gx = 7.55, gy = 5.2, cell = 0.3, cols = 16, rows = 4;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const pos = (c === 11 && r === 1) || (c === 12 && r === 1) || (c === 4 && r === 2);
      s.addShape(pres.shapes.RECTANGLE, { x: gx + c * cell, y: gy + r * cell, w: cell - 0.04, h: cell - 0.04, fill: { color: pos ? C.eosin : "EAE2F2" } });
    }
    s.addText("every patch inherits Y=1, though most are benign", { x: 7.4, y: 6.45, w: 5.4, h: 0.3, align: "center", fontSize: 12.5, color: C.muted, fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("Make the weak-label point concrete: the slide label comes from a free-text report, propagates to all patches, but is really an 'at least one positive' statement. This noisy inheritance is the standard MIL assumption we'll formalize next.");
  })();

  // 1.4 clinical applications grid
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Background · applications", "What MIL pathology systems actually do");
    const apps = [
      ["Cancer subtyping", "LUAD vs LUSC, RCC subtypes, breast molecular class — directly from H&E.", C.eosin],
      ["Cancer detection", "Metastasis in lymph nodes (CAMELYON), prostate cancer foci screening.", C.hema],
      ["Grading", "Gleason grading for prostate; nuclear grade for breast & renal.", C.hema2],
      ["Biomarker prediction", "MSI status, gene mutations (EGFR, BRAF), HER2 — 'molecular from morphology'.", C.teal],
      ["Treatment response", "Predict response to immunotherapy / chemotherapy from baseline slides.", C.amber],
      ["Survival / prognosis", "Risk stratification and outcome prediction at the patient level.", C.eosin],
    ];
    const cw = 3.9, ch = 2.18, gx = 0.7, gy = 1.6, gapx = 0.33, gapy = 0.3;
    apps.forEach((a, i) => {
      const x = gx + (i % 3) * (cw + gapx), y = gy + Math.floor(i / 3) * (ch + gapy);
      infoCard(s, x, y, cw, ch, a[0], a[1], a[2]);
    });
    footer(s);
    s.addNotes("Survey the application space so engineers see where this lands. Two big families: morphology tasks (subtyping, detection, grading) and the more surprising 'molecular-from-morphology' tasks (mutation, MSI, biomarker, response, survival). Same MIL machinery, different label.");
  })();

  // 1.5 commercial / regulatory
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Background · the field today", "From research code to the clinic");
    bullets(s, 0.7, 1.7, 6.1, 4.6, [
      "Digital pathology went mainstream once whole-slide scanners + FDA clearance for primary diagnosis arrived (Philips 2017).",
      "Paige Prostate became the first FDA-authorized AI for pathology (2021) — a clinical-grade MIL/foundation system.",
      "2024–2025 saw an explosion of open pathology foundation models (UNI, Virchow, GigaPath, CONCH) that ML engineers can use off-the-shelf.",
      "Most published models are research-/non-commercial-licensed; clinical deployment still needs regulatory validation and external cohorts.",
      "Net: the building blocks are now public, reproducible, and the subject of this course.",
    ], { fontSize: 16.5, spaceAfter: 11 });
    card(s, 7.1, 1.65, 5.8, 5.0, { accent: C.eosin });
    s.addText("A short timeline", { x: 7.4, y: 1.82, w: 5, h: 0.4, fontSize: 17, bold: true, color: C.hema, fontFace: FB, margin: 0 });
    const tl = [
      ["2018", "ABMIL — attention-based MIL formalized"],
      ["2021", "CLAM (Nature BME); Paige Prostate FDA-cleared"],
      ["2021", "TransMIL — transformer aggregation"],
      ["2024", "UNI, Virchow, GigaPath, CONCH foundation models"],
      ["2025", "UNI2 / Virchow2; TRIDENT toolkit; slide encoders"],
    ];
    let ty = 2.45;
    tl.forEach((t) => {
      s.addShape(pres.shapes.OVAL, { x: 7.4, y: ty + 0.02, w: 0.22, h: 0.22, fill: { color: C.eosin } });
      s.addText(t[0], { x: 7.72, y: ty - 0.04, w: 0.95, h: 0.3, fontSize: 15.5, bold: true, color: C.eosin, fontFace: FB, margin: 0 });
      s.addText(t[1], { x: 8.7, y: ty - 0.05, w: 4.1, h: 0.65, fontSize: 14, color: C.ink, fontFace: FB, valign: "top", margin: 0 });
      ty += 0.86;
    });
    s.addShape(pres.shapes.LINE, { x: 7.51, y: 2.5, w: 0, h: 3.45, line: { color: C.line, width: 2 } });
    footer(s);
    s.addNotes("Ground the field historically and commercially. Key beats: ABMIL 2018, CLAM + Paige FDA 2021, the 2024 foundation-model wave, and 2025's v2 encoders + slide encoders + TRIDENT. The point: everything we teach is now open and reproducible.");
  })();

  // =====================================================================
  // SECTION 2 — MIL FORMULATION
  // =====================================================================
  divider("2", "The MIL Formulation", "Bags, instances, and permutation-invariant pooling", false);

  // 2.1 what is MIL
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "MIL · definition", "Multiple Instance Learning, formally");
    card(s, 0.7, 1.65, 6.0, 2.5, { accent: C.hema });
    s.addText("The setup", { x: 0.98, y: 1.8, w: 5, h: 0.35, fontSize: 17, bold: true, color: C.hema, fontFace: FB, margin: 0 });
    bullets(s, 0.98, 2.25, 5.5, 1.9, [
      ["A bag X = {x₁, x₂, …, x_N} is a set of instances (patches).", 0],
      ["We observe one label Y for the whole bag, not per instance.", 0],
      ["Bag size N varies slide to slide (1k–100k+).", 0],
    ], { fontSize: 15.5 });
    eqBox(s, 0.7, 4.4, 6.0, 1.4, "Y = 1  ⇔  ∃ i : yᵢ = 1\nY = 0  ⇔  ∀ i : yᵢ = 0", "Standard (binary) MIL assumption: positive bag ⇒ at least one positive instance");
    // right: bag visual
    card(s, 7.0, 1.65, 5.9, 4.15, {});
    s.addText("Bag = slide,  instance = patch", { x: 7.2, y: 1.78, w: 5.5, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.45, y: 2.25, w: 5.0, h: 3.3, fill: { color: "F3EEF9" }, line: { color: C.hema2, width: 1.5, dashType: "dash" }, rectRadius: 0.08 });
    s.addText("Bag  X  (one slide)", { x: 7.55, y: 2.32, w: 4.5, h: 0.3, fontSize: 13.5, bold: true, color: C.hema, fontFace: FB, margin: 0 });
    const ix = 7.7, iy = 2.8, cell = 0.62, cols = 7, rows = 4;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const pos = (r === 1 && c === 4) || (r === 2 && c === 1);
      s.addShape(pres.shapes.RECTANGLE, { x: ix + c * cell, y: iy + r * cell, w: cell - 0.1, h: cell - 0.1, fill: { color: pos ? C.eosin : "D9CCEC" }, line: { color: "FFFFFF", width: 1 } });
    }
    s.addText("xᵢ", { x: ix, y: iy, w: cell - 0.1, h: cell - 0.1, align: "center", valign: "middle", fontSize: 13.5, italic: true, color: C.hema, fontFace: FM, margin: 0 });
    footer(s);
    s.addNotes("Define MIL crisply. A bag is an unordered set of instances with a single bag label. The classic binary assumption: a bag is positive iff at least one instance is positive. In pathology, bag=slide, instance=patch, and instance labels are unobserved.");
  })();

  // 2.2 instance vs embedding
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "MIL · two paradigms", "Instance-level vs embedding-level MIL");
    card(s, 0.7, 1.65, 6.0, 5.0, { accent: C.amber });
    s.addText("Instance-level", { x: 0.98, y: 1.82, w: 5, h: 0.4, fontSize: 19, bold: true, color: C.amber, fontFace: FB, margin: 0 });
    s.addText("Score each patch, then pool the scores", { x: 0.98, y: 2.22, w: 5.4, h: 0.3, fontSize: 14.5, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    bullets(s, 0.98, 2.65, 5.5, 1.7, [
      "Classifier f(xᵢ) → ŷᵢ for every instance.",
      "Bag score = max / mean of instance scores.",
      "Interpretable per-patch, but noisy and unstable under weak labels.",
    ], { fontSize: 15.5 });
    eqBox(s, 0.9, 4.55, 5.6, 1.0, "Ŷ = max_i  f(xᵢ)", null);
    s.addText("Classic deep-MIL (e.g. max-pooling baselines)", { x: 0.9, y: 5.65, w: 5.6, h: 0.4, align: "center", fontSize: 13.5, italic: true, color: C.muted, fontFace: FB, margin: 0 });

    card(s, 6.95, 1.65, 5.95, 5.0, { accent: C.teal });
    s.addText("Embedding-level  ★", { x: 7.23, y: 1.82, w: 5, h: 0.4, fontSize: 19, bold: true, color: C.teal, fontFace: FB, margin: 0 });
    s.addText("Pool features first, classify once", { x: 7.23, y: 2.22, w: 5.4, h: 0.3, fontSize: 14.5, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    bullets(s, 7.23, 2.65, 5.4, 1.7, [
      "Encode each patch → embedding hᵢ ∈ ℝᵈ.",
      "Pool embeddings → one bag vector z.",
      "One classifier g(z) → Ŷ. More stable, SOTA approach.",
    ], { fontSize: 15.5 });
    eqBox(s, 7.15, 4.55, 5.55, 1.0, "z = Σ_i aᵢ hᵢ ;  Ŷ = g(z)", null);
    s.addText("ABMIL / CLAM / TransMIL all live here", { x: 7.15, y: 5.65, w: 5.55, h: 0.4, align: "center", fontSize: 13.5, italic: true, color: C.teal, fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("Two paradigms. Instance-level scores each patch then pools scores — interpretable but unstable. Embedding-level pools features into one bag vector then classifies once — more stable and the basis of every modern method (ABMIL, CLAM, TransMIL). We focus on embedding-level for the rest of the course.");
  })();

  // 2.3 permutation invariant master equation
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "MIL · the core abstraction", "Every MIL model is three boxes");
    // pipeline boxes
    const boxes = [
      ["Encoder\nf( · )", "each patch xᵢ →\nembedding hᵢ ∈ ℝᵈ", C.hema],
      ["Pooling\nσ( · )", "permutation-invariant\naggregate → z ∈ ℝᵈ", C.eosin],
      ["Classifier\ng( · )", "z → slide prediction Ŷ", C.teal],
    ];
    const bw = 3.3, by = 1.75, bh = 1.7, gap = 1.0, x0 = 0.95;
    boxes.forEach((b, i) => {
      const x = x0 + i * (bw + gap);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: by, w: bw, h: bh, fill: { color: b[2] }, rectRadius: 0.08, shadow: mkShadow() });
      s.addText(b[0], { x, y: by + 0.2, w: bw, h: 0.75, align: "center", fontSize: 20, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
      s.addText(b[1], { x: x + 0.1, y: by + 0.95, w: bw - 0.2, h: 0.65, align: "center", fontSize: 14, color: "F0E8F8", fontFace: FB, margin: 0 });
      if (i < 2) s.addShape(pres.shapes.LINE, { x: x + bw + 0.12, y: by + bh / 2, w: gap - 0.24, h: 0, line: { color: C.muted, width: 2.5, endArrowType: "triangle" } });
    });
    eqBox(s, 0.95, 3.95, 11.45, 1.25, "Ŷ = g( σ( { f(x₁), f(x₂), …, f(x_N) } ) )", "σ must be permutation-invariant: the slide has no natural ordering of patches");
    card(s, 0.95, 5.45, 11.45, 1.35, { accent: C.eosin, fill: "FBF1F5" });
    s.addText([
      { text: "Why permutation invariance? ", options: { bold: true, fontFace: FB, fontSize: 16, color: C.eosin } },
      { text: "Patches are a set, not a sequence — shuffle them and the prediction must not change. Mean, max, and attention-weighted sums all satisfy this. ", options: { fontFace: FB, fontSize: 16, color: C.ink } },
      { text: "The entire design space of MIL is: how do we build a smart, learnable σ?", options: { bold: true, fontFace: FB, fontSize: 16, color: C.hema } },
    ], { x: 1.2, y: 5.62, w: 11, h: 1.05, valign: "top", margin: 0, lineSpacingMultiple: 1.12 });
    footer(s);
    s.addNotes("This is the unifying mental model for the whole architecture section. Encoder → permutation-invariant pooling → classifier. The encoder is now a frozen foundation model; the classifier is trivial; all the intellectual action is in designing the pooling operator σ. Every method we cover next is a different σ.");
  })();

  // =====================================================================
  // SECTION 3 — DATA PREPARATION (notebook)
  // =====================================================================
  divider("3", "Data Preparation", "From raw whole-slide images to feature bags", true);

  // 3.1 WSI format / pyramid
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Data prep · the WSI", "Whole-slide images are tiled pyramids");
    bullets(s, 0.7, 1.7, 6.0, 4.0, [
      "Formats: .svs (Aperio), .ndpi (Hamamatsu), .mrxs, .tiff — all read by OpenSlide.",
      "Stored as a multi-resolution pyramid: level 0 = full 40×/20× resolution, each level downsampled ~4×.",
      ["Magnification ↔ microns-per-pixel (mpp): 20× ≈ 0.5 mpp, 40× ≈ 0.25 mpp.", 0],
      "Internally tiled (e.g. 256×256 JPEG tiles) so you can random-access regions without loading the whole slide.",
      "Always check the slide's true mpp — scanners differ; never assume the nominal magnification.",
    ], { fontSize: 16, spaceAfter: 9 });
    // pyramid visual
    card(s, 7.0, 1.65, 5.9, 5.1, {});
    s.addText("Resolution pyramid (random-access tiles)", { x: 7.2, y: 1.78, w: 5.5, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    const levels = [["L0 · 40× · 0.25 mpp", 1.0, 1.0, C.hema], ["L1 · 20×", 0.66, 0.75, C.hema2], ["L2 · 10×", 0.42, 0.55, C.eosin], ["L3 · 5× thumbnail", 0.27, 0.4, C.eosinSoft]];
    let py = 2.5;
    const barLeft = 9.2, fullW = 3.5;
    levels.forEach(([lab, frac, hh, col], i) => {
      const w = fullW * frac;
      s.addShape(pres.shapes.RECTANGLE, { x: barLeft, y: py, w, h: hh, fill: { color: col }, line: { color: "FFFFFF", width: 1 } });
      if (i === 0) for (let c = 1; c < 8; c++) s.addShape(pres.shapes.LINE, { x: barLeft + c * (w / 8), y: py, w: 0, h: hh, line: { color: "FFFFFF", width: 0.5 } });
      s.addText(lab, { x: 7.25, y: py, w: 1.8, h: hh, fontSize: 13, bold: true, color: C.ink, fontFace: FB, align: "right", valign: "middle", margin: 0 });
      py += hh + 0.2;
    });
    footer(s);
    s.addNotes("Engineers need the storage model. A WSI is a pyramid of pre-tiled levels; OpenSlide gives random access to any region at any level without decoding the whole file. Critical practical point: read the real mpp from metadata, because 20x on one scanner ≠ 20x on another.");
  })();

  // 3.2 tissue segmentation
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Data prep · step 1", "Tissue segmentation — skip the glass");
    bullets(s, 0.7, 1.7, 6.0, 3.5, [
      "Most of a slide is empty background glass; encoding it wastes compute and adds noise.",
      "Classic recipe (CLAM): downsample to a low level, convert to HSV, Otsu-threshold the saturation channel.",
      ["Median blur + morphological closing clean the mask; filter tiny tissue specks and holes.", 0],
      "Output: tissue contours (polygons) used to constrain where patches are sampled.",
      "Modern option: learned segmenters (e.g. GrandQC) for artifact/pen-mark removal.",
    ], { fontSize: 16, spaceAfter: 9 });
    codeBox(s, 0.7, 5.3, 6.0, 1.4, [
      "# CLAM-style tissue mask",
      "hsv = cv2.cvtColor(img, BGR2HSV)",
      "sat = medianBlur(hsv[...,1], mthresh)",
      "_, mask = threshold(sat, 0, 255, OTSU)",
    ], { fs: 11.5 });
    // before/after mock
    card(s, 7.0, 1.65, 5.9, 5.05, {});
    s.addText("Raw slide → tissue mask → contours", { x: 7.2, y: 1.78, w: 5.5, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    // raw
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.4, y: 2.3, w: 2.55, h: 1.9, fill: { color: "F2EAF7" }, line: { color: C.line, width: 1 }, rectRadius: 0.04 });
    [[8.1,2.7,0.9,0.7,C.eosinSoft],[8.7,3.3,0.7,0.6,C.hema2],[7.7,3.5,0.55,0.5,C.eosin]].forEach(([x,y,w,h,c]) => s.addShape(pres.shapes.OVAL, { x, y, w, h, fill: { color: c, transparency: 15 } }));
    s.addText("raw H&E", { x: 7.4, y: 4.24, w: 2.55, h: 0.25, align: "center", fontSize: 12.5, color: C.muted, fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.LINE, { x: 10.0, y: 3.2, w: 0.35, h: 0, line: { color: C.muted, width: 2, endArrowType: "triangle" } });
    // mask
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 10.35, y: 2.3, w: 2.4, h: 1.9, fill: { color: "1A1326" }, rectRadius: 0.04 });
    [[11.0,2.7,0.9,0.7],[11.6,3.3,0.7,0.6],[10.6,3.5,0.55,0.5]].forEach(([x,y,w,h]) => s.addShape(pres.shapes.OVAL, { x, y, w, h, fill: { color: "FFFFFF" } }));
    s.addText("binary mask", { x: 10.35, y: 4.24, w: 2.4, h: 0.25, align: "center", fontSize: 12.5, color: C.muted, fontFace: FB, margin: 0 });
    // contour result
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.8, y: 4.55, w: 3.2, h: 1.95, fill: { color: "F2EAF7" }, line: { color: C.line, width: 1 }, rectRadius: 0.04 });
    [[9.5,4.9,0.9,0.7],[10.1,5.5,0.7,0.6],[9.1,5.7,0.55,0.5]].forEach(([x,y,w,h]) => { s.addShape(pres.shapes.OVAL, { x, y, w, h, fill: { color: C.eosinSoft, transparency: 30 }, line: { color: C.teal, width: 2.5 } }); });
    s.addText("tissue contours (green) constrain patching", { x: 8.8, y: 6.32, w: 3.2, h: 0.25, align: "center", fontSize: 12, color: C.muted, fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("Step 1 of the pipeline. Tissue segmentation removes background glass so we only encode real tissue. The CLAM recipe is Otsu on the saturation channel after blur + morphology. The output contours bound where we sample patches. Mention learned segmenters for pen-mark/artifact removal.");
  })();

  // 3.3 patching
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Data prep · step 2", "Patching — tile the tissue into instances");
    bullets(s, 0.7, 1.7, 6.0, 3.6, [
      "Tile tissue into a grid of fixed-size patches: 256×256 px is the de-facto standard.",
      "Choose the magnification deliberately: 20× captures cellular detail; 10× captures more context per patch.",
      ["Non-overlapping grid for efficiency; overlap only if you need denser spatial coverage.", 0],
      "Store coordinates, not pixels — CLAM saves an .h5 of (x,y) coords and lazy-loads pixels at encode time.",
      "Typical yield: 5k–50k patches per slide depending on tissue area.",
    ], { fontSize: 16, spaceAfter: 9 });
    codeBox(s, 0.7, 5.4, 6.0, 1.3, [
      "# coords-first patching",
      "coords = grid_within(contours, size=256, step=256)",
      "h5.create_dataset('coords', data=coords)  # (N,2)",
    ], { fs: 11.5 });
    // patch grid on tissue
    card(s, 7.0, 1.65, 5.9, 5.05, {});
    s.addText("256-px grid clipped to tissue contour", { x: 7.2, y: 1.78, w: 5.5, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    // irregular tissue blob
    s.addShape(pres.shapes.OVAL, { x: 7.8, y: 2.4, w: 4.4, h: 3.9, fill: { color: "F2D9E6" }, line: { color: C.teal, width: 2.5 } });
    const gx = 7.55, gy = 2.35, cell = 0.5;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 10; c++) {
      const cx = gx + c * cell + cell / 2, cy = gy + r * cell + cell / 2;
      const inside = Math.pow((cx - 10.0) / 2.2, 2) + Math.pow((cy - 4.35) / 1.95, 2) < 1;
      if (inside) s.addShape(pres.shapes.RECTANGLE, { x: gx + c * cell, y: gy + r * cell, w: cell - 0.06, h: cell - 0.06, fill: { color: C.hema2, transparency: 55 }, line: { color: C.hema, width: 0.75 } });
    }
    s.addText("each in-tissue cell = one instance xᵢ", { x: 7.4, y: 6.35, w: 5.4, h: 0.3, align: "center", fontSize: 13, color: C.muted, fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("Step 2. Tile tissue into a 256-px grid at a chosen magnification. The coords-first trick (store (x,y), lazy-load pixels) is what makes CLAM fast and disk-light. Each in-tissue tile becomes an instance in the bag.");
  })();

  // 3.4 feature extraction
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Data prep · step 3", "Feature extraction — patches → embeddings");
    bullets(s, 0.7, 1.7, 6.0, 3.7, [
      "Run each patch through a frozen foundation encoder → fixed-length embedding hᵢ ∈ ℝᵈ.",
      "Embedding dims: UNI = 1024, UNI2 = 1536, Virchow2 = 2560, GigaPath/CONCHv1.5 = 1536/768.",
      ["This is the expensive, one-time, GPU-bound step — batch patches, use AMP/fp16.", 0],
      "Output per slide: a tensor (N × d) saved as .pt / .h5 — this IS the bag the MIL model trains on.",
      "Because features are precomputed, MIL training itself is cheap (CPU-feasible, minutes).",
    ], { fontSize: 16, spaceAfter: 9 });
    codeBox(s, 0.7, 5.4, 6.0, 1.3, [
      "# precompute once, reuse forever",
      "feats = encoder(patches.cuda())   # (B, d)",
      "torch.save(bag_feats, f'{slide_id}.pt')  # (N, d)",
    ], { fs: 11.5 });
    // diagram patch->encoder->vector
    card(s, 7.0, 1.65, 5.9, 5.05, {});
    s.addText("The encode-once bottleneck", { x: 7.2, y: 1.78, w: 5.5, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    // patches column
    for (let i = 0; i < 4; i++) s.addShape(pres.shapes.RECTANGLE, { x: 7.4, y: 2.5 + i * 0.62, w: 0.55, h: 0.55, fill: { color: i === 1 ? C.eosin : C.hema2 }, line: { color: "FFFFFF", width: 1 } });
    s.addText("patches", { x: 7.3, y: 5.0, w: 0.8, h: 0.3, fontSize: 12, color: C.muted, fontFace: FB, align: "center", margin: 0 });
    s.addShape(pres.shapes.LINE, { x: 8.05, y: 3.45, w: 0.5, h: 0, line: { color: C.muted, width: 2, endArrowType: "triangle" } });
    // encoder
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.6, y: 2.85, w: 2.0, h: 1.25, fill: { color: C.hema }, rectRadius: 0.08 });
    s.addText("Frozen\nfoundation\nencoder f", { x: 8.6, y: 2.85, w: 2.0, h: 1.25, align: "center", valign: "middle", fontSize: 14.5, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
    s.addText("❄", { x: 8.65, y: 2.9, w: 0.3, h: 0.3, fontSize: 14.5, color: "CFE8FF", fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.LINE, { x: 10.7, y: 3.45, w: 0.5, h: 0, line: { color: C.muted, width: 2, endArrowType: "triangle" } });
    // vector
    s.addShape(pres.shapes.RECTANGLE, { x: 11.3, y: 2.65, w: 0.45, h: 1.6, fill: { color: C.teal }, line: { color: "FFFFFF", width: 1 } });
    for (let k = 1; k < 6; k++) s.addShape(pres.shapes.LINE, { x: 11.3, y: 2.65 + k * 0.265, w: 0.45, h: 0, line: { color: "FFFFFF", width: 0.75 } });
    s.addText("hᵢ ∈ ℝᵈ", { x: 11.1, y: 4.32, w: 0.95, h: 0.3, fontSize: 13, color: C.muted, fontFace: FM, align: "center", margin: 0 });
    // result tensor
    s.addShape(pres.shapes.RECTANGLE, { x: 8.0, y: 5.05, w: 3.3, h: 1.25, fill: { color: "F2EAF7" }, line: { color: C.eosin, width: 1.5 } });
    s.addText("Bag tensor  (N × d)\nsaved to disk · trains the MIL model", { x: 8.0, y: 5.05, w: 3.3, h: 1.25, align: "center", valign: "middle", fontSize: 14.5, bold: true, color: C.hema, fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("Step 3, the crux. Each patch goes through a FROZEN foundation encoder to a d-dim vector. This is the one expensive GPU pass; cache it. The per-slide (N×d) tensor is the bag. Because it's precomputed, MIL training is cheap and fast — a key practical property.");
  })();

  // 3.5 notebook 1 callout / recap
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Data prep · notebook 01", "Hands-on: build a feature bag end-to-end");
    // pipeline strip
    const steps = ["Open WSI\n(OpenSlide)", "Segment\ntissue", "Patch\n256px", "Encode\n(UNI/CONCH)", "Save bag\n(N × d)"];
    const sw = 2.25, sy = 1.8, sh = 1.1, gap = 0.18, x0 = 0.7;
    steps.forEach((st, i) => {
      const x = x0 + i * (sw + gap);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: sy, w: sw, h: sh, fill: { color: i === 4 ? C.eosin : C.hema }, rectRadius: 0.06, shadow: mkShadow() });
      s.addText(st, { x, y: sy, w: sw, h: sh, align: "center", valign: "middle", fontSize: 15, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
      if (i < 4) s.addShape(pres.shapes.LINE, { x: x + sw + 0.01, y: sy + sh / 2, w: gap - 0.02, h: 0, line: { color: C.muted, width: 2, endArrowType: "triangle" } });
    });
    card(s, 0.7, 3.35, 7.4, 3.35, { accent: C.teal });
    s.addText("What notebook 01 covers", { x: 0.98, y: 3.5, w: 6.8, h: 0.4, fontSize: 17, bold: true, color: C.teal, fontFace: FB, margin: 0 });
    bullets(s, 0.98, 3.98, 6.95, 2.6, [
      "Load a TCGA .svs slide with OpenSlide; read mpp & pyramid levels.",
      "Otsu tissue segmentation and contour extraction.",
      "Grid patching at 20×; visualize the patch map over the slide.",
      "Load UNI/CONCH from HuggingFace; extract & cache patch features.",
      "Save the (N×d) bag tensor + a manifest CSV for training.",
    ], { fontSize: 15, spaceAfter: 7 });
    codeBox(s, 8.25, 3.35, 4.65, 3.35, [
      "# notebook 01 — data prep",
      "import openslide, torch",
      "from transformers import AutoModel",
      "",
      "wsi = openslide.OpenSlide(path)",
      "mask = segment_tissue(wsi)",
      "coords = grid_patches(mask, 256)",
      "enc = AutoModel.from_pretrained(",
      "        'MahmoodLab/UNI2-h')",
      "bag = encode(enc, wsi, coords)",
      "torch.save(bag, 'TCGA-XX.pt')",
    ], { fs: 11.5 });
    footer(s);
    s.addNotes("Point to notebook 01. It walks the full data-prep pipeline on a real TCGA slide: OpenSlide load, Otsu segmentation, 20x patching with a visual patch map, UNI/CONCH feature extraction, and saving the bag tensor + manifest. This produces the input every later notebook consumes.");
  })();

  // =====================================================================
  // SECTION 4 — FOUNDATION ENCODERS
  // =====================================================================
  divider("4", "Foundation Encoders", "The frozen feature extractors that power modern MIL", false);

  // 4.1 why foundation models
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Encoders · why", "ImageNet → pathology foundation models");
    const evo = [
      ["2019–21", "ImageNet CNNs", "ResNet-50 features. Domain gap: natural images ≠ H&E. Weak.", C.muted],
      ["2021–22", "In-domain SSL", "CTransPath, RetCCL: contrastive SSL on histology. Better.", C.hema2],
      ["2024+", "Foundation models", "ViT-H/G trained on millions of WSIs with DINOv2. Dramatic jump.", C.eosin],
    ];
    const cw = 3.95, gap = 0.3, x0 = 0.7, y = 1.7, ch = 2.5;
    evo.forEach((e, i) => {
      const x = x0 + i * (cw + gap);
      card(s, x, y, cw, ch, { accent: e[3] });
      s.addText(e[0], { x: x + 0.28, y: y + 0.18, w: cw - 0.5, h: 0.35, fontSize: 15.5, bold: true, color: e[3] === C.muted ? C.muted : e[3], fontFace: FB, margin: 0 });
      s.addText(e[1], { x: x + 0.28, y: y + 0.55, w: cw - 0.5, h: 0.45, fontSize: 18, bold: true, color: C.hema, fontFace: FB, margin: 0 });
      s.addText(e[2], { x: x + 0.28, y: y + 1.05, w: cw - 0.5, h: 1.3, fontSize: 15, color: C.ink, fontFace: FB, valign: "top", margin: 0 });
    });
    card(s, 0.7, 4.55, 11.93, 2.15, { accent: C.teal, fill: "EEF6F6" });
    s.addText("Why this matters for MIL", { x: 0.98, y: 4.7, w: 11, h: 0.4, fontSize: 17, bold: true, color: C.teal, fontFace: FB, margin: 0 });
    s.addText("Foundation-model features are so strong that even mean-pooling becomes competitive, and a tiny attention head trained on a few hundred slides reaches clinical-grade AUCs. The encoder does the heavy lifting; the MIL head learns 'which patches and how much'. This is why we freeze the encoder and only train the aggregator.", { x: 0.98, y: 5.12, w: 11.5, h: 1.4, fontSize: 16.5, color: C.ink, fontFace: FB, valign: "top", margin: 0, lineSpacingMultiple: 1.12 });
    footer(s);
    s.addNotes("Explain the encoder revolution. We went from ImageNet CNNs (big domain gap) to in-domain SSL (CTransPath) to true foundation models trained on millions of WSIs. The features are now strong enough that the MIL head can be tiny and data-efficient. That's why the frozen-encoder + light-aggregator recipe dominates.");
  })();

  // 4.2 the encoder zoo table
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Encoders · the zoo (2024–2025)", "Patch encoders you can download today");
    const rows = [
      [{ text: "Model", b: 1 }, { text: "Maker", b: 1 }, { text: "Arch", b: 1 }, { text: "Train data", b: 1 }, { text: "Emb. dim", b: 1 }, { text: "Notes", b: 1 }],
      ["UNI", "Mahmood Lab", "ViT-L/16", "100M tiles · 100k WSI", "1024", "First open FM; strong baseline"],
      ["UNI2-h", "Mahmood Lab", "ViT-H/14", "200M+ tiles · 350k WSI", "1536", "SOTA-class general encoder"],
      ["Virchow2", "Paige", "ViT-H/14", "3.1M WSI · 2B tiles", "2560", "Mixed-magnification, register tokens"],
      ["Prov-GigaPath", "Microsoft/Providence", "ViT-G/14", "1.3B tiles · 171k WSI", "1536", "Paired slide encoder available"],
      ["H-optimus-0", "Bioptimus", "ViT-G/14", "500k+ WSI", "1536", "Strong open ViT-G"],
      ["CONCH v1.5", "Mahmood Lab", "ViT-B/16", "1.17M image–caption", "768", "Vision-language (zero-shot capable)"],
      ["Phikon-v2", "Owkin", "ViT-L", "multi-cohort histology", "1024", "Open, permissive-ish licensing"],
    ];
    const tbl = rows.map((r, ri) => r.map((cell) => {
      const txt = typeof cell === "string" ? cell : cell.text;
      const header = ri === 0;
      return { text: txt, options: { fill: { color: header ? C.hema : (ri % 2 ? "FFFFFF" : "F3EEF9") }, color: header ? "FFFFFF" : C.ink, bold: header || (typeof cell === "object"), fontSize: header ? 12.5 : 11.5, fontFace: FB, align: "left", valign: "middle", margin: 3 } };
    }));
    s.addTable(tbl, { x: 0.7, y: 1.65, w: 11.93, colW: [1.7, 2.1, 1.25, 2.85, 1.1, 2.93], rowH: 0.52, border: { type: "solid", color: C.line, pt: 1 }, valign: "middle" });
    s.addText("Benchmarks shift fast; CONCH, Virchow2 and UNI2 trade the lead across tasks. None were trained on TCGA/CAMELYON, so they're safe to benchmark on those.", { x: 0.7, y: 6.35, w: 11.9, h: 0.5, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("Reference table — don't read every cell. Key takeaways: ViT-L to ViT-G scale, embedding dims from 768 to 2560, all trained on huge WSI corpora, all downloadable. Note CONCH is vision-language (zero-shot capable). Important: these models excluded TCGA/CAMELYON from training, so benchmarking on those is leakage-safe.");
  })();

  // 4.3 patch vs slide encoders
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Encoders · two levels", "Patch encoders vs slide encoders");
    card(s, 0.7, 1.65, 6.0, 5.0, { accent: C.hema });
    s.addText("Patch (tile) encoders", { x: 0.98, y: 1.82, w: 5.5, h: 0.4, fontSize: 19, bold: true, color: C.hema, fontFace: FB, margin: 0 });
    bullets(s, 0.98, 2.35, 5.5, 2.0, [
      "Input: one 256-px tile → one vector.",
      "What we've discussed: UNI2, Virchow2, CONCH, GigaPath tile model.",
      "Still need a MIL aggregator on top to reach a slide prediction.",
    ], { fontSize: 16 });
    s.addText("tile → hᵢ ∈ ℝᵈ,  then MIL pools the bag", { x: 0.98, y: 4.45, w: 5.5, h: 0.4, fontSize: 14.5, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.98, y: 5.0, w: 5.4, h: 1.4, fill: { color: "F3EEF9" }, line: { color: C.line, width: 1 } });
    s.addText("This course trains the aggregator on top of a frozen patch encoder — the most common, flexible setup.", { x: 1.15, y: 5.1, w: 5.1, h: 1.2, fontSize: 15, color: C.ink, fontFace: FB, valign: "middle", margin: 0 });

    card(s, 6.95, 1.65, 5.95, 5.0, { accent: C.eosin });
    s.addText("Slide encoders", { x: 7.23, y: 1.82, w: 5.5, h: 0.4, fontSize: 19, bold: true, color: C.eosin, fontFace: FB, margin: 0 });
    bullets(s, 7.23, 2.35, 5.4, 2.3, [
      "Input: the full bag of tile features → one slide embedding.",
      "Pretrained aggregators: GigaPath slide encoder, PRISM (Virchow), TITAN, CHIEF, Madeleine.",
      "Often a transformer over the tile grid, self-supervised at slide level.",
      "Use as a strong frozen slide embedding → linear probe, or fine-tune.",
    ], { fontSize: 16 });
    s.addText("bag → z_slide ∈ ℝᵈ  (aggregation is pretrained)", { x: 7.23, y: 5.0, w: 5.4, h: 0.4, fontSize: 14.5, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.RECTANGLE, { x: 7.23, y: 5.5, w: 5.4, h: 0.9, fill: { color: "FBF1F5" }, line: { color: C.line, width: 1 } });
    s.addText("Emerging frontier: less task data needed, but heavier and newer. We mention them; the course core is patch-encoder + trainable MIL head.", { x: 7.4, y: 5.58, w: 5.1, h: 0.78, fontSize: 14, color: C.ink, fontFace: FB, valign: "middle", margin: 0 });
    footer(s);
    s.addNotes("Distinguish the two tiers. Patch encoders give per-tile vectors and still need a MIL aggregator — our focus. Slide encoders are pretrained aggregators (GigaPath slide model, PRISM, TITAN, CHIEF) that output a slide embedding directly. They're the frontier and reduce task-data needs, but the course core is the flexible patch-encoder + trainable head.");
  })();

  // =====================================================================
  // SECTION 5 — MODEL ARCHITECTURE
  // =====================================================================
  divider("5", "Model Architecture", "Designing the pooling operator: Mean → ABMIL → CLAM → TransMIL", false);

  // 5.1 aggregator anatomy
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Architecture · anatomy", "Anatomy of a MIL aggregator");
    bullets(s, 0.7, 1.7, 5.6, 4.4, [
      "Input: bag of frozen features H ∈ ℝ^{N×d}.",
      "(Optional) projection: compress d → d′ (e.g. 1024 → 512) with a small FC + ReLU.",
      ["Pooling σ: collapse N instances → one vector z. THE design choice.", 0],
      "Classifier g: a linear layer z → logits over classes.",
      "Trainable params live almost entirely in pooling + the projection — often < 1M.",
      "Trains in minutes on cached features; iterate fast.",
    ], { fontSize: 16.5, spaceAfter: 9 });
    // vertical pipeline
    card(s, 6.6, 1.65, 6.3, 5.05, {});
    const stk = [["H ∈ ℝ^{N×d}", "frozen bag features", C.hema2], ["Projection (opt.)", "FC: d → d′", C.hema], ["Pooling σ", "N×d′ → d′   ← learnable, the key", C.eosin], ["Classifier g", "linear → logits", C.teal]];
    let yy = 2.1;
    stk.forEach((b, i) => {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.4, y: yy, w: 4.7, h: 0.85, fill: { color: b[2] }, rectRadius: 0.06, shadow: mkShadow() });
      s.addText(b[0], { x: 7.4, y: yy + 0.1, w: 4.7, h: 0.4, align: "center", fontSize: 16.5, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
      s.addText(b[1], { x: 7.4, y: yy + 0.48, w: 4.7, h: 0.32, align: "center", fontSize: 13, color: "F0E8F8", fontFace: FB, margin: 0 });
      if (i < 3) s.addShape(pres.shapes.LINE, { x: 9.75, y: yy + 0.85, w: 0, h: 0.32, line: { color: C.muted, width: 2.5, endArrowType: "triangle" } });
      yy += 1.17;
    });
    footer(s);
    s.addNotes("Give the anatomy before the zoo. Bag features in, optional projection, pooling (the learnable heart), linear classifier out. Emphasize how few parameters this is and how fast it trains on cached features — that's why MIL research iterates so quickly. Everything next is a different pooling box.");
  })();

  // 5.2 mean/max baseline
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Architecture · baselines", "Mean & Max pooling — the honest baselines");
    card(s, 0.7, 1.65, 6.0, 2.4, { accent: C.hema2 });
    s.addText("Mean pooling", { x: 0.98, y: 1.8, w: 5, h: 0.4, fontSize: 18, bold: true, color: C.hema, fontFace: FB, margin: 0 });
    eqBox(s, 0.98, 2.3, 5.45, 0.95, "z = (1/N) Σ_i hᵢ", null);
    s.addText("Democratic: every patch counts equally. Robust, but dilutes a tiny tumor focus in a sea of benign tissue.", { x: 0.98, y: 3.35, w: 5.45, h: 0.6, fontSize: 14.5, color: C.ink, fontFace: FB, valign: "top", margin: 0 });

    card(s, 0.7, 4.25, 6.0, 2.4, { accent: C.amber });
    s.addText("Max pooling", { x: 0.98, y: 4.4, w: 5, h: 0.4, fontSize: 18, bold: true, color: C.amber, fontFace: FB, margin: 0 });
    eqBox(s, 0.98, 4.9, 5.45, 0.95, "z = max_i hᵢ   (per-dim)", null);
    s.addText("Spotlights the single strongest patch. Sensitive to outliers/artifacts; throws away everything else.", { x: 0.98, y: 5.95, w: 5.45, h: 0.6, fontSize: 14.5, color: C.ink, fontFace: FB, valign: "top", margin: 0 });

    card(s, 6.95, 1.65, 5.95, 5.0, { accent: C.eosin, fill: "FBF1F5" });
    s.addText("Why we still care", { x: 7.23, y: 1.82, w: 5, h: 0.4, fontSize: 18, bold: true, color: C.eosin, fontFace: FB, margin: 0 });
    bullets(s, 7.23, 2.3, 5.4, 4.0, [
      "Zero learnable pooling params — pure inductive bias.",
      "With strong foundation features, mean-pooling is a shockingly tough baseline; always report it.",
      "Mean = 'attention with uniform weights'; Max = 'attention with a one-hot weight'.",
      "Attention MIL generalizes both: let the data choose the weights.",
      "Rule of thumb: if your fancy model can't beat mean-pooling, something is wrong.",
    ], { fontSize: 16, spaceAfter: 11 });
    footer(s);
    s.addNotes("Respect the baselines. Mean = uniform weights (robust but dilutes signal); Max = one-hot weight (sharp but fragile). Crucially, with foundation features mean-pooling is a strong baseline you must beat. Frame both as special cases of attention — which motivates the next slide.");
  })();

  // 5.3 ABMIL attention
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Architecture · ABMIL", "Attention-based MIL (Ilse et al., 2018)");
    bullets(s, 0.7, 1.7, 5.7, 2.6, [
      "Learn a scalar attention weight aᵢ for each patch, then take a weighted sum.",
      "Weights are normalized across the bag (softmax) → they sum to 1.",
      "aᵢ is directly interpretable: 'how much this patch drove the prediction'.",
      "Permutation-invariant by construction; handles any bag size N.",
    ], { fontSize: 16.5, spaceAfter: 9 });
    eqBox(s, 0.7, 5.0, 5.9, 1.55, "aᵢ = softmax_i( wᵀ tanh(V hᵢ) )\nz = Σ_i aᵢ hᵢ", "V ∈ ℝ^{L×d}, w ∈ ℝ^L are the only new params");
    // attention bar viz
    card(s, 6.85, 1.65, 6.05, 5.0, {});
    s.addText("Attention reweights the bag", { x: 7.1, y: 1.78, w: 5.5, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    const weights = [0.03, 0.05, 0.02, 0.34, 0.28, 0.04, 0.03, 0.02, 0.06, 0.13];
    const bx = 7.25, by = 2.35, bw = 0.5, gap = 0.07, maxH = 3.4;
    weights.forEach((wv, i) => {
      const hh = 0.15 + wv * maxH * 2.2;
      const x = bx + i * (bw + gap);
      const col = wv > 0.2 ? C.eosin : C.hema2;
      s.addShape(pres.shapes.RECTANGLE, { x, y: by + (maxH - hh), w: bw, h: hh, fill: { color: col } });
      s.addText("h" + (i + 1), { x: x - 0.05, y: by + maxH + 0.05, w: bw + 0.1, h: 0.25, align: "center", fontSize: 11, color: C.muted, fontFace: FM, margin: 0 });
    });
    s.addText("aᵢ", { x: 6.95, y: by + 1.3, w: 0.3, h: 0.3, fontSize: 15.5, italic: true, color: C.hema, fontFace: FM, margin: 0 });
    s.addText("Two patches dominate (high aᵢ) → these become the attention heatmap hotspots.", { x: 7.25, y: 6.05, w: 5.4, h: 0.55, fontSize: 14, color: C.ink, fontFace: FB, valign: "top", margin: 0 });
    footer(s);
    s.addNotes("ABMIL is the workhorse. A small 2-layer network scores each patch; softmax normalizes; weighted sum gives the bag vector. The attention weights are the interpretability bonus — the same numbers we'll paint as heatmaps later. Stress that this generalizes mean/max.");
  })();

  // 5.4 gated attention
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Architecture · ABMIL", "Gated attention — adding a learnable gate");
    bullets(s, 0.7, 1.7, 5.8, 2.5, [
      "tanh alone is roughly linear near 0 — limits the attention's expressiveness.",
      "Gated attention multiplies a tanh branch by a sigmoid 'gate' branch (à la GLU).",
      "Lets the network suppress or pass features per-dimension before scoring.",
      "Default in CLAM; usually a small but real bump over vanilla ABMIL.",
    ], { fontSize: 16.5, spaceAfter: 9 });
    eqBox(s, 0.7, 5.0, 5.95, 1.55, "aᵢ = softmax_i( wᵀ [ tanh(V hᵢ) ⊙ sigm(U hᵢ) ] )", "⊙ = element-wise product; U is the extra gating matrix");
    // two-branch diagram
    card(s, 6.85, 1.65, 6.05, 5.0, {});
    s.addText("Two-branch gating", { x: 7.1, y: 1.78, w: 5, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.RECTANGLE, { x: 9.45, y: 2.3, w: 1.0, h: 0.55, fill: { color: C.hema2 } });
    s.addText("hᵢ", { x: 9.45, y: 2.3, w: 1.0, h: 0.55, align: "center", valign: "middle", fontSize: 15.5, italic: true, color: "FFFFFF", fontFace: FM, margin: 0 });
    // branch lines
    seg(s, 9.45, 2.58, 8.5, 3.43);
    s.addShape(pres.shapes.LINE, { x: 10.45, y: 2.58, w: 0.95, h: 0.85, line: { color: C.muted, width: 2 } });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.8, y: 3.45, w: 1.55, h: 0.65, fill: { color: C.hema }, rectRadius: 0.06 });
    s.addText("tanh(V·)", { x: 7.8, y: 3.45, w: 1.55, h: 0.65, align: "center", valign: "middle", fontSize: 15, bold: true, color: "FFFFFF", fontFace: FM, margin: 0 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 10.55, y: 3.45, w: 1.55, h: 0.65, fill: { color: C.eosin }, rectRadius: 0.06 });
    s.addText("sigm(U·)", { x: 10.55, y: 3.45, w: 1.55, h: 0.65, align: "center", valign: "middle", fontSize: 15, bold: true, color: "FFFFFF", fontFace: FM, margin: 0 });
    // multiply
    s.addShape(pres.shapes.LINE, { x: 8.57, y: 4.1, w: 1.35, h: 0.7, line: { color: C.muted, width: 2 } });
    seg(s, 11.32, 4.1, 9.97, 4.8);
    s.addShape(pres.shapes.OVAL, { x: 9.7, y: 4.75, w: 0.55, h: 0.55, fill: { color: C.teal } });
    s.addText("⊙", { x: 9.7, y: 4.75, w: 0.55, h: 0.55, align: "center", valign: "middle", fontSize: 20, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.LINE, { x: 9.97, y: 5.3, w: 0, h: 0.5, line: { color: C.muted, width: 2, endArrowType: "triangle" } });
    s.addShape(pres.shapes.RECTANGLE, { x: 9.2, y: 5.85, w: 1.55, h: 0.55, fill: { color: C.hema2 } });
    s.addText("aᵢ → softmax", { x: 9.2, y: 5.85, w: 1.55, h: 0.55, align: "center", valign: "middle", fontSize: 13.5, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("Gated attention is a one-line upgrade: add a sigmoid gate branch and element-wise-multiply it with the tanh branch before scoring. More expressive non-linearity; it's the CLAM default. Small but consistent improvement — cheap to adopt.");
  })();

  // 5.5 CLAM
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Architecture · CLAM · Lu et al. 2021", "CLAM: clustering-constrained attention");
    bullets(s, 0.7, 1.7, 6.0, 3.0, [
      "Gated-attention MIL + an instance-level clustering auxiliary loss.",
      "After computing attention, take the top-k and bottom-k attended patches as pseudo-labeled positives/negatives.",
      ["A small 'instance classifier' is trained on these via a clustering loss → sharpens the attention's discriminability.", 0],
      "CLAM-SB: one attention branch (binary). CLAM-MB: one attention branch per class (multi-class).",
      "Data-efficient: strong results from only a few hundred slides — a big reason it's the field default.",
    ], { fontSize: 16, spaceAfter: 8 });
    eqBox(s, 0.7, 5.45, 6.0, 1.25, "L = L_bag(Ŷ, Y) + λ · L_cluster(top/bottom-k)", "two-task objective: slide classification + instance clustering");
    // diagram
    card(s, 6.85, 1.65, 6.05, 5.05, {});
    s.addText("Attention + instance supervision", { x: 7.1, y: 1.78, w: 5.5, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.4, y: 2.35, w: 4.7, h: 0.6, fill: { color: C.hema2 }, rectRadius: 0.06 });
    s.addText("Bag features  H (N×d)", { x: 7.4, y: 2.35, w: 4.7, h: 0.6, align: "center", valign: "middle", fontSize: 14.5, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.LINE, { x: 9.75, y: 2.95, w: 0, h: 0.3, line: { color: C.muted, width: 2, endArrowType: "triangle" } });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.9, y: 3.3, w: 3.7, h: 0.6, fill: { color: C.eosin }, rectRadius: 0.06 });
    s.addText("Gated attention  aᵢ", { x: 7.9, y: 3.3, w: 3.7, h: 0.6, align: "center", valign: "middle", fontSize: 14.5, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
    // two branches
    seg(s, 8.7, 3.9, 8.15, 4.55);
    s.addShape(pres.shapes.LINE, { x: 10.8, y: 3.9, w: 0.55, h: 0.65, line: { color: C.muted, width: 2 } });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.25, y: 4.6, w: 2.55, h: 0.95, fill: { color: C.hema }, rectRadius: 0.06 });
    s.addText("Σ aᵢhᵢ → g\nslide loss", { x: 7.25, y: 4.6, w: 2.55, h: 0.95, align: "center", valign: "middle", fontSize: 14, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 10.05, y: 4.6, w: 2.55, h: 0.95, fill: { color: C.teal }, rectRadius: 0.06 });
    s.addText("top/bottom-k\nclustering loss", { x: 10.05, y: 4.6, w: 2.55, h: 0.95, align: "center", valign: "middle", fontSize: 14, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
    s.addText("Two heads share one attention map", { x: 7.25, y: 5.7, w: 5.35, h: 0.4, align: "center", fontSize: 13.5, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("CLAM is the field default — explain it precisely. It's gated-attention MIL plus an instance-clustering auxiliary task: the top-k and bottom-k attended patches are pseudo-labeled and an instance classifier learns to separate them, which regularizes/sharpens attention. SB vs MB = single vs per-class attention branch. The clustering loss + data efficiency are why it caught on. Correct the common myth: there is no k-means preprocessing.");
  })();

  // 5.6 TransMIL
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Architecture · TransMIL · Shao et al. 2021", "TransMIL: self-attention across patches");
    bullets(s, 0.7, 1.7, 6.0, 3.4, [
      "ABMIL/CLAM score patches independently — they ignore patch-to-patch relationships.",
      "TransMIL applies Transformer self-attention so patches can attend to each other (morphological context, correlations).",
      ["Full self-attention is O(N²) — infeasible for N≈10⁴. TransMIL uses the Nyström approximation for near-linear cost.", 0],
      "Adds a learnable [CLS] token; its output embedding is the bag representation.",
      "A PPEG module injects approximate 2-D spatial position of patches.",
    ], { fontSize: 14, spaceAfter: 7 });
    eqBox(s, 0.7, 5.55, 6.0, 1.2, "Attn(Q,K,V) = softmax(QKᵀ/√d) V   ≈  Nyström", "correlated pooling: instances are no longer independent");
    // self-attention graph viz
    card(s, 6.85, 1.65, 6.05, 5.05, {});
    s.addText("Patches attend to each other", { x: 7.1, y: 1.78, w: 5, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    const nodes = [[8.0, 3.0], [9.9, 2.5], [11.5, 3.3], [8.4, 4.6], [10.2, 4.9], [11.6, 5.6], [9.4, 5.7]];
    // edges
    const edges = [[0,1],[1,2],[0,3],[3,4],[1,4],[4,5],[3,6],[4,6],[2,4]];
    edges.forEach(([a,b]) => seg(s, nodes[a][0]+0.2, nodes[a][1]+0.2, nodes[b][0]+0.2, nodes[b][1]+0.2, "C9B8DE", 1.5));
    nodes.forEach((n, i) => { const cls = i === 4; s.addShape(pres.shapes.OVAL, { x: n[0], y: n[1], w: 0.4, h: 0.4, fill: { color: cls ? C.eosin : C.hema2 } }); });
    s.addShape(pres.shapes.OVAL, { x: nodes[4][0]-0.08, y: nodes[4][1]-0.08, w: 0.56, h: 0.56, fill: { color: C.eosin }, line: { color: C.hema, width: 2 } });
    s.addText("CLS", { x: nodes[4][0]-0.08, y: nodes[4][1]-0.08, w: 0.56, h: 0.56, align: "center", valign: "middle", fontSize: 11.5, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
    s.addText("[CLS] token aggregates a fully-connected attention graph", { x: 7.1, y: 6.25, w: 5.6, h: 0.4, align: "center", fontSize: 13.5, color: C.muted, fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("TransMIL adds inter-patch context via self-attention — patches see each other, unlike ABMIL/CLAM's independent scoring. The catch is O(N²); they use Nyström to approximate it near-linearly, plus a CLS token and PPEG positional module. Best when spatial/morphological context between regions matters.");
  })();

  // 5.7 comparison table
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Architecture · landscape", "Choosing an aggregator");
    const rows = [
      [{t:"Method",b:1},{t:"Pooling idea",b:1},{t:"Interpretable?",b:1},{t:"Cost",b:1},{t:"When to use",b:1}],
      ["Mean / Max","Fixed average / maximum","Weak","O(N)","Always — as a baseline"],
      ["ABMIL","Learned attention-weighted sum","Yes (aᵢ)","O(N)","Strong, simple default"],
      ["CLAM","Gated attn + instance clustering","Yes (aᵢ)","O(N)","Few slides; want robustness + heatmaps"],
      ["DSMIL","Dual-stream: critical + bag stream","Yes","O(N)","Max-instance anchored attention"],
      ["TransMIL","Self-attention (Nyström) + CLS","Partial","~O(N)","Inter-patch context matters"],
      ["DTFD-MIL","Pseudo-bags + 2-tier distillation","Partial","O(N)","Very small cohorts / noisy bags"],
    ];
    const tbl = rows.map((r, ri) => r.map((cell) => {
      const txt = typeof cell === "string" ? cell : cell.t;
      const header = ri === 0;
      return { text: txt, options: { fill: { color: header ? C.hema : (ri % 2 ? "FFFFFF" : "F3EEF9") }, color: header ? "FFFFFF" : C.ink, bold: header, fontSize: header ? 12.5 : 11.5, fontFace: FB, align: "left", valign: "middle", margin: 3 } };
    }));
    s.addTable(tbl, { x: 0.7, y: 1.65, w: 11.93, colW: [1.6, 3.35, 1.7, 1.1, 4.18], rowH: 0.55, border: { type: "solid", color: C.line, pt: 1 }, valign: "middle" });
    s.addText("Practical default: start with CLAM-SB on frozen foundation features. Reach for TransMIL when context helps; DTFD when data is scarce. Always beat mean-pooling first.", { x: 0.7, y: 6.5, w: 11.9, h: 0.5, fontSize: 14.5, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("Decision table. The honest practical advice: default to CLAM-SB on frozen foundation features, use TransMIL when inter-patch context helps, DTFD for tiny cohorts, and always sanity-check against mean-pooling. There's no universal winner — encoder choice often matters more than aggregator choice.");
  })();

  // =====================================================================
  // SECTION 6 — TRAINING PROTOCOLS (notebook)
  // =====================================================================
  divider("6", "Training Protocols", "How to actually train and validate a MIL model", true);

  // 6.1 two-stage pipeline
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Training · the pipeline", "Two stages: encode offline, train online");
    // stage boxes
    card(s, 0.7, 1.7, 6.0, 2.45, { accent: C.hema });
    s.addText("Stage 1 · Offline (once)", { x: 0.98, y: 1.85, w: 5.5, h: 0.4, fontSize: 17, bold: true, color: C.hema, fontFace: FB, margin: 0 });
    bullets(s, 0.98, 2.3, 5.5, 1.7, [
      "Patch + encode every slide → cache (N×d) bags.",
      "GPU-heavy, but amortized across all experiments.",
      "Re-used by every model, fold, and hyperparameter run.",
    ], { fontSize: 15.5 });
    card(s, 0.7, 4.3, 6.0, 2.4, { accent: C.eosin });
    s.addText("Stage 2 · Online (per experiment)", { x: 0.98, y: 4.45, w: 5.5, h: 0.4, fontSize: 17, bold: true, color: C.eosin, fontFace: FB, margin: 0 });
    bullets(s, 0.98, 4.9, 5.5, 1.7, [
      "Load cached bags; train only the aggregator.",
      "One bag = one 'batch' (variable N) → batch size 1, or pad/bucket.",
      "Minutes per run on a single GPU (or even CPU).",
    ], { fontSize: 15.5 });
    // right pseudo training loop
    codeBox(s, 6.95, 1.7, 5.95, 5.0, [
      "# stage 2: train the aggregator",
      "model = CLAM_SB(in_dim=1536, n_classes=2)",
      "opt = AdamW(model.parameters(), lr=2e-4,",
      "            weight_decay=1e-5)",
      "",
      "for epoch in range(max_epochs):",
      "  for bag, y in train_loader:   # bag: (N,d)",
      "    logits, A, inst_loss = model(bag)",
      "    loss = ce(logits, y) + 0.3*inst_loss",
      "    loss.backward(); opt.step(); opt.zero_grad()",
      "",
      "  auc = evaluate(model, val_loader)",
      "  early_stopping(auc)            # patience ~20",
      "",
      "# bags vary in size → batch_size = 1",
      "# (or bucket by N and pad with a mask)",
    ], { fs: 11.5 });
    footer(s);
    s.addNotes("The defining property of modern MIL training: it's two-stage. Stage 1 encodes slides once (GPU-heavy, cached). Stage 2 trains only the small aggregator on cached features — fast, cheap, and where you iterate. Note the variable bag size forces batch_size=1 or bucketing+masking. The code mirrors a CLAM training loop.");
  })();

  // 6.2 losses
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Training · objectives", "Loss functions for MIL");
    const items = [
      ["Bag classification loss", "Cross-entropy on the slide logits — the primary signal. Use weighted CE for class imbalance.", C.eosin, "L_bag = CE(g(z), Y)"],
      ["Instance clustering loss (CLAM)", "Auxiliary supervised loss on top-/bottom-k attended patches; sharpens attention. Weighted by λ (~0.3).", C.teal, "L_inst = SmoothSVM(top/bottom-k)"],
      ["Survival / regression heads", "For outcome tasks: Cox partial-likelihood or NLL; for biomarker levels: MSE. Same backbone.", C.hema, "L = Cox( risk(z), t, event )"],
    ];
    let y = 1.65;
    items.forEach((it) => {
      card(s, 0.7, y, 12.2, 1.55, { accent: it[2] });
      s.addText(it[0], { x: 0.98, y: y + 0.16, w: 6.5, h: 0.4, fontSize: 17.5, bold: true, color: C.hema, fontFace: FB, margin: 0 });
      s.addText(it[1], { x: 0.98, y: y + 0.6, w: 7.4, h: 0.85, fontSize: 15.5, color: C.ink, fontFace: FB, valign: "top", margin: 0 });
      s.addShape(pres.shapes.RECTANGLE, { x: 8.4, y: y + 0.42, w: 4.25, h: 0.7, fill: { color: "2B2138" } });
      s.addText(it[3], { x: 8.45, y: y + 0.42, w: 4.15, h: 0.7, align: "center", valign: "middle", fontSize: 13.5, color: "EDE6F5", fontFace: FM, margin: 0 });
      y += 1.7;
    });
    footer(s);
    s.addNotes("Losses. The primary signal is bag-level cross-entropy (weighted for imbalance). CLAM adds the instance-clustering auxiliary loss at weight ~0.3. The same aggregator backbone swaps in a Cox head for survival or an MSE head for continuous biomarkers — only the head and loss change.");
  })();

  // 6.3 hyperparameters & splits
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Training · recipe", "Hyperparameters & data splits");
    card(s, 0.7, 1.65, 6.0, 5.05, { accent: C.hema });
    s.addText("Sensible starting recipe", { x: 0.98, y: 1.8, w: 5.5, h: 0.4, fontSize: 17, bold: true, color: C.hema, fontFace: FB, margin: 0 });
    const hp = [["Optimizer","AdamW"],["Learning rate","1e-4 – 2e-4"],["Weight decay","1e-5"],["Dropout","0.25 (in attention head)"],["Batch size","1 bag (or bucketed)"],["Max epochs","≤ 200 + early stopping"],["Early-stop metric","val AUC, patience ~20"],["Hidden dim","512 (project from d)"]];
    let yy = 2.3;
    hp.forEach((p, i) => {
      if (i % 2 === 0) s.addShape(pres.shapes.RECTANGLE, { x: 0.95, y: yy - 0.02, w: 5.5, h: 0.52, fill: { color: "F3EEF9" } });
      s.addText(p[0], { x: 1.1, y: yy, w: 2.7, h: 0.45, fontSize: 15, color: C.muted, fontFace: FB, valign: "middle", margin: 0 });
      s.addText(p[1], { x: 3.8, y: yy, w: 2.55, h: 0.45, fontSize: 15, bold: true, color: C.hema, fontFace: FB, valign: "middle", margin: 0 });
      yy += 0.54;
    });
    card(s, 6.95, 1.65, 5.95, 5.05, { accent: C.eosin });
    s.addText("Splitting — get this right", { x: 7.23, y: 1.8, w: 5.5, h: 0.4, fontSize: 17, bold: true, color: C.eosin, fontFace: FB, margin: 0 });
    bullets(s, 7.23, 2.3, 5.5, 4.2, [
      "Split by PATIENT, never by slide — multiple slides per patient leak otherwise.",
      "Stratify folds by label to keep class ratios stable.",
      "Use k-fold cross-validation (e.g. 10×) and report mean ± std — single splits are noisy in pathology.",
      "Hold out an external cohort (different hospital/scanner) for the honest generalization number.",
      "Fix and log seeds; bag sampling and init both add variance.",
    ], { fontSize: 16, spaceAfter: 12 });
    footer(s);
    s.addNotes("Two things to nail. Left: a sane default recipe (AdamW, lr ~1e-4, dropout 0.25, early stop on val AUC). Right — the part people get wrong — splitting by PATIENT not slide to avoid leakage, stratified k-fold with mean±std, and ideally an external cohort. Pathology results are high-variance, so report distributions and log seeds.");
  })();

  // 6.4 pitfalls + notebook 02
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Training · pitfalls + notebook 02", "Common failure modes (and the notebook)");
    const pit = [
      ["Data leakage", "Same patient in train & test; or benchmarking an encoder on data it was pretrained on.", C.eosin],
      ["Tiny-cohort overfitting", "A few hundred bags + an expressive head overfits fast. Heavy dropout, early stop, augment bags.", C.amber],
      ["Class imbalance", "Rare positives drown out. Use weighted CE / balanced sampling; report balanced accuracy + AUC.", C.hema2],
      ["Magnification mismatch", "Train and test patches must share mpp/level, or features are out of distribution.", C.teal],
    ];
    const cw = 5.9, ch = 1.6, gx = 0.7, gy = 1.6, gpx = 0.4, gpy = 0.28;
    pit.forEach((p, i) => {
      const x = gx + (i % 2) * (cw + gpx), y = gy + Math.floor(i / 2) * (ch + gpy);
      card(s, x, y, cw, ch, { accent: p[2] });
      s.addText(p[0], { x: x + 0.26, y: y + 0.14, w: cw - 0.5, h: 0.4, fontSize: 17, bold: true, color: p[2], fontFace: FB, margin: 0 });
      s.addText(p[1], { x: x + 0.26, y: y + 0.56, w: cw - 0.5, h: 0.95, fontSize: 14.5, color: C.ink, fontFace: FB, valign: "top", margin: 0 });
    });
    card(s, 0.7, 5.5, 12.2, 1.2, { accent: C.teal, fill: "EEF6F6" });
    s.addText([
      { text: "Notebook 02 — training: ", options: { bold: true, fontFace: FB, fontSize: 16, color: C.teal } },
      { text: "load cached bags, build a patient-stratified 10-fold split, train CLAM-SB with weighted CE + instance loss, early-stop on val AUC, and log mean ± std across folds. Includes a mean-pooling baseline to beat.", options: { fontFace: FB, fontSize: 16, color: C.ink } },
    ], { x: 0.98, y: 5.66, w: 11.7, h: 0.95, valign: "middle", margin: 0, lineSpacingMultiple: 1.1 });
    footer(s);
    s.addNotes("Close training with the failure modes that bite people: leakage (patient split + encoder-pretraining overlap), tiny-cohort overfitting, class imbalance, and magnification mismatch. Then point to notebook 02, which implements the correct patient-stratified 10-fold CLAM-SB training with a mean-pool baseline.");
  })();

  // =====================================================================
  // SECTION 7 — INFERENCE (notebook)
  // =====================================================================
  divider("7", "Inference", "From a trained model to a slide-level prediction", true);

  // 7.1 inference flow
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Inference · the flow", "Scoring a brand-new slide");
    const steps = [["New WSI", C.hema2], ["Segment +\npatch", C.hema], ["Encode\n(frozen)", C.hema], ["MIL\naggregator", C.eosin], ["Prob +\nattention", C.teal]];
    const sw = 2.28, sy = 1.85, sh = 1.15, gap = 0.16, x0 = 0.7;
    steps.forEach((st, i) => {
      const x = x0 + i * (sw + gap);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: sy, w: sw, h: sh, fill: { color: st[1] }, rectRadius: 0.06, shadow: mkShadow() });
      s.addText(st[0], { x, y: sy, w: sw, h: sh, align: "center", valign: "middle", fontSize: 16, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
      if (i < 4) s.addShape(pres.shapes.LINE, { x: x + sw + 0.005, y: sy + sh / 2, w: gap - 0.01, h: 0, line: { color: C.muted, width: 2, endArrowType: "triangle" } });
    });
    bullets(s, 0.7, 3.45, 6.1, 3.2, [
      "Inference reuses the EXACT data-prep pipeline from training — same mpp, patch size, encoder.",
      "The aggregator outputs class probabilities AND the per-patch attention vector in one forward pass.",
      "Deterministic and fast: the bag is small once features are computed; the head is sub-second.",
      "The bottleneck is patch encoding, not the MIL head — same as training stage 1.",
    ], { fontSize: 16, spaceAfter: 10 });
    codeBox(s, 7.0, 3.45, 5.9, 3.2, [
      "# notebook 03 — inference",
      "model.eval()",
      "with torch.no_grad():",
      "    bag = build_bag(new_wsi)   # prep + encode",
      "    logits, A, _ = model(bag)",
      "    prob = softmax(logits)[1].item()",
      "",
      "print(f'P(tumor) = {prob:.3f}')",
      "# A: (N,) attention → heatmap (sec. 8)",
    ], { fs: 12 });
    footer(s);
    s.addNotes("Inference is just the training pipeline run forward with no grad. The same prep + frozen encoder produce the bag; one forward pass yields both the probability and the attention vector. Reinforce that encoding dominates latency, not the head. Notebook 03 scores a held-out slide.");
  })();

  // 7.2 deployment
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Inference · deployment", "Taking it off the laptop");
    const items = [
      ["Throughput", "Encoding 10k–50k patches/slide is the cost. Batch on GPU, fp16/AMP, multi-GPU shard by slide.", C.hema],
      ["Latency budget", "Pre-compute features asynchronously when a slide is scanned; the MIL head adds milliseconds.", C.eosin],
      ["Reproducibility", "Pin encoder weights, mpp, patch size, and preprocessing. A different encoder = a different model.", C.teal],
      ["Confidence & abstention", "Calibrate probabilities; flag low-confidence or out-of-distribution slides for human review.", C.amber],
      ["Quality control", "Detect blur, pen marks, tissue folds before scoring — garbage patches → garbage features.", C.hema2],
      ["Regulatory & audit", "Log inputs, versions, and attention maps; clinical use needs validation + traceability.", C.eosin],
    ];
    const cw = 3.9, ch = 2.2, gx = 0.7, gy = 1.6, gpx = 0.33, gpy = 0.28;
    items.forEach((it, i) => {
      const x = gx + (i % 3) * (cw + gpx), y = gy + Math.floor(i / 3) * (ch + gpy);
      card(s, x, y, cw, ch, { accent: it[2] });
      s.addText(it[0], { x: x + 0.26, y: y + 0.16, w: cw - 0.5, h: 0.4, fontSize: 17, bold: true, color: C.hema, fontFace: FB, margin: 0 });
      s.addText(it[1], { x: x + 0.26, y: y + 0.6, w: cw - 0.5, h: 1.5, fontSize: 14.5, color: C.ink, fontFace: FB, valign: "top", margin: 0 });
    });
    footer(s);
    s.addNotes("Deployment realities for engineers. The cost is encoding (batch + fp16 + shard); the head is trivial. Pin everything for reproducibility. Add probability calibration, OOD/abstention, slide-level QC (blur, pen, folds), and audit logging. These operational concerns separate a demo from a clinical tool.");
  })();

  // =====================================================================
  // SECTION 8 — POST-PROCESSING (notebook)
  // =====================================================================
  divider("8", "Post-processing", "Turning attention into interpretable, case-level outputs", true);

  // 8.1 attention heatmaps
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Post-processing · heatmaps", "Attention → interpretable heatmaps");
    bullets(s, 0.7, 1.7, 5.9, 3.6, [
      "Each patch already has an attention weight aᵢ from the forward pass.",
      "Scatter aᵢ back to the patch's (x,y) coordinate → an attention map over the slide.",
      ["Normalize (percentile clip), apply a colormap, and alpha-blend over the slide thumbnail.", 0],
      "Hotspots show the tissue regions that drove the prediction — pathologists can verify them.",
      "Caveat: attention ≠ causation. It localizes, but high-attention isn't a guarantee of tumor; validate.",
    ], { fontSize: 16, spaceAfter: 9 });
    codeBox(s, 0.7, 5.4, 5.9, 1.3, [
      "scores = (A - A.min())/(A.max()-A.min())",
      "heat = paste_patches(coords, cmap(scores))",
      "overlay = blend(thumbnail, heat, alpha=0.5)",
    ], { fs: 11.5 });
    // heatmap mock: gradient grid over tissue
    card(s, 6.7, 1.65, 6.2, 5.05, {});
    s.addText("Attention overlaid on the slide", { x: 6.95, y: 1.78, w: 5.5, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    s.addShape(pres.shapes.OVAL, { x: 7.4, y: 2.4, w: 5.0, h: 3.7, fill: { color: "EFE7F6" }, line: { color: C.muted, width: 1 } });
    const hx = 7.55, hy = 2.5, cell = 0.42;
    // hotspot center near (9.9,3.7)
    for (let r = 0; r < 8; r++) for (let c = 0; c < 11; c++) {
      const cx = hx + c * cell + cell / 2, cy = hy + r * cell + cell / 2;
      const inside = Math.pow((cx - 9.9) / 2.45, 2) + Math.pow((cy - 4.25) / 1.8, 2) < 1;
      if (!inside) continue;
      const d1 = Math.hypot(cx - 9.6, cy - 3.5), d2 = Math.hypot(cx - 8.4, cy - 5.2);
      const score = Math.max(0, 1 - d1 / 1.6) * 0.9 + Math.max(0, 1 - d2 / 1.1) * 0.5;
      let col;
      if (score > 0.7) col = "B5179E"; else if (score > 0.45) col = "E0457B"; else if (score > 0.25) col = "F3A26B"; else col = "F7E5A0";
      s.addShape(pres.shapes.RECTANGLE, { x: hx + c * cell, y: hy + r * cell, w: cell - 0.04, h: cell - 0.04, fill: { color: col, transparency: 15 } });
    }
    // legend
    ["F7E5A0","F3A26B","E0457B","B5179E"].forEach((c, i) => s.addShape(pres.shapes.RECTANGLE, { x: 7.6 + i * 0.45, y: 6.25, w: 0.45, h: 0.22, fill: { color: c } }));
    s.addText("low → high attention", { x: 9.5, y: 6.22, w: 3, h: 0.28, fontSize: 12.5, color: C.muted, fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("Heatmaps are the headline interpretability output. Scatter attention back to coordinates, normalize, colormap, blend over the thumbnail — hotspots are what drove the call. Be explicit about the caveat: attention localizes but doesn't prove causation; treat it as a hypothesis for the pathologist, not ground truth.");
  })();

  // 8.2 case aggregation + topk
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Post-processing · beyond one slide", "Top-k review & case-level aggregation");
    card(s, 0.7, 1.65, 6.0, 5.05, { accent: C.eosin });
    s.addText("Top-k patch retrieval", { x: 0.98, y: 1.82, w: 5.5, h: 0.4, fontSize: 18, bold: true, color: C.eosin, fontFace: FB, margin: 0 });
    bullets(s, 0.98, 2.35, 5.5, 2.2, [
      "Sort patches by attention; surface the top-k tiles as a visual evidence panel.",
      "Lets a pathologist audit the model's reasoning in seconds, without scanning the whole slide.",
      "Also powers similar-case retrieval and dataset QC (find mislabeled / artifact tiles).",
    ], { fontSize: 15.5 });
    // top-k thumbnails
    for (let i = 0; i < 4; i++) {
      const x = 0.98 + i * 1.34;
      s.addShape(pres.shapes.RECTANGLE, { x, y: 4.75, w: 1.15, h: 1.15, fill: { color: ["B5179E","D6336C","E0457B","E86A92"][i] }, line: { color: "FFFFFF", width: 2 } });
      s.addText("a=" + (0.34 - i * 0.06).toFixed(2), { x, y: 5.92, w: 1.15, h: 0.25, align: "center", fontSize: 12, color: C.muted, fontFace: FM, margin: 0 });
    }
    s.addText("top-attended evidence tiles", { x: 0.98, y: 6.2, w: 5.3, h: 0.3, fontSize: 13, italic: true, color: C.muted, fontFace: FB, margin: 0 });

    card(s, 6.95, 1.65, 5.95, 5.05, { accent: C.teal });
    s.addText("Slide → patient → decision", { x: 7.23, y: 1.82, w: 5.5, h: 0.4, fontSize: 18, bold: true, color: C.teal, fontFace: FB, margin: 0 });
    bullets(s, 7.23, 2.35, 5.45, 2.6, [
      "A patient often has multiple slides/blocks — aggregate slide scores to a case decision.",
      "Common rules: max (any positive slide ⇒ positive), mean, or a learned second-stage model.",
      "Apply an operating-point threshold chosen on validation (not test) for the final call.",
      "Report at the level the clinic acts on — usually the patient, not the slide.",
    ], { fontSize: 15.5 });
    // aggregation mini-diagram
    [0,1,2].forEach(i => { s.addShape(pres.shapes.RECTANGLE, { x: 7.4, y: 5.3 + i * 0.42, w: 1.5, h: 0.32, fill: { color: C.hema2 } }); s.addText("slide " + (i+1) + ": " + [0.82,0.12,0.67][i], { x: 7.4, y: 5.3 + i*0.42, w: 1.5, h: 0.32, align: "center", valign: "middle", fontSize: 11.5, color: "FFFFFF", fontFace: FM, margin: 0 }); });
    s.addShape(pres.shapes.LINE, { x: 8.95, y: 5.72, w: 0.5, h: 0, line: { color: C.muted, width: 2, endArrowType: "triangle" } });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.5, y: 5.45, w: 3.0, h: 0.6, fill: { color: C.eosin }, rectRadius: 0.06 });
    s.addText("max → patient = positive", { x: 9.5, y: 5.45, w: 3.0, h: 0.6, align: "center", valign: "middle", fontSize: 13.5, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("Two post-processing tools. Top-k retrieval turns attention into an evidence panel for fast human audit and dataset QC. Case-level aggregation rolls multiple slides into the patient decision (max/mean/learned) with a validation-chosen threshold. Always report at the level the clinic acts on. Notebook 04 covers both.");
  })();

  // =====================================================================
  // SECTION 9 — EVALUATION & VISUALIZATION (notebook)
  // =====================================================================
  divider("9", "Evaluation & Visualization", "Measuring performance honestly and seeing what the model learned", true);

  // 9.1 metrics
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Evaluation · metrics", "Metrics that actually matter");
    const items = [
      ["AUROC", "Threshold-free ranking quality; robust to imbalance. The default headline metric for MIL.", C.eosin],
      ["Balanced accuracy", "Mean of per-class recall — the honest accuracy when positives are rare.", C.hema],
      ["AUPRC", "Precision–recall area; more informative than AUROC under heavy imbalance.", C.teal],
      ["F1 / sens / spec", "At a chosen operating point; report the threshold and how you picked it (on val).", C.hema2],
      ["Mean ± std over folds", "Always report variability across CV folds / seeds, not a single lucky number.", C.amber],
      ["External-cohort metric", "The number that predicts real-world behavior: a different hospital / scanner.", C.eosin],
    ];
    const cw = 3.9, ch = 2.18, gx = 0.7, gy = 1.6, gpx = 0.33, gpy = 0.28;
    items.forEach((it, i) => {
      const x = gx + (i % 3) * (cw + gpx), y = gy + Math.floor(i / 3) * (ch + gpy);
      card(s, x, y, cw, ch, { accent: it[2] });
      s.addText(it[0], { x: x + 0.26, y: y + 0.16, w: cw - 0.5, h: 0.4, fontSize: 17, bold: true, color: it[2], fontFace: FB, margin: 0 });
      s.addText(it[1], { x: x + 0.26, y: y + 0.62, w: cw - 0.5, h: 1.45, fontSize: 14.5, color: C.ink, fontFace: FB, valign: "top", margin: 0 });
    });
    footer(s);
    s.addNotes("Metrics discipline. AUROC is the headline but balanced accuracy and AUPRC tell the truth under imbalance. Always report an operating point with how the threshold was chosen, mean±std across folds, and — most important — an external-cohort number. Single-split accuracy on imbalanced data is the classic way to fool yourself.");
  })();

  // 9.2 interpretability + umap
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Evaluation · visualization", "Seeing what the model learned");
    card(s, 0.7, 1.65, 6.0, 5.05, { accent: C.eosin });
    s.addText("Attention overlays", { x: 0.98, y: 1.82, w: 5, h: 0.4, fontSize: 18, bold: true, color: C.eosin, fontFace: FB, margin: 0 });
    bullets(s, 0.98, 2.3, 5.5, 1.9, [
      "Qualitative check: do hotspots land on tumor (vs stroma/artifact)?",
      "A model with great AUC but nonsensical attention is a red flag — likely a shortcut.",
      "Pathologist review of overlays builds trust and catches bias.",
    ], { fontSize: 15.5 });
    s.addText("UMAP of patch embeddings", { x: 0.98, y: 4.4, w: 5, h: 0.4, fontSize: 18, bold: true, color: C.teal, fontFace: FB, margin: 0 });
    bullets(s, 0.98, 4.85, 5.5, 1.8, [
      "Project hᵢ to 2-D, color by attention or predicted class.",
      "Reveals whether the encoder separates tissue types; sanity-checks the feature space.",
    ], { fontSize: 15.5 });
    // umap mock scatter
    card(s, 6.95, 1.65, 5.95, 5.05, {});
    s.addText("UMAP — patch embedding space", { x: 7.2, y: 1.78, w: 5.5, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    function blob(cx, cy, col, n, spread) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * spread; s.addShape(pres.shapes.OVAL, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, w: 0.12, h: 0.12, fill: { color: col, transparency: 25 } }); } }
    blob(8.6, 3.3, C.hema2, 38, 0.95);
    blob(10.9, 3.6, C.eosin, 34, 0.85);
    blob(9.7, 5.2, C.teal, 36, 0.9);
    const leg = [["tumor", C.hema2], ["stroma", C.eosin], ["immune", C.teal]];
    leg.forEach((g, i) => {
      const lx = 7.35 + i * 1.75;
      s.addShape(pres.shapes.OVAL, { x: lx, y: 6.28, w: 0.2, h: 0.2, fill: { color: g[1] } });
      s.addText(g[0], { x: lx + 0.27, y: 6.24, w: 1.4, h: 0.28, fontSize: 13, color: C.muted, fontFace: FB, valign: "middle", margin: 0 });
    });
    footer(s);
    s.addNotes("Visualization is verification, not decoration. Attention overlays catch shortcut learning (great AUC, nonsense hotspots). UMAP of patch embeddings shows whether the feature space separates tissue classes. Both belong in every evaluation report. Notebook 05 produces ROC curves, the metrics table, overlays, and the UMAP.");
  })();

  // 9.3 robustness / external validation
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Evaluation · robustness", "The generalization gap is the real test");
    bullets(s, 0.7, 1.7, 6.2, 4.6, [
      "Stain & scanner shift: H&E color and scanner optics vary by site — the #1 cause of performance drop.",
      "Mitigations: stain normalization / augmentation, scanner-diverse training, and robust encoders.",
      "Always quote an EXTERNAL test cohort; internal CV is optimistic.",
      "Batch effects: a model can learn 'which hospital' instead of biology — check for site confounding.",
      "Subgroup analysis: does performance hold across scanners, sites, and demographics?",
      "Report failure cases and calibration, not just the mean AUC.",
    ], { fontSize: 16.5, spaceAfter: 10 });
    // internal vs external bars
    card(s, 7.1, 1.65, 5.8, 5.05, {});
    s.addText("Internal CV vs external cohort", { x: 7.35, y: 1.8, w: 5.3, h: 0.3, fontSize: 14, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    const pairs = [["Mean-pool", 0.86, 0.74], ["ABMIL", 0.91, 0.80], ["CLAM", 0.93, 0.83]];
    const baseY = 5.8, maxH = 3.0, gw = 1.5, x0 = 7.7;
    pairs.forEach((p, i) => {
      const gx = x0 + i * 1.65;
      const h1 = (p[1] - 0.5) / 0.5 * maxH, h2 = (p[2] - 0.5) / 0.5 * maxH;
      s.addShape(pres.shapes.RECTANGLE, { x: gx, y: baseY - h1, w: 0.6, h: h1, fill: { color: C.hema } });
      s.addShape(pres.shapes.RECTANGLE, { x: gx + 0.66, y: baseY - h2, w: 0.6, h: h2, fill: { color: C.eosin } });
      s.addText(p[0], { x: gx - 0.15, y: baseY + 0.08, w: 1.55, h: 0.3, align: "center", fontSize: 13, color: C.ink, fontFace: FB, margin: 0 });
      s.addText(p[1].toFixed(2), { x: gx - 0.05, y: baseY - h1 - 0.28, w: 0.7, h: 0.25, align: "center", fontSize: 11.5, color: C.hema, fontFace: FM, margin: 0 });
      s.addText(p[2].toFixed(2), { x: gx + 0.61, y: baseY - h2 - 0.28, w: 0.7, h: 0.25, align: "center", fontSize: 11.5, color: C.eosin, fontFace: FM, margin: 0 });
    });
    s.addText("■ internal CV   ■ external cohort (AUROC)", { x: 7.35, y: 6.3, w: 5.4, h: 0.3, fontSize: 12.5, color: C.muted, fontFace: FB, margin: 0 });
    s.addText("illustrative numbers", { x: 7.35, y: 2.05, w: 5.3, h: 0.25, fontSize: 11.5, italic: true, color: C.muted, fontFace: FB, margin: 0 });
    footer(s);
    s.addNotes("The honest test is generalization. Stain/scanner shift is the dominant failure; mitigate with normalization/augmentation and diverse training. Always quote an external cohort — internal CV is optimistic, and the illustrative bars show the typical gap. Watch for batch effects (model learns the hospital) and do subgroup analysis. Numbers shown are illustrative, not measured.");
  })();

  // =====================================================================
  // SECTION 10 — CONCLUSION + QUIZ
  // =====================================================================
  divider("10", "Conclusion", "Takeaways, the road ahead, and your quiz", false);

  // 10.1 takeaways
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Conclusion · takeaways", "Five things to remember");
    const t = [
      ["MIL solves the scale + weak-label problem", "Gigapixel slides + one label per slide → decompose into a bag of patches and learn the pooling."],
      ["Three boxes: encode → pool → classify", "Ŷ = g(σ(f(x₁..x_N))). The pooling σ must be permutation-invariant; it's where the design lives."],
      ["Frozen foundation encoder + small trainable head", "UNI2 / Virchow2 / CONCH features do the heavy lifting; the aggregator is tiny and trains in minutes."],
      ["CLAM-SB is a strong, interpretable default", "Gated attention + instance clustering; beat mean-pooling, then consider TransMIL / DTFD."],
      ["Validate honestly", "Patient-level splits, mean±std, external cohorts, and attention overlays — or you're fooling yourself."],
    ];
    let y = 1.55;
    t.forEach((it, i) => {
      card(s, 0.7, y, 12.2, 0.96, { accent: i % 2 ? C.hema : C.eosin });
      numCircle(s, 0.92, y + 0.23, 0.5, i + 1, i % 2 ? C.hema : C.eosin);
      s.addText(it[0], { x: 1.62, y: y + 0.1, w: 5.2, h: 0.76, fontSize: 17, bold: true, color: C.hema, fontFace: FB, valign: "middle", margin: 0 });
      s.addText(it[1], { x: 6.95, y: y + 0.1, w: 5.8, h: 0.76, fontSize: 14.5, color: C.ink, fontFace: FB, valign: "middle", margin: 0 });
      y += 1.05;
    });
    footer(s);
    s.addNotes("The five-point recap — the slide to photograph. Scale+weak-label motivation; the encode-pool-classify abstraction; frozen-encoder + tiny-head recipe; CLAM-SB as default; and validate honestly. If they remember nothing else, these five carry the course.");
  })();

  // 10.2 future directions
  (function () {
    const s = pres.addSlide();
    contentHeader(s, "Conclusion · the road ahead", "Where pathology MIL is going");
    const items = [
      ["Slide foundation models", "Pretrained aggregators (TITAN, PRISM, GigaPath, CHIEF) shrink task-data needs — MIL heads may be linear probes.", C.eosin],
      ["Multimodal integration", "Fuse histology with genomics, transcriptomics, radiology & text reports for richer prediction.", C.hema],
      ["Vision-language & agents", "CONCH-style zero-shot, report generation, and conversational pathology assistants.", C.teal],
      ["Spatial & cell-level reasoning", "Combine MIL with cell segmentation / graphs for spatial-biology-aware models.", C.hema2],
      ["Robustness & fairness", "Stain/scanner invariance, calibration, and equitable performance as deployment scales.", C.amber],
      ["Regulation & clinical trust", "Prospective validation, explainability standards, and reimbursement pathways.", C.eosin],
    ];
    const cw = 3.9, ch = 2.18, gx = 0.7, gy = 1.6, gpx = 0.33, gpy = 0.28;
    items.forEach((it, i) => {
      const x = gx + (i % 3) * (cw + gpx), y = gy + Math.floor(i / 3) * (ch + gpy);
      card(s, x, y, cw, ch, { accent: it[2] });
      s.addText(it[0], { x: x + 0.26, y: y + 0.16, w: cw - 0.5, h: 0.6, fontSize: 16.5, bold: true, color: C.hema, fontFace: FB, margin: 0 });
      s.addText(it[1], { x: x + 0.26, y: y + 0.78, w: cw - 0.5, h: 1.3, fontSize: 14, color: C.ink, fontFace: FB, valign: "top", margin: 0 });
    });
    footer(s);
    s.addNotes("Forward look. Slide foundation models may turn MIL heads into linear probes; multimodal fusion (genomics, text, radiology) is the next frontier; vision-language enables zero-shot and report generation; spatial/cell-graph reasoning adds biology; and robustness, fairness, and regulation gate real deployment. Plenty of open engineering problems.");
  })();

  // 10.3 quiz + resources
  (function () {
    const s = pres.addSlide();
    s.background = { color: C.hemaDark };
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.18, fill: { color: C.eosin } });
    s.addText("WRAP-UP", { x: 0.7, y: 0.55, w: 8, h: 0.35, fontSize: 15.5, bold: true, color: C.eosinSoft, fontFace: FB, charSpacing: 3, margin: 0 });
    s.addText("Test yourself & keep learning", { x: 0.68, y: 0.9, w: 11, h: 0.7, fontSize: 33, bold: true, color: "FFFFFF", fontFace: FH, margin: 0 });
    // quiz card
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 1.95, w: 6.0, h: 4.55, fill: { color: "31203F" }, line: { color: C.eosin, width: 1.5 }, rectRadius: 0.06 });
    s.addText("◆  NotebookLM Quiz", { x: 1.0, y: 2.2, w: 5.4, h: 0.45, fontSize: 20, bold: true, color: C.eosinSoft, fontFace: FB, margin: 0 });
    s.addText([
      { text: "Upload ", options: { color: "E7DDF2", fontSize: 15.5, fontFace: FB } },
      { text: "quiz/MIL_quiz_source.md", options: { color: C.eosinSoft, fontSize: 15.5, fontFace: FM } },
      { text: " to NotebookLM to auto-generate flashcards, an audio overview, and a quiz.", options: { color: "E7DDF2", fontSize: 15.5, fontFace: FB } },
    ], { x: 1.0, y: 2.72, w: 5.4, h: 0.9, valign: "top", margin: 0, lineSpacingMultiple: 1.1 });
    bullets(s, 1.0, 3.7, 5.4, 2.6, [
      "20 questions spanning all 9 sections.",
      "Conceptual (MIL assumption, attention) + practical (splitting, leakage).",
      "Answer key with explanations included.",
      "Pairs with the 5 hands-on notebooks for a full self-study loop.",
    ], { fontSize: 15, color: "E7DDF2", spaceAfter: 9 });
    // resources card
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.95, y: 1.95, w: 5.95, h: 4.55, fill: { color: "31203F" }, line: { color: C.teal, width: 1.5 }, rectRadius: 0.06 });
    s.addText("Key references", { x: 7.25, y: 2.2, w: 5.4, h: 0.45, fontSize: 20, bold: true, color: "7FD7D7", fontFace: FB, margin: 0 });
    const refs = [
      "Ilse et al. — Attention-based Deep MIL, ICML 2018",
      "Lu et al. — CLAM, Nature Biomed. Eng. 2021",
      "Shao et al. — TransMIL, NeurIPS 2021",
      "Chen et al. — UNI, Nature Medicine 2024",
      "Lu et al. — CONCH, Nature Medicine 2024",
      "Vorontsov et al. — Virchow, Nature Medicine 2024",
      "Xu et al. — Prov-GigaPath, Nature 2024",
      "Toolkits: CLAM & TRIDENT (github.com/mahmoodlab)",
    ];
    s.addText(refs.map((r) => ({ text: r, options: { bullet: { indent: 14 }, breakLine: true, color: "E7DDF2", fontSize: 14.5, fontFace: FB, paraSpaceAfter: 7 } })), { x: 7.25, y: 2.75, w: 5.45, h: 3.6, valign: "top", margin: 0 });
    s.addText("Thank you — questions?", { x: 0.7, y: 6.75, w: 11.9, h: 0.5, align: "center", fontSize: 19, italic: true, bold: true, color: C.eosinSoft, fontFace: FH, margin: 0 });
    footer(s, true);
    s.addNotes("Close out. Point them to the NotebookLM quiz source (20 Q across all sections with answer key) and the 5 notebooks for self-study. Leave the references up. Then open the floor for the 10-minute Q&A.");
  })();
};
