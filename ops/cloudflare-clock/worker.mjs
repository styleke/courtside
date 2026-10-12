/**
 * Optional Free-plan clock for the existing Courtside GitHub workflow.
 * Not part of the public Pages site. No storage, paid API, public trigger,
 * automatic retry, account changes, or source-data access.
 */
export const CRON = '11,41 * * * *';
const ROOT = 'https://api.github.com/repos/styleke/courtside/actions/workflows/refresh.yml';
const RUNS = ROOT + '/runs?branch=main&per_page=5';
const DISPATCH = ROOT + '/dispatches';
const MINUTE = 60000;
const fail = code => { throw new Error(code); };

async function boundedJSON(response) {
  if (!response.headers.get('content-type')?.includes('json')) fail('invalid-content-type');
  const reader = response.body?.getReader();
  if (!reader) fail('missing-response-body');
  const decoder = new TextDecoder();
  let text = '', bytes = 0;
  for (;;) {
    const {value, done} = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 262144) { await reader.cancel(); fail('response-size-limit'); }
    text += decoder.decode(value, {stream: true});
  }
  text += decoder.decode();
  try { return JSON.parse(text); } catch { fail('invalid-json'); }
}

/** Return only a fixed diagnostic category, never a raw exception or a token. */
function networkErrorKind(error) {
  let name = '', message = '';
  try {
    if (typeof error?.name === 'string') name = error.name;
    if (typeof error?.message === 'string') message = error.message.slice(0, 512);
  } catch { return 'unclassified'; }
  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout-or-abort';
  if (/invalid redirect value|unsupported redirect|unsupported.*option/i.test(message)) return 'request-options';
  if (/illegal invocation/i.test(message)) return 'runtime-invocation';
  if (/DNS|name resolution|ENOTFOUND|EAI_AGAIN/i.test(message)) return 'name-resolution';
  if (/network connection lost|connection reset|ECONNRESET|socket|TLS/i.test(message)) return 'connection';
  return 'unclassified';
}

/** Purely injected dependencies in unit tests never count as live Cron evidence. */
export async function runTick(controller, env, {fetcher = fetch, now = Date.now} = {}) {
  const report = {version: 2, origin: 'cloudflare-cron', outcome: 'disabled', requests: 0,
    githubEvent: 'workflow_dispatch', publicationVerified: false, fullCoverage: false};
  if (env?.FREE_ONLY_CONFIRMED !== 'true' || env?.TIMER_ENABLED !== 'true') return report;
  const token = env.GITHUB_ACTIONS_TOKEN;
  if (typeof token !== 'string' || !/^github_pat_[A-Za-z0-9_]{30,245}$/.test(token)) {
    return {...report, outcome: 'error', code: 'fine-grained-token-required'};
  }
  const scheduled = controller?.scheduledTime;
  const at = now();
  if (controller?.cron !== CRON || !Number.isSafeInteger(scheduled) ||
      !Number.isFinite(at) || !Number.isFinite(new Date(scheduled).getTime()) ||
      scheduled > at + MINUTE || at - scheduled > 10 * MINUTE ||
      ![11, 41].includes(new Date(scheduled).getUTCMinutes())) {
    return {...report, outcome: 'error', code: 'invalid-or-late-cron-event'};
  }
  report.scheduledAt = new Date(scheduled).toISOString();
  report.checkedAt = new Date(at).toISOString();
  const headers = {'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json', 'User-Agent': 'CourtsideFreeClock/1.0', 'X-GitHub-Api-Version': '2022-11-28'};
  async function request(url, method = 'GET', body) {
    if (![RUNS, DISPATCH].includes(url) || report.requests >= 2) fail('request-bound');
    report.requests++;
    report.requestStage = method === 'POST' ? 'dispatch' : 'list-runs';
    delete report.httpStatus;
    let response;
    try {
      // workerd accepts follow/manual here, not the browser/Node 'error' mode.
      // Manual never follows Location; all 3xx responses are rejected below.
      response = await fetcher(url, {method, headers, redirect: 'manual',
        signal: AbortSignal.timeout(10000), ...(body ? {body: JSON.stringify(body)} : {})});
    } catch (error) {
      report.errorKind = networkErrorKind(error);
      fail('github-network-error');
    }
    report.httpStatus = response.status;
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      fail('github-redirect-blocked');
    }
    if (!response.ok) {
      await response.body?.cancel();
      fail('github-http-' + response.status);
    }
    return response;
  }
  try {
    const response = await request(RUNS);
    const payload = await boundedJSON(response);
    if (!Array.isArray(payload?.workflow_runs) || payload.workflow_runs.length > 5 ||
        !Number.isSafeInteger(payload.total_count) || payload.total_count < payload.workflow_runs.length) {
      fail('invalid-run-envelope');
    }
    const allowedStatuses = ['queued', 'in_progress', 'pending', 'waiting', 'requested', 'completed'];
    const runs = payload.workflow_runs;
    for (const run of runs) {
      if (!Number.isSafeInteger(run.id) || run.id <= 0 || run.head_branch !== 'main' ||
          run.path !== '.github/workflows/refresh.yml' ||
          !allowedStatuses.includes(run.status) ||
          !Number.isFinite(Date.parse(run.created_at)) || Date.parse(run.created_at) > at + MINUTE) {
        fail('invalid-run-record');
      }
    }
    runs.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const active = runs.find(r => r.status !== 'completed');
    if (active) {
      report.latestRunId = active.id;
      if (at - Date.parse(active.created_at) > 20 * MINUTE) fail('existing-run-stuck');
      return {...report, outcome: 'skipped', code: 'existing-run-active'};
    }
    const latest = runs[0];
    if (latest && at - Date.parse(latest.created_at) < 25 * MINUTE) {
      return {...report, latestRunId: latest.id, outcome: 'skipped', code: 'recent-run'};
    }
    const dispatch = await request(DISPATCH, 'POST', {ref: 'main'});
    await dispatch.body?.cancel();
    if (dispatch.status !== 204) fail('unexpected-dispatch-response');
    return {...report, outcome: 'accepted', code: 'dispatch-accepted-not-publication'};
  } catch (error) {
    const code = String(error.message);
    const safe = /^(github-(network-error|redirect-blocked|http-\d{3})|invalid-(content-type|json|run-envelope|run-record)|missing-response-body|response-size-limit|request-bound|existing-run-stuck|unexpected-dispatch-response)$/;
    return {...report, outcome: 'error', code: safe.test(code) ? code : 'clock-check-failed'};
  }
}

export default {
  // Visiting any Worker URL can never trigger a GitHub job or reveal a secret.
  fetch() { return new Response('Not found', {status: 404}); },
  async scheduled(controller, env) {
    controller.noRetry?.();
    const result = await runTick(controller, env);
    const log = JSON.stringify({...result, message: 'Courtside clock: ' + (result.code || result.outcome)});
    if (result.outcome === 'error') {
      console.error(log);
      throw new Error(result.code);
    }
    console.info(log);
  }
};
