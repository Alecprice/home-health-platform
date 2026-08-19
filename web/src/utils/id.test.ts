import { describe, expect, it } from 'vitest';
import { createUuid } from './id';

describe('createUuid', () => {
  it('creates distinct RFC4122 v4-shaped ids', () => {
    const a = createUuid();
    const b = createUuid();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
