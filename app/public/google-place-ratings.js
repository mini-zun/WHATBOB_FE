(() => {
  const channel = 'whatbob-places-v1';
  const root = document.getElementById('places');
  const cards = new Map();
  let state = { places: [], selectedPlaceId: null, disabled: true, apiKey: '' };
  let googleLoading = null;

  function emit(message) {
    const data = { channel, ...message };
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(data));
    else if (window.parent !== window) window.parent.postMessage(data, window.location.origin);
  }

  let previousHeight = 0;
  function reportHeight() {
    const height = Math.ceil(root.getBoundingClientRect().height);
    if (height > 0 && height !== previousHeight) {
      previousHeight = height;
      emit({ type: 'height', height });
    }
  }
  const resizeObserver = new ResizeObserver(reportHeight);
  resizeObserver.observe(root);

  function loadGoogle(key) {
    if (googleLoading) return googleLoading;
    googleLoading = new Promise((resolve, reject) => {
      if (!key) { reject(new Error('KEY_MISSING')); return; }
      const script = document.createElement('script');
      const timer = setTimeout(() => fail(), 15000);
      let finished = false;
      function fail() {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        script.remove();
        reject(new Error('GOOGLE_LOAD_FAILED'));
      }
      window.gm_authFailure = () => {
        fail();
        cards.forEach((card) => card.fail?.());
      };
      window.whatbobGoogleReady = async () => {
        try {
          const library = await window.google.maps.importLibrary('places');
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          resolve(library);
        } catch { fail(); }
      };
      if (window.google?.maps?.importLibrary) {
        void window.whatbobGoogleReady();
      } else {
        const url = new URL('https://maps.googleapis.com/maps/api/js');
        url.search = new URLSearchParams({ key, v: 'weekly', loading: 'async', libraries: 'places', callback: 'whatbobGoogleReady', language: 'ko', region: 'KR' }).toString();
        script.src = url.href;
        script.async = true;
        script.onerror = fail;
        document.head.appendChild(script);
      }
    }).catch((error) => { googleLoading = null; throw error; });
    return googleLoading;
  }

  function setStatus(card, message) {
    card.status.textContent = message;
    card.status.hidden = !message;
    reportHeight();
  }

  async function renderRating(card, place) {
    card.cleanup?.();
    card.rating.replaceChildren();
    card.retry.hidden = true;
    if (!place.googlePlaceId) {
      setStatus(card, '평점 정보 없음');
      return;
    }
    setStatus(card, 'Google 평점을 불러오는 중…');
    let active = true;
    let timer;
    card.cleanup = () => { active = false; clearTimeout(timer); };
    const fail = () => {
      if (!active) return;
      clearTimeout(timer);
      active = false;
      card.rating.replaceChildren();
      setStatus(card, '평점을 불러오지 못했어요.');
      card.retry.hidden = false;
    };
    card.fail = fail;
    try {
      await loadGoogle(state.apiKey);
      if (!active) return;
      const widget = document.createElement('gmp-place-details-compact');
      widget.setAttribute('orientation', 'horizontal');
      const request = document.createElement('gmp-place-details-place-request');
      request.setAttribute('place', place.googlePlaceId);
      const rating = document.createElement('gmp-place-rating');
      const attribution = document.createElement('gmp-place-attribution');
      widget.append(request, rating, attribution);
      widget.addEventListener('gmp-load', () => {
        if (!active) return;
        clearTimeout(timer);
        setStatus(card, '');
        reportHeight();
      });
      widget.addEventListener('gmp-error', fail);
      timer = setTimeout(fail, 20000);
      card.rating.append(widget);
    } catch { fail(); }
  }

  function createCard(place) {
    const element = document.createElement('section');
    element.className = 'place';
    const choose = document.createElement('button');
    choose.type = 'button';
    choose.className = 'choose';
    const name = document.createElement('span');
    name.className = 'name';
    const distance = document.createElement('span');
    distance.className = 'distance';
    choose.append(name, distance);
    const rating = document.createElement('div');
    rating.className = 'rating';
    const status = document.createElement('p');
    status.className = 'status';
    status.setAttribute('aria-live', 'polite');
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'retry';
    retry.textContent = '평점 다시 시도';
    retry.hidden = true;
    element.append(choose, rating, status, retry);
    const card = { element, choose, name, distance, rating, status, retry, googlePlaceId: undefined };
    choose.onclick = () => { if (!state.disabled) emit({ type: 'select', placeId: place.id }); };
    retry.onclick = () => {
      const latest = state.places.find((item) => item.id === place.id);
      if (latest) void renderRating(card, latest);
    };
    return card;
  }

  function update(data) {
    if (!data || data.channel !== channel || data.type !== 'update' || !Array.isArray(data.places)) return;
    if (typeof data.apiKey !== 'string' || typeof data.disabled !== 'boolean') return;
    const seen = new Set();
    const places = data.places.slice(0, 10).filter((place) => {
      if (!place || typeof place.id !== 'string' || typeof place.name !== 'string' || typeof place.distance !== 'string' || seen.has(place.id)) return false;
      if (place.googlePlaceId !== null && typeof place.googlePlaceId !== 'string') return false;
      seen.add(place.id);
      return true;
    });
    const keyChanged = data.apiKey !== state.apiKey;
    state = { ...data, places };
    for (const [id, card] of cards) {
      if (!seen.has(id)) { card.cleanup?.(); card.element.remove(); cards.delete(id); }
    }
    places.forEach((place, index) => {
      let card = cards.get(place.id);
      if (!card) { card = createCard(place); cards.set(place.id, card); }
      card.name.textContent = `${index + 1} · ${place.name}`;
      card.distance.textContent = place.distance;
      card.choose.disabled = state.disabled;
      card.choose.setAttribute('aria-pressed', String(state.selectedPlaceId === place.id));
      if (root.children[index] !== card.element) root.insertBefore(card.element, root.children[index] || null);
      if (card.googlePlaceId !== place.googlePlaceId || keyChanged) {
        card.googlePlaceId = place.googlePlaceId;
        void renderRating(card, place);
      }
    });
    reportHeight();
    emit({ type: 'ready' });
  }

  window.WhatbobPlaces = { update };
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    update(event.data);
  });
  window.addEventListener('pagehide', () => {
    cards.forEach((card) => card.cleanup?.());
    resizeObserver.disconnect();
  });
  emit({ type: 'ready' });
})();
