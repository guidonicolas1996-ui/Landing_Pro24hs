(function (global) {
  const App = global.App || (global.App = {});
  App.config = App.config || {};

  const DEFAULT_LANDING_CONTENT = {
    heroBonusLine: '100% DE BONO',
    accessBadge: 'ACCESO VIP',
    heroTitle: 'BIENVENIDO A TU <span class="gradient-text">CASINO DE CONFIANZA</span>',
    heroCopy: 'Escribinos apretando el botón de abajo',
    promoLabel: 'PARA USUARIOS NUEVOS',
    promoTitle: '<span class="gradient-text">EXTRA</span> DE BONO EN TU <span class="gradient-text">PRIMERA CARGA</span>',
    promoNote: 'CARGAS Y RETIROS AL INSTANTE',
    ctaLabel: 'CARGANDO PROMOCIÓN...',
    helperText: 'CARGAS Y RETIROS AL INSTANTE',
    footerText1: 'Bono no extraíble, válido solo para slots. Mínimo de carga: $2.000.',
    footerText2: 'Advertencia de juego responsable (+18) - © 2026',
    whatsappUrl: ''
  };

  const MAX_CASINOS = 5;
  const BACKGROUND_IMAGES = [
    './img/background1.png',
    './img/background2.png',
    './img/background3.png',
    './img/background4.png',
    './img/background5.png',
    './img/background6.png',
    './img/background7.png',
    './img/background8.png',
    './img/background9.png',
    './img/background10.png'
  ];
  const LOCAL_STORAGE_CASINOS_KEY = 'dynamicCasinos';
  const USE_REMOTE_STORAGE = global.window !== undefined && global.window.location.protocol !== 'file:';

  const REMOTE_CONFIG_CACHE_TTL = 30000;
  const CLOUDINARY_CLOUD_NAME = 'efcbsldh';
  const CLOUDINARY_UPLOAD_PRESET = 'casinos';
  const CLOUDINARY_UPLOAD_PRESET_LOGO = 'casinos_logo';
  const CLOUDINARY_UPLOAD_PRESET_MASCOT = 'casinos_mascot';
  const CLOUDINARY_FOLDER = 'casinos';
  const FIRESTORE_COLLECTION = 'config';
  const FIRESTORE_DOCUMENT = 'landing';
  const ANALYTICS_COLLECTION = 'analytics';
  const ANALYTICS_DOCUMENT = 'landing';
  const WHATSAPP_NUMBER = '573001234567';
  const WHATSAPP_MESSAGE = 'Hola, quiero más información.';
  const FACEBOOK_PIXEL_ID = '1680703513224069';

  App.config.DEFAULT_LANDING_CONTENT = DEFAULT_LANDING_CONTENT;
  App.config.MAX_CASINOS = MAX_CASINOS;
  App.config.BACKGROUND_IMAGES = BACKGROUND_IMAGES;
  App.config.LOCAL_STORAGE_CASINOS_KEY = LOCAL_STORAGE_CASINOS_KEY;
  App.config.USE_REMOTE_STORAGE = USE_REMOTE_STORAGE;
  App.config.REMOTE_CONFIG_CACHE_TTL = REMOTE_CONFIG_CACHE_TTL;
  App.config.CLOUDINARY_CLOUD_NAME = CLOUDINARY_CLOUD_NAME;
  App.config.CLOUDINARY_UPLOAD_PRESET = CLOUDINARY_UPLOAD_PRESET;
  App.config.CLOUDINARY_UPLOAD_PRESET_LOGO = CLOUDINARY_UPLOAD_PRESET_LOGO;
  App.config.CLOUDINARY_UPLOAD_PRESET_MASCOT = CLOUDINARY_UPLOAD_PRESET_MASCOT;
  App.config.CLOUDINARY_FOLDER = CLOUDINARY_FOLDER;
  App.config.FIRESTORE_COLLECTION = FIRESTORE_COLLECTION;
  App.config.FIRESTORE_DOCUMENT = FIRESTORE_DOCUMENT;
  App.config.ANALYTICS_COLLECTION = ANALYTICS_COLLECTION;
  App.config.ANALYTICS_DOCUMENT = ANALYTICS_DOCUMENT;
  App.config.WHATSAPP_NUMBER = WHATSAPP_NUMBER;
  App.config.WHATSAPP_MESSAGE = WHATSAPP_MESSAGE;
  App.config.FACEBOOK_PIXEL_ID = FACEBOOK_PIXEL_ID;

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  App.generateColorVariations = function generateColorVariations(baseColor) {
    const rgb = hexToRgb(baseColor);
    if (!rgb) {
      return {
        light: baseColor,
        medium: baseColor,
        dark: baseColor
      };
    }

    const light = rgbToHex(Math.min(rgb.r + 80, 255), Math.min(rgb.g + 80, 255), Math.min(rgb.b + 80, 255));
    const dark = rgbToHex(Math.max(rgb.r - 60, 0), Math.max(rgb.g - 60, 0), Math.max(rgb.b - 60, 0));

    return {
      light,
      medium: baseColor,
      dark
    };
  };

  App.hexToRgb = hexToRgb;
  App.rgbToHex = rgbToHex;
})(window);
