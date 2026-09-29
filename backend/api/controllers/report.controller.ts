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
import {buildReportDocument} from '../services/reportDocument.service';
import type {ReportView} from '../services/reportDocument.service';
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

      // The document is assembled from the exact same service calls that back
      // the on-screen views, so the PDF can never disagree with the screen.
      const document = await buildReportDocument({view, range, groupBy: query.groupBy});
      const pdf = await renderReportPdf(document);

      const admins = await adminRepository.listAll();
      const businessName = admins[0]?.businessName || 'Don Claudio\'s Lechon House';
      const safeName = businessName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const stamp = range.from.toISOString().slice(0, 10);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeName}-${view}-report-${stamp}.pdf"`
      );
      res.setHeader('Content-Length', String(pdf.length));
      res.status(200).end(pdf);
    } catch (error) {
      next(error);
    }
  }
};
