/** Operational correlation, NOT an independent provider signature.
 * Only Actions-authorized callers can dispatch. A privileged caller can copy
 * these inputs; do not describe this metadata as cryptographic authentication.
 */
export const CLOCK_PREFIX = 'Courtside clock v1 | cloudflare-cron | ';
export const TRIGGER_JOB = 'Validate trigger provenance';
const MINUTE = 60000;
// Keep raw controller time for age checks; use the minute only as a deduplication key.
export function clockSlot(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:(11|41):[0-5]\d\.\d{3}Z$/.test(text)) return null;
  const at = Date.parse(text);
  return Number.isFinite(at) && new Date(at).toISOString() === text ? Math.floor(at / MINUTE) * MINUTE : null;
}
export function validateClockTrigger({event, ref, actor, source = '', scheduledAt = '', now = Date.now()}) {
  if (ref !== 'refs/heads/main') throw Error('main-ref-required');
  if (source === 'cloudflare-cron') {
    const slot = clockSlot(scheduledAt), scheduled = Date.parse(scheduledAt);
    if (event !== 'workflow_dispatch' || actor !== 'styleke' || slot === null || !Number.isFinite(now) ||
        scheduled > now + MINUTE || now - scheduled > 45 * MINUTE) throw Error('invalid-clock-provenance');
    return {source, scheduledAt, slotAt: new Date(slot).toISOString(), correlation: 'validated-dispatch-metadata', providerAuthenticated: false};
  }
  if (!['', 'manual', 'bounded-recovery'].includes(source) || scheduledAt) throw Error('invalid-nonclock-inputs');
  return {source: event === 'workflow_dispatch' ? source || 'unattributed-dispatch' : event,
    scheduledAt: null, correlation: 'none', providerAuthenticated: false};
}
export function externalClockEvidence(run, jobs) {
  if (run?.event !== 'workflow_dispatch' || run.head_branch !== 'main' ||
      run.path !== '.github/workflows/refresh.yml' || run.run_attempt !== 1 ||
      run.actor?.id !== 264408634 || run.triggering_actor?.id !== 264408634 ||
      !Number.isSafeInteger(run.id) || run.id <= 0 ||
      typeof run.display_title !== 'string' || !run.display_title.startsWith(CLOCK_PREFIX)) return null;
  const text = run.display_title.slice(CLOCK_PREFIX.length), slot = clockSlot(text);
  const created = Date.parse(run.created_at), scheduled = Date.parse(text);
  if (slot === null || !Number.isFinite(created) || created < scheduled - MINUTE || created - scheduled > 15 * MINUTE) return null;
  const guards = (jobs || []).filter(j => j.name === TRIGGER_JOB);
  if (guards.length !== 1 || guards[0].run_id !== run.id || guards[0].status !== 'completed' ||
      guards[0].conclusion !== 'success') return null;
  return {source: 'cloudflare-cron', scheduledAt: text, slotAt: new Date(slot).toISOString(), runId: run.id, guardJobId: guards[0].id,
    correlation: 'validated-dispatch-metadata', providerAuthenticated: false};
}
