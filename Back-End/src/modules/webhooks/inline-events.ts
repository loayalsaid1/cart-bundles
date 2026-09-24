/**
 * Salla events that must be processed synchronously in the webhook controller
 * (before the job is enqueued) so OAuth tokens are never parked in Redis.
 *
 * Single source of truth: the controller uses it to run `processEvent` inline,
 * and the queue processor uses it to skip the same events on the queued copy.
 */
export const INLINE_WEBHOOK_EVENTS: ReadonlySet<string> = new Set<string>([
  'app.store.authorize',
  'app.uninstalled',
]);
