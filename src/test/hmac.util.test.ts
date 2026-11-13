import { describe, expect, it } from 'vitest';
import { hmacSha256Hex } from '../api/utils/hmac.util.ts';

describe('hmacSha256Hex', () => {
  it('coincide con el vector de prueba de RFC 4231 (caso 2)', async () => {
    const signature = await hmacSha256Hex('Jefe', 'what do ya want for nothing?');

    expect(signature).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });
});
