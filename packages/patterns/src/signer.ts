import { createHmac } from 'node:crypto';
import type { PatternPack } from './types.js';

function canonicalize(pack: PatternPack): string {
  const { signature, ...rest } = pack;
  const keys = Object.keys(rest).sort();
  const obj: Record<string, unknown> = {};
  for (const key of keys) {
    obj[key] = (rest as Record<string, unknown>)[key];
  }
  return JSON.stringify(obj);
}

export class PatternSigner {
  sign(pack: PatternPack, secret: string): string {
    const data = canonicalize(pack);
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  verify(pack: PatternPack, secret: string): boolean {
    if (!pack.signature) return false;
    return this.sign(pack, secret) === pack.signature;
  }
}
