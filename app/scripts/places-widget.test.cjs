const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const rootPath = path.resolve(__dirname, '..');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function bridge(env = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(rootPath, 'src/lib/places_widget.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    exports, URL, process: { env },
    require(name) {
      assert.equal(name, './places_widget_fonts');
      return { getPlacesWidgetFonts: () => ({}) };
    },
  });
  return exports;
}

function page({ failGoogle = false, native = false } = {}) {
  const elements = [];
  const fontLoads = [];
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.attributes = {}; this.textContent = ''; elements.push(this); }
    append(...children) { for (const child of children) { child.remove(); child.parent = this; this.children.push(child); } }
    insertBefore(child, before) { child.remove(); child.parent = this; const index = before ? this.children.indexOf(before) : -1; this.children.splice(index < 0 ? this.children.length : index, 0, child); }
    remove() { if (this.parent) { const index = this.parent.children.indexOf(this); if (index >= 0) this.parent.children.splice(index, 1); this.parent = null; } }
    replaceChildren(...children) { for (const child of [...this.children]) child.remove(); this.append(...children); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    getBoundingClientRect() {
      const top = this.parent?.tag === 'main' ? this.parent.children.indexOf(this) * 150 : 0;
      const height = this.tag === 'section' ? 150 : this.children.length * 150;
      return { top, height, bottom: top + height };
    }
  }
  const root = new Element('main');
  const messages = [];
  const listeners = {};
  const timers = new Map();
  let timerId = 0;
  let imports = 0;
  const window = {
    location: { origin: 'https://widget.example.com', href: 'https://widget.example.com/google-place-ratings.html' },
    parent: { postMessage: (message) => messages.push(message) },
    addEventListener: (name, listener) => { listeners[name] = listener; },
    google: { maps: { importLibrary: async () => { imports++; if (failGoogle) throw new Error('denied'); return {}; } } },
  };
  if (native) window.ReactNativeWebView = { postMessage: (message) => messages.push(JSON.parse(message)) };
  vm.runInNewContext(fs.readFileSync(path.join(rootPath, 'public/google-place-ratings.js'), 'utf8'), {
    window,
    document: { getElementById: () => root, head: new Element('head'), createElement: (tag) => new Element(tag), fonts: { add() {} } },
    FontFace: class { constructor(family, source) { fontLoads.push({ family, source }); } load() { return Promise.resolve(); } },
    fetch: async (url) => {
      assert.equal(url.href, 'https://widget.example.com/google-place-fonts.json');
      return { ok: true, json: async () => ({ BusanDandiMyeongjoM: '/assets/current-web-font.otf' }) };
    },
    ResizeObserver: class { observe() {} disconnect() {} },
    URL, URLSearchParams,
    setTimeout: (fn) => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: (id) => timers.delete(id),
  });
  return { window, root, messages, listeners, elements, timers, fontLoads, get imports() { return imports; } };
}

function payload(places, extra = {}) {
  return { channel: 'whatbob-places-v1', type: 'update', apiKey: 'test-key', disabled: false, selectedPlaceId: null, viewport: { top: 0, bottom: 20000 }, places, ...extra };
}

const restaurant = { id: 'kakao-one', name: 'Restaurant', distance: '0.1km', googlePlaceId: 'google-one' };

test('bridge forwards only display data and validates messages and HTTPS configuration', () => {
  const api = bridge({ EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: 'public-key', EXPO_PUBLIC_GOOGLE_PLACES_WIDGET_URL: 'https://widget.example.com/google-place-ratings.html' });
  const data = api.createPlacesWidgetPayload({ places: [{ kakao_place_id: 'one', name: 'A', distance_m: 123, google_place_id: null, latitude: 36, longitude: 127 }], selectedPlaceId: null, disabled: false });
  assert.equal(data.places[0].googlePlaceId, null);
  assert.equal(data.places[0].distance, '0.1km');
  assert.equal('latitude' in data.places[0], false);
  assert.equal('access_token' in data, false);
  assert.equal(api.getNativePlacesWidgetUrl(), 'https://widget.example.com/google-place-ratings.html');
  for (const url of ['file:///page.html', 'http://widget.example.com', 'https://user:pass@widget.example.com']) {
    assert.equal(bridge({ EXPO_PUBLIC_GOOGLE_PLACES_WIDGET_URL: url }).getNativePlacesWidgetUrl(), null);
  }
  for (const value of ['{', null, { channel: 'wrong', type: 'select', placeId: 'one' }, { channel: data.channel, type: 'height', height: -1 }]) assert.equal(api.parsePlacesWidgetMessage(value), null);
  assert.equal(api.parsePlacesWidgetMessage(JSON.stringify({ channel: data.channel, type: 'select', placeId: 'one' })).placeId, 'one');
});

test('selection updates reuse widgets and widget interactions do not select a restaurant', async () => {
  const p = page();
  p.window.WhatbobPlaces.update(payload([restaurant]));
  await flush();
  const widget = p.elements.find((element) => element.tag === 'gmp-place-details-compact');
  assert.ok(widget);
  assert.deepEqual(widget.children.map((element) => element.tag), ['gmp-place-details-place-request', 'gmp-place-rating', 'gmp-place-attribution']);
  widget.place = { rating: undefined };
  widget.listeners['gmp-load']();
  assert.equal(p.root.children[0].children[2].hidden, true);
  assert.equal(p.messages.some((message) => message.type === 'select'), false);
  p.window.WhatbobPlaces.update(payload([{ ...restaurant }], { selectedPlaceId: restaurant.id, disabled: true }));
  await flush();
  assert.equal(p.elements.filter((element) => element.tag === 'gmp-place-details-compact').length, 1);
  assert.equal(p.imports, 1);
  const choose = p.root.children[0].children[0];
  choose.onclick();
  assert.equal(p.messages.some((message) => message.type === 'select'), false);
  p.window.WhatbobPlaces.update(payload([restaurant]));
  choose.onclick();
  assert.equal(p.messages.at(-1).placeId, restaurant.id);
});

