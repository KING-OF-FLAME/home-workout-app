/**
 * Turns trainer plans and student progress into text that fits in QR codes
 * or a small file, and back. Pure functions (no native modules), so
 * `npm run validate-data` can test them.
 *
 * Text form:  FH1.<base64url of deflated JSON>
 * QR parts:   FHQ1~<id>~<part>~<total>~<slice of the text form>
 */
import { deflate, inflate } from 'pako';

const PREFIX = 'FH1.';
const QR_PREFIX = 'FHQ1';
/** Characters of the text form per QR code. Small enough to scan off a phone screen. */
export const QR_PART_SIZE = 650;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toB64url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64[n & 63];
  }
  return out;
}

function fromB64url(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9\-_]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const v = [0, 1, 2, 3].map((k) => (i + k < clean.length ? B64.indexOf(clean[i + k]) : 0));
    if (v.some((x) => x < 0)) throw new Error('bad text');
    const n = (v[0] << 18) | (v[1] << 12) | (v[2] << 6) | v[3];
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < clean.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
function fromUtf8(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

/** Packet → compact text. */
export function encodePacket(packet: unknown): string {
  return PREFIX + toB64url(deflate(utf8(JSON.stringify(packet)), { level: 9 }));
}

/** Compact text, or a plain JSON file, → packet. Throws on anything else. */
export function decodePacket<T = unknown>(text: string): T {
  const t = text.trim();
  if (t.startsWith(PREFIX)) return JSON.parse(fromUtf8(inflate(fromB64url(t.slice(PREFIX.length))))) as T;
  if (t.startsWith('{')) return JSON.parse(t) as T;
  throw new Error('This is not a FitHome code or file.');
}

/** Split the text form into QR parts. One part when it fits. */
export function toQrParts(text: string, size = QR_PART_SIZE): string[] {
  const id = Math.random().toString(36).slice(2, 8);
  const total = Math.max(1, Math.ceil(text.length / size));
  return Array.from({ length: total }, (_, i) => `${QR_PREFIX}~${id}~${i + 1}~${total}~${text.slice(i * size, (i + 1) * size)}`);
}

/** Collects scanned QR parts until the whole packet is in. */
export class QrCollector {
  private id: string | null = null;
  private parts = new Map<number, string>();
  total = 0;

  get have() {
    return this.parts.size;
  }

  /** Feed one scanned code. Returns the full text once every part is in, else null. */
  add(raw: string): string | null {
    const s = raw.trim();
    if (s.startsWith(PREFIX)) return s;
    const m = /^FHQ1~([a-z0-9]+)~(\d+)~(\d+)~([\s\S]*)$/.exec(s);
    if (!m) throw new Error('This QR code is not from FitHome.');
    const [, id, part, total, data] = m;
    if (id !== this.id) {
      // A new set of codes (for example the trainer reopened the screen): start over.
      this.id = id;
      this.parts.clear();
      this.total = Number(total);
    }
    this.parts.set(Number(part), data);
    if (this.parts.size < this.total) return null;
    return Array.from({ length: this.total }, (_, i) => this.parts.get(i + 1) ?? '').join('');
  }
}
