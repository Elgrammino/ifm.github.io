/* Local visitor data, shared validation and regression helpers. */
(function (root) {
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const record = (value, check) => Object.fromEntries(Object.entries(object(value) ? value : {}).filter(([key, item]) => /^[a-zA-Z0-9_-]+$/.test(key) && check(item)));
  const validEvent = e => object(e) && /^[a-zA-Z0-9_-]+$/.test(e.id) && Number.isInteger(e.day) && e.day >= 0 && e.day <= 2 && typeof e.t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(e.t) && Number.isInteger(e.d) && e.d > 0 && e.d <= 1440 && ['lec','con','show','party','dealer','brk'].includes(e.type) && typeof e.title === 'string';
  const state = value => {
    const s = object(value) ? value : {};
    return {
      shift: Number.isFinite(s.shift) && Math.abs(s.shift) <= 1440 ? s.shift : 0,
      off: record(s.off, x => typeof x === 'boolean'),
      add: Array.isArray(s.add) ? s.add.filter(validEvent) : [],
      news: Array.isArray(s.news) ? s.news.filter(n => object(n) && typeof n.t === 'string' && typeof n.x === 'string' && Number.isFinite(n.ts)) : []
    };
  };
  function storage(backend, scope, warn = () => {}) {
    const memory = new Map();
    let warned = false;
    return (key, value) => {
      const name = 'ifm2027:' + scope + ':' + key;
      if (value === undefined) {
        if (memory.has(name)) return memory.get(name);
        try {
          const current = backend.getItem(name);
          if (current !== null) return JSON.parse(current);
          const old = JSON.parse(backend.getItem('d') || 'null');
          if (old && Array.isArray(old.events) && old.events.some(e => e.id === 'a1' && e.title === 'Регистрация участников') && old.events.some(e => e.id === 'c4' && e.title === 'Гала-шоу МФИ')) {
            const previous = JSON.parse(backend.getItem(key) || 'null');
            if (previous !== null) { memory.set(name, previous); backend.setItem(name, JSON.stringify(previous)); }
            return previous;
          }
          return null;
        }
        catch { return null; }
      }
      memory.set(name, value);
      try { backend.setItem(name, JSON.stringify(value)); }
      catch { if (!warned) { warned = true; warn(); } }
      return value;
    };
  }
  const api = { state, record, validEvent, storage };
  if (typeof module !== 'undefined') module.exports = api;
  else root.IFM = api;
})(globalThis);
