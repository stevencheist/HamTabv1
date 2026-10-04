// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { securePost } = require('../../server/services/http-fetch');

// Fake https.request: records the call and answers with the given status/body.
function fakeRequest(status, body, calls) {
  return (options, onResponse) => {
    const req = new EventEmitter();
    let written = '';
    req.setTimeout = () => req;
    req.destroy = () => {};
    req.write = (chunk) => { written += chunk; };
    req.end = () => {
      calls.push({ options, body: written });
      const resp = new EventEmitter();
      resp.statusCode = status;
      onResponse(resp);
      resp.emit('data', Buffer.from(body));
      resp.emit('end');
    };
    return req;
  };
}

const publicResolver = async () => '13.33.33.33';

describe('securePost', () => {
  test('sends a real POST with JSON body, pinned IP, SNI and Host', async () => {
    const calls = [];
    const out = await securePost('https://api.pota.app/spot', { activator: 'W1AW' }, {}, { resolveHost: publicResolver, request: fakeRequest(200, '{}', calls) });
    assert.equal(out.ok, true);
    assert.equal(out.status, 200);
    const { options, body } = calls[0];
    assert.equal(options.method, 'POST');
    assert.equal(options.hostname, '13.33.33.33');
    assert.equal(options.path, '/spot');
    assert.equal(options.servername, 'api.pota.app');
    assert.equal(options.headers.Host, 'api.pota.app');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.equal(options.headers['Content-Length'], Buffer.byteLength(body));
    assert.deepEqual(JSON.parse(body), { activator: 'W1AW' });
  });

  test('resolves (does not throw) on upstream 4xx/5xx so callers can relay them', async () => {
    const out = await securePost('https://api.pota.app/spot', {}, {}, { resolveHost: publicResolver, request: fakeRequest(400, 'Invalid park', []) });
    assert.deepEqual(out, { status: 400, ok: false, text: 'Invalid park' });
  });

  test('does not follow redirects (a 301 is returned as-is)', async () => {
    const calls = [];
    const out = await securePost('https://api.pota.app/spot', {}, {}, { resolveHost: publicResolver, request: fakeRequest(301, '', calls) });
    assert.equal(out.status, 301);
    assert.equal(calls.length, 1);
  });

  test('rejects non-HTTPS URLs', async () => {
    await assert.rejects(securePost('http://api.pota.app/spot', {}), /Only HTTPS/);
  });

  test('rejects hosts that resolve to private addresses', async () => {
    await assert.rejects(
      securePost('https://evil.example/spot', {}, {}, { resolveHost: async () => '169.254.169.254', request: fakeRequest(200, '', []) }),
      /private addresses/
    );
  });

  test('extra headers cannot override Host or Content-Length', async () => {
    const calls = [];
    await securePost('https://api.pota.app/spot', { a: 1 }, { Host: 'evil', 'Content-Length': 1 }, { resolveHost: publicResolver, request: fakeRequest(200, '', calls) });
    assert.equal(calls[0].options.headers.Host, 'api.pota.app');
    assert.equal(calls[0].options.headers['Content-Length'], Buffer.byteLength('{"a":1}'));
  });
});
