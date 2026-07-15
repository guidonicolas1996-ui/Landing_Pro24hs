(function (global) {
  const App = global.App || (global.App = {});
  App.analytics = App.analytics || {};

  async function getIpAddress() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  async function getVisitorFingerprint(ip) {
    const text = `${ip}|${navigator.userAgent}|${navigator.platform}|${window.screen.width}x${window.screen.height}|${navigator.language}`;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function getPersistentVisitorId() {
    try {
      let visitorId = localStorage.getItem('visitorId');
      if (visitorId) {
        return visitorId;
      }
      const ip = await getIpAddress();
      visitorId = await getVisitorFingerprint(ip);
      localStorage.setItem('visitorId', visitorId);
      return visitorId;
    } catch (error) {
      return 'anonymous';
    }
  }

  function trackEvent(eventName, payload = {}) {
    try {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
      }
      if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        window.fbq('track', eventName, payload);
      }
      const statePayload = { eventName, ...payload, ts: Date.now() };
      App.state.analyticsEvents = App.state.analyticsEvents || [];
      App.state.analyticsEvents.push(statePayload);
    } catch (error) {
      console.warn('Error trackEvent:', error);
    }
  }

  async function registerAnalyticsVisit() {
    try {
      const { db, doc, setDoc } = await App.state.ensureFirebaseServices();
      const visitorId = await getPersistentVisitorId();
      const analyticsRef = doc(db, App.config.ANALYTICS_COLLECTION, App.config.ANALYTICS_DOCUMENT);
      const now = new Date().toISOString();
      const payload = {
        visitedAt: now,
        source: App.state.analyticsSource || 'primary',
        visitorId,
        userAgent: navigator.userAgent,
        path: window.location.pathname,
        search: window.location.search
      };
      await setDoc(analyticsRef, { [visitorId]: payload }, { merge: true });
    } catch (error) {
      console.warn('No se pudo registrar la visita de analytics:', error);
    }
  }

  async function registerAnalyticsWhatsappClick() {
    try {
      const { db, doc, setDoc } = await App.state.ensureFirebaseServices();
      const visitorId = await getPersistentVisitorId();
      const analyticsRef = doc(db, App.config.ANALYTICS_COLLECTION, App.config.ANALYTICS_DOCUMENT);
      const now = new Date().toISOString();
      await setDoc(analyticsRef, {
        [visitorId]: {
          lastWhatsappClickAt: now,
          source: App.state.analyticsSource || 'primary'
        }
      }, { merge: true });
    } catch (error) {
      console.warn('No se pudo registrar el click de WhatsApp:', error);
    }
  }

  function trackConversion(payload = {}) {
    try {
      if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        window.fbq('track', 'Purchase', payload);
      }
    } catch (error) {
      console.warn('Error trackConversion:', error);
    }
  }

  function trackWhatsAppClick() {
    trackEvent('WhatsApp_Click', { event_category: 'engagement' });
    App.analytics.trackConversion({ content_name: 'WhatsApp_Click' });
  }

  App.analytics.trackEvent = trackEvent;
  App.analytics.trackConversion = trackConversion;
  App.analytics.trackWhatsAppClick = trackWhatsAppClick;
  App.analytics.getPersistentVisitorId = getPersistentVisitorId;
  App.analytics.registerAnalyticsVisit = registerAnalyticsVisit;
  App.analytics.registerAnalyticsWhatsappClick = registerAnalyticsWhatsappClick;
})(window);
