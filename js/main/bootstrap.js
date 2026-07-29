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
    if (typeof App.analytics?.initSessionAnalytics === 'function') {
      void App.analytics.initSessionAnalytics().catch((error) => {
        console.warn('No se pudo iniciar la analítica de comportamiento:', error);
      });
    }

    if (typeof App.whatsapp?.initializeButton === 'function') {
      void App.whatsapp.initializeButton(null).catch((error) => {
        console.warn('No se pudo inicializar WhatsApp con la configuración remota:', error);
      });
    }

    const runImmediateStartup = async () => {
      try {
        if (typeof App.casinos?.applyTheme === 'function') {
          const defaultCasino = App.casinos.getDefaultCasino?.() || App.state.activeTheme || 'casino_1';
          App.casinos.applyTheme(defaultCasino, { animate: false });
        }

        if (typeof App.casinos?.applyRandomBackground === 'function') {
          App.casinos.applyRandomBackground();
        }

        if (typeof App.storage?.loadDynamicCasinos === 'function') {
          await App.storage.loadDynamicCasinos().catch((error) => {
            console.warn('No se pudo hidratar los casinos dinámicos al iniciar:', error);
            return null;
          });

          if (typeof App.casinos?.applyTheme === 'function') {
            const refreshedCasino = App.casinos.getDefaultCasino?.() || App.state.activeTheme || 'casino_1';
            App.casinos.applyTheme(refreshedCasino, { animate: false });
          }
        }
      } catch (error) {
        console.warn('No se pudo completar el arranque inmediato:', error);
      }
    };

    void runImmediateStartup();

    const runDeferredStartup = async () => {
      try {
        const remoteConfig = typeof App.storage?.getRemoteConfig === 'function'
          ? await App.storage.getRemoteConfig().catch((error) => {
              console.warn('No se pudo hidratar la configuración remota:', error);
              return null;
            })
          : null;

        if (remoteConfig?.landingContent) {
          App.content?.setLandingContent?.(remoteConfig.landingContent, false);
        }

        if (typeof App.events?.bindUIEvents === 'function') {
          App.events.bindUIEvents();
        }

        if (typeof App.facebook?.initPixel === 'function') {
          App.facebook.initPixel();
        }

        if (typeof App.analytics?.registerAnalyticsVisit === 'function' && !window.location.pathname.includes('settings') && !window.location.pathname.includes('analytics')) {
          await App.analytics.registerAnalyticsVisit().catch(() => {});
        }
      } catch (error) {
        console.warn('No se pudo completar el arranque diferido:', error);
      }
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => {
        void runDeferredStartup();
      }, { timeout: 500 });
    } else {
      window.setTimeout(() => {
        void runDeferredStartup();
      }, 120);
    }
  }

  App.bootstrap.init = init;
})(window);
