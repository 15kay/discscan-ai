import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify, sastDate } from '../dist/expiry.mjs';

test('classifies the expiry day and 30-day threshold inclusively', () => {
  const today = '2026-11-26';
  for (const [expiry, expected] of [
    ['2026-11-25', 'expired'], ['2026-11-26', 'expiring'],
    ['2026-12-26', 'expiring'], ['2026-12-27', 'valid'],
  ]) assert.equal(classify('EXPIRY DATE\n' + expiry, today).status, expected);
});

test('routes missing, impossible and conflicting dates to review', () => {
  for (const text of ['2026-12-10', 'EXPIRY DATE 2026-02-30', 'EXPIRY 2026-12-10\nEXPIRY 2027-01-10',
    'EXPIRY 2026-12-10 and 2027-01-10', 'EXPIRY\nMISSING\n2026-12-10']) {
    assert.deepEqual(classify(text), { status: 'review' });
  }
  assert.equal(classify('VERVALDATUM 10/12/2026').expiry, '2026-12-10');
});

test('switches the date at midnight South African time', () => {
  assert.equal(sastDate(new Date('2026-11-25T22:00:00Z')), '2026-11-26');
});
