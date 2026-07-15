(function (global) {
  const App = global.App || (global.App = {});
  App.antibot = App.antibot || {};

  let lastInteractionAt = 0;

  function updateTrustScore(delta = 0) {
    App.state.trustScore = Math.max(0, Math.min(100, (App.state.trustScore || 0) + delta));
  }

  function markInteraction() {
    lastInteractionAt = Date.now();
    App.state.userInteractions.genuineInteractions += 1;
    if (App.state.userInteractions.mouseMovements >= 0) {
      App.state.userInteractions.mouseMovements += 1;
    }
    updateTrustScore(1);
  }

  function detectSuspiciousUserAgent() {
    const ua = navigator.userAgent.toLowerCase();
    const botPatterns = ['headless', 'phantom', 'selenium', 'webdriver', 'chrome-lighthouse', 'googlebot', 'bingbot', 'facebookexternalhit'];
    return botPatterns.some((pattern) => ua.includes(pattern));
  }

  function detectHeadlessBrowser() {
    const checks = [
      !window.chrome,
      navigator.webdriver === true,
      window.outerHeight === 0,
      window.outerWidth === 0,
      screen.colorDepth < 24,
      typeof navigator.permissions === 'undefined'
    ];
    return checks.filter(Boolean).length > 2;
  }

  function detectSuspiciousTimezone() {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = new Date().getTimezoneOffset();
      return timezone === 'UTC' || Math.abs(offset) === 0;
    } catch (error) {
      return true;
    }
  }

  async function detectVPNProxy() {
    try {
      const connection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      const ips = [];
      connection.onicecandidate = (event) => {
        if (!event.candidate) {
          connection.close();
          return;
        }
        const match = event.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (match) {
          ips.push(match[1]);
        }
      };
      connection.createDataChannel('test');
      await connection.createOffer();
      return false;
    } catch (error) {
      return false;
    }
  }

  function trackUserBehavior() {
    document.addEventListener('mousemove', () => {
      App.state.userInteractions.mouseMovements += 1;
      App.state.userInteractions.genuineInteractions += 1;
    }, { passive: true });

    document.addEventListener('scroll', () => {
      App.state.userInteractions.scrolls += 1;
      App.state.userInteractions.genuineInteractions += 1;
    }, { passive: true });

    document.addEventListener('keydown', () => {
      App.state.userInteractions.keyPresses += 1;
      App.state.userInteractions.genuineInteractions += 1;
    }, { passive: true });

    document.addEventListener('touchstart', () => {
      App.state.userInteractions.touches += 1;
      App.state.userInteractions.genuineInteractions += 1;
    }, { passive: true });

    setInterval(() => {
      App.state.userInteractions.timeOnPage = Math.floor((Date.now() - App.state.pageLoadTime) / 1000);
    }, 1000);
  }

  function calculateTrustScore() {
    let score = 100;
    Object.values(App.state.botDetectionFlags).forEach((flag) => {
      if (flag) score -= 15;
    });
    if (App.state.userInteractions.genuineInteractions < 3) score -= 25;
    if (App.state.userInteractions.mouseMovements < 5) score -= 20;
    if (App.state.userInteractions.timeOnPage < 3) score -= 15;
    if (App.state.userInteractions.mouseMovements > 20) score += 5;
    if (App.state.userInteractions.scrolls > 5) score += 5;
    if (App.state.userInteractions.timeOnPage > 10) score += 10;
    App.state.trustScore = Math.max(0, Math.min(100, score));
    return App.state.trustScore;
  }

  async function initBotDetection() {
    App.state.botDetectionFlags.suspiciousUserAgent = detectSuspiciousUserAgent();
    App.state.botDetectionFlags.headlessBrowser = detectHeadlessBrowser();
    App.state.botDetectionFlags.suspiciousTimezone = detectSuspiciousTimezone();
    App.state.botDetectionFlags.vpnDetected = await detectVPNProxy();
    trackUserBehavior();
    calculateTrustScore();
    return App.state.botDetectionFlags;
  }

  function validateClickSecurity(clickTime) {
    const timeSinceLoad = clickTime - App.state.pageLoadTime;
    if (timeSinceLoad < 1000) {
      App.state.botDetectionFlags.tooFastClick = true;
      return false;
    }
    if (App.state.userInteractions.genuineInteractions < 1 && timeSinceLoad < 3000) {
      App.state.botDetectionFlags.noMouseMovement = true;
      return false;
    }
    return calculateTrustScore() >= 40;
  }

  function observeInteractions() {
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'touchmove'];
    events.forEach((eventName) => {
      document.addEventListener(eventName, markInteraction, { passive: true });
    });

    window.addEventListener('load', () => {
      App.state.pageLoadTime = Date.now();
      updateTrustScore(5);
    });

    window.setInterval(() => {
      const elapsed = Date.now() - lastInteractionAt;
      if (elapsed > 4000) {
        updateTrustScore(-1);
      }
    }, 2000);
  }

  function getTrustScore() {
    return Math.max(0, Math.min(100, App.state.trustScore || 0));
  }

  App.antibot.observeInteractions = observeInteractions;
  App.antibot.updateTrustScore = updateTrustScore;
  App.antibot.getTrustScore = getTrustScore;
  App.antibot.initBotDetection = initBotDetection;
  App.antibot.calculateTrustScore = calculateTrustScore;
  App.antibot.validateClickSecurity = validateClickSecurity;
})(window);