test('missing IDs and Google errors leave restaurant selection usable', async () => {
  const p = page({ failGoogle: true });
  p.window.WhatbobPlaces.update(payload([{ ...restaurant, googlePlaceId: null }]));
  await flush();
  assert.equal(p.imports, 0);
  assert.equal(p.root.children.length, 1);
  p.window.WhatbobPlaces.update(payload([restaurant]));
  await flush();
  const card = p.root.children[0];
  assert.equal(card.children[1].children.length, 0);
  assert.equal(card.children[3].hidden, false);
  card.children[0].onclick();
  assert.equal(p.messages.at(-1).type, 'select');
});

test('Google ID changes replace the widget and stale load events are ignored', async () => {
  const p = page();
  p.window.WhatbobPlaces.update(payload([restaurant]));
  await flush();
  const oldWidget = p.elements.find((element) => element.tag === 'gmp-place-details-compact');
  p.window.WhatbobPlaces.update(payload([{ ...restaurant, googlePlaceId: 'google-two' }]));
  await flush();
  oldWidget.listeners['gmp-error']();
  assert.equal(p.root.children[0].children[1].children.length, 1);
  p.window.WhatbobPlaces.update(payload([]));
  assert.equal(p.root.children.length, 0);
  assert.equal(p.timers.size, 0);
});

test('messages from another origin or window cannot change the list', () => {
  const p = page();
  const data = payload([{ ...restaurant, googlePlaceId: null }]);
  p.listeners.message({ origin: 'https://other.example.com', source: p.window.parent, data });
  p.listeners.message({ origin: p.window.location.origin, source: {}, data });
  assert.equal(p.root.children.length, 0);
  p.listeners.message({ origin: p.window.location.origin, source: p.window.parent, data });
  assert.equal(p.root.children.length, 1);
  assert.ok(p.messages.some((message) => message.type === 'height' && message.height > 0));
});

test('all places remain visible in the list but only cards in the viewport request ratings', async () => {
  const p = page();
  const places = Array.from({ length: 12 }, (_, index) => ({ ...restaurant, id: `place-${index}`, googlePlaceId: `google-${index}` }));
  p.window.WhatbobPlaces.update(payload(places, { viewport: { top: 0, bottom: 0 } }));
  await flush();
  assert.equal(p.root.children.length, 12);
  assert.equal(p.imports, 0);
  p.window.WhatbobPlaces.update(payload(places, { viewport: { top: 0, bottom: 150 } }));
  await flush();
  assert.equal(p.elements.filter((element) => element.tag === 'gmp-place-details-compact').length, 1);
  p.window.WhatbobPlaces.update(payload(places, { viewport: { top: 150, bottom: 300 } }));
  await flush();
  assert.equal(p.elements.filter((element) => element.tag === 'gmp-place-details-compact').length, 2);
  p.window.WhatbobPlaces.update(payload(places, { viewport: { top: 0, bottom: 150 } }));
  await flush();
  assert.equal(p.elements.filter((element) => element.tag === 'gmp-place-details-compact').length, 2);
  assert.equal(p.imports, 1);
});

test('viewport-only messages load visible ratings without resending or rebuilding the list', async () => {
  const p = page();
  const places = [restaurant, { ...restaurant, id: 'two', googlePlaceId: 'google-two' }];
  p.window.WhatbobPlaces.update(payload(places, { viewport: { top: 0, bottom: 0 } }));
  const firstCard = p.root.children[0];
  p.listeners.message({ origin: p.window.location.origin, source: p.window.parent,
    data: { channel: 'whatbob-places-v1', type: 'viewport', viewport: { top: 150, bottom: 300 } } });
  await flush();
  assert.equal(p.root.children[0], firstCard);
  assert.equal(p.root.children[1].children[1].children.length, 1);
  assert.equal(p.root.children[0].children[1].children.length, 0);
  p.window.WhatbobPlaces.setViewport({ top: 0, bottom: 150 });
  await flush();
  assert.equal(p.root.children[0].children[1].children.length, 1);
  assert.equal(p.imports, 1);
});

test('native loads fonts from the web deployment and ignores an old app font URL', async () => {
  const p = page({ native: true });
  const data = payload([{ ...restaurant, googlePlaceId: null }], {
    fonts: { BusanDandiMyeongjoM: '/assets/old-app-font.otf' },
  });
  p.window.WhatbobPlaces.update(data);
  await flush();
  p.window.WhatbobPlaces.update(data);
  await flush();
  assert.equal(p.fontLoads.length, 1);
  assert.ok(p.fontLoads[0].source.includes('current-web-font.otf'));
  assert.equal(p.fontLoads[0].source.includes('old-app-font'), false);
});

test('font manifest uses the current web source assets and native sends no font hashes', () => {
  const { createPlacesFontManifest } = require('./places-font-manifest.cjs');
  const fonts = createPlacesFontManifest(rootPath);
  assert.equal(Object.keys(fonts).length, 2);
  for (const url of Object.values(fonts)) assert.match(url, /^\/assets\/assets\/fonts\/.+\.[a-f0-9]{32}\.otf$/);
  const exported = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(rootPath, 'src/lib/places_widget_fonts.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports: exported });
  assert.equal(Object.keys(exported.getPlacesWidgetFonts()).length, 0);
});
