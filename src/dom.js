const cache = {};

export function $(id) {
  if (!cache[id]) cache[id] = document.getElementById(id);
  return cache[id];
}
