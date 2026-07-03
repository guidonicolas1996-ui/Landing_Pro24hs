import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const rangeSelect = document.getElementById('analytics-range-select');
const detailSelect = document.getElementById('analytics-detail-select');
const metricSelect = document.getElementById('analytics-metric-select');
const startInput = document.getElementById('analytics-start');
const endInput = document.getElementById('analytics-end');
const refreshButton = document.getElementById('analytics-refresh');
const messageElement = document.getElementById('analytics-message');
const breakdownElement = document.getElementById('analytics-breakdown');
const breakdownTitle = document.getElementById('analytics-breakdown-title');
const chartCanvas = document.getElementById('analytics-chart');
const chartContext = chartCanvas ? chartCanvas.getContext('2d') : null;

const DETAIL_LABELS = {
  hour: 'Detalle por hora',
  shift: 'Detalle por turno',
  day: 'Detalle por día',
  week: 'Detalle por semana',
  month: 'Detalle por mes'
};

function toLocalDateTimeString(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function createRange(preset) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (preset) {
    case 'week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Esta semana' };
    }
    case 'month': {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Este mes' };
    }
    case 'year': {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Este año' };
    }
    case 'all': {
      start.setTime(0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Todo el tiempo' };
    }
    default: {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Hoy' };
    }
  }
}

function setInputsForRange(preset) {
  const range = createRange(preset);
  startInput.value = toLocalDateTimeString(range.start);
  endInput.value = toLocalDateTimeString(range.end);
  messageElement.textContent = `Mostrando datos para: ${range.label}`;
}

function parseRangeInputs() {
  const start = new Date(startInput.value);
  const end = new Date(endInput.value);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    throw new Error('Rango de fecha/hora inválido');
  }
  return { start, end };
}

function collectBuckets(buckets, rangeStart, rangeEnd) {
  const items = [];
  const totals = {
    uniqueVisitors: 0,
    totalVisits: 0,
    primaryLinks: 0,
    alternativeLinks: 0,
    whatsappClicks: 0
  };

  for (const dateKey of Object.keys(buckets)) {
    const dayBuckets = buckets[dateKey] || {};
    for (const hourKey of Object.keys(dayBuckets)) {
      const bucket = dayBuckets[hourKey];
      const bucketStart = new Date(`${dateKey}T${hourKey}:00:00`);
      const bucketEnd = new Date(bucketStart.getTime() + 3599999);
      if (bucketEnd < rangeStart || bucketStart > rangeEnd) {
        continue;
      }

      totals.uniqueVisitors += bucket.uniqueVisitors || 0;
      totals.totalVisits += bucket.totalVisits || 0;
      totals.primaryLinks += bucket.primaryLinks || 0;
      totals.alternativeLinks += bucket.alternativeLinks || 0;
      totals.whatsappClicks += bucket.whatsappClicks || 0;
      items.push({
        label: `${dateKey} ${hourKey}:00`,
        ...bucket
      });
    }
  }

  items.sort((a, b) => a.label.localeCompare(b.label));
  return { totals, items };
}

function countUniqueVisitors(visitors, rangeStart, rangeEnd) {
  return Object.values(visitors).filter((visitor) => {
    const firstSeen = visitor.firstSeen ? new Date(visitor.firstSeen) : null;
    const lastSeen = visitor.lastSeen ? new Date(visitor.lastSeen) : null;
    if (!firstSeen || !lastSeen) {
      return false;
    }
    return firstSeen <= rangeEnd && lastSeen >= rangeStart;
  }).length;
}

