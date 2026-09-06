// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { isPrivateIP, MAX_REDIRECTS, MAX_RESPONSE_BYTES } = require('../../server/services/http-fetch');

describe('isPrivateIP — IPv4', () => {
  test('blocks RFC 1918 ranges', () => {
    assert.equal(isPrivateIP('10.0.0.1'), true);
    assert.equal(isPrivateIP('10.255.255.255'), true);
    assert.equal(isPrivateIP('172.16.0.1'), true);
    assert.equal(isPrivateIP('172.31.255.255'), true);
    assert.equal(isPrivateIP('192.168.1.1'), true);
    assert.equal(isPrivateIP('192.168.255.255'), true);
  });

  test('blocks loopback', () => {
    assert.equal(isPrivateIP('127.0.0.1'), true);
    assert.equal(isPrivateIP('127.255.255.254'), true);
  });

  test('blocks link-local (169.254.0.0/16)', () => {
    assert.equal(isPrivateIP('169.254.169.254'), true); // AWS metadata
    assert.equal(isPrivateIP('169.254.0.1'), true);
  });

  test('blocks 0.0.0.0/8 (current network)', () => {
    assert.equal(isPrivateIP('0.0.0.0'), true);
    assert.equal(isPrivateIP('0.1.2.3'), true);
  });

  test('blocks CGNAT (100.64.0.0/10)', () => {
    assert.equal(isPrivateIP('100.64.0.1'), true);
    assert.equal(isPrivateIP('100.127.255.255'), true);
  });

  test('blocks multicast and reserved', () => {
    assert.equal(isPrivateIP('224.0.0.1'), true);
    assert.equal(isPrivateIP('239.255.255.255'), true);
    assert.equal(isPrivateIP('240.0.0.1'), true);
    assert.equal(isPrivateIP('255.255.255.255'), true);
  });

  test('blocks 198.18/15 benchmark range', () => {
    assert.equal(isPrivateIP('198.18.0.1'), true);
    assert.equal(isPrivateIP('198.19.255.255'), true);
  });

  test('does NOT block RFC 1918 boundaries', () => {
    // 172.15.x.x and 172.32.x.x are public
    assert.equal(isPrivateIP('172.15.0.1'), false);
    assert.equal(isPrivateIP('172.32.0.1'), false);
    // 100.63.x.x and 100.128.x.x are public (CGNAT is 100.64-127)
    assert.equal(isPrivateIP('100.63.0.1'), false);
    assert.equal(isPrivateIP('100.128.0.1'), false);
  });

  test('allows public IPs', () => {
    assert.equal(isPrivateIP('8.8.8.8'), false);
    assert.equal(isPrivateIP('1.1.1.1'), false);
    assert.equal(isPrivateIP('151.101.0.1'), false); // Fastly
    assert.equal(isPrivateIP('142.250.190.78'), false); // Google
  });
});

describe('isPrivateIP — IPv6', () => {
  test('blocks IPv6 loopback and unspecified', () => {
    assert.equal(isPrivateIP('::1'), true);
    assert.equal(isPrivateIP('::'), true);
  });

  test('blocks IPv6 unique local (fc00::/7)', () => {
    assert.equal(isPrivateIP('fc00::1'), true);
    assert.equal(isPrivateIP('fd00::1'), true);
  });

  test('blocks IPv6 link-local (fe80::/10)', () => {
    assert.equal(isPrivateIP('fe80::1'), true);
  });

  test('blocks IPv4-mapped IPv6 representation of private addresses', () => {
    assert.equal(isPrivateIP('::ffff:10.0.0.1'), true);
    assert.equal(isPrivateIP('::ffff:127.0.0.1'), true);
    assert.equal(isPrivateIP('::ffff:169.254.169.254'), true);
  });

  test('allows IPv4-mapped public addresses', () => {
    assert.equal(isPrivateIP('::ffff:8.8.8.8'), false);
  });
});

describe('http-fetch constants', () => {
  test('MAX_REDIRECTS is a small positive integer', () => {
    assert.equal(typeof MAX_REDIRECTS, 'number');
    assert.ok(MAX_REDIRECTS >= 1 && MAX_REDIRECTS <= 10);
  });

  test('MAX_RESPONSE_BYTES is reasonable (1KB - 50MB)', () => {
    assert.equal(typeof MAX_RESPONSE_BYTES, 'number');
    assert.ok(MAX_RESPONSE_BYTES >= 1024 && MAX_RESPONSE_BYTES <= 50 * 1024 * 1024);
  });
});
