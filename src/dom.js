// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

const cache = {};

export function $(id) {
  if (!cache[id]) cache[id] = document.getElementById(id);
  return cache[id];
}
