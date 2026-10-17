import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/analyse/route';
import { buildUserPrompt } from '../lib/prompt';

const securityVars = ['APPRAISAL_ACCESS_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] as const;
const oldSecurity = securityVars.map(key => process.env[key]);
const accessCode = 'offline-test-access-code-32-characters';
const redisUrl = 'https://offline-redis.example/';
const authHeaders = { 'content-type': 'application/json', authorization: `Bearer ${accessCode}` };
const oldKey = process.env.OPENAI_API_KEY;
const oldModel = process.env.OPENAI_MODEL;
const originalFetch = globalThis.fetch;
let calls: string[];
beforeEach(() => {
  calls = [];
  process.env.APPRAISAL_ACCESS_TOKEN = accessCode;
  process.env.UPSTASH_REDIS_REST_URL = redisUrl;
  process.env.UPSTASH_REDIS_REST_TOKEN = 'offline-redis-token';
  delete process.env.OPENAI_API_KEY;
  process.env.OPENAI_MODEL = 'offline-test-model';
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    throw new Error('Unexpected network request');
  };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  securityVars.forEach((key, index) => {
    if (oldSecurity[index] === undefined) delete process.env[key]; else process.env[key] = oldSecurity[index];
  });
  if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
  if (oldModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL = oldModel;
});
const request = (body: unknown) => new NextRequest('http://localhost/api/analyse', {
  method: 'POST', headers: authHeaders, body: JSON.stringify(body),
});
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json' },
});

test('non-object JSON bodies are rejected without external requests', async (t) => {
  t.mock.method(console, 'error', () => {});
  for (const body of [null, [], 'site', 42]) assert.equal((await POST(request(body))).status, 400);
  assert.equal(calls.length, 0);
});
test('non-text input fields are rejected before missing-key or provider checks', async (t) => {
  t.mock.method(console, 'error', () => {});
  for (const field of ['address', 'postcode', 'siteArea', 'currentUse', 'planningRef', 'notes']) {
    for (const value of [123, null, {}, []]) {
      assert.equal((await POST(request({ address: 'Derby DE1 3AH', [field]: value }))).status, 400);
    }
  }
  assert.equal(calls.length, 0);
});
test('malformed JSON returns 400 rather than an internal server error', async (t) => {
  t.mock.method(console, 'error', () => {});
  const req = new NextRequest('http://localhost/api/analyse', { method: 'POST', headers: authHeaders, body: '{' });
  assert.equal((await POST(req)).status, 400);
  assert.equal(calls.length, 0);
});

for (const address of [undefined, '   ', 'abc']) {
  test(`rejects missing or short address: ${JSON.stringify(address)}`, async () => {
    const response = await POST(request({ address }));
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Enter a site/);
    assert.equal(calls.length, 0);
  });
}
test('missing server key returns 503 before any external request', async () => {
  const response = await POST(request({ address: 'Derby DE1 3AH' }));
  assert.equal(response.status, 503);
  assert.equal(calls.length, 0);
});

