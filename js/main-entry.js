import './main/config.js';
import './main/state.js';
import './main/dom.js';
import './main/storage.js';
import './main/content.js';
import './main/casinos.js';
import './main/analytics.js';
import './main/antibot.js';
import './main/facebook.js';
import './main/whatsapp.js';
import './main/events.js';
import './main/bootstrap.js';

window.App = window.App || {};

function startApp() {
  if (window.App && window.App.bootstrap && typeof window.App.bootstrap.init === 'function') {
    window.App.bootstrap.init();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp, { once: true });
} else {
  startApp();
}
