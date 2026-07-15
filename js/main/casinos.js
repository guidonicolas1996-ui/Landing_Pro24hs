(function (global) {
  const App = global.App || (global.App = {});
  App.casinos = App.casinos || {};

  function getSortedCasinoIds() {
    if (Array.isArray(App.state.dynamicCasinoOrder) && App.state.dynamicCasinoOrder.length) {
      return App.state.dynamicCasinoOrder.filter((id) => App.state.dynamicCasinos[id]);
    }

    return Object.keys(App.state.dynamicCasinos).sort((a, b) => {
      const aNum = parseInt((a.match(/(\d+)$/) || [])[0] || a, 10);
      const bNum = parseInt((b.match(/(\d+)$/) || [])[0] || b, 10);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });
  }

  function getActiveCasinos() {
    return getSortedCasinoIds().filter((id) => App.state.dynamicCasinos[id]?.active);
  }

  function getDefaultCasino() {
    const activeCasinos = getActiveCasinos();
    return activeCasinos.length ? activeCasinos[0] : getSortedCasinoIds()[0] || 'casino_1';
  }

  function getStoredActiveCasino() {
    const activeCasinos = getActiveCasinos();
    return activeCasinos.length ? activeCasinos[0] : getSortedCasinoIds()[0] || 'casino_1';
  }

  function getStoredActiveCasinos() {
    return getActiveCasinos() || [];
  }

  function setCheckboxStates(activeCasinoIds) {
    const checkboxInputs = document.querySelectorAll('input[name="theme-select"][type="checkbox"]');
    if (!checkboxInputs.length) return;

    checkboxInputs.forEach((input) => {
      input.checked = activeCasinoIds.includes(input.value);
    });
  }

  function setStoredActiveCasino(casinoId) {
    // Se maneja a través de dynamicCasinos
  }

  function setStoredActiveCasinos(casinoIds) {
    // Se maneja a través de dynamicCasinos
  }

  async function setActiveCasinos(casinoIds) {
    const normalized = casinoIds.filter((id) => App.state.dynamicCasinos[id]);
    const finalCasinos = normalized.length ? normalized : [getDefaultCasino()];

    App.state.activeThemes = finalCasinos;
    App.state.activeTheme = finalCasinos[0];
    setStoredActiveCasinos(finalCasinos);
    setStoredActiveCasino(App.state.activeTheme);

    Object.keys(App.state.dynamicCasinos).forEach((id) => {
      App.state.dynamicCasinos[id].active = finalCasinos.includes(id);
    });

    try {
      await App.storage.saveDynamicCasinos();
    } catch (error) {
      console.warn('Error guardando estado activo de casinos:', error);
    }

    return App.state.activeTheme;
  }

  function getImageUrl(imageRecord) {
    return typeof imageRecord === 'string'
      ? imageRecord
      : (imageRecord && imageRecord.url)
        ? imageRecord.url
        : null;
  }

  function getCarouselItems(carouselId, hasMascot = true) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return null;
    const hasLogo = !hasMascot;

    const createItem = (id, cssClass, ariaHidden = false) => {
      const item = document.createElement('div');
      item.id = id;
      item.className = `mascot-carousel__item ${cssClass}`;
      item.alt = '';
      if (ariaHidden) {
        item.setAttribute('aria-hidden', 'true');
      }

      if (hasLogo) {
        const logo = document.createElement('img');
        logo.className = 'mascot-carousel__logo';
        logo.alt = '';
        item.appendChild(logo);
      }

      if (hasMascot) {
        const mascot = document.createElement('img');
        mascot.className = 'hero-header__mascot mascot-carousel__image';
        mascot.alt = '';
        item.appendChild(mascot);
      }

      return item;
    };

    const left = document.getElementById(`${carouselId === 'mascot-carousel' ? 'mascot' : 'logo'}-left`);
    const center = document.getElementById(`${carouselId === 'mascot-carousel' ? 'active-mascot' : 'active-logo'}`);
    const right = document.getElementById(`${carouselId === 'mascot-carousel' ? 'mascot' : 'logo'}-right`);
    const hidden1 = document.getElementById(`${carouselId === 'mascot-carousel' ? 'mascot-hidden-1' : 'logo-hidden-1'}`);
    const hidden2 = document.getElementById(`${carouselId === 'mascot-carousel' ? 'mascot-hidden-2' : 'logo-hidden-2'}`);

    const ensureMascotImage = (item) => {
      if (!hasMascot) return null;
      let mascot = item.querySelector('.mascot-carousel__image');
      if (!mascot) {
        mascot = document.createElement('img');
        mascot.className = 'hero-header__mascot mascot-carousel__image';
        mascot.alt = '';
        item.appendChild(mascot);
      }

      if (!mascot.getAttribute('data-default-src')) {
        mascot.setAttribute('data-default-src', mascot.getAttribute('src') || './img/mascot.png');
      }

      return mascot;
    };

    const ensureLogoImage = (item) => {
      let logo = item.querySelector('.mascot-carousel__logo');
      if (!logo) {
        logo = document.createElement('img');
        logo.className = 'mascot-carousel__logo';
        logo.alt = '';
        item.insertBefore(logo, item.firstChild);
      }

      if (!logo.getAttribute('data-default-src')) {
        logo.setAttribute('data-default-src', logo.getAttribute('src') || './img/logo_view.png');
      }

      return logo;
    };

    const ensureItem = (existing, id, cssClass, ariaHidden) => {
      if (existing) return existing;
      const item = createItem(id, cssClass, ariaHidden);
      carousel.appendChild(item);
      return item;
    };

    const leftItem = ensureItem(left, `${carouselId === 'mascot-carousel' ? 'mascot' : 'logo'}-left`, 'mascot-carousel__item--left', true);
    const centerItem = ensureItem(center, `${carouselId === 'mascot-carousel' ? 'active-mascot' : 'active-logo'}`, 'mascot-carousel__item--center');
    const rightItem = ensureItem(right, `${carouselId === 'mascot-carousel' ? 'mascot' : 'logo'}-right`, 'mascot-carousel__item--right', true);
    const hidden1Item = ensureItem(hidden1, `${carouselId === 'mascot-carousel' ? 'mascot-hidden-1' : 'logo-hidden-1'}`, 'mascot-carousel__item--hidden', true);
    const hidden2Item = ensureItem(hidden2, `${carouselId === 'mascot-carousel' ? 'mascot-hidden-2' : 'logo-hidden-2'}`, 'mascot-carousel__item--hidden', true);

    [leftItem, centerItem, rightItem, hidden1Item, hidden2Item].forEach((item) => {
      if (hasMascot) {
        ensureMascotImage(item);
      }
      if (!hasMascot) {
        ensureLogoImage(item);
      }
    });

    return { left: leftItem, center: centerItem, right: rightItem, hidden1: hidden1Item, hidden2: hidden2Item };
  }

  function getMascotCarouselItems() {
    return getCarouselItems('mascot-carousel', true);
  }

  function updateMascotCarousel(casinoId, carouselId = 'mascot-carousel', hasMascot = true, animate = true) {
    const themeIds = Array.isArray(App.state.activeThemes) && App.state.activeThemes.length
      ? App.state.activeThemes
      : [casinoId || getDefaultCasino()];

    if (!themeIds.length) return;

    const items = getCarouselItems(carouselId, hasMascot);
    if (!items) return;

    const { left, center, right, hidden1, hidden2 } = items;
    const currentThemeId = casinoId || App.state.activeTheme || themeIds[0];
    const currentIndex = themeIds.indexOf(currentThemeId);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const count = themeIds.length;
    const loopedThemeIds = count === 2 ? [...themeIds, ...themeIds] : themeIds;

    const normalizeIndex = (index, length) => ((index % length) + length) % length;
    const getThemeAtOffset = (baseIndex, offset) => {
      if (count === 1) return themeIds[0];
      const normalizedIndex = normalizeIndex(baseIndex + offset, loopedThemeIds.length);
      return loopedThemeIds[normalizedIndex];
    };

    const previousThemeId = center.getAttribute('data-casino-id') || currentThemeId;
    const previousIndex = themeIds.indexOf(previousThemeId);
    const isNextStep = previousIndex >= 0 && normalizeIndex(safeIndex - previousIndex, count) === 1;
    const shouldAnimate = animate && previousThemeId && previousThemeId !== currentThemeId && count > 1 && isNextStep;

    const currentSlotThemes = {
      hidden1: getThemeAtOffset(previousIndex >= 0 ? previousIndex : safeIndex, 2),
      left: getThemeAtOffset(previousIndex >= 0 ? previousIndex : safeIndex, -1),
      center: getThemeAtOffset(previousIndex >= 0 ? previousIndex : safeIndex, 0),
      right: getThemeAtOffset(previousIndex >= 0 ? previousIndex : safeIndex, 1),
      hidden2: getThemeAtOffset(previousIndex >= 0 ? previousIndex : safeIndex, 3)
    };

    const nextSlotThemes = {
      hidden1: getThemeAtOffset(safeIndex, 2),
      left: getThemeAtOffset(safeIndex, -1),
      center: getThemeAtOffset(safeIndex, 0),
      right: getThemeAtOffset(safeIndex, 1),
      hidden2: getThemeAtOffset(safeIndex, 3)
    };

    const applyImagesForTheme = (item, themeId) => {
      const logo = item.querySelector('.mascot-carousel__logo');
      const mascot = hasMascot ? item.querySelector('.mascot-carousel__image') : null;
      const logoFallbackUrl = logo?.getAttribute('data-default-src') || logo?.getAttribute('src') || './img/logo_view.png';
      const logoUrl = getImageUrl(App.state.dynamicCasinos[themeId]?.logo) || logoFallbackUrl;

      if (logo && !hasMascot) {
        logo.src = logoUrl;
        logo.alt = App.state.dynamicCasinos[themeId]?.label || '';
        logo.setAttribute('data-casino-id', themeId);
      }

      if (mascot) {
        const mascotFallbackUrl = mascot?.getAttribute('data-default-src') || mascot?.getAttribute('src') || './img/mascot.png';
        const mascotUrl = getImageUrl(App.state.dynamicCasinos[themeId]?.mascot) || mascotFallbackUrl;
        mascot.src = mascotUrl;
        mascot.alt = App.state.dynamicCasinos[themeId]?.label || '';
        mascot.setAttribute('data-casino-id', themeId);
      }

      item.setAttribute('data-casino-id', themeId);
    };

    const removeStateClasses = (item) => {
      item.classList.remove(
        'mascot-carousel__item--left',
        'mascot-carousel__item--center',
        'mascot-carousel__item--right',
        'mascot-carousel__item--hidden',
        'mascot-carousel__item--hidden-behind',
        'mascot-carousel__item--incoming-right',
        'mascot-carousel__item--transition-left',
        'mascot-carousel__item--transition-center',
        'mascot-carousel__item--transition-right',
        'mascot-carousel__item--animate-center-to-left',
        'mascot-carousel__item--animate-right-to-center',
        'mascot-carousel__item--animate-left-to-right',
        'mascot-carousel__item--animate-hidden-to-right',
        'mascot-carousel__item--animate-left-to-hidden'
      );
    };

    const setState = (item, state) => {
      removeStateClasses(item);
      item.classList.add(state);
    };

    const animateItem = (item, animationClass) => {
      removeStateClasses(item);
      item.classList.add(animationClass);
    };

    [left, center, right, hidden1, hidden2].forEach((item) => {
      if (!item.getAttribute('data-default-src')) {
        item.setAttribute('data-default-src', item.querySelector('.mascot-carousel__image')?.getAttribute('src') || './img/mascot.png');
      }
    });

    const effectiveCount = count === 2 ? 4 : count;
    const hiddenState = effectiveCount <= 3 ? 'mascot-carousel__item--hidden' : 'mascot-carousel__item--hidden-behind';

    const setFinalStates = () => {
      setState(hidden1, count === 1 ? 'mascot-carousel__item--hidden' : hiddenState);
      setState(left, count === 1 ? 'mascot-carousel__item--hidden' : 'mascot-carousel__item--left');
      setState(center, 'mascot-carousel__item--center');
      setState(right, count === 1 ? 'mascot-carousel__item--hidden' : 'mascot-carousel__item--right');
      setState(hidden2, count === 1 ? 'mascot-carousel__item--hidden' : hiddenState);
    };

    const assignThemeToSlots = (themeMap) => {
      if (count === 1) {
        applyImagesForTheme(center, themeMap.center);
        return;
      }

      applyImagesForTheme(left, themeMap.left);
      applyImagesForTheme(center, themeMap.center);
      applyImagesForTheme(right, themeMap.right);
      applyImagesForTheme(hidden1, themeMap.hidden1);
      applyImagesForTheme(hidden2, themeMap.hidden2);
    };

    if (!shouldAnimate) {
      assignThemeToSlots(nextSlotThemes);
      setFinalStates();
      return;
    }

    assignThemeToSlots(currentSlotThemes);
    animateItem(center, 'mascot-carousel__item--animate-center-to-left');
    animateItem(right, 'mascot-carousel__item--animate-right-to-center');

    const useHiddenFlow = carouselId === 'logo-carousel' || effectiveCount > 3;
    if (useHiddenFlow) {
      animateItem(left, 'mascot-carousel__item--animate-left-to-hidden');
      animateItem(hidden1, 'mascot-carousel__item--animate-hidden-to-right');
      setState(hidden2, 'mascot-carousel__item--hidden-behind');
    } else {
      animateItem(left, 'mascot-carousel__item--animate-left-to-right');
    }

    void left.offsetWidth;
    void center.offsetWidth;
    void right.offsetWidth;

    const candidates = [left, center, right, hidden1, hidden2];
    const animatedEls = candidates.filter((el) => {
      if (!el) return false;
      return Array.from(el.classList).some((cn) => cn.startsWith('mascot-carousel__item--animate-'));
    });

    if (animatedEls.length === 0) {
      assignThemeToSlots(nextSlotThemes);
      setFinalStates();
    } else {
      let finished = 0;
      const cleanup = () => {
        animatedEls.forEach((el) => el.removeEventListener('animationend', onEnd));
      };

      const onEnd = (e) => {
        finished += 1;
        e.currentTarget.removeEventListener('animationend', onEnd);
        if (finished >= animatedEls.length) {
          clearTimeout(fallbackTimeout);
          cleanup();
          assignThemeToSlots(nextSlotThemes);
          setFinalStates();
        }
      };

      animatedEls.forEach((el) => el.addEventListener('animationend', onEnd));

      const fallbackTimeout = window.setTimeout(() => {
        cleanup();
        assignThemeToSlots(nextSlotThemes);
        setFinalStates();
      }, 2500);
    }
  }

  function applyRandomBackground() {
    const fallback = './img/background.png';
    const selectedBackground = App.config.BACKGROUND_IMAGES[Math.floor(Math.random() * App.config.BACKGROUND_IMAGES.length)] || fallback;
    document.documentElement.style.setProperty('--background-image', `url("${selectedBackground}")`);
  }

  function stopThemeRotation() {
    if (App.state.rotationTimerId) {
      window.clearInterval(App.state.rotationTimerId);
      App.state.rotationTimerId = null;
    }
  }

  function refreshThemeRotation() {
    stopThemeRotation();

    if (window.location.pathname.includes('settings') || window.location.pathname.includes('analytics')) {
      return;
    }

    if (!Array.isArray(App.state.activeThemes) || App.state.activeThemes.length <= 1) {
      return;
    }

    App.state.rotationTimerId = window.setInterval(rotateTheme, 5000);
  }

  function applyTheme(casinoId, options = {}) {
    const { animate = true } = options;
    const safeCasino = App.state.dynamicCasinos[casinoId] ? casinoId : getDefaultCasino();
    App.state.activeTheme = safeCasino;
    document.body.setAttribute('data-theme', safeCasino);
    setStoredActiveCasino(safeCasino);

    const mascot = document.getElementById('active-mascot') || document.querySelector('.mascot-carousel__item--center');
    const cards = document.querySelectorAll('[data-theme-card]');

    cards.forEach((card) => {
      card.classList.toggle('is-active', App.state.activeThemes.includes(card.getAttribute('data-theme-card')));
    });

    if (!App.state.dynamicCasinos[safeCasino]) {
      return;
    }

    if (mascot) {
      updateMascotCarousel(safeCasino, 'mascot-carousel', true, animate);
      updateMascotCarousel(safeCasino, 'logo-carousel', false, animate);
    }

    const colorVars = App.generateColorVariations(App.state.dynamicCasinos[safeCasino].color);
    document.documentElement.style.setProperty('--primary-color', colorVars.medium);
    document.documentElement.style.setProperty('--primary-light', colorVars.light);
    document.documentElement.style.setProperty('--primary-dark', colorVars.dark);
    document.documentElement.style.setProperty('--theme-primary', colorVars.medium);
    document.documentElement.style.setProperty('--theme-primary-strong', colorVars.dark);
    document.documentElement.style.setProperty('--theme-accent', colorVars.light);

    refreshThemeRotation();
  }

  function rotateTheme() {
    if (!App.state.activeThemes.length) {
      App.state.activeThemes = [getDefaultCasino()];
    }

    if (App.state.activeThemes.length === 1) {
      return;
    }

    const currentIndex = App.state.activeThemes.indexOf(App.state.activeTheme);
    const nextTheme = App.state.activeThemes[(currentIndex + 1) % App.state.activeThemes.length] || App.state.activeThemes[0];
    applyTheme(nextTheme);
  }

  function applyRemoteThemes(remoteCasinos) {
    if (!remoteCasinos || !Array.isArray(remoteCasinos)) return;

    const normalized = remoteCasinos.filter((id) => App.state.dynamicCasinos[id]);
    if (!normalized.length) return;

    App.state.activeThemes = normalized;
    App.state.activeTheme = App.state.activeThemes[0];
    setCheckboxStates(App.state.activeThemes);
    applyTheme(App.state.activeTheme);
  }

  async function observeRemoteConfig() {
    try {
      const { db, doc, onSnapshot } = await App.state.ensureFirebaseServices();
      onSnapshot(doc(db, App.config.FIRESTORE_COLLECTION, App.config.FIRESTORE_DOCUMENT), (snapshot) => {
        if (!snapshot.exists()) return;
        const config = snapshot.data();
        if (!config) return;

        if (config.casinos && typeof config.casinos === 'object') {
          App.state.dynamicCasinos = config.casinos;
          if (config.casinoOrder && Array.isArray(config.casinoOrder)) {
            App.state.dynamicCasinoOrder = config.casinoOrder;
          } else {
            App.state.dynamicCasinoOrder = Object.keys(App.state.dynamicCasinos || {}).sort((a, b) => {
              const aNum = parseInt((a.match(/(\d+)$/) || [])[0] || a, 10);
              const bNum = parseInt((b.match(/(\d+)$/) || [])[0] || b, 10);
              if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
                return aNum - bNum;
              }
              return a.localeCompare(b);
            });
          }
          App.state.activeThemes = getActiveCasinos();
          App.state.activeTheme = App.state.activeThemes[0] || getDefaultCasino();
          setCheckboxStates(App.state.activeThemes);
          applyTheme(App.state.activeTheme, { animate: false });
          refreshThemeRotation();
          if (window.location.pathname.includes('settings')) {
            if (typeof window.renderCasinos === 'function') {
              window.renderCasinos();
            }
          }
        }
      });
    } catch (error) {
      console.error('Error suscribiéndose a la configuración remota:', error);
    }
  }

  App.casinos.getSortedCasinoIds = getSortedCasinoIds;
  App.casinos.getActiveCasinos = getActiveCasinos;
  App.casinos.getDefaultCasino = getDefaultCasino;
  App.casinos.getStoredActiveCasino = getStoredActiveCasino;
  App.casinos.getStoredActiveCasinos = getStoredActiveCasinos;
  App.casinos.setCheckboxStates = setCheckboxStates;
  App.casinos.setStoredActiveCasino = setStoredActiveCasino;
  App.casinos.setStoredActiveCasinos = setStoredActiveCasinos;
  App.casinos.setActiveCasinos = setActiveCasinos;
  App.casinos.getCarouselItems = getCarouselItems;
  App.casinos.getMascotCarouselItems = getMascotCarouselItems;
  App.casinos.updateMascotCarousel = updateMascotCarousel;
  App.casinos.applyRandomBackground = applyRandomBackground;
  App.casinos.stopThemeRotation = stopThemeRotation;
  App.casinos.refreshThemeRotation = refreshThemeRotation;
  App.casinos.applyTheme = applyTheme;
  App.casinos.rotateTheme = rotateTheme;
  App.casinos.applyRemoteThemes = applyRemoteThemes;
  App.casinos.observeRemoteConfig = observeRemoteConfig;
})(window);
