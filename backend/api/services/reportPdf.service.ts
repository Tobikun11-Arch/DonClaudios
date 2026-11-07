import PDFDocument from 'pdfkit';

/*
 * Formal report renderer (print layout, not a dashboard).
 *
 * Paper: US Letter / "short bond" portrait, the usual business paper in the
 * Philippines. Layout follows paginated-report conventions: letterhead and
 * report information block on page 1, numbered sections, statement-style
 * summary, plain tables with right-aligned numbers and TOTAL rows, table
 * headers repeated on page breaks, a footer with "Page X of Y" on every page,
 * and a sign-off block at the end.
 *
 * The built-in PDF fonts cannot draw the peso sign, so amounts are written as
 * plain numbers and the currency goes in the column heading ("Amount (PHP)").
 */

export type Align = 'left' | 'right' | 'center';

export type TableColumn = {
  label: string;
  /** Fraction of the content width; the fractions of a table sum to 1. */
  width: number;
  align?: Align;
};

export type StatementLine = {
  label: string;
  value?: string;
  /**
   * normal  : plain line
   * less    : indented deduction, value already in (parentheses)
   * subtotal: rule above the value
   * total   : bold, rule above, double rule below
   * info    : smaller supporting figure under the statement
   */
  style?: 'normal' | 'less' | 'subtotal' | 'total' | 'info';
};

export type ReportBlock =
  | {kind: 'section'; title: string}
  | {kind: 'subheading'; title: string}
  | {kind: 'statement'; lines: StatementLine[]}
  | {
      kind: 'table';
      columns: TableColumn[];
      rows: string[][];
      /** Row indexes drawn as a group heading (e.g. a menu category). */
      groupRows?: number[];
      /** Row indexes drawn bold with a rule above (e.g. category subtotal). */
      subtotalRows?: number[];
      total?: string[];
      emptyText?: string;
      note?: string;
    }
  | {kind: 'facts'; rows: Array<[string, string]>}
  | {kind: 'note'; text: string};

export interface ReportDocument {
  title: string;
  number: string;
  periodLabel: string;
  generatedAt: string;
  preparedBy: {name: string; role: string};
  /** How the figures were counted, printed under the title. */
  basis: string;
  business: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: Buffer | null;
  };
  blocks: ReportBlock[];
}

// Letter, in points (8.5 x 11 in).
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 54;
const MARGIN_TOP = 50;
const FOOTER_H = 42;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const CONTENT_BOTTOM = PAGE_H - MARGIN_TOP - FOOTER_H;

const INK = '#111827';
const MUTED = '#4b5563';
const FAINT = '#9ca3af';
const RULE = '#d1d5db';
const BRAND = '#2d4a35';
const GROUP_FILL = '#f3f4f6';
const INFO_FILL = '#f9fafb';

const BODY = 9;
const SMALL = 7.5;
const TABLE = 8.5;
const CELL_PAD_X = 5;
const CELL_PAD_Y = 4;

const DISCLAIMER =
  'System-generated management report. This is not an official BIR sales record (X/Z reading).';

type Doc = PDFKit.PDFDocument;

