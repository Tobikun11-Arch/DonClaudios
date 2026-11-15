import {Schema} from 'mongoose';
import {ACQUISITION_SOURCES, type Acquisition} from '../../config/acquisition';

/** Optional "where did this customer come from" block (see config/acquisition.ts). */
export const AcquisitionSchema = new Schema<Acquisition>(
  {
    source: {type: String, enum: ACQUISITION_SOURCES},
    heardFrom: {type: String, enum: ACQUISITION_SOURCES},
    utmSource: {type: String},
    utmMedium: {type: String},
    utmCampaign: {type: String},
    referrer: {type: String},
    landingPath: {type: String},
    firstSeenAt: {type: Date}
  },
  {_id: false}
);
