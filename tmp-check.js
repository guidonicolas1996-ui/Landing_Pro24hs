const fs = require('fs');
const vm = require('vm');
const path = require('path');

const cwd = process.cwd();
const context = {
  window: {
    location: { search: '', pathname: '/', href: 'http://localhost/' },
    addEventListener() {},
    dispatchEvent() {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    performance: { now: () => Date.now() },
    CustomEvent: class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } }
  },
  document: { getElementById() { return null; }, querySelectorAll() { return []; }, body: {}, addEventListener() {} },
  localStorage: {
    data: {},
    getItem(key) { return this.data[key] ?? null; },
    setItem(key, value) { this.data[key] = String(value); },
    removeItem(key) { delete this.data[key]; }
  },
  console,
  URLSearchParams,
  performance: { now: () => Date.now() },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  FileReader: class {},
  Blob: class {},
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
  btoa: (value) => Buffer.from(value, 'binary').toString('base64')
};
context.global = context;
context.globalThis = context;
context.window.window = context.window;
context.window.global = context;
context.window.globalThis = context;
context.window.document = context.document;
context.window.localStorage = context.localStorage;
context.window.console = console;
context.window.URLSearchParams = URLSearchParams;
context.window.performance = context.performance;
context.window.setTimeout = setTimeout;
context.window.clearTimeout = clearTimeout;
context.window.setInterval = setInterval;
context.window.clearInterval = clearInterval;
context.window.CustomEvent = class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } };

context.App = {
  state: {
    landingContent: {},
    dynamicCasinos: {},
    dynamicCasinoOrder: [],
    remoteConfigCache: null,
    remoteConfigCacheTime: 0,
    ensureFirebaseServices: async () => ({ db: {}, doc: () => ({}), getDoc: async () => ({ exists: () => false, data: () => ({}) }), setDoc: async () => {} }),
    whatsappButtonProgressValue: 0,
    whatsappButtonReady: false,
    whatsappButtonProgressStartedAt: 0,
    whatsappButtonProgressActive: false,
    whatsappButtonCompleteTimeout: null,
    whatsappButtonProgressTimer: null
  },
  dom: { cache() { return {}; } },
  content: {},
  casinos: { getDefaultCasino() { return 'casino_1'; }, applyTheme() {} },
  events: { bindUIEvents() {} },
  facebook: { initPixel() {}, handleWhatsAppClick() {}, enviarEventoFacebook() {} },
  analytics: { registerAnalyticsVisit() { return Promise.resolve(); }, registerAnalyticsWhatsappClick() { return Promise.resolve(); } },
  antibot: {},
  whatsapp: {},
  storage: {},
  bootstrap: {}
};

const files = [
  'js/main/config.js',
  'js/main/state.js',
  'js/main/dom.js',
  'js/main/storage.js',
  'js/main/content.js',
  'js/main/casinos.js',
  'js/main/analytics.js',
  'js/main/antibot.js',
  'js/main/facebook.js',
  'js/main/whatsapp.js',
  'js/main/events.js',
  'js/main/bootstrap.js'
];

for (const file of files) {
  vm.runInNewContext(fs.readFileSync(path.join(cwd, file), 'utf8'), context, { filename: file });
}

(async () => {
  context.App.state.landingContent.whatsappUrl = 'https://wa.me/123456';
  const built = context.App.whatsapp.buildWhatsAppUrl();
  context.App.state.ensureFirebaseServices = async () => ({
    db: {},
    doc: () => ({}),
    getDoc: async () => ({ exists: () => true, data: () => ({ casinos: { casino_1: { label: 'Remote Casino' } }, casinoOrder: ['casino_1'] }) }),
    setDoc: async () => {}
  });
  const casinos = await context.App.storage.loadDynamicCasinos();
  console.log(JSON.stringify({ built, casinoKeys: Object.keys(casinos), order: context.App.state.dynamicCasinoOrder }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