function mockUpstreams(output: string, failedLookup = false) {
  process.env.OPENAI_API_KEY = 'offline-test-key';
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === redisUrl) return json({ result: [1, 0] });
    calls.push(url);
    if (url.startsWith('https://api.postcodes.io/')) {
      assert.ok(url.endsWith('/DE13AH'));
      return failedLookup ? json({}, 503) : json({ result: { latitude: 52.9, longitude: -1.4 } });
    }
    if (url.startsWith('https://www.planning.data.gov.uk/')) {
      const params = new URL(url).searchParams;
      assert.equal(params.getAll('dataset').length, 7);
      if (!failedLookup) assert.equal(params.get('latitude'), '52.9');
      return json({ entities: [{ dataset: 'green-belt', name: 'Mock evidence' }] });
    }
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, 'offline-test-model');
    assert.equal(body.text.format.strict, true);
    assert.equal(body.tools[0].type, 'web_search');
    assert.match(body.input, /Mock evidence/);
    return json({ id: 'resp_test', object: 'response', output: [{ type: 'message', role: 'assistant',
      content: [{ type: 'output_text', text: output, annotations: [] }] }] });
  };
}
const appraisal = () => ({ executive_summary: {}, options: [
  { name: 'A', suitability: 1, score_breakdown: { policy: 30, principle: 20, constraints: 15, access: 10, built_form: 10, history: 10, strategic_case: 5 } },
  { name: 'B', suitability: 99, score_breakdown: { policy: 20 } },
] });
test('appraisal uses postcode evidence and recalculates option and headline scores', async () => {
  mockUpstreams(JSON.stringify(appraisal()));
  const response = await POST(request({ address: '  Derby DE1 3AH  ' }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.appraisal.options.map((o: { suitability: number }) => o.suitability), [100, 20]);
  assert.equal(body.appraisal.executive_summary.development_suitability, 100);
  assert.equal(body.open_data.postcode, 'DE1 3AH');
  assert.equal(calls.length, 3);
});
test('failed postcode lookup is disclosed while postcode-based evidence remains available', async () => {
  mockUpstreams(JSON.stringify(appraisal()), true);
  const response = await POST(request({ address: 'Derby DE1 3AH' }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.open_data.postcodeLookup, null);
  assert.match(body.open_data.warnings[0], /lookup failed/);
});
test('invalid AI JSON returns an error rather than a successful appraisal', async (t) => {
  t.mock.method(console, 'error', () => {});
  mockUpstreams('invalid JSON');
  assert.equal((await POST(request({ address: 'Derby DE1 3AH' }))).status, 500);
});
test('prompt retains supplied site details and structured evidence', () => {
  const prompt = buildUserPrompt({ address: 'Test site', analysisDate: '2026-10-17',
    siteArea: '0.5 ha', notes: 'Check access', openData: { warnings: ['Unverified boundary'] } });
  for (const value of ['Test site', '2026-10-17', '0.5 ha', 'Check access', 'Unverified boundary']) assert.ok(prompt.includes(value));
});

test('missing and incorrect access codes cannot trigger any external request', async () => {
  for (const authorization of ['', 'Bearer wrong-code', accessCode]) {
    const req = new NextRequest('http://localhost/api/analyse', {
      method: 'POST', headers: { authorization }, body: '{'
    });
    assert.equal((await POST(req)).status, 401);
  }
  assert.equal(calls.length, 0);
});

test('absent or weak access configuration disables appraisals', async () => {
  for (const value of ['', 'short']) {
    process.env.APPRAISAL_ACCESS_TOKEN = value;
    assert.equal((await POST(request({ address: 'Derby DE1 3AH' }))).status, 503);
  }
  assert.equal(calls.length, 0);
});

test('missing durable limiter configuration cannot fall back to paid requests', async () => {
  process.env.OPENAI_API_KEY = 'offline-test-key';
  for (const key of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
    const old = process.env[key];
    delete process.env[key];
    assert.equal((await POST(request({ address: 'Derby DE1 3AH' }))).status, 503);
    process.env[key] = old;
  }
  assert.equal(calls.length, 0);
});

test('limiter outage, bad configuration and malformed responses fail closed', async () => {
  process.env.OPENAI_API_KEY = 'offline-test-key';
  for (const url of ['http://redis.example', 'https://user:password@redis.example', 'https://redis.example/?token=bad']) {
    process.env.UPSTASH_REDIS_REST_URL = url;
    assert.equal((await POST(request({ address: 'Derby DE1 3AH' }))).status, 503);
  }
  assert.equal(calls.length, 0);
  process.env.UPSTASH_REDIS_REST_URL = redisUrl;
  for (const response of [json({}, 500), json({ error: 'bad token' }), json({ result: [2, 0] }), json({ result: [1] })]) {
    globalThis.fetch = async () => response;
    assert.equal((await POST(request({ address: 'Derby DE1 3AH' }))).status, 503);
  }
  globalThis.fetch = async () => { throw new Error('timeout'); };
  assert.equal((await POST(request({ address: 'Derby DE1 3AH' }))).status, 503);
});

test('exhausted shared budget returns 429 with retry time before providers', async () => {
  process.env.OPENAI_API_KEY = 'offline-test-key';
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), redisUrl);
    const command = JSON.parse(String(init?.body));
    assert.equal(command[0], 'EVAL');
    assert.equal(command[2], 2);
    assert.deepEqual(command.slice(5, 7), [3, 20]);
    assert.ok(command[7] > 0 && command[7] <= 600);
    assert.ok(command[8] > 0 && command[8] <= 86400);
    return json({ result: [0, 123] });
  };
  const response = await POST(request({ address: 'Derby DE1 3AH' }));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '123');
});
