(function (global) {
  const App = global.App || (global.App = {});
  App.events = App.events || {};

  if (!window.fbEventTrackerState) {
    window.fbEventTrackerState = {
      leadSent: false
    };
  }

  function handleWhatsAppClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (window.fbEventTrackerState.leadSent) {
      console.log('FB Pixel: Evento duplicado bloqueado.');
      return false;
    }

    window.fbEventTrackerState.leadSent = true;
    console.log('FB Pixel: Enviando evento único de conversión...');

    if (typeof fbq === 'function') {
      fbq('track', 'Lead', {
        content_name: 'whatsapp_click',
        content_type: 'lead'
      });
    }

    return true;
  }

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

  App.events.handleWhatsAppClick = handleWhatsAppClick;
  App.events.bindUIEvents = bindUIEvents;
})(window);
