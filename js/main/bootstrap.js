(function (global) {
  const App = global.App || (global.App = {});
  App.bootstrap = App.bootstrap || {};

  async function init() {
    if (!App.state) {
      return;
    }

    App.dom?.cache?.();
    App.content?.setLandingContent?.(App.config.DEFAULT_LANDING_CONTENT, false);
    App.content?.hydrateAnalyticsSourceFromUrl?.();

    if (typeof App.casinos?.applyRandomBackground === 'function') {
      App.casinos.applyRandomBackground();
    }

    if (typeof App.storage?.loadDynamicCasinos === 'function') {
      await App.storage.loadDynamicCasinos();
    }

    if (typeof App.casinos?.applyTheme === 'function') {
      const defaultCasino = App.casinos.getDefaultCasino?.() || App.state.activeTheme || 'casino_1';
      App.casinos.applyTheme(defaultCasino, { animate: false });
    }

    if (typeof App.events?.bindUIEvents === 'function') {
      App.events.bindUIEvents();
    }

    if (typeof App.facebook?.initPixel === 'function') {
      App.facebook.initPixel();
    }

    try {
      const remoteConfig = await App.storage?.getRemoteConfig?.();
      if (remoteConfig?.landingContent) {
        App.content?.setLandingContent?.(remoteConfig.landingContent, false);
      }
    } catch (error) {
      console.warn('No se pudo hidratar la configuración remota:', error);
    }

    if (typeof App.whatsapp?.initializeButton === 'function') {
      await App.whatsapp.initializeButton();
    }

    if (typeof App.analytics?.registerAnalyticsVisit === 'function' && !window.location.pathname.includes('settings') && !window.location.pathname.includes('analytics')) {
      App.analytics.registerAnalyticsVisit().catch(() => {});
    }
  }

  App.bootstrap.init = init;
})(window);
