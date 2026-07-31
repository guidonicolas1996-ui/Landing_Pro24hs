const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadContentModule() {
  const code = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const context = {
    window: {},
    document: {},
    console,
    URL,
    URLSearchParams,
    CustomEvent,
    setTimeout,
    clearTimeout,
    performance,
    navigator: {}
  };
  context.global = context;
  context.globalThis = context;
  context.window = context;
  context.window.window = context.window;
  context.window.document = context.document;
  context.window.console = console;
  context.window.URL = URL;
  context.window.URLSearchParams = URLSearchParams;
  context.window.CustomEvent = CustomEvent;
  context.window.setTimeout = setTimeout;
  context.window.clearTimeout = clearTimeout;
  context.window.performance = performance;
  context.window.navigator = navigator;
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.App;
}

test('renderContent splits the bonus line only when a space exists', () => {
  const App = loadContentModule();
  const percentEl = { textContent: '' };
  const textEl = { textContent: '' };

  App.dom = {
    elements: {
      heroBonusLinePercent: percentEl,
      heroBonusLineText: textEl
    }
  };
  App.state = { landingContent: { heroBonusLine: 'EXTRA' } };
  App.config = { DEFAULT_LANDING_CONTENT: {} };
  App.storage = { saveRemoteConfig: async () => {} };

  App.content.renderContent();

  assert.equal(percentEl.textContent, 'EXTRA');
  assert.equal(textEl.textContent, '');
});

test('renderContent keeps the second part in the text span when the bonus line contains a space', () => {
  const App = loadContentModule();
  const percentEl = { textContent: '' };
  const textEl = { textContent: '' };

  App.dom = {
    elements: {
      heroBonusLinePercent: percentEl,
      heroBonusLineText: textEl
    }
  };
  App.state = { landingContent: { heroBonusLine: 'EXTRA DE BONO' } };
  App.config = { DEFAULT_LANDING_CONTENT: {} };
  App.storage = { saveRemoteConfig: async () => {} };

  App.content.renderContent();

  assert.equal(percentEl.textContent, 'EXTRA');
  assert.equal(textEl.textContent, ' DE BONO');
});
