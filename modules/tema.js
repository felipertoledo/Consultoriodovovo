/* ================================================================
   modules/tema.js — Sprint C3
   Gerencia tema claro/escuro/automático.

   Tema é guardado em localStorage (não cifrado — preferência visual
   não é dado clínico). Aplicado via atributo data-theme no <html>.

   Modos:
   - 'light': sempre claro
   - 'dark': sempre escuro
   - 'auto': segue prefers-color-scheme do sistema
   ================================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'cv:tema';
  const DEFAULT_MODE = 'auto';

  let modoAtual = DEFAULT_MODE;
  let listeners = [];
  let mqlDark = null;

  function carregarPreferencia() {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo === 'light' || salvo === 'dark' || salvo === 'auto') {
        modoAtual = salvo;
      } else {
        modoAtual = DEFAULT_MODE;
      }
    } catch (_) {
      modoAtual = DEFAULT_MODE;
    }
  }

  function salvarPreferencia(modo) {
    try {
      localStorage.setItem(STORAGE_KEY, modo);
    } catch (_) {
      // Sem persistência se localStorage indisponível
    }
  }

  function temaEfetivo() {
    if (modoAtual === 'dark') return 'dark';
    if (modoAtual === 'light') return 'light';
    // auto: segue prefers-color-scheme
    if (typeof window === 'undefined') return 'light';
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    return mql && mql.matches ? 'dark' : 'light';
  }

  function aplicar() {
    if (typeof document === 'undefined') return;
    const efetivo = temaEfetivo();
    document.documentElement.setAttribute('data-theme', efetivo);
    // Notifica listeners
    for (const fn of listeners) {
      try { fn(efetivo, modoAtual); } catch (e) { /* ignore */ }
    }
  }

  function get() {
    return modoAtual;
  }

  function getEfetivo() {
    return temaEfetivo();
  }

  function set(modo) {
    if (modo !== 'light' && modo !== 'dark' && modo !== 'auto') {
      throw new Error('Modo de tema inválido: ' + modo);
    }
    modoAtual = modo;
    salvarPreferencia(modo);
    aplicar();
  }

  /**
   * Alterna ciclicamente: light → dark → auto → light...
   */
  function toggle() {
    const ordem = ['light', 'dark', 'auto'];
    const idx = ordem.indexOf(modoAtual);
    const proximo = ordem[(idx + 1) % ordem.length];
    set(proximo);
    return proximo;
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function init() {
    carregarPreferencia();
    aplicar();
    // Reage a mudanças do sistema quando em modo auto
    if (typeof window !== 'undefined' && window.matchMedia) {
      mqlDark = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        if (modoAtual === 'auto') aplicar();
      };
      if (mqlDark.addEventListener) mqlDark.addEventListener('change', handler);
      else if (mqlDark.addListener) mqlDark.addListener(handler);
    }
  }

  // Inicializa imediatamente para evitar "flash of unstyled content"
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      // Aplica direto antes de DOMContentLoaded, mas sem listeners de mql ainda
      carregarPreferencia();
      aplicar();
      document.addEventListener('DOMContentLoaded', () => init());
    } else {
      init();
    }
  }

  const api = {
    get,
    getEfetivo,
    set,
    toggle,
    onChange,
    init,  // exposto para chamada manual em testes
    _carregarPreferencia: carregarPreferencia,
    _aplicar: aplicar
  };

  if (typeof window !== 'undefined') window.Tema = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