export function renderReportPdf(model: ReportDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      // Bottom margin 0: page breaks are handled by `ensure()` below, so
      // pdfkit never inserts surprise pages (which used to break numbering).
      margins: {top: MARGIN_TOP, bottom: 0, left: MARGIN_X, right: MARGIN_X},
      bufferPages: true,
      info: {
        Title: `${model.title} ${model.number}`,
        Author: model.business.name,
        Subject: `${model.title} for ${model.periodLabel}`,
        Creator: `${model.business.name} ordering system`
      }
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      const r = new Renderer(doc, model);
      r.letterhead();
      r.infoBlock();
      model.blocks.forEach((block, i) => r.block(block, model.blocks[i + 1]));
      r.signOff();
      r.footers();
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

class Renderer {
  private y = MARGIN_TOP;
  private sectionNo = 0;

  constructor(private doc: Doc, private model: ReportDocument) {}

  // -- layout helpers -------------------------------------------------------

  private ensure(height: number) {
    if (this.y + height > CONTENT_BOTTOM) {
      this.doc.addPage();
      this.y = MARGIN_TOP;
      return true;
    }
    return false;
  }

  private text(
    value: string,
    x: number,
    y: number,
    opts: {width: number; align?: Align; size?: number; bold?: boolean; italic?: boolean; color?: string}
  ) {
    const font = opts.bold
      ? 'Helvetica-Bold'
      : opts.italic
        ? 'Helvetica-Oblique'
        : 'Helvetica';
    this.doc
      .font(font)
      .fontSize(opts.size ?? BODY)
      .fillColor(opts.color ?? INK)
      .text(value, x, y, {width: opts.width, align: opts.align ?? 'left', lineGap: 1});
  }

  private heightOf(value: string, width: number, size: number, bold = false) {
    this.doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    return this.doc.heightOfString(value || ' ', {width, lineGap: 1});
  }

  private hRule(y: number, x1 = MARGIN_X, x2 = MARGIN_X + CONTENT_W, color = RULE, width = 0.6) {
    this.doc.moveTo(x1, y).lineTo(x2, y).lineWidth(width).strokeColor(color).stroke();
  }

  // -- page 1 header --------------------------------------------------------

  letterhead() {
    const b = this.model.business;
    let textX = MARGIN_X;
    if (b.logo) {
      try {
        this.doc.image(b.logo, MARGIN_X, this.y, {fit: [46, 46]});
        textX = MARGIN_X + 56;
      } catch {
        textX = MARGIN_X;
      }
    }
    const textW = CONTENT_W - (textX - MARGIN_X);
    this.text(b.name.toUpperCase(), textX, this.y + 4, {width: textW, size: 14, bold: true, color: BRAND});
    const contact = [b.address, b.phone, b.email].filter(Boolean).join('  |  ');
    if (contact) {
      this.text(contact, textX, this.y + 23, {width: textW, size: SMALL + 0.5, color: MUTED});
    }
    this.y += b.logo ? 54 : 42;
    this.hRule(this.y, MARGIN_X, MARGIN_X + CONTENT_W, BRAND, 1.4);
    this.y += 14;

    this.text(this.model.title.toUpperCase(), MARGIN_X, this.y, {width: CONTENT_W, size: 15, bold: true});
    this.y += 24;
  }

  infoBlock() {
    const m = this.model;
    const rows: Array<[string, string, string, string]> = [
      ['Report No.', m.number, 'Period covered', m.periodLabel],
      ['Date generated', m.generatedAt, 'Prepared by', `${m.preparedBy.name} (${m.preparedBy.role})`]
    ];
    const labelW = 82;
    const half = CONTENT_W / 2;
    const rowH = 16;
    const basisH = this.heightOf(m.basis, CONTENT_W - labelW - 12, SMALL + 0.5) + 8;
    const boxH = rows.length * rowH + basisH + 6;

    this.doc.rect(MARGIN_X, this.y, CONTENT_W, boxH).lineWidth(0.6).fillAndStroke(INFO_FILL, RULE);
    let y = this.y + 6;
    for (const [l1, v1, l2, v2] of rows) {
      this.text(l1, MARGIN_X + 8, y, {width: labelW, size: SMALL + 0.5, bold: true, color: MUTED});
      this.text(v1, MARGIN_X + 8 + labelW, y, {width: half - labelW - 12, size: BODY});
      this.text(l2, MARGIN_X + half + 4, y, {width: labelW, size: SMALL + 0.5, bold: true, color: MUTED});
      this.text(v2, MARGIN_X + half + 4 + labelW, y, {width: half - labelW - 12, size: BODY});
      y += rowH;
    }
    this.text('Basis', MARGIN_X + 8, y + 1, {width: labelW, size: SMALL + 0.5, bold: true, color: MUTED});
    this.text(m.basis, MARGIN_X + 8 + labelW, y + 1, {width: CONTENT_W - labelW - 16, size: SMALL + 0.5, color: INK});
    this.y += boxH + 16;
  }

  // -- blocks ---------------------------------------------------------------

  /** Smallest height a block needs so its heading is never left alone. */
  private minHeight(b?: ReportBlock): number {
    if (!b) return 0;
    switch (b.kind) {
      case 'table':
        return 22 + Math.max(1, Math.min(2, b.rows.length)) * 20 + (b.total && b.rows.length <= 2 ? 22 : 0);
      case 'statement':
        return b.lines.length * 15 + 10;
      case 'facts':
        return Math.min(3, b.rows.length) * 18;
      case 'note':
        return 20;
      default:
        return 30;
    }
  }

  block(b: ReportBlock, next?: ReportBlock) {
    switch (b.kind) {
      case 'section':
        return this.section(b.title, next);
      case 'subheading':
        return this.subheading(b.title);
      case 'statement':
        return this.statement(b.lines);
      case 'table':
        return this.table(b);
      case 'facts':
        return this.facts(b.rows);
      case 'note':
        return this.note(b.text);
    }
  }

  private section(title: string, next?: ReportBlock) {
    // Keep the heading on the same page as the start of its content.
    this.ensure(34 + this.minHeight(next));
    this.sectionNo += 1;
    this.y += 4;
    this.text(`${this.sectionNo}.  ${title.toUpperCase()}`, MARGIN_X, this.y, {width: CONTENT_W, size: 10.5, bold: true, color: BRAND});
    this.y += 15;
    this.hRule(this.y, MARGIN_X, MARGIN_X + CONTENT_W, BRAND, 0.8);
    this.y += 8;
  }

  private subheading(title: string) {
    this.ensure(50);
    this.text(title, MARGIN_X, this.y, {width: CONTENT_W, size: BODY + 0.5, bold: true});
    this.y += 14;
  }

  private statement(lines: StatementLine[]) {
    const width = 380;
    const valueW = 110;
    const x = MARGIN_X;
    const valueX = x + width - valueW;
    this.ensure(lines.length * 15 + 10);

    for (const line of lines) {
      const style = line.style ?? 'normal';
      const bold = style === 'total' || style === 'subtotal';
      const size = style === 'info' ? SMALL + 0.5 : BODY;
      const indent = style === 'less' ? 14 : 0;
      const color = style === 'info' ? MUTED : INK;

      if (style === 'subtotal' || style === 'total') {
        this.hRule(this.y - 2, valueX, x + width, INK, 0.6);
        this.y += 2;
      }
      // Supporting info lines span the full width instead of the label column.
      const labelW = style === 'info' ? CONTENT_W : valueX - x - indent - 6;
      this.text(line.label, x + indent, this.y, {width: labelW, size, bold, color});
      if (line.value !== undefined) {
        this.text(line.value, valueX, this.y, {width: valueW, align: 'right', size, bold, color});
      }
      this.y += style === 'info' ? 12 : 14;
      if (style === 'total') {
        this.hRule(this.y - 1, valueX, x + width, INK, 0.6);
        this.hRule(this.y + 1, valueX, x + width, INK, 0.6);
        this.y += 6;
      }
    }
    this.y += 8;
  }

  private facts(rows: Array<[string, string]>) {
    const labelW = CONTENT_W * 0.55;
    for (const [label, value] of rows) {
      const h = Math.max(this.heightOf(label, labelW - 10, BODY), this.heightOf(value, CONTENT_W - labelW - 10, BODY, true)) + 6;
      this.ensure(h);
      this.text(label, MARGIN_X + 4, this.y + 3, {width: labelW - 10, size: BODY, color: MUTED});
      this.text(value, MARGIN_X + labelW, this.y + 3, {width: CONTENT_W - labelW - 4, size: BODY, bold: true, align: 'right'});
      this.y += h;
      this.hRule(this.y);
    }
    this.y += 12;
  }

  private note(text: string) {
    const h = this.heightOf(text, CONTENT_W, SMALL) + 4;
    this.ensure(h);
    this.text(text, MARGIN_X, this.y, {width: CONTENT_W, size: SMALL, italic: true, color: MUTED});
    this.y += h + 8;
  }

  private table(t: Extract<ReportBlock, {kind: 'table'}>) {
    const widths = t.columns.map(c => c.width * CONTENT_W);
    const xs = widths.reduce<number[]>((acc, w, i) => [...acc, i === 0 ? MARGIN_X : acc[i - 1] + widths[i - 1]], []);
    const groupRows = new Set(t.groupRows ?? []);
    const subtotalRows = new Set(t.subtotalRows ?? []);

    const rowHeight = (cells: string[], bold: boolean) =>
      Math.max(
        ...cells.map((c, i) => this.heightOf(c ?? '', widths[i] - CELL_PAD_X * 2, TABLE, bold))
      ) + CELL_PAD_Y * 2;

    const header = (continued: boolean) => {
      if (continued) {
        this.text('(continued)', MARGIN_X, this.y, {width: CONTENT_W, size: SMALL, italic: true, color: MUTED});
        this.y += 11;
      }
      const h = rowHeight(t.columns.map(c => c.label), true);
      this.doc.rect(MARGIN_X, this.y, CONTENT_W, h).fill(BRAND);
      t.columns.forEach((c, i) => {
        this.text(c.label, xs[i] + CELL_PAD_X, this.y + CELL_PAD_Y, {
          width: widths[i] - CELL_PAD_X * 2,
          align: c.align ?? 'left',
          size: TABLE,
          bold: true,
          color: '#ffffff'
        });
      });
      this.y += h;
    };

    const firstRowH = t.rows.length ? rowHeight(t.rows[0], false) : 18;
    // Never strand a header at the bottom of a page.
    this.ensure(rowHeight(t.columns.map(c => c.label), true) + firstRowH * 2 + 4);
    header(false);

    if (t.rows.length === 0) {
      const msg = t.emptyText ?? 'No records for this period.';
      this.text(msg, MARGIN_X + CELL_PAD_X, this.y + CELL_PAD_Y, {width: CONTENT_W - CELL_PAD_X * 2, size: TABLE, italic: true, color: MUTED});
      this.y += 18;
      this.hRule(this.y);
    }

    t.rows.forEach((cells, index) => {
      const isGroup = groupRows.has(index);
      const isSub = subtotalRows.has(index);
      const h = rowHeight(cells, isGroup || isSub);
      if (this.ensure(h)) header(true);

      if (isGroup) {
        this.doc.rect(MARGIN_X, this.y, CONTENT_W, h).fill(GROUP_FILL);
      }
      if (isSub) this.hRule(this.y, MARGIN_X, MARGIN_X + CONTENT_W, INK, 0.5);

      cells.forEach((cell, i) => {
        this.text(cell ?? '', xs[i] + CELL_PAD_X, this.y + CELL_PAD_Y, {
          width: widths[i] - CELL_PAD_X * 2,
          align: t.columns[i].align ?? 'left',
          size: TABLE,
          bold: isGroup || isSub
        });
      });
      this.y += h;
      if (!isGroup) this.hRule(this.y);
    });

    if (t.total) {
      const h = rowHeight(t.total, true) + 2;
      if (this.ensure(h + 4)) header(true);
      this.hRule(this.y, MARGIN_X, MARGIN_X + CONTENT_W, INK, 0.9);
      t.total.forEach((cell, i) => {
        this.text(cell ?? '', xs[i] + CELL_PAD_X, this.y + CELL_PAD_Y + 1, {
          width: widths[i] - CELL_PAD_X * 2,
          align: t.columns[i].align ?? 'left',
          size: TABLE,
          bold: true
        });
      });
      this.y += h;
      this.hRule(this.y, MARGIN_X, MARGIN_X + CONTENT_W, INK, 0.6);
      this.hRule(this.y + 2, MARGIN_X, MARGIN_X + CONTENT_W, INK, 0.6);
      this.y += 2;
    }

    this.y += 6;
    if (t.note) this.note(t.note);
    else this.y += 8;
  }

  // -- closing --------------------------------------------------------------

  signOff() {
    this.ensure(100);
    this.y += 12;
    const colW = 220;
    const lineY = this.y + 34;
    this.text('Prepared by:', MARGIN_X, this.y, {width: colW, size: BODY, color: MUTED});
    this.hRule(lineY, MARGIN_X, MARGIN_X + colW, INK, 0.6);
    this.text(this.model.preparedBy.name, MARGIN_X, lineY + 4, {width: colW, size: BODY, bold: true, align: 'center'});
    this.text(`${this.model.preparedBy.role}, ${this.model.business.name}`, MARGIN_X, lineY + 16, {width: colW, size: SMALL + 0.5, color: MUTED, align: 'center'});

    const rightX = MARGIN_X + CONTENT_W - colW;
    this.text('Date generated:', rightX, this.y, {width: colW, size: BODY, color: MUTED});
    this.text(this.model.generatedAt, rightX, lineY - 12, {width: colW, size: BODY, bold: true, align: 'center'});
    this.hRule(lineY, rightX, rightX + colW, INK, 0.6);
    this.text(`Report No. ${this.model.number}`, rightX, lineY + 4, {width: colW, size: SMALL + 0.5, color: MUTED, align: 'center'});

    this.y = lineY + 40;
    this.text('*** End of report ***', MARGIN_X, this.y, {width: CONTENT_W, size: SMALL, color: FAINT, align: 'center'});
  }

  footers() {
    const range = this.doc.bufferedPageRange();
    const total = range.count;
    for (let i = 0; i < total; i += 1) {
      this.doc.switchToPage(range.start + i);
      const top = PAGE_H - MARGIN_TOP - FOOTER_H + 14;
      this.hRule(top, MARGIN_X, MARGIN_X + CONTENT_W, RULE, 0.6);
      this.text(
        `${this.model.business.name}  |  ${this.model.title}  |  ${this.model.number}  |  ${this.model.periodLabel}`,
        MARGIN_X,
        top + 6,
        {width: CONTENT_W - 80, size: SMALL, color: MUTED}
      );
      this.text(`Page ${i + 1} of ${total}`, MARGIN_X + CONTENT_W - 80, top + 6, {width: 80, size: SMALL, bold: true, align: 'right'});
      this.text(DISCLAIMER, MARGIN_X, top + 18, {width: CONTENT_W, size: SMALL - 0.5, color: FAINT});
    }
  }
}
