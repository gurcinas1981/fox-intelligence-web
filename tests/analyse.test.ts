import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/analyse/route';
import { buildUserPrompt } from '../lib/prompt';

const oldKey = process.env.OPENAI_API_KEY;
const oldModel = process.env.OPENAI_MODEL;
const originalFetch = globalThis.fetch;
let calls: string[];
beforeEach(() => {
  calls = [];
  delete process.env.OPENAI_API_KEY;
  process.env.OPENAI_MODEL = 'offline-test-model';
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    throw new Error('Unexpected network request');
  };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
  if (oldModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL = oldModel;
});
const request = (body: unknown) => new NextRequest('http://localhost/api/analyse', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json' },
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
