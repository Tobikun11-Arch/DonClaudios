import mongoose, {Schema} from 'mongoose';

/**
 * Log of every exported PDF report. The report number printed on the PDF
 * (e.g. SR-2026-000142) can be looked up here, so a printout can be traced to
 * who generated it, when, and for which period.
 */
export interface ReportExportDocument extends mongoose.Document {
  number: string;
  prefix: string;
  year: number;
  sequence: number;
  view: string;
  title: string;
  periodFrom: Date;
  periodTo: Date;
  periodLabel: string;
  generatedBy: mongoose.Types.ObjectId;
  generatedByName: string;
  createdAt: Date;
}

const ReportExportSchema = new Schema<ReportExportDocument>(
  {
    number: {type: String, required: true, unique: true},
    prefix: {type: String, required: true},
    year: {type: Number, required: true},
    sequence: {type: Number, required: true},
    view: {type: String, required: true},
    title: {type: String, required: true},
    periodFrom: {type: Date, required: true},
    periodTo: {type: Date, required: true},
    periodLabel: {type: String, required: true},
    generatedBy: {type: Schema.Types.ObjectId, ref: 'Admin', required: true},
    generatedByName: {type: String, required: true}
  },
  {timestamps: {createdAt: true, updatedAt: false}}
);

ReportExportSchema.index({createdAt: -1});

export const ReportExportModel = mongoose.model<ReportExportDocument>(
  'ReportExport',
  ReportExportSchema,
  'report_exports'
);

/** Per prefix-and-year counter, e.g. {_id: 'SR-2026', seq: 142}. */
const ReportCounterSchema = new Schema<{_id: string; seq: number}>(
  {_id: {type: String, required: true}, seq: {type: Number, default: 0}},
  {versionKey: false}
);

export const ReportCounterModel = mongoose.model<{_id: string; seq: number}>(
  'ReportCounter',
  ReportCounterSchema,
  'report_counters'
);
