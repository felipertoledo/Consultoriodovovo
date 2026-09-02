// Lógica de auto-tranco por inatividade (auth.js). Timers falsos ISOLADOS por teste,
// para não interferir no harness.
const H = require('./helpers');

let unlocked = true, lockCalls = 0;
global.DB = { isUnlocked: () => unlocked, lock: () => { unlocked = false; lockCalls++; }, audit: async () => {} };
global.window = global; global.CryptoModule = {};
const Auth = require('../modules/auth.js');
const eventos = []; Auth.on(e => eventos.push(e));

// executa fn com setTimeout/clearTimeout falsos; devolve a lista de timers agendados e vivos
function comTimersFalsos(fn) {
  const timers = []; let id = 0;
  const rs = global.setTimeout, rc = global.clearTimeout;
  global.setTimeout = (cb, ms) => { const t = { id: ++id, cb, ms }; timers.push(t); return t.id; };
  global.clearTimeout = (tid) => { const i = timers.findIndex(t => t.id === tid); if (i >= 0) timers.splice(i, 1); };
  try { fn(timers); } finally { global.setTimeout = rs; global.clearTimeout = rc; }
  return timers;
}

H.section('Auth idle — lógica');
H.test('padrão 0 = nenhum timer', () => {
  const t = comTimersFalsos(() => Auth.setIdleTimeout(0));
  H.assertEq(Auth.getIdleTimeoutMin(), 0); H.assertEq(t.length, 0);
});
H.test('15 min arma um timer de 900000 ms', () => {
  const t = comTimersFalsos(() => Auth.setIdleTimeout(15));
  H.assertEq(Auth.getIdleTimeoutMin(), 15); H.assertEq(t.length, 1); H.assertEq(t[0].ms, 900000);
});
H.test('trocar 15 → 30 substitui (não acumula)', () => {
  const t = comTimersFalsos(() => { Auth.setIdleTimeout(15); Auth.setIdleTimeout(30); });
  H.assertEq(t.length, 1, 'deveria restar 1 timer'); H.assertEq(t[0].ms, 1800000);
});
H.test('voltar a Nunca limpa o timer', () => {
  const t = comTimersFalsos(() => { Auth.setIdleTimeout(15); Auth.setIdleTimeout(0); });
  H.assertEq(t.length, 0); H.assertEq(Auth.getIdleTimeoutMin(), 0);
});
H.test('ao disparar, tranca e emite locked', async () => {
  let disparo;
  comTimersFalsos((t) => { Auth.setIdleTimeout(1); disparo = t[0].cb; });
  await disparo();
  H.assertEq(lockCalls, 1); H.assert(eventos.includes('locked'));
  unlocked = true;
});
H.test('trancado, não arma timer', () => {
  unlocked = false;
  const t = comTimersFalsos(() => Auth.setIdleTimeout(15));
  H.assertEq(t.length, 0, 'não deve armar timer com cofre trancado');
  unlocked = true; Auth.setIdleTimeout(0);
});
H.test('valores inválidos viram Nunca; string numérica vale', () => {
  Auth.setIdleTimeout('abc'); H.assertEq(Auth.getIdleTimeoutMin(), 0);
  Auth.setIdleTimeout(-5);    H.assertEq(Auth.getIdleTimeoutMin(), 0);
  Auth.setIdleTimeout('45');  H.assertEq(Auth.getIdleTimeoutMin(), 45);
  Auth.setIdleTimeout(0);
});
H.run();
