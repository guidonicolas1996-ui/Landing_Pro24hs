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
    visitors: {},
    buckets: {}
  };
}

export function normalizeAnalyticsDocument(data) {
  const source = data && typeof data === 'object' ? data : {};
  const normalized = createEmptyAnalyticsDocument();
  normalized.totals = cloneTotals(source.totals || {});
  normalized.visitors = source.visitors && typeof source.visitors === 'object' ? source.visitors : {};
  normalized.buckets = source.buckets && typeof source.buckets === 'object' ? source.buckets : {};
  return normalized;
}

export function buildAnalyticsDocumentUpdate(currentDocument, { visitorId, now, source, action }) {
  const normalizedDoc = normalizeAnalyticsDocument(currentDocument);
  const totals = cloneTotals(normalizedDoc.totals);
  const visitors = { ...(normalizedDoc.visitors || {}) };
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

  const existingVisitor = visitors[visitorId] && typeof visitors[visitorId] === 'object' ? visitors[visitorId] : null;
  const isFirstVisit = !existingVisitor || (existingVisitor.visits || 0) === 0;
  const isFirstWhatsappClick = action === 'whatsapp_click' && !existingVisitor?.hasClickedWhatsapp;

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

  const visitorRecord = {
    ...(existingVisitor || {}),
    firstSeen: existingVisitor?.firstSeen || eventDate.toISOString(),
    lastSeen: eventDate.toISOString(),
    visits: (existingVisitor?.visits || 0) + 1,
    lastSource: resolvedSource,
    hasClickedWhatsapp: Boolean(existingVisitor?.hasClickedWhatsapp || action === 'whatsapp_click' && !isFirstWhatsappClick ? true : existingVisitor?.hasClickedWhatsapp)
  };

  if (action === 'whatsapp_click') {
    visitorRecord.whatsappClicks = (existingVisitor?.whatsappClicks || 0) + 1;
    visitorRecord.lastWhatsappClickAt = eventDate.toISOString();
    visitorRecord.hasClickedWhatsapp = true;
  }

  visitors[visitorId] = visitorRecord;

  return {
    totals,
    visitors,
    buckets,
    legacyPayload: {
      [visitorId]: {
        visitedAt: action === 'visit' ? eventDate.toISOString() : existingVisitor?.firstSeen || eventDate.toISOString(),
        lastVisitedAt: eventDate.toISOString(),
        lastWhatsappClickAt: action === 'whatsapp_click' ? eventDate.toISOString() : existingVisitor?.lastWhatsappClickAt || null,
        source: resolvedSource,
        visitCount: visitorRecord.visits,
        whatsappClickCount: visitorRecord.whatsappClicks || 0,
        hasClickedWhatsapp: visitorRecord.hasClickedWhatsapp || false
      }
    }
  };
}
