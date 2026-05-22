/* ============================================================
   router.js — Hash-based router minimalista
   Suporta rotas com parâmetros: #/paciente/:id
   ============================================================ */

const Router = (() => {
  const routes = [];
  let currentMatch = null;
  let listeners = [];

  function register(pattern, handler) {
    // Converte padrão "/paciente/:id" em regex
    const paramNames = [];
    const regex = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    }) + '$');
    routes.push({ pattern, regex, paramNames, handler });
  }

  function parseHash() {
    let h = location.hash;
    if (h.startsWith('#')) h = h.slice(1);
    if (!h) h = '/';
    return h;
  }

  function match(path) {
    for (const route of routes) {
      const m = path.match(route.regex);
      if (m) {
        const params = {};
        route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
        return { route, params, path };
      }
    }
    return null;
  }

  function resolve() {
    const path = parseHash();
    const result = match(path);
    if (result) {
      currentMatch = result;
      try {
        result.route.handler(result.params);
      } catch (e) {
        console.error('Erro no handler de rota:', e);
      }
      listeners.forEach(l => l(result));
    } else {
      console.warn('Rota não encontrada:', path);
      // Fallback para home
      navigate('/');
    }
  }

  function navigate(path) {
    const newHash = path.startsWith('/') ? path : '/' + path;
    const currentHash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
    const normalizedCurrent = currentHash || '/';

    if (normalizedCurrent === newHash) {
      // Hash já é igual — hashchange não dispara, força resolve manualmente
      resolve();
    } else {
      location.hash = newHash;
      // O evento hashchange vai disparar resolve automaticamente
    }
  }

  function onChange(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  }

  function start() {
    window.addEventListener('hashchange', resolve);
    window.addEventListener('load', resolve);
    if (document.readyState !== 'loading') resolve();
  }

  function getCurrentPath() {
    return parseHash();
  }

  return { register, navigate, onChange, start, getCurrentPath };
})();

window.Router = Router;
