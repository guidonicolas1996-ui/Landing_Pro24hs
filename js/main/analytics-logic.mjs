function createEmptyTotals() {
  return {
    uniqueVisitors: 0,
    totalVisits: 0,
    primaryLinks: 0,
    primaryVisits: 0,
    primaryWhatsappClicks: 0,
    primaryWhatsappClicksTotal: 0,
    alt1Links: 0,
    alt2Links: 0,
    alt3Links: 0,
    alt4Links: 0,
    alt5Links: 0,
    alt1Visits: 0,
    alt2Visits: 0,
    alt3Visits: 0,
    alt4Visits: 0,
    alt5Visits: 0,
    alt1WhatsappClicks: 0,
    alt2WhatsappClicks: 0,
    alt3WhatsappClicks: 0,
    alt4WhatsappClicks: 0,
    alt5WhatsappClicks: 0,
    alt1WhatsappClicksTotal: 0,
    alt2WhatsappClicksTotal: 0,
    alt3WhatsappClicksTotal: 0,
    alt4WhatsappClicksTotal: 0,
    alt5WhatsappClicksTotal: 0,
    whatsappClicks: 0,
    whatsappClicksTotal: 0
  };
}

function createEmptyBucket() {
  return {
    uniqueVisitors: 0,
    totalVisits: 0,
    primaryLinks: 0,
    primaryVisits: 0,
    primaryWhatsappClicks: 0,
    primaryWhatsappClicksTotal: 0,
    alt1Links: 0,
    alt2Links: 0,
    alt3Links: 0,
    alt4Links: 0,
    alt5Links: 0,
    alt1Visits: 0,
    alt2Visits: 0,
    alt3Visits: 0,
    alt4Visits: 0,
    alt5Visits: 0,
    alt1WhatsappClicks: 0,
    alt2WhatsappClicks: 0,
    alt3WhatsappClicks: 0,
    alt4WhatsappClicks: 0,
    alt5WhatsappClicks: 0,
    alt1WhatsappClicksTotal: 0,
    alt2WhatsappClicksTotal: 0,
    alt3WhatsappClicksTotal: 0,
    alt4WhatsappClicksTotal: 0,
    alt5WhatsappClicksTotal: 0,
    whatsappClicks: 0,
    whatsappClicksTotal: 0
  };
}

function cloneTotals(source = {}) {
  const totals = createEmptyTotals();
  Object.keys(totals).forEach((key) => {
    if (source[key] != null) {
      totals[key] = source[key];
    }
  });
  return totals;
}

function cloneBucket(source = {}) {
  const bucket = createEmptyBucket();
  Object.keys(bucket).forEach((key) => {
    if (source[key] != null) {
      bucket[key] = source[key];
    }
  });
  return bucket;
}

function getSeenVisitorStorageKey() {
  return 'futurevip:analytics:seenVisitors';
}

function getSeenWhatsappStorageKey() {
  return 'futurevip:analytics:seenWhatsappVisitors';
}

function readStoredVisitorIds(storageKey) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (error) {
    return [];
  }
}

function writeStoredVisitorIds(storageKey, visitorIds) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(visitorIds));
  } catch (error) {
    // ignore storage failures
  }
}

function isFirstVisitForVisitor(visitorId) {
  const normalizedVisitorId = String(visitorId || '').trim();
  if (!normalizedVisitorId) {
    return true;
  }

  const seenVisitors = readStoredVisitorIds(getSeenVisitorStorageKey());
  if (seenVisitors.includes(normalizedVisitorId)) {
    return false;
  }

  const nextSeenVisitors = [...seenVisitors, normalizedVisitorId];
  writeStoredVisitorIds(getSeenVisitorStorageKey(), nextSeenVisitors.slice(-200));
  return true;
}

function hasClickedWhatsappForVisitor(visitorId) {
  const normalizedVisitorId = String(visitorId || '').trim();
  if (!normalizedVisitorId) {
    return false;
  }

  const clickedVisitors = readStoredVisitorIds(getSeenWhatsappStorageKey());
  return clickedVisitors.includes(normalizedVisitorId);
}

function markWhatsappClickedForVisitor(visitorId) {
  const normalizedVisitorId = String(visitorId || '').trim();
  if (!normalizedVisitorId) {
    return;
  }

  const clickedVisitors = readStoredVisitorIds(getSeenWhatsappStorageKey());
  if (clickedVisitors.includes(normalizedVisitorId)) {
    return;
  }

  const nextClickedVisitors = [...clickedVisitors, normalizedVisitorId];
  writeStoredVisitorIds(getSeenWhatsappStorageKey(), nextClickedVisitors.slice(-200));
}

