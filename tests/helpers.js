/* ============================================================
   tests/helpers.js — Infraestrutura compartilhada da suíte
   ------------------------------------------------------------
   Cada arquivo tests/test_*.js importa daqui:
     const H = require('./helpers');
     H.section('Grupo'); H.test('nome', () => {...}); H.run();

   - test() aceita funções síncronas OU async (retornam promise)
   - run() executa a fila em ordem e imprime o resumo, saindo com
     código != 0 se houver falha (para o runner detectar)
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ---- Contadores e fila ----
let passed = 0, failed = 0;
const queue = [];

function section(titulo) { queue.push({ tipo: 'section', titulo }); }
function test(nome, fn) { queue.push({ tipo: 'test', nome, fn }); }

async function run() {
  for (const item of queue) {
    if (item.tipo === 'section') {
      console.log('\n=== ' + item.titulo + ' ===');
      continue;
    }
    try {
      const r = item.fn();
      if (r && typeof r.then === 'function') await r;
      console.log('  \u2713 ' + item.nome);
      passed++;
    } catch (e) {
      console.log('  \u2717 ' + item.nome);
      console.log('      ' + (e && e.message ? e.message : e));
      failed++;
    }
  }
  console.log('\n=== Resumo ===');
  console.log(`\u2713 ${passed} testes passaram`);
  if (failed > 0) {
    console.log(`\u2717 ${failed} falharam`);
    process.exit(1);
  } else {
    console.log(`Total: ${passed}/${passed} \u2713`);
    process.exit(0);
  }
}

// ---- Asserts ----
function assert(cond, msg) { if (!cond) throw new Error(msg || 'asserção falhou'); }
function assertEq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || 'esperado igual'}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}
function assertDeep(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error(`${msg || 'esperado deep-igual'}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}
function assertThrows(fn, msg) {
  let lancou = false;
  try { fn(); } catch (_) { lancou = true; }
  if (!lancou) throw new Error(msg || 'esperava exceção');
}
async function assertRejects(fn, msg) {
  let rejeitou = false;
  try { await fn(); } catch (_) { rejeitou = true; }
  if (!rejeitou) throw new Error(msg || 'esperava rejeição');
}
function assertIncludes(haystack, needle, msg) {
  if (!String(haystack).includes(needle))
    throw new Error(`${msg || 'esperava conter'}: "${needle}" não está presente`);
}

// ---- Ambiente ----
const webcrypto = require('crypto').webcrypto;

/**
 * Configura um objeto window mínimo no global, com mocks comuns.
 * Retorna o objeto window para customização adicional.
 */
function setupWindow(opcoes = {}) {
  const storage = {};
  const localStorageMock = {
    _data: storage,
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };

  const win = {
    crypto: webcrypto,
    localStorage: localStorageMock,
    matchMedia: opcoes.matchMedia || ((q) => ({
      matches: false, media: q,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}
    })),
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout, clearTimeout, setInterval, clearInterval
  };
  global.window = win;
  global.crypto = webcrypto;
  global.localStorage = localStorageMock;
  return win;
}

/**
 * Configura jsdom completo (document + window) para testes de
 * renderização de componentes.
 */
function setupDOM(html) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html || '<!DOCTYPE html><html><head></head><body></body></html>',
    { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  // Garante crypto e localStorage
  if (!global.window.crypto) global.window.crypto = webcrypto;
  global.crypto = global.window.crypto;
  return dom;
}

/** Lê um arquivo do app como string. */
function readApp(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/**
 * Executa o código de um arquivo do app no escopo atual (eval).
 * Os módulos do app fazem window.X = X, então após eval o objeto
 * fica acessível em global.window.X. Requer global.window já setado.
 */
function evalApp(rel) {
  // eslint-disable-next-line no-eval
  eval(readApp(rel));
}

/**
 * Carrega Dexie (lib vendored) e devolve o construtor.
 */
function loadDexie() {
  const Dexie = require(path.join(ROOT, 'assets/lib/dexie.min.js'));
  global.Dexie = Dexie;
  if (global.window) global.window.Dexie = Dexie;
  return Dexie;
}

/**
 * Setup completo de cofre destrancado com fake-indexeddb.
 * Retorna { DB, CryptoModule, dek }.
 * Requer: require('fake-indexeddb/auto') no topo do arquivo de teste.
 */
async function setupVault(senha = 'senha-de-teste-123456') {
  setupWindow();
  loadDexie();
  const CryptoModule = require(path.join(ROOT, 'modules/crypto.js'));
  global.window.CryptoModule = CryptoModule;
  global.CryptoModule = CryptoModule;
  const DB = require(path.join(ROOT, 'modules/db.js'));
  global.window.DB = DB;
  global.DB = DB;

  const { dek } = await CryptoModule.createVault(senha);
  DB.setDEK(dek);
  await DB.initNameHashSalt();
  return { DB, CryptoModule, dek };
}

module.exports = {
  ROOT,
  section, test, run,
  assert, assertEq, assertDeep, assertThrows, assertRejects, assertIncludes,
  setupWindow, setupDOM, readApp, evalApp, loadDexie, setupVault,
  webcrypto
};
