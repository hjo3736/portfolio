const encoder = new TextEncoder();
export const ITERATIONS = 100000;
const hex = bytes => [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
export function newSalt() { return hex(crypto.getRandomValues(new Uint8Array(32))); }
export async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: ITERATIONS }, key, 256);
  return hex(new Uint8Array(bits));
}
export async function verifyPassword(password, salt, expected) {
  const actual = await hashPassword(password, salt);
  let difference = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ (expected.charCodeAt(i) || 0);
  return difference === 0;
}
export async function digest(value) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))); }
