import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';

async function request(options, path, init) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { return await fetch(`http://127.0.0.1:${server.address().port}${path}`, init); }
  finally { server.close(); }
}
function upload(content = 'voice', type = 'audio/webm') {
  const body = new FormData(); body.append('file', new Blob([content], { type }), 'voice.webm'); return { method: 'POST', body };
}
test('health reveals configuration flag only', async () => {
  const response = await request({ apiKey: 'dummy-test-credential' }, '/api/health');
  assert.deepEqual(await response.json(), { configured: true });
});
test('missing configuration returns actionable safe error', async () => {
  const response = await request({ apiKey: '' }, '/api/transcribe', upload());
  assert.equal(response.status, 503); assert.match((await response.json()).error, /configured/i);
});
test('rejects missing, empty, unsupported and oversized audio', async () => {
  for (const init of [{ method: 'POST' }, upload(''), upload('bad', 'text/plain'), upload('a'.repeat(5 * 1024 * 1024 + 1))]) {
    const response = await request({ apiKey: 'dummy' }, '/api/transcribe', init);
    assert.ok([400, 413, 415].includes(response.status));
  }
});
test('forwards fixed upstream request and returns only transcript fields', async () => {
  let captured;
  const response = await request({ apiKey: 'dummy', fetchImpl: async (url, init) => {
    captured = { url, init }; return new Response(JSON.stringify({ transcript: 'fireball', language_code: 'en-IN', secret: 'hidden' }));
  } }, '/api/transcribe', upload());
  assert.equal(captured.url, 'https://api.sarvam.ai/speech-to-text');
  assert.equal(captured.init.headers['api-subscription-key'], 'dummy');
  assert.equal(captured.init.body.get('model'), 'saaras:v4');
  assert.deepEqual(await response.json(), { transcript: 'fireball', language_code: 'en-IN' });
});
test('upstream errors never expose response details or credentials', async () => {
  const response = await request({ apiKey: 'dummy', fetchImpl: async () => new Response('sensitive upstream payload', { status: 403 }) }, '/api/transcribe', upload());
  assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /sensitive|dummy/);
});
