(function (global) {
  const App = global.App || (global.App = {});
  App.content = App.content || {};

  function renderContent() {
    const elements = App.dom.elements || App.dom.cache();
    const content = App.state.landingContent;

    if (elements.accessBadge) elements.accessBadge.textContent = content.accessBadge;
    if (elements.heroBonusLinePercent || elements.heroBonusLineText) {
      const bonusLineValue = content.heroBonusLine || '';
      const bonusLineParts = String(bonusLineValue).trim().split(/\s+(?=.+)/);
      const percentValue = bonusLineParts[0] || '100%';
      const textValue = bonusLineParts.slice(1).join(' ') || 'DE BONO';
      if (elements.heroBonusLinePercent) elements.heroBonusLinePercent.textContent = percentValue;
      if (elements.heroBonusLineText) elements.heroBonusLineText.textContent = textValue;
    }
    if (elements.heroTitle) elements.heroTitle.innerHTML = content.heroTitle;
    if (elements.heroCopy) elements.heroCopy.textContent = content.heroCopy;
    if (elements.promoLabel) elements.promoLabel.textContent = content.promoLabel;
    if (elements.promoTitle) elements.promoTitle.innerHTML = content.promoTitle;
    if (elements.promoNote) elements.promoNote.textContent = content.promoNote;
    if (elements.ctaLabel) elements.ctaLabel.textContent = content.ctaLabel;
    if (elements.helperText) elements.helperText.textContent = content.helperText;
    if (elements.footerText1) elements.footerText1.textContent = content.footerText1;
    if (elements.footerText2) elements.footerText2.textContent = content.footerText2;
  }

  function getStoredLandingContent() {
    return null;
  }

  function setStoredLandingContent(content) {
    // No se persiste en localStorage; la configuración remota se maneja vía Firebase.
  }

  function getLandingContent() {
    return App.state.landingContent;
  }

  function normalizeAnalyticsSource(rawSource) {
    const srcParam = String(rawSource ?? '').trim().toLowerCase();
    const primarySources = new Set(['', 'primary', 'main', 'principal']);
    if (primarySources.has(srcParam)) {
      return 'primary';
    }

    const altMatch = srcParam.match(/^alt(?:[_-]?([1-5]))?$/);
    if (altMatch) {
      return altMatch[1] ? `alt${altMatch[1]}` : 'alt1';
    }

    const legacyAltMatch = srcParam.match(/^alternative(?:[_-]?([1-5]))?$/);
    if (legacyAltMatch) {
      return legacyAltMatch[1] ? `alt${legacyAltMatch[1]}` : 'alt1';
    }

    return 'primary';
  }

  function normalizeLandingSource(rawSource) {
    const srcParam = String(rawSource ?? '').trim().toLowerCase();
    if (!srcParam || ['primary', 'main', 'principal'].includes(srcParam)) {
      return '';
    }

    const altMatch = srcParam.match(/^alt(?:[_-]?([1-5]))?$/);
    if (altMatch) {
      return altMatch[1] ? `alt${altMatch[1]}` : 'alt1';
    }

    const legacyAltMatch = srcParam.match(/^alternative(?:[_-]?([1-5]))?$/);
    if (legacyAltMatch) {
      return legacyAltMatch[1] ? `alt${legacyAltMatch[1]}` : 'alt1';
    }

    return '';
  }

  function hydrateAnalyticsSourceFromUrl() {
    const params = new URLSearchParams(global.window?.location?.search || '');
    const srcParamRaw = params.get('src') || '';
    const source = normalizeAnalyticsSource(srcParamRaw);
    App.state.analyticsSource = source;
    window.__activeLandingSource = normalizeLandingSource(srcParamRaw);
    return source;
  }

  function getActiveLandingConfig(configData) {
    const source = typeof window !== 'undefined' && window.__activeLandingSource
      ? window.__activeLandingSource
      : (new URLSearchParams(window.location.search).get('src') || '');
    const normalizedSource = normalizeLandingSource(source);

    if (!configData || typeof configData !== 'object') {
      return { ...App.config.DEFAULT_LANDING_CONTENT };
    }

    const general = configData.general && typeof configData.general === 'object' ? configData.general : null;
    const alternatives = configData.alternatives && typeof configData.alternatives === 'object' ? configData.alternatives : {};
    const activeLandingConfig = { ...App.config.DEFAULT_LANDING_CONTENT, ...(general || {}) };

    if (!normalizedSource) {
      return activeLandingConfig;
    }

    const altConfig = alternatives[normalizedSource] && typeof alternatives[normalizedSource] === 'object'
      ? alternatives[normalizedSource]
      : null;
    if (!altConfig) {
      return activeLandingConfig;
    }

    return {
      ...activeLandingConfig,
      ...altConfig
    };
  }

  function setLandingContent(content, saveRemote = true) {
    const landingConfig = content && typeof content === 'object' ? content : {};
    const activeConfig = getActiveLandingConfig(landingConfig);
    const nextContent = {
      ...App.config.DEFAULT_LANDING_CONTENT,
      ...activeConfig
    };

    App.state.landingContent = nextContent;
    renderContent();
    if (saveRemote && typeof App.storage?.saveRemoteConfig === 'function') {
      App.storage.saveRemoteConfig({ landingContent }).catch((e) => console.warn('Error guardando landingContent remoto', e));
    }
    try {
      window.dispatchEvent(new CustomEvent('landingContent:ready', { detail: App.state.landingContent }));
    } catch (e) {
      // ignore
    }
    return App.state.landingContent;
  }

  App.content.renderContent = renderContent;
  App.content.getStoredLandingContent = getStoredLandingContent;
  App.content.setStoredLandingContent = setStoredLandingContent;
  App.content.getLandingContent = getLandingContent;
  App.content.normalizeAnalyticsSource = normalizeAnalyticsSource;
  App.content.normalizeLandingSource = normalizeLandingSource;
  App.content.hydrateAnalyticsSourceFromUrl = hydrateAnalyticsSourceFromUrl;
  App.content.getActiveLandingConfig = getActiveLandingConfig;
  App.content.setLandingContent = setLandingContent;
})(window);
