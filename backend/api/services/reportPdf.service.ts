import PDFDocument from 'pdfkit';
import type {PdfColumn, PdfDocumentModel, PdfSection} from './reportDocument.service';

/**
 * A4 portrait, in points.
 */
const PAGE = {width: 595.28, height: 841.89};
const MARGIN = 40;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

/**
 * pdfkit auto-inserts a page whenever text is written below `height -
 * bottomMargin`. The footer therefore has to be drawn INSIDE the content box,
 * which is what FOOTER_RESERVE is for — writing it in the true bottom margin
 * silently inflates the page count and breaks the "Page X of Y" numbering.
 */
const FOOTER_RESERVE = 34;
const CONTENT_BOTTOM = PAGE.height - MARGIN - FOOTER_RESERVE;
const BOTTOM_LIMIT = CONTENT_BOTTOM - 28;
const FOOTER_RULE_Y = CONTENT_BOTTOM - 14;
const FOOTER_TEXT_Y = CONTENT_BOTTOM - 8;

const BRAND = '#2d4a35';
const BRAND_LIGHT = '#e9f5ee';
const RULE = '#d9e2dc';
const MUTED = '#6b7280';
const NEGATIVE = '#c0392b';
const POSITIVE = '#2f7d4f';

const ROW_PADDING = 6;
const HEADER_HEIGHT = 22;
const ROW_HEIGHT_MIN = 18;

function isNegativeDelta(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().startsWith('-');
}

/**
 * pdfkit emits asynchronously, so the buffer is only complete once `end` fires.
 * Returning it synchronously would hand back a zero-length Buffer.
 */
export function renderReportPdf(model: PdfDocumentModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE.width, PAGE.height],
      margins: {top: MARGIN, bottom: MARGIN + FOOTER_RESERVE, left: MARGIN, right: MARGIN},
      bufferPages: true,
      info: {
        Title: `${model.title} — ${model.period}`,
        Author: model.businessName,
        Subject: 'Business performance report'
      }
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      drawLetterhead(doc, model);

      for (const section of model.sections) {
        ensureSpace(doc, 80);
        if (section.kind === 'kpis') {
          drawKpis(doc, section);
        } else if (section.kind === 'table') {
          drawTable(doc, section);
        } else {
          drawPairs(doc, section);
        }
        doc.moveDown(0.6);
      }

      paginate(doc, model);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function drawLetterhead(doc: PDFKit.PDFDocument, model: PdfDocumentModel): void {
  const barHeight = 76;
  doc.rect(0, 0, PAGE.width, barHeight).fill(BRAND);

  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(17)
    .text(model.title, MARGIN, 22, {width: CONTENT_WIDTH, lineBreak: false});

  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor('#d6e6dc')
    .text(model.period, MARGIN, 46, {width: CONTENT_WIDTH, lineBreak: false});

  doc
    .fontSize(8.5)
    .fillColor('#a8c7b4')
    .text(
      `${model.businessName}  ·  Generated ${model.generatedAt} (Philippine time)`,
      MARGIN,
      60,
      {width: CONTENT_WIDTH, lineBreak: false}
    );

  doc.y = barHeight + 18;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > BOTTOM_LIMIT) {
    doc.addPage();
    doc.y = MARGIN;
  }
}

function sectionHeading(doc: PDFKit.PDFDocument, text: string | undefined): void {
  if (!text) return;
  ensureSpace(doc, 40);
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(BRAND)
    .text(text, MARGIN, doc.y, {width: CONTENT_WIDTH, lineBreak: false});
  doc.moveDown(0.25);
  const y = doc.y;
  doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).lineWidth(0.8).strokeColor(RULE).stroke();
  doc.moveDown(0.5);
}

function drawKpis(
  doc: PDFKit.PDFDocument,
  section: Extract<PdfSection, {kind: 'kpis'}>
): void {
  sectionHeading(doc, section.title);

  const columns = Math.max(1, Math.min(section.columns ?? 4, section.items.length || 1));
  const gap = 10;
  const cellWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns;
  const cellHeight = 58;

  // Anchored once. `doc.text()` advances `doc.y`, so reading it inside the loop
  // would stagger every cell after the first.
  const gridTop = doc.y;

  section.items.forEach((item, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = MARGIN + column * (cellWidth + gap);
    const y = gridTop + row * (cellHeight + gap);

    doc.roundedRect(x, y, cellWidth, cellHeight, 5).fill(BRAND_LIGHT);

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(item.label.toUpperCase(), x + 9, y + 8, {width: cellWidth - 18, lineBreak: false});

    doc
      .font('Helvetica-Bold')
      .fontSize(12.5)
      .fillColor(BRAND)
      .text(item.value, x + 9, y + 20, {width: cellWidth - 18, lineBreak: false});

    const detailParts: Array<{text: string; color: string}> = [];
    if (item.delta) {
      detailParts.push({text: item.delta, color: isNegativeDelta(item.delta) ? NEGATIVE : POSITIVE});
    }
    if (item.hint) detailParts.push({text: item.hint, color: MUTED});

    if (detailParts.length) {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(detailParts[0].color)
        .text(detailParts.map(p => p.text).join('  ·  '), x + 9, y + 38, {
          width: cellWidth - 18,
          lineBreak: false,
          ellipsis: true
        });
    }
  });

  const rowCount = Math.ceil(section.items.length / columns);
  doc.y = gridTop + rowCount * (cellHeight + gap);
}

