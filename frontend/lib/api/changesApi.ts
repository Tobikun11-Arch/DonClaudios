import {httpClient} from './httpClient';

export type ChangeScope =
  | 'orders'
  | 'orderMessages'
  | 'support'
  | 'reviews'
  | 'notifications';

export type ChangesResponse = {scopes: Partial<Record<ChangeScope, string>>};

// Several components share the change-check poll. Their timers are not in
// sync, so collapse calls made within this window into one request.
const DEDUPE_MS = 3000;
let last: {at: number; promise: Promise<ChangesResponse>} | null = null;

export function getChanges(): Promise<ChangesResponse> {
  const now = Date.now();
  if (last && now - last.at < DEDUPE_MS) return last.promise;
  const promise = httpClient
    .get<ChangesResponse>('/changes')
    .then(res => res.data);
  last = {at: now, promise};
  promise.catch(() => {
    if (last?.promise === promise) last = null;
  });
  return promise;
}
