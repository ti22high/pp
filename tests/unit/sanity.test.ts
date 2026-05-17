import { describe, it, expect } from 'vitest';

// Sanity-тест: проверяет, что vitest вообще запускается на ts-коде.
// Реальные тесты модели/snap/undo появятся в Phase 2.
describe('vitest harness', () => {
  it('runs basic assertions', () => {
    expect(1 + 1).toBe(2);
  });
});