function drawPairs(
  doc: PDFKit.PDFDocument,
  section: Extract<PdfSection, {kind: 'pairs'}>
): void {
  sectionHeading(doc, section.title);

  const rowHeight = 17;
  for (const item of section.items) {
    ensureSpace(doc, rowHeight);
    const y = doc.y;
    doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill('#f7f9f8');

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#333333')
      .text(item.label, MARGIN + 10, y + 5, {width: CONTENT_WIDTH * 0.6, lineBreak: false});

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(BRAND)
      .text(item.value, MARGIN + CONTENT_WIDTH * 0.6, y + 5, {
        width: CONTENT_WIDTH * 0.4 - 10,
        align: 'right',
        lineBreak: false
      });

    doc.y = y + rowHeight;
  }
}

function columnWidths(columns: PdfColumn[]): number[] {
  if (columns.length === 0) return [];
  const firstShare = 0.4;
  const remaining = (CONTENT_WIDTH - CONTENT_WIDTH * firstShare) / (columns.length - 1);
  return columns.map((_, index) => (index === 0 ? CONTENT_WIDTH * firstShare : remaining));
}

function drawTable(
  doc: PDFKit.PDFDocument,
  section: Extract<PdfSection, {kind: 'table'}>
): void {
  sectionHeading(doc, section.title);

  const widths = columnWidths(section.columns);
  const drawHeader = () => {
    const y = doc.y;
    doc.rect(MARGIN, y, CONTENT_WIDTH, HEADER_HEIGHT).fill(BRAND);
    section.columns.forEach((column, index) => {
      const x = MARGIN + widths.slice(0, index).reduce((a, b) => a + b, 0);
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#ffffff')
        .text(column.label, x + 8, y + 7, {
          width: widths[index] - 16,
          align: column.align,
          lineBreak: false
        });
    });
    doc.y = y + HEADER_HEIGHT;
  };

  drawHeader();

  /**
   * A long table spills onto later pages, and a column header that appears only
   * once makes the continuation rows unreadable. Every break re-draws the header
   * band, plus a small "continued" note.
   */
  const ensureRowRoom = () => {
    if (doc.y + ROW_HEIGHT_MIN + 6 <= BOTTOM_LIMIT) return;
    doc.addPage();
    doc.y = MARGIN;
    doc
      .font('Helvetica-Oblique')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(`${section.title} (continued)`, MARGIN, doc.y, {width: CONTENT_WIDTH, lineBreak: false});
    doc.moveDown(0.3);
    drawHeader();
  };

  if (section.rows.length === 0) {
    ensureSpace(doc, ROW_HEIGHT_MIN);
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor(MUTED)
      .text('No data for this period', MARGIN + 8, doc.y + 5, {width: CONTENT_WIDTH - 16});
    doc.y += ROW_HEIGHT_MIN;
  }

  section.rows.forEach((row, rowIndex) => {
    ensureRowRoom();
    const y = doc.y;

    if (rowIndex % 2 === 1) {
      doc.rect(MARGIN, y, CONTENT_WIDTH, ROW_HEIGHT_MIN).fill('#f7f9f8');
    }

    row.forEach((cell, index) => {
      if (index >= section.columns.length) return;
      const x = MARGIN + widths.slice(0, index).reduce((a, b) => a + b, 0);
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(index === 0 ? '#1a1a1a' : '#333333')
        .text(String(cell), x + 8, y + 5, {
          width: widths[index] - 16,
          align: section.columns[index].align,
          lineBreak: false,
          ellipsis: true
        });
    });

    doc.moveTo(MARGIN, y + ROW_HEIGHT_MIN).lineTo(MARGIN + CONTENT_WIDTH, y + ROW_HEIGHT_MIN)
      .lineWidth(0.4).strokeColor(RULE).stroke();

    doc.y = y + ROW_HEIGHT_MIN;
  });

  if (section.note) {
    ensureSpace(doc, 16);
    doc
      .font('Helvetica-Oblique')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(section.note, MARGIN, doc.y + 4, {width: CONTENT_WIDTH});
    doc.y += 12;
  }
}

function paginate(doc: PDFKit.PDFDocument, model: PdfDocumentModel): void {
  const range = doc.bufferedPageRange();

  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);

    /**
     * pdfkit only auto-breaks when the *next* text write starts below
     * `height - margins.bottom`. The two footer lines are written at a fixed
     * y, so the second one always starts past that threshold and would spawn a
     * phantom page (and the phantom page would then get a phantom footer).
     * Clearing the bottom margin for the duration of the footer pass is the
     * documented way to suppress that.
     */
    doc.page.margins.bottom = 0;

    doc.moveTo(MARGIN, FOOTER_RULE_Y)
      .lineTo(MARGIN + CONTENT_WIDTH, FOOTER_RULE_Y)
      .lineWidth(0.5).strokeColor(RULE).stroke();

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(`${model.businessName}  ·  ${model.period}`, MARGIN, FOOTER_TEXT_Y, {
        width: CONTENT_WIDTH * 0.7,
        lineBreak: false
      });

    doc
      .font('Helvetica-Bold')
      .fillColor(BRAND)
      .text(`Page ${index + 1} of ${range.count}`, MARGIN + CONTENT_WIDTH * 0.7, FOOTER_TEXT_Y, {
        width: CONTENT_WIDTH * 0.3,
        align: 'right',
        lineBreak: false
      });
  }
}
