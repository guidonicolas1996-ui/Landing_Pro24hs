(function (global) {
  const App = global.App || (global.App = {});
  App.dom = App.dom || {};

  App.dom.getElement = function getElement(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
  };

  App.dom.querySelector = function querySelector(selector) {
    return typeof document !== 'undefined' ? document.querySelector(selector) : null;
  };

  App.dom.querySelectorAll = function querySelectorAll(selector) {
    return typeof document !== 'undefined' ? document.querySelectorAll(selector) : [];
  };

  App.dom.cache = function cache() {
    App.dom.elements = {
      accessBadge: App.dom.getElement('access-badge'),
      heroBonusLinePercent: App.dom.getElement('hero-bonus-line-percent'),
      heroBonusLineText: App.dom.getElement('hero-bonus-line-text'),
      heroTitle: App.dom.getElement('hero-title'),
      heroCopy: App.dom.getElement('hero-copy'),
      ctaLabel: App.dom.getElement('cta-label'),
      helperText: App.dom.getElement('helper-text'),
      footerText1: App.dom.getElement('footer-text1'),
      footerText2: App.dom.getElement('footer-text2'),
      promoLabel: App.dom.getElement('promoLabel'),
      promoTitle: App.dom.getElement('promoTitle'),
      promoNote: App.dom.getElement('promoNote'),
      whatsappButton: App.dom.getElement('whatsapp-button'),
      activeMascot: App.dom.getElement('active-mascot'),
      activeLogo: App.dom.getElement('active-logo'),
      mascotCarousel: App.dom.getElement('mascot-carousel'),
      logoCarousel: App.dom.getElement('logo-carousel'),
      themeSelect: App.dom.getElement('theme-select')
    };
    return App.dom.elements;
  };

  App.dom.cache();
})(window);
