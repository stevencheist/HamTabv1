// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// N2YO response checking (pure, no I/O).

// N2YO reports failures (bad key, rate limit, unknown satellite) as HTTP 200 with a body like
// {"error":"Invalid API Key!"}. Treat that as an error so it isn't cached as an empty success.
class N2yoError extends Error {}

const N2YO_ERROR_MAX_LEN = 200; // chars — keep upstream text short in logs and responses

function checkN2yoResponse(data) {
  if (!data || typeof data !== 'object') throw new N2yoError('N2YO returned an empty response');
  if (data.error) {
    throw new N2yoError(`N2YO: ${String(data.error).slice(0, N2YO_ERROR_MAX_LEN)}`);
  }
  return data;
}

module.exports = { N2yoError, checkN2yoResponse };
