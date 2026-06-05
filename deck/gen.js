// Introduction to Pathology MIL — slide deck generator
// Palette: Hematoxylin (deep violet) + Eosin (magenta-pink) — content-informed H&E theme
const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.author = "autoMIL course";
pres.title = "Introduction to Pathology MIL";

const W = 13.33, H = 7.5;

const C = {
  ink: "2A2233", hema: "4A2C6D", hemaDark: "241436", hema2: "6B4E8F",
  eosin: "D6336C", eosinSoft: "F2A9C4", light: "F7F4FA", card: "FFFFFF",
  muted: "8A7F99", line: "E4DCEC", teal: "1C8C8C", amber: "C77D14",
};
const FH = "Georgia", FB = "Calibri";
const mkShadow = () => ({ type: "outer", color: "000000", blur: 7, offset: 3, angle: 135, opacity: 0.13 });
let N = 0;

function footer(slide, dark = false) {
  N += 1;
  const col = dark ? "8E7BA8" : C.muted;
  slide.addText("Introduction to Pathology MIL", { x: 0.5, y: H - 0.42, w: 7, h: 0.3, fontSize: 11.5, fontFace: FB, color: col, align: "left", margin: 0 });
  slide.addText(String(N), { x: W - 1.1, y: H - 0.42, w: 0.6, h: 0.3, fontSize: 11.5, fontFace: FB, color: col, align: "right", margin: 0 });
}
function contentHeader(slide, kicker, title) {
  slide.background = { color: C.light };
  slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0.42, w: 0.16, h: 0.52, fill: { color: C.eosin } });
  slide.addText(kicker.toUpperCase(), { x: 0.78, y: 0.4, w: 11, h: 0.28, fontSize: 13.5, bold: true, color: C.eosin, fontFace: FB, charSpacing: 2, margin: 0 });
  slide.addText(title, { x: 0.76, y: 0.62, w: 12.1, h: 0.72, fontSize: 29, bold: true, color: C.hema, fontFace: FH, margin: 0 });
}
function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: opts.fill || C.card }, line: { color: C.line, width: 1 }, shadow: mkShadow() });
  if (opts.accent) slide.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.09, h, fill: { color: opts.accent } });
}
function numCircle(slide, x, y, d, num, fill = C.eosin, txtcol = "FFFFFF") {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill } });
  slide.addText(String(num), { x, y, w: d, h: d, align: "center", valign: "middle", fontSize: d * 18, bold: true, color: txtcol, fontFace: FB, margin: 0 });
}
function bullets(slide, x, y, w, h, items, opts = {}) {
  const fs = (opts.fontSize || 16.5) + 2;   // body-text boost for projector legibility
  const arr = items.map((t) => {
    if (typeof t === "string") return { text: t, options: { bullet: { indent: 16 }, breakLine: true, paraSpaceAfter: opts.spaceAfter || 8, color: opts.color || C.ink, fontSize: fs, fontFace: FB } };
    return { text: t[0], options: { bullet: { indent: 16 }, indentLevel: t[1] ? 1 : 0, breakLine: true, paraSpaceAfter: 6, color: t[1] ? C.muted : C.ink, fontSize: t[1] ? fs - 1.5 : fs, fontFace: FB } };
  });
  slide.addText(arr, { x, y, w, h, valign: "top", margin: 0 });
}

// ---------- TITLE ----------
function titleSlide() {
  const s = pres.addSlide();
  s.background = { color: C.hemaDark };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.18, fill: { color: C.eosin } });
  const dots = [[11.4,0.95,0.62,C.eosin],[12.3,1.55,0.34,C.hema2],[10.95,1.95,0.24,C.eosinSoft],[12.55,2.45,0.18,C.eosin],[11.85,2.75,0.42,C.hema2]];
  dots.forEach(([dx,dy,dd,dc]) => s.addShape(pres.shapes.OVAL, { x: dx, y: dy, w: dd, h: dd, fill: { color: dc, transparency: 22 } }));
  s.addText("A TECHNICAL COURSE FOR ML ENGINEERS", { x: 0.9, y: 2.1, w: 10, h: 0.4, fontSize: 16.5, bold: true, color: C.eosinSoft, fontFace: FB, charSpacing: 3, margin: 0 });
  s.addText("Introduction to\nPathology MIL", { x: 0.85, y: 2.5, w: 11.5, h: 2.0, fontSize: 54, bold: true, color: "FFFFFF", fontFace: FH, lineSpacingMultiple: 0.95, margin: 0 });
  s.addText("Multiple Instance Learning on gigapixel whole-slide images:\nfrom raw slides to interpretable, weakly-supervised predictions.", { x: 0.9, y: 4.8, w: 11, h: 0.9, fontSize: 19, color: "CFC3DE", fontFace: FB, lineSpacingMultiple: 1.1, margin: 0 });
  s.addText("50-minute lecture   ·   hands-on Jupyter notebooks   ·   NotebookLM quiz", { x: 0.9, y: 6.2, w: 11.5, h: 0.4, fontSize: 15.5, italic: true, color: C.eosinSoft, fontFace: FB, margin: 0 });
  N += 1;
}

