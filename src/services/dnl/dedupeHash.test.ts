import assert from 'node:assert/strict';
import { generateDedupeHash } from './deduplicator';

/**
 * Unit tests for generateDedupeHash.
 *
 * Run with: npm run test-dedupe   (tsx src/services/dnl/dedupeHash.test.ts)
 *
 * These tests lock in the behavior required by issue #582: the hash must be
 * deterministic (no timestamps) so identical opportunities dedupe correctly.
 */

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`      ${err.message}`);
  }
}

console.log('generateDedupeHash');

const base = {
  source: 'Devpost',
  url: 'https://spaceapps.devpost.com/',
  title: 'NASA Space Apps Challenge 2026',
  company: 'NASA',
};

test('identical inputs produce identical hashes', () => {
  assert.equal(generateDedupeHash(base), generateDedupeHash({ ...base }));
});

test('hash is stable across repeated calls over time (no timestamp)', () => {
  const first = generateDedupeHash(base);
  // Simulate the passage of time; a timestamp-based hash would change here.
  const busyUntil = Date.now() + 5;
  while (Date.now() < busyUntil) { /* spin */ }
  const second = generateDedupeHash(base);
  assert.equal(first, second);
});

test('produces a 64-char hex sha256 digest', () => {
  assert.match(generateDedupeHash(base), /^[a-f0-9]{64}$/);
});

test('normalizes case and whitespace to the same hash', () => {
  const variant = {
    source: '  DEVPOST ',
    url: 'https://spaceapps.devpost.com/',
    title: 'NASA   Space Apps   Challenge 2026',
    company: 'nasa',
  };
  assert.equal(generateDedupeHash(base), generateDedupeHash(variant));
});

test('different title produces a different hash', () => {
  assert.notEqual(generateDedupeHash(base), generateDedupeHash({ ...base, title: 'MIT Reality Hack' }));
});

test('different source produces a different hash', () => {
  assert.notEqual(generateDedupeHash(base), generateDedupeHash({ ...base, source: 'Internshala' }));
});

test('different url produces a different hash', () => {
  assert.notEqual(generateDedupeHash(base), generateDedupeHash({ ...base, url: 'https://example.com/other' }));
});

test('externalId, when present, differentiates otherwise-identical items', () => {
  const withId = { ...base, externalId: 'job-123' };
  const withOtherId = { ...base, externalId: 'job-456' };
  assert.notEqual(generateDedupeHash(withId), generateDedupeHash(withOtherId));
  // ...but stays deterministic for the same id.
  assert.equal(generateDedupeHash(withId), generateDedupeHash({ ...base, externalId: 'job-123' }));
});

test('delimiter prevents field-boundary collisions', () => {
  const a = { source: 's', url: 'ab', title: 'c', company: 'd' };
  const b = { source: 's', url: 'a', title: 'bc', company: 'd' };
  assert.notEqual(generateDedupeHash(a), generateDedupeHash(b));
});

test('missing/undefined fields are handled without throwing', () => {
  const partial = { source: 'Devpost', url: '', title: 'Only Title', company: '' } as any;
  assert.match(generateDedupeHash(partial), /^[a-f0-9]{64}$/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
