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
      const { db, doc, getDoc, setDoc } = await App.state.ensureFirebaseServices();
      const visitorId = await getPersistentVisitorId();
      const analyticsRef = doc(db, App.config.ANALYTICS_COLLECTION, App.config.ANALYTICS_DOCUMENT);
      const now = new Date();
      const source = App.state.analyticsSource || 'primary';
      console.log('[analytics] visit start', { visitorId, source, path: window.location.pathname, search: window.location.search });

      const currentSnapshot = await getDoc(analyticsRef);
      const currentDocument = currentSnapshot.exists() ? currentSnapshot.data() : null;
      const { createEmptyAnalyticsDocument, buildAnalyticsDocumentUpdate } = await import('./analytics-logic.mjs');
      const nextState = buildAnalyticsDocumentUpdate(currentDocument || createEmptyAnalyticsDocument(), {
        visitorId,
        now,
        source,
        action: 'visit'
      });

      console.log('[analytics] visit update payload', {
        visitorId,
        source,
        totals: nextState.totals,
        visitorRecord: nextState.visitors[visitorId],
        bucket: nextState.buckets[`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`]?.[String(now.getHours()).padStart(2, '0')]
      });

      await setDoc(analyticsRef, nextState, { merge: true });
      console.log('[analytics] visit saved', { visitorId, ref: analyticsRef.path });
    } catch (error) {
      console.error('[analytics] failed visit registration', error);
    }
  }

  async function registerAnalyticsWhatsappClick() {
    try {
      const { db, doc, getDoc, setDoc } = await App.state.ensureFirebaseServices();
      const visitorId = await getPersistentVisitorId();
      const analyticsRef = doc(db, App.config.ANALYTICS_COLLECTION, App.config.ANALYTICS_DOCUMENT);
      const now = new Date();
      const source = App.state.analyticsSource || 'primary';
      console.log('[analytics] whatsapp click start', { visitorId, source, path: window.location.pathname, search: window.location.search });

      const currentSnapshot = await getDoc(analyticsRef);
      const currentDocument = currentSnapshot.exists() ? currentSnapshot.data() : null;
      const { createEmptyAnalyticsDocument, buildAnalyticsDocumentUpdate } = await import('./analytics-logic.mjs');
      const nextState = buildAnalyticsDocumentUpdate(currentDocument || createEmptyAnalyticsDocument(), {
        visitorId,
        now,
        source,
        action: 'whatsapp_click'
      });

      console.log('[analytics] whatsapp click update payload', {
        visitorId,
        source,
        totals: nextState.totals,
        visitorRecord: nextState.visitors[visitorId],
        bucket: nextState.buckets[`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`]?.[String(now.getHours()).padStart(2, '0')]
      });

      await setDoc(analyticsRef, nextState, { merge: true });
      console.log('[analytics] whatsapp click saved', { visitorId, ref: analyticsRef.path });
    } catch (error) {
      console.error('[analytics] failed whatsapp click registration', error);
    }
  }

  function trackConversion(payload = {}) {
    return payload;
  }

  function trackWhatsAppClick() {
    App.analytics.trackEvent('Lead', {
      content_name: 'whatsapp_click',
      content_type: 'lead',
      event_category: 'engagement'
    });
  }

  App.analytics.trackEvent = trackEvent;
  App.analytics.trackConversion = trackConversion;
  App.analytics.trackWhatsAppClick = trackWhatsAppClick;
  App.analytics.getPersistentVisitorId = getPersistentVisitorId;
  App.analytics.registerAnalyticsVisit = registerAnalyticsVisit;
  App.analytics.registerAnalyticsWhatsappClick = registerAnalyticsWhatsappClick;
})(window);
