(function (global) {
  const App = global.App || (global.App = {});
  App.bootstrap = App.bootstrap || {};

  async function init() {
    if (!App.state) {
      return;
    }

    const remoteConfigPromise = typeof App.storage?.getRemoteConfig === 'function'
      ? (async () => {
          try {
            return await App.storage.getRemoteConfig();
          } catch (error) {
            console.warn('No se pudo hidratar la configuración remota:', error);
            return null;
          }
        })()
      : Promise.resolve(null);

    const whatsappInitPromise = remoteConfigPromise.then(async (remoteConfig) => {
      if (remoteConfig?.landingContent) {
        App.content?.setLandingContent?.(remoteConfig.landingContent, false);
      }

      if (typeof App.whatsapp?.initializeButton === 'function') {
        await App.whatsapp.initializeButton(remoteConfig);
      }
    }).catch((error) => {
      console.warn('No se pudo inicializar WhatsApp con la configuración remota:', error);
    });

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

    if (typeof App.analytics?.registerAnalyticsVisit === 'function' && !window.location.pathname.includes('settings') && !window.location.pathname.includes('analytics')) {
      App.analytics.registerAnalyticsVisit().catch(() => {});
    }

    await whatsappInitPromise;
  }

  App.bootstrap.init = init;
})(window);
