(function (global) {
  const App = global.App || (global.App = {});
  App.state = App.state || {};

  App.state.landingContent = { ...App.config.DEFAULT_LANDING_CONTENT };
  App.state.dynamicCasinos = {};
  App.state.dynamicCasinoOrder = [];
  App.state.remoteConfigCache = null;
  App.state.remoteConfigCacheTime = 0;
  App.state.firebaseServices = null;
  App.state.firebaseServicesReady = null;
  App.state.analyticsSource = 'primary';
  App.state.activeThemes = [];
  App.state.activeTheme = '';
  App.state.rotationTimerId = null;
  App.state.whatsappButtonProgressTimer = null;
  App.state.whatsappButtonCompleteTimeout = null;
  App.state.whatsappButtonProgressValue = 0;
  App.state.whatsappButtonProgressStartedAt = 0;
  App.state.whatsappButtonProgressActive = false;
  App.state.whatsappButtonReady = false;
  App.state.analyticsEvents = [];
  App.state.userInteractions = {
    mouseMovements: 0,
    scrolls: 0,
    keyPresses: 0,
    touches: 0,
    timeOnPage: 0,
    genuineInteractions: 0
  };
  App.state.botDetectionFlags = {
    suspiciousUserAgent: false,
    noMouseMovement: false,
    tooFastClick: false,
    suspiciousTimezone: false,
    headlessBrowser: false,
    vpnDetected: false
  };
  App.state.trustScore = 100;
  App.state.pageLoadTime = Date.now();

  App.state.ensureFirebaseServices = async function ensureFirebaseServices() {
    if (App.state.firebaseServices) {
      return App.state.firebaseServices;
    }

    if (!App.state.firebaseServicesReady) {
      App.state.firebaseServicesReady = (async () => {
        try {
          const [{ db }, firestore] = await Promise.all([
            import('../firebase.js'),
            import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js')
          ]);

          App.state.firebaseServices = { db, ...firestore };
          return App.state.firebaseServices;
        } catch (error) {
          console.warn('Error pre-cargando Firebase services:', error);
          return null;
        }
      })();
    }

    await App.state.firebaseServicesReady;
    return App.state.firebaseServices;
  };
})(window);