function groupKey(item, mode) {
  const [dateKey, hourPart] = item.label.split(' ');
  const hour = Number(hourPart.split(':')[0]);
  const date = new Date(`${dateKey}T00:00:00`);

  if (mode === 'hour') {
    return { key: item.label, label: item.label, sort: item.label };
  }

  if (mode === 'shift') {
    const shiftIndex = hour < 8 ? 0 : hour < 16 ? 1 : 2;
    const shiftLabel = shiftIndex === 0 ? 'Noche' : shiftIndex === 1 ? 'Mañana' : 'Tarde';
    const label = `${dateKey} ${shiftLabel}`;
    return { key: `${dateKey}-${shiftIndex}`, label, sort: `${dateKey}-${shiftIndex}` };
  }

  if (mode === 'day') {
    return { key: dateKey, label: dateKey, sort: dateKey };
  }

  if (mode === 'week') {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + diff);
    const weekLabel = weekStart.toISOString().slice(0, 10);
    return { key: `week-${weekLabel}`, label: `Semana de ${weekLabel}`, sort: `week-${weekLabel}` };
  }

  if (mode === 'month') {
    const monthLabel = `${dateKey.slice(0, 7)}`;
    return { key: monthLabel, label: monthLabel, sort: monthLabel };
  }

  return { key: item.label, label: item.label, sort: item.label };
}

function aggregateItems(items, mode) {
  const grouped = {};

  items.forEach((item) => {
    const group = groupKey(item, mode);
    if (!grouped[group.key]) {
      grouped[group.key] = {
        label: group.label,
        uniqueVisitors: 0,
        totalVisits: 0,
        primaryLinks: 0,
        alternativeLinks: 0,
        whatsappClicks: 0,
        sort: group.sort
      };
    }

    grouped[group.key].uniqueVisitors += item.uniqueVisitors || 0;
    grouped[group.key].totalVisits += item.totalVisits || 0;
    grouped[group.key].primaryLinks += item.primaryLinks || 0;
    grouped[group.key].alternativeLinks += item.alternativeLinks || 0;
    grouped[group.key].whatsappClicks += item.whatsappClicks || 0;
  });

  return Object.values(grouped).sort((a, b) => a.sort.localeCompare(b.sort));
}

