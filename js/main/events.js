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
      //console.log('FB Pixel: Evento duplicado bloqueado.');
      return false;
    }

    window.fbEventTrackerState.leadSent = true;
    //console.log('FB Pixel: Enviando evento único de conversión...');
    /*
    if (typeof fbq === 'function') {
      fbq('track', 'Lead', {
        content_name: 'whatsapp_click',
        content_type: 'lead'
      });
    } */

    return true;
  }

  function bindUIEvents() {
    if (typeof App.whatsapp?.bindWhatsAppButtons === 'function') {
      App.whatsapp.bindWhatsAppButtons();
    }

    const scheduleNonCriticalWork = () => {
      if (typeof App.antibot?.observeInteractions === 'function') {
        App.antibot.observeInteractions();
      }

      if (typeof App.antibot?.initBotDetection === 'function') {
        App.antibot.initBotDetection().catch(() => {});
      }

      if (typeof App.casinos?.observeRemoteConfig === 'function') {
        App.casinos.observeRemoteConfig().catch(() => {});
      }
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(scheduleNonCriticalWork, { timeout: 500 });
    } else {
      window.setTimeout(scheduleNonCriticalWork, 150);
    }
  }

  App.events.handleWhatsAppClick = handleWhatsAppClick;
  App.events.bindUIEvents = bindUIEvents;
})(window);