function normalizeSource(rawSource) {
  const source = String(rawSource ?? '').trim().toLowerCase();
  if (!source || source === 'primary' || source === 'main' || source === 'principal') {
    return 'primary';
  }

  const altMatch = source.match(/^alt(?:[_-]?([1-5]))?$/);
  if (altMatch) {
    return altMatch[1] ? `alt${altMatch[1]}` : 'alt1';
  }

  return 'primary';
}

function getMetricsForSource(source) {
  const normalizedSource = normalizeSource(source);
  const sourceMap = {
    primary: {
      linkField: 'primaryLinks',
      visitField: 'primaryVisits',
      whatsappField: 'primaryWhatsappClicks',
      whatsappTotalField: 'primaryWhatsappClicksTotal'
    },
    alt1: {
      linkField: 'alt1Links',
      visitField: 'alt1Visits',
      whatsappField: 'alt1WhatsappClicks',
      whatsappTotalField: 'alt1WhatsappClicksTotal'
    },
    alt2: {
      linkField: 'alt2Links',
      visitField: 'alt2Visits',
      whatsappField: 'alt2WhatsappClicks',
      whatsappTotalField: 'alt2WhatsappClicksTotal'
    },
    alt3: {
      linkField: 'alt3Links',
      visitField: 'alt3Visits',
      whatsappField: 'alt3WhatsappClicks',
      whatsappTotalField: 'alt3WhatsappClicksTotal'
    },
    alt4: {
      linkField: 'alt4Links',
      visitField: 'alt4Visits',
      whatsappField: 'alt4WhatsappClicks',
      whatsappTotalField: 'alt4WhatsappClicksTotal'
    },
    alt5: {
      linkField: 'alt5Links',
      visitField: 'alt5Visits',
      whatsappField: 'alt5WhatsappClicks',
      whatsappTotalField: 'alt5WhatsappClicksTotal'
    }
  };

  return sourceMap[normalizedSource] || sourceMap.primary;
}

export function createEmptyAnalyticsDocument() {
  return {
    totals: createEmptyTotals(),
    buckets: {}
  };
}

export function isFirestoreIndexEntryError(error) {
  const message = [error?.message, error?.code, error?.toString?.()].filter(Boolean).join(' ');
  return /too many index entries/i.test(message) || /index entries/i.test(message);
}

export function normalizeAnalyticsDocument(data) {
  const source = data && typeof data === 'object' ? data : {};
  const normalized = createEmptyAnalyticsDocument();
  normalized.totals = cloneTotals(source.totals || {});
  normalized.buckets = source.buckets && typeof source.buckets === 'object' ? source.buckets : {};
  return normalized;
}

export function buildAnalyticsDocumentUpdate(currentDocument, { visitorId, now, source, action }) {
  const normalizedDoc = normalizeAnalyticsDocument(currentDocument);
  const totals = cloneTotals(normalizedDoc.totals);
  const buckets = { ...(normalizedDoc.buckets || {}) };
  const resolvedSource = normalizeSource(source);
  const metrics = getMetricsForSource(resolvedSource);

  const eventDate = new Date(now);
  const dateKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
  const hourKey = String(eventDate.getHours()).padStart(2, '0');

  const bucketDay = buckets[dateKey] && typeof buckets[dateKey] === 'object' ? buckets[dateKey] : {};
  const currentBucket = bucketDay[hourKey] && typeof bucketDay[hourKey] === 'object'
    ? cloneBucket(bucketDay[hourKey])
    : createEmptyBucket();

  const isFirstVisit = isFirstVisitForVisitor(visitorId);
  const isFirstWhatsappClick = action === 'whatsapp_click' && !hasClickedWhatsappForVisitor(visitorId);

  totals.totalVisits += 1;
  totals[metrics.visitField] += 1;
  if (isFirstVisit) {
    totals.uniqueVisitors += 1;
    totals[metrics.linkField] += 1;
  }

  currentBucket.totalVisits += 1;
  currentBucket[metrics.visitField] += 1;
  if (isFirstVisit) {
    currentBucket.uniqueVisitors += 1;
    currentBucket[metrics.linkField] += 1;
  }

  if (action === 'whatsapp_click') {
    totals.whatsappClicksTotal += 1;
    totals[metrics.whatsappTotalField] += 1;
    if (isFirstWhatsappClick) {
      totals.whatsappClicks += 1;
      totals[metrics.whatsappField] += 1;
    }

    currentBucket.whatsappClicksTotal += 1;
    currentBucket[metrics.whatsappTotalField] += 1;
    if (isFirstWhatsappClick) {
      currentBucket.whatsappClicks += 1;
      currentBucket[metrics.whatsappField] += 1;
    }
  }

  bucketDay[hourKey] = currentBucket;
  buckets[dateKey] = bucketDay;

  if (action === 'whatsapp_click' && isFirstWhatsappClick) {
    markWhatsappClickedForVisitor(visitorId);
  }

  return {
    totals,
    buckets
  };
}
