import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyAnalyticsDocument, buildAnalyticsDocumentUpdate, isFirestoreIndexEntryError } from './analytics-logic.mjs';

test('buildAnalyticsDocumentUpdate writes compact analytics without visitors payload', () => {
  const base = createEmptyAnalyticsDocument();
  const next = buildAnalyticsDocumentUpdate(base, {
    visitorId: 'visitor-1',
    now: new Date('2026-07-31T10:15:00.000Z'),
    source: 'alt5',
    action: 'visit'
  });

  assert.equal(next.visitors, undefined);
  assert.equal(next.legacyPayload, undefined);
  assert.equal(next.totals.alt5Visits, 1);
  assert.equal(next.totals.alt5Links, 1);
  assert.equal(next.buckets['2026-07-31']['07'].alt5Visits, 1);
  assert.equal(next.buckets['2026-07-31']['07'].alt5Links, 1);
});

test('isFirestoreIndexEntryError recognizes Firestore index-entry failures', () => {
  assert.equal(isFirestoreIndexEntryError(new Error('too many index entries for entity /analytics/landing')), true);
  assert.equal(isFirestoreIndexEntryError({ message: 'The operation failed because there are too many index entries' }), true);
  assert.equal(isFirestoreIndexEntryError(new Error('permission denied')), false);
});
