// tests/test_tema.js — modos light/dark/auto, toggle, persistência, reação ao SO
const path = require('path');
const H = require('./helpers');

// Ambiente controlável: localStorage mock + matchMedia mock + document mínimo
H.setupWindow();
let systemDark = false;
global.window.matchMedia = (q) => ({
  matches: systemDark && /dark/.test(q),
  media: q,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {}
});
const docEl = {
  _attrs: {},
  setAttribute(k, v) { this._attrs[k] = v; },
  getAttribute(k) { return this._attrs[k] || null; }
};
global.document = { documentElement: docEl };
global.window.document = global.document;

const Tema = require(path.join(H.ROOT, 'modules/tema.js'));

H.section('Default e leitura');
H.test('modo padrão é auto', () => {
  Tema.init();
  H.assertEq(Tema.get(), 'auto');
});

H.section('set / persistência');
H.test('set("dark") muda o modo', () => {
  Tema.set('dark');
  H.assertEq(Tema.get(), 'dark');
});
H.test('set persiste em localStorage (cv:tema)', () => {
  Tema.set('light');
  H.assertEq(global.localStorage.getItem('cv:tema'), 'light');
});
H.test('set("xpto") inválido lança', () => {
  H.assertThrows(() => Tema.set('xpto'));
});
H.test('carregarPreferencia lê valor salvo', () => {
  global.localStorage.setItem('cv:tema', 'dark');
  Tema.init();
  H.assertEq(Tema.get(), 'dark');
});

H.section('getEfetivo (modo auto segue o sistema)');
H.test('auto + sistema claro → light', () => {
  systemDark = false;
  Tema.set('auto');
  H.assertEq(Tema.getEfetivo(), 'light');
});
H.test('auto + sistema escuro → dark', () => {
  systemDark = true;
  Tema.set('auto');
  H.assertEq(Tema.getEfetivo(), 'dark');
});
H.test('modo light ignora sistema escuro', () => {
  systemDark = true;
  Tema.set('light');
  H.assertEq(Tema.getEfetivo(), 'light');
});
H.test('modo dark ignora sistema claro', () => {
  systemDark = false;
  Tema.set('dark');
  H.assertEq(Tema.getEfetivo(), 'dark');
});

H.section('aplicar / data-theme');
H.test('aplicar escreve data-theme no documentElement', () => {
  systemDark = false;
  Tema.set('dark');
  H.assertEq(docEl.getAttribute('data-theme'), 'dark');
  Tema.set('light');
  H.assertEq(docEl.getAttribute('data-theme'), 'light');
});

H.section('toggle (ciclo)');
H.test('toggle cicla light → dark → auto → light', () => {
  Tema.set('light');
  H.assertEq(Tema.toggle(), 'dark');
  H.assertEq(Tema.toggle(), 'auto');
  H.assertEq(Tema.toggle(), 'light');
});

H.section('onChange');
H.test('listener é chamado ao aplicar', () => {
  let recebido = null;
  Tema.onChange((efetivo) => { recebido = efetivo; });
  systemDark = false;
  Tema.set('dark');
  H.assertEq(recebido, 'dark');
});

H.run();
