(function (global) {
  const App = global.App || (global.App = {});
  App.facebook = App.facebook || {};

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
      window.fbq('track', 'PageView');
      window.__facebookPixelInitialized = true;
      window.__facebookPixelId = App.config.FACEBOOK_PIXEL_ID;
    }
  }

  function handleWhatsAppClick() {
    firePixelEvent('WhatsApp_Click', { content_name: 'WhatsApp_Click', content_type: 'lead' });
    firePixelEvent('Lead', { content_name: 'WhatsApp_Click', content_type: 'lead' });
    App.analytics?.trackWhatsAppClick?.();
  }

  function enviarEventoFacebook() {
    try {
      const clickTime = Date.now();
      if (!App.antibot?.validateClickSecurity?.(clickTime)) {
        console.warn('Click rechazado por sistema anti-bot');
        return Promise.resolve(false);
      }

      const eventId = `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const trustScore = App.antibot?.getTrustScore?.() ?? App.state.trustScore ?? 100;
      const fbp = getCookie('_fbp') || '';
      const fbc = getCookie('_fbc') || getCookie('fbclid') || new URL(window.location.href).searchParams.get('fbclid') || '';

      if (window.fbq) {
        window.fbq('track', 'CompleteRegistration', {
          value: 1.0,
          currency: 'USD',
          event_id: eventId,
          fbp,
          fbc,
          trust_score: trustScore,
          time_on_page: App.state.userInteractions.timeOnPage,
          interactions: App.state.userInteractions.genuineInteractions,
          mouse_movements: App.state.userInteractions.mouseMovements,
          scroll_count: App.state.userInteractions.scrolls,
          click_delay: clickTime - App.state.pageLoadTime,
          screen_resolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language
        }, { eventID: eventId });
      }

      return Promise.resolve(true);
    } catch (error) {
      console.error('Error en Pixel:', error);
      return Promise.resolve(false);
    }
  }

  App.facebook.firePixelEvent = firePixelEvent;
  App.facebook.initPixel = initPixel;
  App.facebook.handleWhatsAppClick = handleWhatsAppClick;
  App.facebook.enviarEventoFacebook = enviarEventoFacebook;
})(window);