function setChartSize() {
  if (!chartCanvas || !chartContext) {
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const styleWidth = chartCanvas.clientWidth;
  const styleHeight = chartCanvas.clientHeight;
  chartCanvas.width = styleWidth * dpr;
  chartCanvas.height = styleHeight * dpr;
  chartContext.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getMetricValue(item, metric) {
  return item[metric] || 0;
}

function renderChart(items, metric) {
  if (!chartContext || !chartCanvas) {
    return;
  }

  setChartSize();
  const values = items.map((item) => getMetricValue(item, metric));
  const labels = items.map((item) => item.label);
  const width = chartCanvas.width / (window.devicePixelRatio || 1);
  const height = chartCanvas.height / (window.devicePixelRatio || 1);
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxValue = Math.max(...values, 1);
  const barWidth = Math.max(20, chartWidth / Math.max(values.length, 1) - 10);

  chartContext.clearRect(0, 0, width, height);
  chartContext.fillStyle = 'rgba(255,255,255,0.08)';
  chartContext.fillRect(0, 0, width, height);

  chartContext.strokeStyle = 'rgba(255,255,255,0.12)';
  chartContext.lineWidth = 1;
  chartContext.beginPath();
  chartContext.moveTo(padding, padding);
  chartContext.lineTo(padding, height - padding);
  chartContext.lineTo(width - padding, height - padding);
  chartContext.stroke();

  values.forEach((value, index) => {
    const x = padding + index * (barWidth + 10) + 10;
    const barHeight = (value / maxValue) * (chartHeight - 20);
    const y = height - padding - barHeight;

    chartContext.fillStyle = 'rgba(125, 108, 255, 0.85)';
    chartContext.fillRect(x, y, barWidth, barHeight);

    chartContext.fillStyle = '#ffffff';
    chartContext.font = '12px Inter, system-ui, sans-serif';
    chartContext.textAlign = 'center';
    chartContext.fillText(value.toString(), x + barWidth / 2, y - 8);
  });

  chartContext.fillStyle = 'rgba(255,255,255,0.75)';
  chartContext.font = '12px Inter, system-ui, sans-serif';
  chartContext.textAlign = 'center';

  labels.forEach((label, index) => {
    if (index % Math.ceil(Math.max(labels.length / 8, 1)) !== 0) {
      return;
    }
    const x = padding + index * (barWidth + 10) + 10 + barWidth / 2;
    chartContext.save();
    chartContext.translate(x, height - padding + 18);
    chartContext.rotate(-Math.PI / 4);
    chartContext.fillText(label, 0, 0);
    chartContext.restore();
  });
}

function renderBreakdown(items) {
  if (!items.length) {
    breakdownElement.innerHTML = '<p>No hay datos en este rango.</p>';
    return;
  }

  const rows = items.map((item) => `
          <tr>
            <td>${item.label}</td>
            <td>${item.uniqueVisitors || 0}</td>
            <td>${item.totalVisits || 0}</td>
            <td>${item.primaryLinks || 0}</td>
            <td>${item.alternativeLinks || 0}</td>
            <td>${item.whatsappClicks || 0}</td>
          </tr>
        `).join('');

  breakdownElement.innerHTML = `
          <div class="analytics-breakdown-scroll">
            <table>
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Únicas</th>
                  <th>Visitas</th>
                  <th>Principal</th>
                  <th>Alternativa</th>
                  <th>WhatsApp</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
}

function displayTotals(totals, visitorCount) {
  document.getElementById('analytics-unique').textContent = visitorCount;
  document.getElementById('analytics-total').textContent = totals.totalVisits || 0;
  document.getElementById('analytics-primary').textContent = totals.primaryLinks || 0;
  document.getElementById('analytics-alternative').textContent = totals.alternativeLinks || 0;
  document.getElementById('analytics-whatsapp').textContent = totals.whatsappClicks || 0;
}

const METRIC_LABELS = {
  totalVisits: 'Visitas totales',
  uniqueVisitors: 'Visitas únicas',
  whatsappClicks: 'Clicks WhatsApp',
  primaryLinks: 'Link principal',
  alternativeLinks: 'Link alternativo'
};

async function loadAnalytics() {
  try {
    const ref = doc(db, 'analytics', 'landing');
    const snapshot = await getDoc(ref);
    const range = parseRangeInputs();
    const detailMode = detailSelect.value || 'hour';
    const metric = metricSelect.value || 'totalVisits';
    breakdownTitle.textContent = DETAIL_LABELS[detailMode] || DETAIL_LABELS.hour;

    if (!snapshot.exists()) {
      document.getElementById('analytics-content').innerHTML = '<p>No se encontraron datos de analytics aún.</p>';
      breakdownElement.innerHTML = '';
      return;
    }

    const data = snapshot.data();
    const visitors = data.visitors || {};
    const buckets = data.buckets || {};
    const bucketData = collectBuckets(buckets, range.start, range.end);
    const visitorCount = countUniqueVisitors(visitors, range.start, range.end);
    const detailItems = aggregateItems(bucketData.items, detailMode);

    displayTotals(bucketData.totals, visitorCount);
    renderBreakdown(detailItems);
    renderChart(detailItems, metric);
    messageElement.textContent = `Mostrando ${METRIC_LABELS[metric].toLowerCase()} ${DETAIL_LABELS[detailMode].toLowerCase()} desde ${startInput.value} hasta ${endInput.value}`;
  } catch (error) {
    document.getElementById('analytics-content').innerHTML = '<p>Error cargando analytics.</p>';
    breakdownElement.innerHTML = '';
    console.error('Error loading analytics:', error);
  }
}

globalThis.addEventListener('load', () => {
  rangeSelect.addEventListener('change', async () => {
    if (rangeSelect.value !== 'custom') {
      setInputsForRange(rangeSelect.value);
      await loadAnalytics();
    }
  });

  detailSelect.addEventListener('change', async () => {
    breakdownTitle.textContent = DETAIL_LABELS[detailSelect.value] || DETAIL_LABELS.hour;
    await loadAnalytics();
  });

  metricSelect.addEventListener('change', async () => {
    await loadAnalytics();
  });

  refreshButton.addEventListener('click', async () => {
    try {
      parseRangeInputs();
      await loadAnalytics();
    } catch (error) {
      messageElement.textContent = error.message;
      breakdownElement.innerHTML = '';
    }
  });

  window.addEventListener('resize', () => {
    loadAnalytics().catch((error) => console.warn('Error actualizando gráfico al redimensionar:', error));
  });

  setInputsForRange('today');
  loadAnalytics();
});
