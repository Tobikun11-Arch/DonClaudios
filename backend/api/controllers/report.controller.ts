import {Request, Response, NextFunction} from 'express';
import {
  REPORT_DIMENSIONS,
  getReportBreakdown,
  getReportInventoryHealth,
  getReportOperations,
  getReportSummary,
  getReportTimeseries
} from '../services/report.service';
import type {ReportDimension} from '../services/report.service';
import {renderReportPdf} from '../services/reportPdf.service';
import {buildReportDocument, issueReportNumber} from '../services/reportDocument.service';
import type {ReportView} from '../services/reportDocument.service';
import {settingsRepository} from '../repositories/settings.repository';
import {
  MAX_RANGE_DAYS,
  countManilaDays,
  manilaDayEndUtc,
  manilaDayStartUtc,
  parseDateInput,
  resolveRange
} from '../utils/dateRange';
import type {RangePreset, ReportGranularity} from '../utils/dateRange';
import {adminRepository} from '../repositories/admin.repository';
import {ApiError} from '../utils/error';

type RangeQuery = {preset?: RangePreset; from?: string; to?: string};
type TimeseriesQuery = RangeQuery & {granularity?: ReportGranularity};
type BreakdownQuery = RangeQuery & {dimension?: ReportDimension; limit?: number};
type PdfQuery = BreakdownQuery & {view?: string; groupBy?: string};

/** Fetches the business logo for the letterhead. Never blocks the report. */
async function fetchLogo(url?: string | null): Promise<Buffer | null> {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {signal: controller.signal});
    clearTimeout(timer);
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    // pdfkit only embeds PNG and JPEG.
    if (!/image\/(png|jpe?g)/i.test(type)) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function readQuery<T>(req: Request): T {
  return (req as Request & {validatedQuery?: T}).validatedQuery as T;
}

function toRange(query: RangeQuery) {
  // `resolveRange` is forgiving by design (it clamps and repairs), which is right
  // for internal callers but wrong for a user-supplied query: silently returning
  // a different window than the owner asked for is worse than a clear rejection.
  if (query.preset === 'custom') {
    if (!query.from || !query.to) {
      throw new ApiError(
        400,
        'INVALID_DATE_RANGE',
        'A custom range needs both a "from" and a "to" date.'
      );
    }
    const from = parseDateInput(query.from);
    const to = parseDateInput(query.to);
    if (!from || !to) {
      throw new ApiError(400, 'INVALID_DATE_RANGE', 'Those dates could not be read.');
    }
    if (manilaDayStartUtc(to).getTime() < manilaDayStartUtc(from).getTime()) {
      throw new ApiError(
        400,
        'INVALID_DATE_RANGE',
        'The start date must be on or before the end date.'
      );
    }
    if (countManilaDays(manilaDayStartUtc(from), manilaDayEndUtc(to)) > MAX_RANGE_DAYS) {
      throw new ApiError(
        400,
        'RANGE_TOO_LARGE',
        `A report range cannot exceed ${MAX_RANGE_DAYS} days.`
      );
    }
  }

  const range = resolveRange({preset: query.preset, from: query.from, to: query.to});
  if (range.days > MAX_RANGE_DAYS) {
    throw new ApiError(
      400,
      'RANGE_TOO_LARGE',
      `A report range cannot exceed ${MAX_RANGE_DAYS} days.`
    );
  }
  return range;
}

export const reportController = {
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const range = toRange(readQuery<RangeQuery>(req));
      res.status(200).json(await getReportSummary(range));
    } catch (error) {
      next(error);
    }
  },

  async timeseries(req: Request, res: Response, next: NextFunction) {
    try {
      const query = readQuery<TimeseriesQuery>(req);
      const range = toRange(query);
      res.status(200).json(await getReportTimeseries(range, query.granularity));
    } catch (error) {
      next(error);
    }
  },

  async breakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const query = readQuery<BreakdownQuery>(req);
      const dimension = query.dimension ?? 'product';
      const range = toRange(query);
      res.status(200).json(await getReportBreakdown(range, dimension, query.limit ?? 50));
    } catch (error) {
      next(error);
    }
  },

  async operations(req: Request, res: Response, next: NextFunction) {
    try {
      const range = toRange(readQuery<RangeQuery>(req));
      res.status(200).json(await getReportOperations(range));
    } catch (error) {
      next(error);
    }
  },

  async inventoryHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const range = toRange(readQuery<RangeQuery>(req));
      res.status(200).json(await getReportInventoryHealth(range));
    } catch (error) {
      next(error);
    }
  },

  /** Dimensions the UI is allowed to request, so the client can render filters. */
  async dimensions(_req: Request, res: Response) {
    res.status(200).json({dimensions: REPORT_DIMENSIONS});
  },

  async pdf(req: Request, res: Response, next: NextFunction) {
    try {
      const query = readQuery<PdfQuery>(req);
      const range = toRange(query);
      const view = (query.view ?? 'sales') as ReportView;

      // "Prepared by" is the owner account that is generating the report.
      const admin = req.auth?.userId ? await adminRepository.findById(req.auth.userId) : null;
      if (!admin) {
        throw new ApiError(403, 'FORBIDDEN', 'Only the owner can export reports');
      }
      const ownerName =
        `${admin.firstName ?? ''} ${admin.lastName ?? ''}`.trim() || admin.username || 'Owner';

      const settings = await settingsRepository.findOne().catch(() => null);
      const contact = (settings as any)?.contact ?? {};
      const businessName = admin.businessName || "DonClaudio's Lechon House";

      const [number, logo] = await Promise.all([
        issueReportNumber({view, range, admin: {id: String(admin._id), name: ownerName}}),
        fetchLogo(admin.businessLogo)
      ]);

      const document = await buildReportDocument({
        view,
        range,
        number,
        preparedBy: {name: ownerName, role: 'Owner'},
        business: {
          name: businessName,
          address: admin.storeAddress || contact.address || undefined,
          phone: admin.businessContactNumber || contact.phones?.[0] || undefined,
          email: contact.email || admin.email || undefined,
          logo
        }
      });
      const pdf = await renderReportPdf(document);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${number}-${view}-report.pdf"`
      );
      res.setHeader('X-Report-Number', number);
      res.setHeader('Content-Length', String(pdf.length));
      res.status(200).end(pdf);
    } catch (error) {
      next(error);
    }
  }
};
