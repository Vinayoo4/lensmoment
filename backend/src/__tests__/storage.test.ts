import { describe, it, expect } from 'vitest';
import { writeJson, readJson, appendJson, updateJson } from '../storage/index.js';

describe('Storage', () => {
  it('exports needed functions', () => {
    expect(writeJson).toBeDefined();
    expect(readJson).toBeDefined();
    expect(appendJson).toBeDefined();
    expect(updateJson).toBeDefined();
  });
});
