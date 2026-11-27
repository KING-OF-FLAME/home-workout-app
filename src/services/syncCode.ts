/** Sharing codes for phone-to-phone sync (pure functions, tested by validate-data). */

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** 4 IP bytes + 2 PIN bytes, as 10 easy-to-type characters, e.g. "K7Q2M-9XA3F". */
export function makeCode(ip: string, pin: number): string {
  const bytes = [...ip.split('.').map((n) => Number(n) & 255), (pin >> 8) & 255, pin & 255];
  let bits = 0n;
  for (const b of bytes) bits = (bits << 8n) | BigInt(b);
  let out = '';
  for (let i = 0; i < 10; i++) {
    out = ALPHABET[Number(bits & 31n)] + out;
    bits >>= 5n;
  }
  return `${out.slice(0, 5)}-${out.slice(5)}`;
}

export function readCode(raw: string): { ip: string; pin: number } | null {
  const s = raw.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/I/g, '1');
  if (s.length !== 10) return null;
  let bits = 0n;
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    bits = (bits << 5n) | BigInt(v);
  }
  const bytes: number[] = [];
  for (let i = 0; i < 6; i++) {
    bytes.unshift(Number(bits & 255n));
    bits >>= 8n;
  }
  return { ip: bytes.slice(0, 4).join('.'), pin: (bytes[4] << 8) | bytes[5] };
}

