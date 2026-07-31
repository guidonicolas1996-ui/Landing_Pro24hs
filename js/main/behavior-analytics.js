(function (global) {
  const App = global.App || (global.App = {});
  App.analytics = App.analytics || {};
  App.state = App.state || {};

  const MAX_SCROLL_PERCENT = 100;
  const RAGE_CLICK_WINDOW_MS = 2000;
  const RAGE_CLICK_THRESHOLD = 3;

  function getTimestamp() {
    return Date.now();
  }

  function getRelativeTimeMs() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? Math.round(performance.now() - (App.state.pageLoadTime || 0))
      : null;
  }

  function getDeviceType() {
    const ua = navigator.userAgent || '';
    const isTablet = /Tablet|iPad|PlayBook|Silk/i.test(ua);
    const isMobile = /Mobi|Android|iPhone|iPod|Windows Phone|Opera Mini|BlackBerry/i.test(ua);
    if (isTablet) return 'tablet';
    if (isMobile) return 'mobile';
    return 'desktop';
  }

  function getBrowserInfo() {
    if (navigator.userAgentData && Array.isArray(navigator.userAgentData.brands)) {
      return navigator.userAgentData.brands.map((brand) => `${brand.brand} ${brand.version}`).join(', ');
    }
    return navigator.userAgent || 'unknown';
  }

  function getResolution() {
    return {
      width: window.screen.width || null,
      height: window.screen.height || null
    };
  }

  function getOrientation() {
    if (screen.orientation && screen.orientation.type) {
      return screen.orientation.type;
    }
    return window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
  }

  function getConnectionInfo() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) {
      return null;
    }

    return {
      effectiveType: conn.effectiveType || null,
      downlink: typeof conn.downlink === 'number' ? conn.downlink : null,
      rtt: typeof conn.rtt === 'number' ? conn.rtt : null,
      saveData: typeof conn.saveData === 'boolean' ? conn.saveData : null,
      type: conn.type || null
    };
  }

  function getNavigationTiming() {
    if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
      return null;
    }

    const navigationEntries = performance.getEntriesByType('navigation');
    const nav = Array.isArray(navigationEntries) && navigationEntries[0] ? navigationEntries[0] : null;
    if (!nav) {
      return null;
    }

    return {
      domContentLoaded: nav.domContentLoadedEventEnd || null,
      loadEventEnd: nav.loadEventEnd || null,
      requestStart: nav.requestStart || null,
      responseStart: nav.responseStart || null,
      ttfb: nav.responseStart && nav.requestStart ? Math.round(nav.responseStart - nav.requestStart) : null,
      type: nav.type || null,
      redirectCount: typeof nav.redirectCount === 'number' ? nav.redirectCount : null,
      duration: typeof nav.duration === 'number' ? Math.round(nav.duration) : null
    };
  }

  function initializePerformanceMetrics() {
    const metrics = {
      fcp: null,
      lcp: null,
      cls: 0,
      inp: null,
      domContentLoaded: null,
      loadEventEnd: null,
      ttfb: null,
      navigationTiming: null
    };

    App.state.behaviorAnalyticsPerformance = metrics;

    function updateNavigationTiming() {
      const nav = getNavigationTiming();
      if (!nav) {
        return;
      }
      metrics.domContentLoaded = nav.domContentLoaded;
      metrics.loadEventEnd = nav.loadEventEnd;
      metrics.ttfb = nav.ttfb;
      metrics.navigationTiming = {
        type: nav.type,
        redirectCount: nav.redirectCount,
        duration: nav.duration
      };
    }

    function handlePerformanceEntry(entries) {
      entries.getEntries().forEach((entry) => {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          metrics.fcp = Math.round(entry.startTime);
        }
        if (entry.entryType === 'largest-contentful-paint') {
          metrics.lcp = Math.round(entry.startTime);
        }
        if (entry.entryType === 'layout-shift') {
          metrics.cls = Math.round((metrics.cls || 0) + (entry.value || 0) * 1000) / 1000;
        }
        if (entry.entryType === 'event' && entry.name === 'first-input' && typeof entry.processingStart === 'number') {
          metrics.inp = Math.round(entry.processingStart - entry.startTime);
        }
      });
    }

    try {
      if (typeof PerformanceObserver === 'function') {
        const observer = new PerformanceObserver((list) => {
          handlePerformanceEntry(list);
          updateNavigationTiming();
        });

        observer.observe({ type: 'paint', buffered: true });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        observer.observe({ type: 'layout-shift', buffered: true });
        if (typeof PerformanceObserver.supportedEntryTypes !== 'undefined' && PerformanceObserver.supportedEntryTypes.includes('event')) {
          observer.observe({ type: 'event', buffered: true });
        }
      }
    } catch (error) {
      console.warn('[behavior-analytics] no se pudo iniciar PerformanceObserver', error);
    }

    updateNavigationTiming();
  }

  function getSessionDocRef() {
    return App.state.analyticsSessionDocRef || null;
  }

  async function updateSessionDocument(updatePayload) {
    let sessionRef = null;
    try {
      sessionRef = getSessionDocRef();
      if (!sessionRef) {
        console.warn('[Behavior Analytics] No sessionRef available for updateSessionDocument', {
          sessionId: App.state.analyticsSessionId || null,
          updatePayload
        });
        return;
      }

      console.log('[Behavior Analytics] updateSessionDocument start', {
        sessionId: App.state.analyticsSessionId || null,
        sessionRefPath: sessionRef.path,
        updatePayload
      });

      const services = await App.state.ensureFirebaseServices();
      const { setDoc, getDoc } = services || {};
      if (!setDoc) {
        console.warn('[Behavior Analytics] setDoc unavailable in Firebase services', {
          sessionId: App.state.analyticsSessionId || null,
          sessionRefPath: sessionRef.path
        });
        return;
      }

      await setDoc(sessionRef, updatePayload, { merge: true });
      console.log('[Behavior Analytics] Session updated successfully', {
        sessionId: App.state.analyticsSessionId || null,
        sessionRefPath: sessionRef.path,
        updatePayload
      });

      if (getDoc) {
        const verificationSnapshot = await getDoc(sessionRef);
        const behaviorWhatsappClick = verificationSnapshot?.exists?.() ? verificationSnapshot.data()?.behavior?.whatsappClick : undefined;
        console.log('[Behavior Analytics] Session verification after update', {
          sessionId: App.state.analyticsSessionId || null,
          sessionRefPath: sessionRef.path,
          containsBehaviorWhatsappClick: behaviorWhatsappClick !== undefined,
          behaviorWhatsappClick
        });
      }
    } catch (error) {
      console.error('[Behavior Analytics] Session update failed', {
        sessionId: App.state.analyticsSessionId || null,
        sessionRefPath: sessionRef?.path || null,
        updatePayload,
        error,
        firebaseCode: error?.code || null,
        message: error?.message || null,
        stack: error?.stack || null
      });
    }
  }

  function createSessionId(visitorId) {
    const base = visitorId || 'anon';
    const timestamp = Math.floor(getTimestamp() / 1000);
    const randomSuffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 12);
    return `${base}_${timestamp}_${randomSuffix}`;
  }

  async function createSessionDocument() {
    if (App.state.analyticsSessionCreated) {
      return;
    }
    App.state.analyticsSessionCreated = true;

    try {
      const visitorId = await App.analytics.getPersistentVisitorId();
      const sessionId = createSessionId(visitorId);
      App.state.analyticsSessionId = sessionId;
      App.state.analyticsVisitorId = visitorId;
      App.state.analyticsSessionStartedAt = getTimestamp();
      App.state.analyticsSessionEvents = {
        hero: null,
        buttonVisible: null,
        firstScroll: null,
        maxScrollPercent: 0,
        firstScrollDirection: null,
        buttonVisibleBeforeClick: false,
        buttonVisibleAt: null,
        whatsappClick: null,
        totalClicks: 0,
        totalTaps: 0,
        rageClicks: 0,
        hasScrolled: false,
        hasClicked: false,
        sawButton: false,
        buttonReadyDetails: null,
        landingReady: null,
        exit: null
      };
      App.state.behaviorAnalyticsActiveTime = {
        active: false,
        startedAt: null,
        accumulated: 0
      };
      App.state.behaviorAnalyticsPerformance = null;
      App.state.behaviorAnalyticsFirstScrollY = null;
      App.state.behaviorAnalyticsButtonVisibleAt = null;
      App.state.behaviorAnalyticsVisibleBeforeClick = false;
      App.state.behaviorAnalyticsButtonExposure = {
        firstVisibleAtMs: null,
        totalVisibleDurationMs: 0,
        maxVisiblePercent: 0,
        wasEverFullyVisible: false,
        isCurrentlyVisible: false,
        lastVisibleAtMs: null,
        visibleBeforeWhatsappMs: null
      };
      App.state.analyticsButtonObserver = null;

      const { db, doc } = await App.state.ensureFirebaseServices();
      if (!db || !doc) {
        return;
      }

      const sessionRef = doc(db, App.config.ANALYTICS_COLLECTION, `${App.config.ANALYTICS_DOCUMENT}_session_${sessionId}`);
      App.state.analyticsSessionDocRef = sessionRef;

      const payload = {
        sessionId,
        visitorId,
        source: App.state.analyticsSource || 'primary',
        visitStart: new Date(App.state.analyticsSessionStartedAt).toISOString(),
        visitStartMs: App.state.analyticsSessionStartedAt,
        page: window.location.pathname || '/',
        landing: window.location.pathname || '/',
        status: {
          createdAt: new Date(App.state.analyticsSessionStartedAt).toISOString(),
          createdMs: App.state.analyticsSessionStartedAt
        }
      };

      await updateSessionDocument(payload);
    } catch (error) {
      console.warn('[behavior-analytics] error creando documento de sesión', error);
    }
  }

  function getScrollPercent() {
    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const maxScroll = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    if (maxScroll <= 0) {
      return 0;
    }
    return Math.round(Math.min(MAX_SCROLL_PERCENT, Math.max(0, (scrollTop / maxScroll) * 100)));
  }

  function getScrollDistance() {
    return Math.round(window.scrollY || window.pageYOffset || 0);
  }

  function getScrollDirection(lastY) {
    const currentY = window.scrollY || window.pageYOffset || 0;
    if (lastY === null || lastY === undefined) {
      return 'unknown';
    }
    return currentY > lastY ? 'down' : currentY < lastY ? 'up' : 'none';
  }

  function getViewportInfo() {
    return {
      height: window.innerHeight || null,
      width: window.innerWidth || null
    };
  }

  function getButtonExposurePayload() {
    const exposure = App.state.behaviorAnalyticsButtonExposure || {};
    return {
      firstVisibleAtMs: exposure.firstVisibleAtMs,
      totalVisibleDurationMs: exposure.totalVisibleDurationMs,
      maxVisiblePercent: exposure.maxVisiblePercent,
      wasEverFullyVisible: exposure.wasEverFullyVisible,
      visibleBeforeWhatsappMs: exposure.visibleBeforeWhatsappMs
    };
  }

  function stopButtonExposurePeriod(nowMs) {
    const exposure = App.state.behaviorAnalyticsButtonExposure;
    if (!exposure || !exposure.isCurrentlyVisible || exposure.lastVisibleAtMs == null) {
      return;
    }
    const delta = Math.max(0, nowMs - exposure.lastVisibleAtMs);
    exposure.totalVisibleDurationMs += delta;
    exposure.isCurrentlyVisible = false;
    exposure.lastVisibleAtMs = null;
  }

  function updateButtonExposureState(entry) {
    if (!App.state.behaviorAnalyticsButtonExposure) {
      return;
    }
    const exposure = App.state.behaviorAnalyticsButtonExposure;
    const nowMs = getRelativeTimeMs();
    const ratio = typeof entry.intersectionRatio === 'number' ? Math.max(0, Math.min(1, entry.intersectionRatio)) : 0;
    exposure.maxVisiblePercent = Math.max(exposure.maxVisiblePercent, Math.round(ratio * 100));
    if (ratio >= 1) {
      exposure.wasEverFullyVisible = true;
    }

    if (entry.isIntersecting && !exposure.isCurrentlyVisible) {
      exposure.isCurrentlyVisible = true;
      exposure.lastVisibleAtMs = nowMs;
      if (exposure.firstVisibleAtMs == null) {
        exposure.firstVisibleAtMs = nowMs;
      }
      return;
    }

    if (!entry.isIntersecting && exposure.isCurrentlyVisible) {
      stopButtonExposurePeriod(nowMs);
    }
  }

  function finalizeButtonExposureOnClick() {
    const exposure = App.state.behaviorAnalyticsButtonExposure;
    if (!exposure) {
      return;
    }
    if (exposure.isCurrentlyVisible) {
      stopButtonExposurePeriod(getRelativeTimeMs());
    }
    exposure.visibleBeforeWhatsappMs = exposure.totalVisibleDurationMs;
  }

  function finalizeButtonExposureAtEnd() {
    const exposure = App.state.behaviorAnalyticsButtonExposure;
    if (!exposure) {
      return;
    }
    if (exposure.isCurrentlyVisible) {
      stopButtonExposurePeriod(getRelativeTimeMs());
    }
  }

  function setLandingReadyEvent(details) {
    if (App.state.analyticsSessionEvents?.landingReady) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      timeSinceNavigationStartMs: getRelativeTimeMs(),
      device: getDeviceType(),
      browser: getBrowserInfo(),
      resolution: getResolution(),
      orientation: getOrientation(),
      connection: getConnectionInfo(),
      firebaseReadyMs: details.firebaseReadyMs,
      firestoreReadyMs: details.firestoreReadyMs,
      remoteConfigReadyMs: details.remoteConfigReadyMs,
      buttonReadyMs: details.buttonReadyMs,
      buttonReadyError: details.buttonReadyError || null,
      dependencies: {
        firebase: details.firebaseReadyMs != null,
        firestore: details.firestoreReadyMs != null,
        remoteConfig: details.remoteConfigReadyMs != null,
        whatsappButton: details.buttonReadyMs != null
      }
    };

    App.state.analyticsSessionEvents.landingReady = payload;
    updateSessionDocument({ landingReady: payload });
  }

  function setButtonReadyDetails(error) {
    const readyAt = getRelativeTimeMs();
    const payload = {
      timestamp: new Date().toISOString(),
      readyAtMs: readyAt,
      readyDelayMs: readyAt,
      error: error ? String(error) : null,
      firebaseReadyMs: App.state.analyticsSessionEvents?.landingReady?.firebaseReadyMs || null,
      remoteConfigReadyMs: App.state.analyticsSessionEvents?.landingReady?.remoteConfigReadyMs || null
    };
    App.state.analyticsSessionEvents.buttonReadyDetails = payload;
    updateSessionDocument({ buttonReady: payload });
  }

  function trackHeroVisible(entry) {
    if (App.state.analyticsSessionEvents?.hero) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      timeSinceLoadMs: getRelativeTimeMs(),
      visiblePercent: Math.round((entry.intersectionRatio || 0) * 100)
    };
    App.state.analyticsSessionEvents.hero = payload;
    App.state.analyticsSessionEvents.sawHero = true;
    updateSessionDocument({ 'behavior.hero': payload });
  }

  function trackButtonVisible(entry) {
    updateButtonExposureState(entry);
    if (App.state.analyticsSessionEvents?.buttonVisible) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      timeSinceLoadMs: getRelativeTimeMs(),
      visiblePercent: Math.round((entry.intersectionRatio || 0) * 100),
      scrollY: getScrollDistance(),
      viewportHeight: getViewportInfo().height
    };
    App.state.analyticsSessionEvents.buttonVisible = payload;
    App.state.analyticsSessionEvents.sawButton = true;
    App.state.analyticsButtonVisibleAt = getTimestamp();
    updateSessionDocument({ 'behavior.buttonVisible': payload, 'behavior.sawButton': true });
  }

  function trackFirstScroll() {
    if (App.state.analyticsSessionEvents?.firstScroll) {
      return;
    }

    const scrollY = getScrollDistance();
    const direction = scrollY > 0 ? 'down' : 'none';
    const payload = {
      timestamp: new Date().toISOString(),
      timeSinceLoadMs: getRelativeTimeMs(),
      distance: scrollY,
      direction
    };

    App.state.analyticsSessionEvents.firstScroll = payload;
    App.state.analyticsSessionEvents.hasScrolled = true;
    App.state.behaviorAnalyticsFirstScrollY = scrollY;
    updateSessionDocument({ 'behavior.firstScroll': payload, 'behavior.hasScrolled': true });
  }

  function trackScrollProgress() {
    const percent = getScrollPercent();
    if (percent > (App.state.analyticsSessionEvents.maxScrollPercent || 0)) {
      App.state.analyticsSessionEvents.maxScrollPercent = percent;
    }
    if (percent > 0) {
      App.state.analyticsSessionEvents.hasScrolled = true;
    }
  }

  function trackPointerInteraction(pointerType) {
    if (!App.state.analyticsSessionEvents) {
      return;
    }
    App.state.analyticsSessionEvents.totalClicks = (App.state.analyticsSessionEvents.totalClicks || 0) + 1;
    App.state.analyticsSessionEvents.hasClicked = true;
  }

  function trackTapInteraction() {
    if (!App.state.analyticsSessionEvents) {
      return;
    }
    App.state.analyticsSessionEvents.totalTaps = (App.state.analyticsSessionEvents.totalTaps || 0) + 1;
    App.state.analyticsSessionEvents.hasClicked = true;
  }

  function trackWhatsAppClick() {
    const sessionRef = App.state.analyticsSessionDocRef || null;
    console.log('[Behavior Analytics] trackWhatsAppClick entered', {
      sessionId: App.state.analyticsSessionId || null,
      sessionRefPath: sessionRef?.path || null
    });

    const now = getTimestamp();
    const clickAt = getRelativeTimeMs();
    const wasVisible = Boolean(App.state.analyticsSessionEvents.buttonVisible);
    const buttonVisibleDuration = App.state.analyticsButtonVisibleAt ? Math.round((now - App.state.analyticsButtonVisibleAt)) : null;

    finalizeButtonExposureOnClick();
    if (App.state.analyticsButtonObserver) {
      try {
        App.state.analyticsButtonObserver.disconnect();
      } catch (error) {
        // ignore
      }
      App.state.analyticsButtonObserver = null;
    }

    const buttonExposurePayload = getButtonExposurePayload();
    const payload = {
      timestamp: new Date().toISOString(),
      timeSinceLoadMs: clickAt,
      scrollY: getScrollDistance(),
      buttonVisible: wasVisible,
      buttonVisibleBeforeClick: wasVisible,
      buttonVisibleDurationMs: buttonVisibleDuration,
      totalClicks: App.state.analyticsSessionEvents.totalClicks || 0,
      totalTaps: App.state.analyticsSessionEvents.totalTaps || 0
    };

    console.log('[Behavior Analytics] trackWhatsAppClick payload ready', {
      sessionId: App.state.analyticsSessionId || null,
      sessionRefPath: sessionRef?.path || null,
      payload,
      buttonExposurePayload
    });

    App.state.analyticsSessionEvents.whatsappClick = payload;
    App.state.analyticsSessionEvents.openedWhatsapp = true;
    const updatePayload = {
      'behavior.whatsappClick': payload,
      'behavior.openedWhatsapp': true,
      'behavior.buttonExposure': buttonExposurePayload
    };

    console.log('[Behavior Analytics] trackWhatsAppClick writing session update', {
      sessionId: App.state.analyticsSessionId || null,
      sessionRefPath: sessionRef?.path || null,
      updatePayload
    });

    updateSessionDocument(updatePayload);
  }

  function trackRageClick() {
    const clicks = App.state.analyticsRageClickTimestamps || [];
    const now = getTimestamp();
    const windowStart = now - RAGE_CLICK_WINDOW_MS;
    const recent = clicks.filter((timestamp) => timestamp >= windowStart);
    recent.push(now);
    App.state.analyticsRageClickTimestamps = recent;
    if (recent.length >= RAGE_CLICK_THRESHOLD) {
      App.state.analyticsSessionEvents.rageClicks = (App.state.analyticsSessionEvents.rageClicks || 0) + 1;
      updateSessionDocument({ 'behavior.rageClicks': App.state.analyticsSessionEvents.rageClicks });
      App.state.analyticsRageClickTimestamps = [];
    }
  }

  function updateActiveTimeState() {
    if (!App.state.behaviorAnalyticsActiveTime) {
      return;
    }
    const isVisible = document.visibilityState === 'visible';
    const isFocused = document.hasFocus();
    const shouldBeActive = isVisible && isFocused;

    if (shouldBeActive && !App.state.behaviorAnalyticsActiveTime.active) {
      App.state.behaviorAnalyticsActiveTime.active = true;
      App.state.behaviorAnalyticsActiveTime.startedAt = getTimestamp();
    }

    if (!shouldBeActive && App.state.behaviorAnalyticsActiveTime.active) {
      App.state.behaviorAnalyticsActiveTime.accumulated += Math.max(0, getTimestamp() - (App.state.behaviorAnalyticsActiveTime.startedAt || getTimestamp()));
      App.state.behaviorAnalyticsActiveTime.active = false;
      App.state.behaviorAnalyticsActiveTime.startedAt = null;
    }
  }

  function getActiveTimeMs() {
    if (!App.state.behaviorAnalyticsActiveTime) {
      return 0;
    }
    let total = App.state.behaviorAnalyticsActiveTime.accumulated;
    if (App.state.behaviorAnalyticsActiveTime.active && App.state.behaviorAnalyticsActiveTime.startedAt) {
      total += Math.max(0, getTimestamp() - App.state.behaviorAnalyticsActiveTime.startedAt);
    }
    return Math.round(total);
  }

  async function flushSessionSummary(reason) {
    if (!App.state.analyticsSessionId || App.state.analyticsSessionFlushed) {
      return;
    }
    App.state.analyticsSessionFlushed = true;
    updateActiveTimeState();

    finalizeButtonExposureAtEnd();
    const buttonExposurePayload = getButtonExposurePayload();

    const exitPayload = {
      timestamp: new Date().toISOString(),
      reason: reason || (document.visibilityState === 'hidden' ? 'hidden' : 'unload'),
      totalTimeMs: Math.round(getTimestamp() - (App.state.analyticsSessionStartedAt || getTimestamp())),
      activeTimeMs: getActiveTimeMs(),
      maxScrollPercent: App.state.analyticsSessionEvents.maxScrollPercent || 0,
      sawButton: Boolean(App.state.analyticsSessionEvents.sawButton),
      didScroll: Boolean(App.state.analyticsSessionEvents.hasScrolled),
      didClick: Boolean(App.state.analyticsSessionEvents.hasClicked),
      openedWhatsapp: Boolean(App.state.analyticsSessionEvents.openedWhatsapp)
    };

    const sessionPayload = {
      exit: exitPayload,
      behavior: {
        hero: App.state.analyticsSessionEvents.hero || null,
        buttonVisible: App.state.analyticsSessionEvents.buttonVisible || null,
        firstScroll: App.state.analyticsSessionEvents.firstScroll || null,
        maxScrollPercent: App.state.analyticsSessionEvents.maxScrollPercent || 0,
        totalClicks: App.state.analyticsSessionEvents.totalClicks || 0,
        totalTaps: App.state.analyticsSessionEvents.totalTaps || 0,
        rageClicks: App.state.analyticsSessionEvents.rageClicks || 0,
        sawButton: Boolean(App.state.analyticsSessionEvents.sawButton),
        hasScrolled: Boolean(App.state.analyticsSessionEvents.hasScrolled),
        hasClicked: Boolean(App.state.analyticsSessionEvents.hasClicked),
        openedWhatsapp: Boolean(App.state.analyticsSessionEvents.openedWhatsapp),
        buttonExposure: buttonExposurePayload
      },
      performance: App.state.behaviorAnalyticsPerformance || {},
      landingReady: App.state.analyticsSessionEvents.landingReady || null,
      buttonReady: App.state.analyticsSessionEvents.buttonReadyDetails || null
    };

    await updateSessionDocument(sessionPayload);
  }

  async function markLandingReadyAfterInitialization() {
    if (App.state.analyticsSessionEvents?.landingReady) {
      return;
    }

    const startTime = App.state.pageLoadTime || getTimestamp();
    const firestorePromise = App.state.ensureFirebaseServices();
    const remoteConfigPromise = App.storage?.getRemoteConfig?.().catch((error) => ({ error }));
    const buttonPromise = App.whatsapp?.initializeButton?.().catch((error) => ({ error }));

    const [firebaseResult, remoteConfigResult, buttonResult] = await Promise.allSettled([firestorePromise, remoteConfigPromise, buttonPromise]);

    const now = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : getTimestamp();
    const elapsedSinceLoadMs = Math.max(0, Math.round(now - startTime));
    const firebaseReadyMs = !firebaseResult.reason ? elapsedSinceLoadMs : null;
    const remoteConfigReadyMs = !remoteConfigResult.reason ? elapsedSinceLoadMs : null;
    const buttonReadyMs = App.state.whatsappButtonReady ? elapsedSinceLoadMs : null;
    const buttonError = buttonResult.status === 'rejected' ? buttonResult.reason : buttonResult.value?.error || null;

    setLandingReadyEvent({
      firebaseReadyMs,
      firestoreReadyMs: firebaseReadyMs,
      remoteConfigReadyMs,
      buttonReadyMs,
      buttonReadyError: buttonError ? String(buttonError) : null
    });
  }

  function observeHeroIntersection() {
    const hero = document.querySelector('.hero-header');
    if (!hero || !window.IntersectionObserver) {
      return;
    }

    const observer = new IntersectionObserver((entries, observerInstance) => {
      const entry = entries.find((item) => item.isIntersecting);
      if (!entry) {
        return;
      }
      trackHeroVisible(entry);
      observerInstance.disconnect();
    }, {
      threshold: [0.1, 0.25, 0.5, 0.75, 1]
    });
    observer.observe(hero);
  }

  function observeButtonIntersection() {
    const button = document.getElementById('whatsapp-button');
    if (!button || !window.IntersectionObserver) {
      return;
    }

    if (App.state.analyticsButtonObserver) {
      return;
    }

    const observer = new IntersectionObserver((entries, observerInstance) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      updateButtonExposureState(entry);
      if (entry.isIntersecting) {
        trackButtonVisible(entry);
      }
      if (App.state.analyticsSessionEvents?.whatsappClick) {
        observerInstance.disconnect();
        App.state.analyticsButtonObserver = null;
      }
    }, {
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
    });
    App.state.analyticsButtonObserver = observer;
    observer.observe(button);
  }

  function observeScrollEvents() {
    let lastScrollY = null;
    const handleScroll = () => {
      if (lastScrollY === null) {
        lastScrollY = window.scrollY || window.pageYOffset || 0;
      }
      trackScrollProgress();
      if (!App.state.analyticsSessionEvents?.firstScroll) {
        trackFirstScroll();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  function observeInteractionEvents() {
    const handlePointerDown = (event) => {
      if (event.pointerType === 'touch') {
        trackTapInteraction();
      } else {
        trackPointerInteraction(event.pointerType || 'mouse');
      }
    };

    if (window.PointerEvent) {
      window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    } else {
      window.addEventListener('mousedown', handlePointerDown, { passive: true });
      window.addEventListener('touchstart', handleTapInteraction, { passive: true });
    }
  }

  function observeVisibilityAndFocus() {
    const onVisibilityChange = () => {
      updateActiveTimeState();
      if (document.visibilityState === 'hidden') {
        flushSessionSummary('hidden');
      }
    };

    const onFocus = () => updateActiveTimeState();
    const onBlur = () => updateActiveTimeState();

    document.addEventListener('visibilitychange', onVisibilityChange, false);
    window.addEventListener('focus', onFocus, false);
    window.addEventListener('blur', onBlur, false);

    window.addEventListener('pagehide', () => flushSessionSummary('pagehide'), false);
    window.addEventListener('beforeunload', () => flushSessionSummary('beforeunload'), false);
  }

  function observeButtonReadyState() {
    const originalComplete = App.whatsapp?.completeButtonProgress;
    if (typeof originalComplete !== 'function') {
      return;
    }

    App.whatsapp.completeButtonProgress = function () {
      try {
        if (typeof originalComplete === 'function') {
          originalComplete.call(App.whatsapp);
        }
      } finally {
        setButtonReadyDetails(null);
      }
    };
  }

  async function initSessionAnalytics() {
    if (App.state.analyticsSessionInitialized) {
      return;
    }
    App.state.analyticsSessionInitialized = true;
    await createSessionDocument();
    initializePerformanceMetrics();
    updateActiveTimeState();
    observeHeroIntersection();
    observeButtonIntersection();
    observeScrollEvents();
    observeInteractionEvents();
    observeVisibilityAndFocus();
    observeButtonReadyState();
    markLandingReadyAfterInitialization().catch((error) => {
      console.warn('[behavior-analytics] error al marcar landing ready', error);
      setLandingReadyEvent({
        firebaseReadyMs: null,
        firestoreReadyMs: null,
        remoteConfigReadyMs: null,
        buttonReadyMs: App.state.whatsappButtonReady ? getRelativeTimeMs() : null,
        buttonReadyError: error ? String(error) : null
      });
    });
  }

  App.analytics.initSessionAnalytics = initSessionAnalytics;
  App.analytics.trackBehaviorWhatsAppClick = trackWhatsAppClick;
  App.analytics.trackBehaviorRageClick = trackRageClick;
  App.analytics.flushSessionSummary = flushSessionSummary;
})(window);
