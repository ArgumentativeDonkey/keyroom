//this function generates a unique hash for a given string input. it's used to encode passwords.
//we realize that this is not the most secure method of hashing, but it serves our purposes for this project.
//keyroom and it's instances are not intended to ever reach a point at which high security is necessary.
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