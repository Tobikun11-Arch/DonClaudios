import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {connectDb} from './api/config/db';
import {env} from './api/config/env';
import routes from './api/routes/index';
import {errorHandler} from './api/middleware/errorHandler';
import {sanitize} from './api/middleware/sanitize';

const app = express();

// Behind Vercel's proxy: trust the first hop so req.ip is the real client IP
// (needed for per-IP rate limits and guest checkout spam protection).
app.set('trust proxy', 1);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const allowedExact = new Set(['http://localhost:3000']);
    // Expo web dev server for the mobile POS (native apps send no Origin).
    if (process.env.NODE_ENV !== 'production') {
      allowedExact.add('http://localhost:8081');
    }

    let originUrl: URL | null = null;
    try {
      originUrl = new URL(origin);
    } catch {
      originUrl = null;
    }

    const isAllowed =
      allowedExact.has(origin) ||
      (originUrl?.protocol === 'https:' &&
        originUrl.hostname.toLowerCase().endsWith('.vercel.app'));

    return callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'x-guest-session-id', 'x-client'],
  // Lets the browser read the report number / file name of exported PDFs.
  exposedHeaders: ['Content-Disposition', 'X-Report-Number']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(helmet());

app.use(express.json());
app.use(cookieParser());
app.use(sanitize);

app.use('/api', routes);

app.get('/', async (req, res) => {
  res.send('test production!');
});

app.use(errorHandler);

let dbInitPromise: Promise<unknown> | null = null;
const ensureDb = () => {
  if (!dbInitPromise) {
    dbInitPromise = connectDb();
  }
  return dbInitPromise;
};

export default async function handler(
  req: express.Request,
  res: express.Response
) {
  try {
    await ensureDb();
    return app(req, res);
  } catch (error) {
    console.error('Failed to connect to database', error);
    return res.status(500).json({message: 'Database connection failed'});
  }
}

if (process.env.VERCEL !== '1') {
  ensureDb()
    .then(() => {
      app.listen(env.PORT, () => {
        console.log(`Server listening on port ${env.PORT}`);
      });
    })
    .catch(error => {
      console.error('Failed to connect to database', error);
      process.exit(1);
    });
}
