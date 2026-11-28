import PDFDocument from 'pdfkit';
import type {DetailResult} from './reportDetail.service';
import {formatNumber} from '../utils/numberFormat';

function fmt(value: unknown, type?: string) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'money' && typeof value === 'number') {
    return `PHP ${formatNumber(value, 2)}`;
  }
  if (type === 'datetime' && typeof value === 'string') {
    return new Date(value).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
  if (type === 'number' && typeof value === 'number') return formatNumber(value);
  return String(value);
}

/**
 * Detailed report as a landscape PDF table: same columns and rows as the
 * screen (all pages), with a totals line. Long cells are cut to fit.
 */
export function buildDetailPdf(result: DetailResult, meta: {title: string; rangeLabel: string; business: string}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({size: 'A4', layout: 'landscape', margin: 28});
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const bottom = doc.page.height - doc.page.margins.bottom;
    // Wider columns for free text; everything else shares the rest.
    const weights = result.columns.map(c =>
      ['items', 'action', 'email', 'customer', 'product'].includes(c.key) ? 2.2 : c.type === 'datetime' ? 1.3 : 1
    );
    const sumW = weights.reduce((a, b) => a + b, 0);
    const colW = weights.map(w => (w / sumW) * width);
    const fontSize = result.columns.length > 10 ? 6.5 : 7.5;

    const header = () => {
      doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#2d4a35');
      let x = left;
      const y = doc.y;
      result.columns.forEach((c, i) => {
        doc.text(c.label, x + 2, y, {width: colW[i] - 4, height: fontSize * 2.6, ellipsis: true});
        x += colW[i];
      });
      doc.y = y + fontSize * 2.8;
      doc.moveTo(left, doc.y - 2).lineTo(left + width, doc.y - 2).strokeColor('#c9d6cc').stroke();
      doc.font('Helvetica').fillColor('#1f2937');
    };

    doc.font('Helvetica-Bold').fontSize(14).fillColor('#2d4a35').text(meta.title, left, doc.y);
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text(`${meta.business} · ${meta.rangeLabel} · ${formatNumber(result.total)} rows`);
    doc.moveDown(0.8);
    header();

    const rowH = fontSize * 2.4;
    for (const row of result.rows) {
      if (doc.y + rowH > bottom) {
        doc.addPage();
        header();
      }
      let x = left;
      const y = doc.y;
      result.columns.forEach((c, i) => {
        doc.fontSize(fontSize).text(fmt(row[c.key], c.type), x + 2, y, {
          width: colW[i] - 4,
          height: rowH,
          ellipsis: true,
          align: c.type === 'money' || c.type === 'number' ? 'right' : 'left'
        });
        x += colW[i];
      });
      doc.y = y + rowH;
    }

    if (Object.keys(result.totals).length) {
      if (doc.y + rowH > bottom) doc.addPage();
      doc.moveTo(left, doc.y).lineTo(left + width, doc.y).strokeColor('#2d4a35').stroke();
      doc.font('Helvetica-Bold');
      let x = left;
      const y = doc.y + 3;
      result.columns.forEach((c, i) => {
        const text = i === 0 ? 'TOTAL' : c.key in result.totals ? fmt(result.totals[c.key], c.type) : '';
        doc.fontSize(fontSize).text(text, x + 2, y, {
          width: colW[i] - 4,
          align: c.type === 'money' || c.type === 'number' ? 'right' : 'left'
        });
        x += colW[i];
      });
    }
    doc.end();
  });
}