// ---------- AGENDA ----------
function agendaSlide() {
  const s = pres.addSlide();
  contentHeader(s, "Roadmap", "What we'll cover in the next 50 minutes");
  const items = [
    ["1","Background","Why gigapixel pathology needs weak supervision"],
    ["2","MIL formulation","Bags, instances & permutation-invariant pooling"],
    ["3","Data preparation","WSIs → tissue → patches → features · notebook"],
    ["4","Foundation encoders","UNI2, Virchow2, GigaPath, CONCH"],
    ["5","Model architecture","Mean/Max, ABMIL, CLAM, TransMIL, DTFD"],
    ["6","Training protocols","Two-stage pipeline, losses, CV · notebook"],
    ["7","Inference","Slide-level prediction & deployment · notebook"],
    ["8","Post-processing","Attention heatmaps & case aggregation · notebook"],
    ["9","Evaluation & viz","AUC, balanced acc, UMAP, robustness · notebook"],
    ["10","Conclusion + Quiz","Takeaways, future directions, NotebookLM quiz"],
  ];
  const colX = [0.6, 6.95], cardW = 5.78, rowH = 0.9, top = 1.5, gap = 0.13;
  items.forEach((it, i) => {
    const col = i < 5 ? 0 : 1, row = i % 5;
    const x = colX[col], y = top + row * (rowH + gap);
    card(s, x, y, cardW, rowH, { accent: C.hema2 });
    numCircle(s, x + 0.22, y + 0.2, 0.5, it[0], C.hema);
    s.addText(it[1], { x: x + 0.92, y: y + 0.1, w: cardW - 1.05, h: 0.36, fontSize: 17, bold: true, color: C.hema, fontFace: FB, margin: 0 });
    s.addText(it[2], { x: x + 0.92, y: y + 0.45, w: cardW - 1.05, h: 0.36, fontSize: 13.5, color: C.muted, fontFace: FB, margin: 0 });
  });
  footer(s);
  s.addNotes("Roadmap. End-to-end: motivation, the MIL abstraction, then the full engineering pipeline — data prep, encoders, architectures, training, inference, post-processing, evaluation. Five sections ship with a runnable notebook. We close with takeaways and a NotebookLM quiz.");
}

function divider(num, title, subtitle, hasNotebook) {
  const s = pres.addSlide();
  s.background = { color: C.hemaDark };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.22, h: H, fill: { color: C.eosin } });
  numCircle(s, 0.95, 2.5, 1.6, num, C.eosin);
  s.addText("SECTION", { x: 2.95, y: 2.65, w: 8, h: 0.35, fontSize: 16.5, bold: true, color: C.eosinSoft, fontFace: FB, charSpacing: 3, margin: 0 });
  s.addText(title, { x: 2.92, y: 3.0, w: 9.8, h: 1.1, fontSize: 38, bold: true, color: "FFFFFF", fontFace: FH, margin: 0 });
  s.addText(subtitle, { x: 2.95, y: 4.15, w: 9.6, h: 0.7, fontSize: 18, color: "CFC3DE", fontFace: FB, margin: 0 });
  if (hasNotebook) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 2.95, y: 5.0, w: 3.7, h: 0.5, fill: { color: C.teal }, rectRadius: 0.08 });
    s.addText("◆  Hands-on notebook included", { x: 2.95, y: 5.0, w: 3.7, h: 0.5, align: "center", valign: "middle", fontSize: 14.5, bold: true, color: "FFFFFF", fontFace: FB, margin: 0 });
  }
  footer(s, true);
}

const ctx = { pres, C, FH, FB, W, H, mkShadow, footer, contentHeader, card, numCircle, divider, bullets };

titleSlide();
agendaSlide();
require("./sections.js")(ctx);

pres.writeFile({ fileName: "Pathology_MIL_Course.pptx" }).then(() => console.log("written"));
