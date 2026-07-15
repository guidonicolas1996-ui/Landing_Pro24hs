(function (global) {
  const App = global.App || (global.App = {});
  App.events = App.events || {};

  function bindUIEvents() {
    if (typeof App.whatsapp?.bindWhatsAppButtons === 'function') {
      App.whatsapp.bindWhatsAppButtons();
    }

    if (typeof App.antibot?.observeInteractions === 'function') {
      App.antibot.observeInteractions();
    }

    if (typeof App.antibot?.initBotDetection === 'function') {
      App.antibot.initBotDetection().catch(() => {});
    }

    document.addEventListener('DOMContentLoaded', () => {
      if (typeof App.casinos?.applyRandomBackground === 'function') {
        App.casinos.applyRandomBackground();
      }
      if (typeof App.casinos?.observeRemoteConfig === 'function') {
        App.casinos.observeRemoteConfig().catch(() => {});
      }
    });
  }

  App.events.bindUIEvents = bindUIEvents;
})(window);
