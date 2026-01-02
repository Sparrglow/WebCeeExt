// WebCee Runtime Simulator (Webview)
// Implements the same in-browser model as WebCee's embedded fallback:
// - /api/data (GET) -> JSON model
// - /api/update (POST ?key=..&val=..) -> update model + hook
// - /api/trigger (POST ?event=..&arg=..) -> trigger handler + sync
// - /api/list (GET ?name=..) -> list JSON
// plus DOM binding via [wce-bind] and polling sync.

(function () {
  'use strict';

  const bootstrap = (window.__WEBCEE_SIM_BOOTSTRAP__ || {});
  const pollIntervalMs = typeof bootstrap.pollIntervalMs === 'number' ? bootstrap.pollIntervalMs : 100;

  /** @type {Record<string, string>} */
  const store = Object.assign({}, bootstrap.initialData || {});

  /** @type {Record<string, any>} */
  const handlerEffects = bootstrap.handlerEffects || {};

  /** @type {Record<string, any>} */
  const modelUpdateEffects = bootstrap.modelUpdateEffects || {};

  /** @type {Record<string, any>} */
  const lists = bootstrap.lists || {};

  const originalFetch = window.fetch ? window.fetch.bind(window) : null;

  function jsonResponse(obj, status) {
    return Promise.resolve(new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  function textResponse(text, status) {
    return Promise.resolve(new Response(text, {
      status: status || 200,
      headers: { 'Content-Type': 'text/plain' }
    }));
  }

  function parseUrl(input) {
    try {
      return new URL(input, window.location.origin);
    } catch {
      return null;
    }
  }

  function toStringValue(v) {
    if (v === null || v === undefined) return '';
    return String(v);
  }

  function reverseString(s) {
    return String(s).split('').reverse().join('');
  }

  function renderTemplate(template, ctx) {
    const safe = template == null ? '' : String(template);
    const val = toStringValue(ctx && 'val' in ctx ? ctx.val : '');
    const arg = toStringValue(ctx && 'arg' in ctx ? ctx.arg : '');
    const key = toStringValue(ctx && 'key' in ctx ? ctx.key : '');
    const len = String(val.length);
    const reversed = reverseString(val);

    return safe.replace(/\$\{(val|arg|key|len|reversed)\}/g, (_, name) => {
      switch (name) {
        case 'val': return val;
        case 'arg': return arg;
        case 'key': return key;
        case 'len': return len;
        case 'reversed': return reversed;
        default: return '';
      }
    });
  }

  function applyEffect(effect) {
    if (!effect || typeof effect !== 'object') return;

    if (effect.type === 'set') {
      if (typeof effect.key === 'string') {
        store[effect.key] = toStringValue(effect.val);
      }
      return;
    }

    if (effect.type === 'setTemplate') {
      if (typeof effect.key === 'string') {
        const tmpl = typeof effect.template === 'string' ? effect.template : '';
        store[effect.key] = renderTemplate(tmpl, effect.__ctx || {});
      }
      return;
    }

    if (effect.type === 'inc') {
      if (typeof effect.key === 'string') {
        const prev = Number(store[effect.key] || 0);
        const delta = Number(effect.by || 1);
        const next = prev + (Number.isFinite(delta) ? delta : 1);
        store[effect.key] = toStringValue(next);
      }
      return;
    }

    if (effect.type === 'toggle') {
      if (typeof effect.key === 'string') {
        const cur = store[effect.key];
        store[effect.key] = cur === 'true' ? 'false' : 'true';
      }
      return;
    }
  }

  function runHandler(handlerName, arg) {
    // Pure simulation: apply configured effects.
    const effect = handlerEffects[handlerName];

    const ctx = { arg: toStringValue(arg), key: '', val: '' };
    if (Array.isArray(effect)) {
      effect.forEach(e => {
        if (e && typeof e === 'object') e.__ctx = ctx;
        applyEffect(e);
      });
    } else {
      if (effect && typeof effect === 'object') effect.__ctx = ctx;
      applyEffect(effect);
    }

    if (bootstrap.onTriggerLog !== false) {
      console.log('[WebCee Sim] trigger:', handlerName, arg || '');
    }
  }

  function updateView() {
    const bound = document.querySelectorAll('[wce-bind]');
    bound.forEach((el) => {
      const key = el.getAttribute('wce-bind');
      if (!key) return;

      const value = store[key];
      if (value === undefined) return;

      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // Avoid fighting user's typing
        if (document.activeElement !== el) {
          if (el.value !== value) el.value = value;
        }
        return;
      }

      if (tag === 'PROGRESS') {
        const n = Number(value);
        if (Number.isFinite(n)) el.value = n;
        return;
      }

      el.textContent = value;
      el.classList.remove('bind-hint');
    });
  }

  async function handleApi(urlObj, init) {
    const pathname = urlObj.pathname;
    const method = (init && init.method ? String(init.method) : 'GET').toUpperCase();

    if (pathname === '/api/data' && method === 'GET') {
      return jsonResponse(store, 200);
    }

    if (pathname.startsWith('/api/update') && method === 'POST') {
      const key = urlObj.searchParams.get('key');
      const val = urlObj.searchParams.get('val');
      if (!key || val === null) return textResponse('Missing params', 400);

      store[key] = toStringValue(val);

      // Simulate C-side hook: wce_handle_model_update(key, val)
      const hook = modelUpdateEffects[key];
      const hookCtx = { key, val: toStringValue(val), arg: '' };
      if (Array.isArray(hook)) {
        hook.forEach(e => {
          if (e && typeof e === 'object') e.__ctx = hookCtx;
          applyEffect(e);
        });
      } else if (hook) {
        if (hook && typeof hook === 'object') hook.__ctx = hookCtx;
        applyEffect(hook);
      }

      // optional hook model update
      if (bootstrap.onModelUpdateLog !== false) {
        console.log('[WebCee Sim] model update:', key, '=', store[key]);
      }
      updateView();
      return textResponse('OK', 200);
    }

    if (pathname.startsWith('/api/trigger') && method === 'POST') {
      const event = urlObj.searchParams.get('event');
      const arg = urlObj.searchParams.get('arg') || '';
      if (!event) return textResponse('Missing event param', 400);

      runHandler(event, arg);
      updateView();
      return textResponse('OK', 200);
    }

    if (pathname.startsWith('/api/list') && method === 'GET') {
      const name = urlObj.searchParams.get('name');
      if (!name) return textResponse('Missing name param', 400);

      const data = (name in lists) ? lists[name] : [];
      return jsonResponse(data, 200);
    }

    return null;
  }

  function installFetchInterceptor() {
    if (!originalFetch) return;

    window.fetch = function (input, init) {
      const urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : String(input));
      const urlObj = parseUrl(urlStr);
      if (urlObj && urlObj.pathname.startsWith('/api/')) {
        return handleApi(urlObj, init).then((r) => r || textResponse('Not Found', 404));
      }
      return originalFetch(input, init);
    };
  }

  function installInputBinding() {
    document.querySelectorAll('input[wce-bind], textarea[wce-bind], select[wce-bind]').forEach((el) => {
      const key = el.getAttribute('wce-bind');
      if (!key) return;

      // init store if missing
      if (store[key] === undefined) store[key] = '';

      el.addEventListener('change', () => {
        const val = el.value;
        // mimic WebCee: POST /api/update?key=...&val=...
        fetch('/api/update?key=' + encodeURIComponent(key) + '&val=' + encodeURIComponent(val), { method: 'POST' })
          .catch(() => { /* ignore */ });
      });
    });
  }

  function installTriggerApi() {
    // Match the embedded fallback naming
    window.trigger = async function (evt, arg) {
      await fetch('/api/trigger?event=' + encodeURIComponent(evt) + (arg ? ('&arg=' + encodeURIComponent(arg)) : ''), { method: 'POST' });
      window.sync();
    };

    window.sync = async function () {
      try {
        const r = await fetch('/api/data');
        const d = await r.json();
        Object.keys(d || {}).forEach((k) => { store[k] = toStringValue(d[k]); });
        updateView();
      } catch {
        // ignore
      }
    };
  }

  function boot() {
    installFetchInterceptor();
    installTriggerApi();
    installInputBinding();

    // first paint
    updateView();

    // polling model sync (matches WebCee footer)
    setInterval(() => { window.sync(); }, pollIntervalMs);
    window.sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
