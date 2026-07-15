(function (global) {
  const App = global.App || (global.App = {});
  App.facebook = App.facebook || {};

  let leadDispatched = false;

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift().trim();
    }
    return '';
  }

  function firePixelEvent(eventName, payload = {}) {
    try {
      if (window.fbq) {
        window.fbq('track', eventName, payload);
      }
      if (App.analytics?.trackEvent) {
        App.analytics.trackEvent(eventName, payload);
      }
    } catch (error) {
      console.warn('Error firing Facebook Pixel event:', error);
    }
  }

  function initPixel() {
    if (window.__facebookPixelInitialized) {
      return;
    }

    if (typeof window !== 'undefined' && typeof window.fbq === 'function' && App.config.FACEBOOK_PIXEL_ID) {
      window.fbq('init', App.config.FACEBOOK_PIXEL_ID);
      window.fbq('set', 'autoConfig', false, App.config.FACEBOOK_PIXEL_ID);
      window.fbq('track', 'PageView');
      window.__facebookPixelInitialized = true;
      window.__facebookPixelId = App.config.FACEBOOK_PIXEL_ID;
    }
  }

  function handleWhatsAppClick() {
    if (leadDispatched) {
      return;
    }

    leadDispatched = true;
    firePixelEvent('Lead', { content_name: 'whatsapp_click', content_type: 'lead' });
    App.analytics?.trackWhatsAppClick?.();
  }

  function resetLeadDispatch() {
    leadDispatched = false;
  }

  App.facebook.firePixelEvent = firePixelEvent;
  App.facebook.initPixel = initPixel;
  App.facebook.handleWhatsAppClick = handleWhatsAppClick;
  App.facebook.resetLeadDispatch = resetLeadDispatch;
})(window);
