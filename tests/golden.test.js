import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';

describe('Golden file regression test', () => {
  let extractedHtml;
  let expectedText;

  beforeAll(() => {
    const scriptContent = readFileSync(resolve(__dirname, '..', 'popup.js'), 'utf-8');
    const fixtureHtml = readFileSync(resolve(__dirname, '..', 'test_fixture.html'), 'utf-8');
    const dom = new JSDOM(fixtureHtml, { runScripts: 'outside-only', url: 'http://localhost' });
    dom.window.eval(scriptContent);
    extractedHtml = dom.window.extractContent('all');
    expectedText = readFileSync(resolve(__dirname, '..', 'extracted_test.txt'), 'utf-8');
  });

  function getTokens(text) {
    return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4));
  }

  it('extraction produces non-empty output', () => {
    expect(extractedHtml).toBeTruthy();
    expect(extractedHtml.length).toBeGreaterThan(100);
  });

  it('extraction tokens overlap with expected', () => {
    const actualTokens = getTokens(extractedHtml);
    const expectedTokens = getTokens(expectedText);
    let matchCount = 0;
    for (const token of actualTokens) { if (expectedTokens.has(token)) matchCount++; }
    expect(matchCount / actualTokens.size).toBeGreaterThanOrEqual(0.6);
  });

  it('extraction captures key content strings', () => {
    const keys = ['PageSpeed Insights', 'Analyze', 'Mobile', 'Desktop'];
    let m = 0;
    for (const s of keys) { if (extractedHtml.includes(s)) m++; }
    expect(m / keys.length).toBeGreaterThanOrEqual(0.9);
  });
});
