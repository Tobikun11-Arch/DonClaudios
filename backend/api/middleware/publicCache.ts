import {Request, Response, NextFunction} from 'express';

/**
 * Lets Vercel's CDN answer a public, non-personalised GET for `seconds`
 * without running the function, then serve the stale copy for a while longer
 * while it refreshes in the background.
 *
 * Only use on endpoints whose response is the same for every visitor (no
 * auth, no per-user data). Browsers do not cache it (max-age=0).
 */
export function publicCache(seconds: number, staleSeconds = seconds * 5) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Cache-Control',
      `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`
    );
    next();
  };
}
