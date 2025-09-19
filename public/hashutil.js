export function hasher(input) {
  const base = 3498;
  let hash = base;
  let i = 0;
  for (const char of input) {
    hash = (hash >> ((char.charCodeAt(0) * i) / 10000));
    hash += char.charCodeAt(0) * Math.sqrt(i + char.charCodeAt(0));
    i++;
  }
  hash = Math.round(hash * 1000) / 1000;
  return hash;
}