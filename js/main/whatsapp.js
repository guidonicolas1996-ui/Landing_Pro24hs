(function (global) {
  const App = global.App || (global.App = {});
  App.whatsapp = App.whatsapp || {};

  function syncButtonUI() {
    const button = document.getElementById('whatsapp-button');
    const fill = button?.querySelector('.whatsapp-button__progress-fill');
    if (!button || !fill) return;

    fill.style.width = `${App.state.whatsappButtonProgressValue || 0}%`;

    if (App.state.whatsappButtonReady) {
      button.disabled = false;
      button.classList.remove('whatsapp-button--loading');
      button.classList.add('whatsapp-button--ready');
      button.removeAttribute('aria-disabled');
    } else {
      button.disabled = true;
      button.classList.add('whatsapp-button--loading');
      button.classList.remove('whatsapp-button--ready');
      button.setAttribute('aria-disabled', 'true');
    }
  }

  function updateButtonProgress(value) {
    App.state.whatsappButtonProgressValue = Math.min(100, Math.max(0, value));
    syncButtonUI();
  }

  function startButtonProgress() {
    if (App.state.whatsappButtonCompleteTimeout) {
      clearTimeout(App.state.whatsappButtonCompleteTimeout);
      App.state.whatsappButtonCompleteTimeout = null;
    }

    App.state.whatsappButtonProgressStartedAt = performance.now();
    App.state.whatsappButtonProgressActive = true;
    App.state.whatsappButtonReady = false;
    updateButtonProgress(16);

    if (App.state.whatsappButtonProgressTimer) {
      clearInterval(App.state.whatsappButtonProgressTimer);
    }

    App.state.whatsappButtonProgressTimer = window.setInterval(() => {
      if (App.state.whatsappButtonProgressValue >= 94) {
        return;
      }
      updateButtonProgress(App.state.whatsappButtonProgressValue + Math.random() * 4 + 2);
    }, 100);
  }

  function completeButtonProgress() {
    if (App.state.whatsappButtonProgressTimer) {
      clearInterval(App.state.whatsappButtonProgressTimer);
      App.state.whatsappButtonProgressTimer = null;
    }

    updateButtonProgress(100);
    const elapsed = performance.now() - App.state.whatsappButtonProgressStartedAt;
    const remaining = Math.max(0, 360 - elapsed);
    App.state.whatsappButtonCompleteTimeout = window.setTimeout(() => {
      App.state.whatsappButtonProgressActive = false;
      App.state.whatsappButtonReady = true;
      syncButtonUI();
      App.state.whatsappButtonCompleteTimeout = null;
    }, remaining);
  }

  function buildWhatsAppUrl() {
    const number = App.config.WHATSAPP_NUMBER || '573001234567';
    const message = encodeURIComponent(App.config.WHATSAPP_MESSAGE || 'Hola, quiero más información.');
    const base = `https://wa.me/${number}`;
    return message ? `${base}?text=${message}` : base;
  }

  async function loadWhatsAppUrlUrgent() {
    startButtonProgress();
    try {
      const remoteConfig = await App.storage?.getRemoteConfig?.();
      if (remoteConfig?.landingContent) {
        const activeLanding = App.content?.getActiveLandingConfig?.(remoteConfig.landingContent);
        if (activeLanding?.whatsappUrl) {
          App.state.landingContent.whatsappUrl = activeLanding.whatsappUrl;
          App.content?.renderContent?.();
        }
      }
    } catch (error) {
      console.warn('WhatsApp URL no se cargó a tiempo:', error);
    } finally {
      completeButtonProgress();
    }
  }

  function handleWhatsAppClick(event) {
    if (event) {
      event.preventDefault();
    }

    if (typeof App.facebook?.handleWhatsAppClick === 'function') {
      App.facebook.handleWhatsAppClick();
    }

    App.analytics?.registerAnalyticsWhatsappClick?.().catch(() => {});
    App.facebook?.enviarEventoFacebook?.().catch(() => {});

    window.setTimeout(() => {
      window.location.href = buildWhatsAppUrl();
    }, 300);
  }

  function bindWhatsAppButtons() {
    const selectors = ['.whatsapp-button', '[data-whatsapp]', '#whatsapp-button'];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((button) => {
        if (!button.dataset.bound) {
          button.addEventListener('click', handleWhatsAppClick);
          button.dataset.bound = 'true';
        }
      });
    });
  }

  function initializeButton() {
    syncButtonUI();
    bindWhatsAppButtons();
    return loadWhatsAppUrlUrgent();
  }

  App.whatsapp.buildWhatsAppUrl = buildWhatsAppUrl;
  App.whatsapp.handleWhatsAppClick = handleWhatsAppClick;
  App.whatsapp.bindWhatsAppButtons = bindWhatsAppButtons;
  App.whatsapp.initializeButton = initializeButton;
  App.whatsapp.syncButtonUI = syncButtonUI;
  App.whatsapp.loadWhatsAppUrlUrgent = loadWhatsAppUrlUrgent;
})(window);
