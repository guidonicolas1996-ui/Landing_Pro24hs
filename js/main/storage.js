(function (global) {
  const App = global.App || (global.App = {});
  App.storage = App.storage || {};

  function getLocalDynamicCasinos() {
    try {
      const stored = localStorage.getItem('dynamicCasinos');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Error leyendo casinos locales de localStorage:', error);
      return {};
    }
  }

  function getLocalCasinoOrder() {
    try {
      const stored = localStorage.getItem(App.config.LOCAL_STORAGE_CASINOS_KEY + ':order');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  function setLocalDynamicCasinos(casinos) {
    try {
      localStorage.setItem('dynamicCasinos', JSON.stringify(casinos || {}));
    } catch (error) {
      console.warn('Error guardando casinos locales en localStorage:', error);
    }
  }

  function setLocalCasinoOrder(order) {
    try {
      localStorage.setItem(App.config.LOCAL_STORAGE_CASINOS_KEY + ':order', JSON.stringify(order || []));
    } catch (error) {
      console.warn('Error guardando orden de casinos locales en localStorage:', error);
    }
  }

  function extractRemoteCasinos(configData) {
    const candidates = [
      configData?.casinos,
      configData?.dynamicCasinos,
      configData?.casinoData,
      configData?.landingContent?.casinos,
      configData?.landingContent?.dynamicCasinos,
      configData?.config?.casinos,
      configData?.config?.dynamicCasinos
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate) && Object.keys(candidate).length) {
        return candidate;
      }
    }

    return null;
  }

  function extractRemoteCasinoOrder(configData) {
    const candidates = [
      configData?.casinoOrder,
      configData?.dynamicCasinoOrder,
      configData?.landingContent?.casinoOrder,
      configData?.landingContent?.dynamicCasinoOrder,
      configData?.config?.casinoOrder,
      configData?.config?.dynamicCasinoOrder
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length) {
        return candidate;
      }
    }

    return null;
  }

  function extractRemoteActiveCasinoIds(configData) {
    const candidates = [
      configData?.activeCasinos,
      configData?.activeCasinoIds,
      configData?.activeCasinoOrder,
      configData?.landingContent?.activeCasinos,
      configData?.landingContent?.activeCasinoIds,
      configData?.config?.activeCasinos,
      configData?.config?.activeCasinoIds
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length) {
        return candidate.filter(Boolean);
      }
    }

    return null;
  }

  function normalizeRemoteCasinos(casinos, activeIds) {
    if (!casinos || typeof casinos !== 'object' || Array.isArray(casinos)) {
      return {};
    }

    const normalized = {};
    const resolvedActiveIds = Array.isArray(activeIds) ? activeIds.filter(Boolean) : [];
    const hasExplicitFlags = Object.values(casinos).some((casino) => {
      if (!casino || typeof casino !== 'object') {
        return false;
      }
      return typeof casino.active === 'boolean' || typeof casino.enabled === 'boolean' || typeof casino.isActive === 'boolean';
    });

    Object.keys(casinos).forEach((id) => {
      const sourceCasino = casinos[id];
      const nextCasino = sourceCasino && typeof sourceCasino === 'object' ? { ...sourceCasino } : { label: sourceCasino };

      if (typeof nextCasino.active !== 'boolean') {
        if (typeof nextCasino.enabled === 'boolean') {
          nextCasino.active = nextCasino.enabled;
        } else if (typeof nextCasino.isActive === 'boolean') {
          nextCasino.active = nextCasino.isActive;
        } else if (resolvedActiveIds.length) {
          nextCasino.active = resolvedActiveIds.includes(id);
        } else if (hasExplicitFlags) {
          nextCasino.active = false;
        } else {
          nextCasino.active = true;
        }
      }

      normalized[id] = nextCasino;
    });

    return normalized;
  }

  async function uploadImageFile(source, casinoId, type) {
    if (typeof source === 'string' && !source.startsWith('data:')) {
      return { url: source, deleteToken: null };
    }

    if (!App.config.USE_REMOTE_STORAGE || !App.config.CLOUDINARY_CLOUD_NAME || !App.config.CLOUDINARY_UPLOAD_PRESET) {
      const url = source instanceof File ? await fileToDataURL(source) : source;
      return { url, deleteToken: null };
    }

    const originalMime = source instanceof File ? source.type : (source.match(/^data:(image\/[^;]+);/) || [])[1] || 'image/jpeg';
    const fileBlob = source instanceof File ? source : dataURLtoBlob(source);
    const fileName = originalMime === 'image/png' ? `${type}.png` : `${type}.jpg`;
    const uploadUrl = `https://api.cloudinary.com/v1_1/${App.config.CLOUDINARY_CLOUD_NAME}/image/upload`;

    const doUpload = async (includeDeleteToken = true) => {
      const formData = new FormData();
      formData.append('file', fileBlob, fileName);
      const presetForType = (type === 'logo' && App.config.CLOUDINARY_UPLOAD_PRESET_LOGO) ? App.config.CLOUDINARY_UPLOAD_PRESET_LOGO
        : (type === 'mascot' && App.config.CLOUDINARY_UPLOAD_PRESET_MASCOT) ? App.config.CLOUDINARY_UPLOAD_PRESET_MASCOT
        : App.config.CLOUDINARY_UPLOAD_PRESET;
      formData.append('upload_preset', presetForType);
      formData.append('folder', `${App.config.CLOUDINARY_FOLDER}/${casinoId}`);
      formData.append('public_id', `${type}-${Date.now()}`);
      formData.append('resource_type', 'image');
      if (includeDeleteToken) {
        formData.append('return_delete_token', 'true');
      }

      const response = await fetch(uploadUrl, { method: 'POST', body: formData });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudinary upload failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      return {
        url: result.secure_url || result.url,
        deleteToken: result.delete_token || null
      };
    };

    try {
      return await doUpload(true);
    } catch (error) {
      const errorText = (error.message || '').toLowerCase();
      if (errorText.includes('return delete token') || errorText.includes('return_delete_token') || errorText.includes('delete token')) {
        console.warn('Cloudinary upload falló por delete token; reintentando sin token:', { casinoId, type, error });
        return await doUpload(false);
      }
      console.error('Cloudinary upload falló y no se realizará fallback base64 en modo remoto:', { source, casinoId, type, error });
      throw error;
    }
  }

  function dataURLtoBlob(dataURL) {
    const [header, base64] = dataURL.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function deleteCloudinaryImage(deleteToken) {
    if (!deleteToken || !App.config.USE_REMOTE_STORAGE || !App.config.CLOUDINARY_CLOUD_NAME) {
      return false;
    }

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${App.config.CLOUDINARY_CLOUD_NAME}/delete_by_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: deleteToken })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudinary delete failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      return result.result === 'ok' || result.result === 'deleted';
    } catch (error) {
      console.warn('Error borrando imagen Cloudinary:', error);
      return false;
    }
  }

  async function loadDynamicCasinos() {
    const localCasinos = getLocalDynamicCasinos();
    const localOrder = getLocalCasinoOrder();

    if (!App.config.USE_REMOTE_STORAGE) {
      App.state.dynamicCasinos = localCasinos;
      App.state.dynamicCasinoOrder = Array.isArray(localOrder) && localOrder.length ? localOrder : Object.keys(localCasinos || {}).sort((a, b) => a.localeCompare(b));
      return App.state.dynamicCasinos;
    }

    try {
      const remoteConfig = await getRemoteConfig();
      const remoteCasinos = extractRemoteCasinos(remoteConfig);
      if (remoteCasinos && typeof remoteCasinos === 'object' && Object.keys(remoteCasinos).length) {
        const activeIds = extractRemoteActiveCasinoIds(remoteConfig);
        App.state.dynamicCasinos = normalizeRemoteCasinos(remoteCasinos, activeIds);
        const remoteOrder = extractRemoteCasinoOrder(remoteConfig);
        App.state.dynamicCasinoOrder = Array.isArray(remoteOrder) && remoteOrder.length
          ? remoteOrder.filter((id) => App.state.dynamicCasinos[id])
          : Object.keys(App.state.dynamicCasinos).sort((a, b) => {
            const aNum = parseInt((a.match(/(\d+)$/) || [])[0] || a, 10);
            const bNum = parseInt((b.match(/(\d+)$/) || [])[0] || b, 10);
            if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
              return aNum - bNum;
            }
            return a.localeCompare(b);
          });
        setLocalDynamicCasinos(App.state.dynamicCasinos);
        setLocalCasinoOrder(App.state.dynamicCasinoOrder);
        return App.state.dynamicCasinos;
      }
    } catch (error) {
      console.warn('Error cargando casinos desde Firebase, usando localStorage como fallback:', error);
    }

    App.state.dynamicCasinos = localCasinos;
    App.state.dynamicCasinoOrder = Array.isArray(localOrder) && localOrder.length ? localOrder : Object.keys(localCasinos || {}).sort((a, b) => a.localeCompare(b));
    return App.state.dynamicCasinos;
  }

  async function saveDynamicCasinos() {
    setLocalDynamicCasinos(App.state.dynamicCasinos);
    try {
      localStorage.setItem(App.config.LOCAL_STORAGE_CASINOS_KEY + ':order', JSON.stringify(App.state.dynamicCasinoOrder || []));
    } catch (e) {}

    if (!App.config.USE_REMOTE_STORAGE) {
      return;
    }

    try {
      const { db, doc, getDoc, setDoc } = await App.state.ensureFirebaseServices();
      const snapshot = await getDoc(doc(db, App.config.FIRESTORE_COLLECTION, App.config.FIRESTORE_DOCUMENT));
      const currentConfig = snapshot.exists() ? snapshot.data() : {};
      const newConfig = {
        ...currentConfig,
        casinos: App.state.dynamicCasinos,
        casinoOrder: App.state.dynamicCasinoOrder
      };
      await setDoc(doc(db, App.config.FIRESTORE_COLLECTION, App.config.FIRESTORE_DOCUMENT), newConfig);
    } catch (error) {
      console.error('Error guardando casinos dinámicos en Firebase:', error);
      throw error;
    }
  }

  async function addCasino(id, name, logo, mascot, color) {
    const casinoId = id || `casino_${Date.now()}`;
    let logoRecord = logo;
    let mascotRecord = mascot;

    if (logo && (logo instanceof File || (typeof logo === 'string' && logo.startsWith('data:')))) {
      logoRecord = await uploadImageFile(logo, casinoId, 'logo');
    }
    if (mascot && (mascot instanceof File || (typeof mascot === 'string' && mascot.startsWith('data:')))) {
      mascotRecord = await uploadImageFile(mascot, casinoId, 'mascot');
    }

    const existing = App.state.dynamicCasinos[casinoId] || {};
    const active = existing.active || false;
    const logoUrl = typeof logoRecord === 'object' ? logoRecord.url : logoRecord;
    const mascotUrl = typeof mascotRecord === 'object' ? mascotRecord.url : mascotRecord;

    App.state.dynamicCasinos[casinoId] = {
      label: name,
      logo: logoUrl,
      logoDeleteToken: typeof logoRecord === 'object' ? logoRecord.deleteToken : existing.logoDeleteToken || null,
      mascot: mascotUrl,
      mascotDeleteToken: typeof mascotRecord === 'object' ? mascotRecord.deleteToken : existing.mascotDeleteToken || null,
      color,
      active
    };

    if (!App.state.dynamicCasinoOrder.includes(casinoId)) {
      App.state.dynamicCasinoOrder.push(casinoId);
    }

    await saveDynamicCasinos();
    return casinoId;
  }

  async function removeCasino(casinoId) {
    const casino = App.state.dynamicCasinos[casinoId];
    if (casino) {
      const logoDeleteToken = casino.logoDeleteToken || null;
      const mascotDeleteToken = casino.mascotDeleteToken || null;
      delete App.state.dynamicCasinos[casinoId];
      await saveDynamicCasinos();

      if (logoDeleteToken) {
        await deleteCloudinaryImage(logoDeleteToken).catch((error) => console.warn('Error borrando logo Cloudinary:', error));
      }
      if (mascotDeleteToken) {
        await deleteCloudinaryImage(mascotDeleteToken).catch((error) => console.warn('Error borrando mascot Cloudinary:', error));
      }
    } else {
      delete App.state.dynamicCasinos[casinoId];
      await saveDynamicCasinos();
    }
  }

  async function updateCasinoActive(casinoId, active) {
    if (App.state.dynamicCasinos[casinoId]) {
      App.state.dynamicCasinos[casinoId].active = active;
      await saveDynamicCasinos();
    }
  }

  async function getRemoteConfig() {
    if (App.state.remoteConfigCache && (Date.now() - App.state.remoteConfigCacheTime) < App.config.REMOTE_CONFIG_CACHE_TTL) {
      return App.state.remoteConfigCache;
    }

    if (App.state.remoteConfigRequestPromise) {
      return App.state.remoteConfigRequestPromise;
    }

    App.state.remoteConfigRequestPromise = (async () => {
      try {
        const { db, doc, getDoc } = await App.state.ensureFirebaseServices();
        const snapshot = await getDoc(doc(db, App.config.FIRESTORE_COLLECTION, App.config.FIRESTORE_DOCUMENT));
        const data = snapshot.exists() ? snapshot.data() : null;
        App.state.remoteConfigCache = data;
        App.state.remoteConfigCacheTime = Date.now();
        return data;
      } catch (error) {
        console.error('Error leyendo configuración remota de Firebase:', error);
        return App.state.remoteConfigCache;
      } finally {
        App.state.remoteConfigRequestPromise = null;
      }
    })();

    return App.state.remoteConfigRequestPromise;
  }

  async function saveRemoteConfig(config) {
    try {
      const { db, doc, getDoc, setDoc } = await App.state.ensureFirebaseServices();
      const snapshot = await getDoc(doc(db, App.config.FIRESTORE_COLLECTION, App.config.FIRESTORE_DOCUMENT));
      const currentConfig = snapshot.exists() ? snapshot.data() : {};
      await setDoc(doc(db, App.config.FIRESTORE_COLLECTION, App.config.FIRESTORE_DOCUMENT), {
        ...currentConfig,
        ...config
      });
    } catch (error) {
      console.error('Error guardando configuración en Firebase:', error);
    }
  }

  App.storage.getLocalDynamicCasinos = getLocalDynamicCasinos;
  App.storage.setLocalDynamicCasinos = setLocalDynamicCasinos;
  App.storage.uploadImageFile = uploadImageFile;
  App.storage.deleteCloudinaryImage = deleteCloudinaryImage;
  App.storage.loadDynamicCasinos = loadDynamicCasinos;
  App.storage.saveDynamicCasinos = saveDynamicCasinos;
  App.storage.addCasino = addCasino;
  App.storage.removeCasino = removeCasino;
  App.storage.updateCasinoActive = updateCasinoActive;
  App.storage.getRemoteConfig = getRemoteConfig;
  App.storage.saveRemoteConfig = saveRemoteConfig;
})(window);
