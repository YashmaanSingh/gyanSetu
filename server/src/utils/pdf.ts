import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

export interface ChapterPdfInput {
  className: string;
  subjectName: string;
  chapterNo: number;
  chapterTitle: string;
  intro?: string | null;
  objectives?: string[];
  keyPoints?: string[];
  definitions?: { term: string; definition: string }[];
  examples?: { question: string; solution: string }[];
  practiceQuestions?: { q: string; a: string }[];
  revision?: string | null;
  body?: string | null;
}

const BRAND = rgb(79 / 255, 70 / 255, 229 / 255); // brand-600 #4f46e5
const INK = rgb(30 / 255, 41 / 255, 59 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);
const LIGHT = rgb(241 / 255, 245 / 255, 249 / 255);

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = (text || "").toString().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export async function generateChapterPdf(input: ChapterPdfInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595.28; // A4
  const PAGE_H = 841.89;
  const MARGIN = 56;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensure = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const write = (text: string, size: number, f: PDFFont, color = INK, gap = 4) => {
    const lines = wrap(text, f, size, CONTENT_W);
    for (const ln of lines) {
      ensure(size + gap);
      page.drawText(ln, { x: MARGIN, y: y - size, size, font: f, color });
      y -= size + gap;
    }
  };

  const bullet = (text: string, size: number, f: PDFFont, color = INK) => {
    const lines = wrap(text, f, size, CONTENT_W - 16);
    lines.forEach((ln, i) => {
      ensure(size + 4);
      if (i === 0) page.drawText("•", { x: MARGIN, y: y - size, size, font: f, color: BRAND });
      page.drawText(ln, { x: MARGIN + 16, y: y - size, size, font: f, color });
      y -= size + 4;
    });
  };

  const heading = (text: string) => {
    ensure(34);
    y -= 6;
    page.drawText(text.toUpperCase(), { x: MARGIN, y: y - 13, size: 13, font: bold, color: BRAND });
    y -= 18;
    page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end: { x: PAGE_W - MARGIN, y: y + 4 },
      thickness: 1,
      color: BRAND,
    });
    y -= 10;
  };

  // ---- Cover page ----
  page.drawRectangle({ x: 0, y: PAGE_H - 200, width: PAGE_W, height: 200, color: BRAND });
  page.drawText("GyaanSetu", { x: MARGIN, y: PAGE_H - 110, size: 34, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Student Learning Portal", { x: MARGIN, y: PAGE_H - 140, size: 14, font, color: rgb(1, 1, 1) });

  page.drawText(`Class: ${input.className}`, { x: MARGIN, y: PAGE_H - 260, size: 16, font: bold, color: INK });
  page.drawText(`Subject: ${input.subjectName}`, { x: MARGIN, y: PAGE_H - 288, size: 16, font: bold, color: INK });
  page.drawText(`Chapter ${input.chapterNo}: ${input.chapterTitle}`, {
    x: MARGIN,
    y: PAGE_H - 316,
    size: 16,
    font: bold,
    color: INK,
  });
  page.drawText("Original study notes prepared from the official NCERT/CBSE syllabus.", {
    x: MARGIN,
    y: PAGE_H - 360,
    size: 10,
    font,
    color: MUTED,
  });
  y = PAGE_H - 420;

  // ---- Intro ----
  if (input.intro) {
    heading("Introduction");
    write(input.intro, 11, font);
  }

  // ---- Objectives ----
  if (input.objectives?.length) {
    heading("Learning Objectives");
    input.objectives.forEach((o) => bullet(o, 11, font));
  }

  // ---- Main body ----
  if (input.body) {
    heading("Study Content");
    write(input.body, 11, font);
  }

  // ---- Key points ----
  if (input.keyPoints?.length) {
    heading("Key Points");
    input.keyPoints.forEach((k) => bullet(k, 11, font));
  }

  // ---- Definitions ----
  if (input.definitions?.length) {
    heading("Important Definitions");
    input.definitions.forEach((d) => {
      write(`${d.term}:`, 11, bold, INK);
      write(d.definition, 11, font);
      y -= 4;
    });
  }

  // ---- Examples ----
  if (input.examples?.length) {
    heading("Examples");
    input.examples.forEach((ex, i) => {
      write(`Example ${i + 1}: ${ex.question}`, 11, bold, INK);
      write(ex.solution, 11, font);
      y -= 4;
    });
  }

  // ---- Practice ----
  if (input.practiceQuestions?.length) {
    heading("Practice Questions");
    input.practiceQuestions.forEach((p, i) => {
      write(`Q${i + 1}. ${p.q}`, 11, bold, INK);
      write(`A. ${p.a}`, 11, font);
      y -= 4;
    });
  }

  // ---- Revision ----
  if (input.revision) {
    heading("Revision Section");
    write(input.revision, 11, font);
  }

  // ---- Footer page numbers ----
  const pages = pdf.getPages();
  pages.forEach((pg, i) => {
    if (i === 0) return; // skip cover
    pg.drawText(`GyaanSetu • ${input.className} • ${input.subjectName}`, {
      x: MARGIN,
      y: 32,
      size: 8,
      font,
      color: MUTED,
    });
    pg.drawText(`Page ${i + 1}`, { x: PAGE_W - MARGIN - 40, y: 32, size: 8, font, color: MUTED });
  });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
