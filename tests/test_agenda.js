// tests/test_agenda.js — parser PT-BR de prazos e cálculo de datas
const path = require('path');
const H = require('./helpers');
H.setupWindow();
const Agenda = require(path.join(H.ROOT, 'modules/agenda.js'));

H.section('parsePrazo');
H.test('"3 meses" → {meses, 3}', () => {
  H.assertDeep(Agenda.parsePrazo('3 meses'), { unidade: 'meses', quantidade: 3 });
});
H.test('"1 mês" (singular)', () => {
  H.assertDeep(Agenda.parsePrazo('1 mês'), { unidade: 'meses', quantidade: 1 });
});
H.test('"2 semanas"', () => {
  H.assertDeep(Agenda.parsePrazo('2 semanas'), { unidade: 'semanas', quantidade: 2 });
});
H.test('"15 dias"', () => {
  H.assertDeep(Agenda.parsePrazo('15 dias'), { unidade: 'dias', quantidade: 15 });
});
H.test('"1 ano"', () => {
  H.assertDeep(Agenda.parsePrazo('1 ano'), { unidade: 'anos', quantidade: 1 });
});
H.test('"retorno em 6 meses" (com prefixo)', () => {
  H.assertDeep(Agenda.parsePrazo('retorno em 6 meses'), { unidade: 'meses', quantidade: 6 });
});
H.test('texto sem prazo → null', () => {
  H.assertEq(Agenda.parsePrazo('voltar quando precisar'), null);
});
H.test('vazio → null', () => {
  H.assertEq(Agenda.parsePrazo(''), null);
});
H.test('quantidade absurda (>200) → null', () => {
  H.assertEq(Agenda.parsePrazo('500 dias'), null);
});

H.section('calcularDataFutura');
H.test('soma dias corretamente', () => {
  const base = new Date('2026-06-01T12:00:00');
  const r = Agenda.calcularDataFutura(base, { unidade: 'dias', quantidade: 10 });
  H.assertIncludes(r, '2026-06-11');
});
H.test('soma meses', () => {
  const base = new Date('2026-01-15T12:00:00');
  const r = Agenda.calcularDataFutura(base, { unidade: 'meses', quantidade: 3 });
  H.assertIncludes(r, '2026-04');
});
H.test('soma semanas', () => {
  const base = new Date('2026-06-01T12:00:00');
  const r = Agenda.calcularDataFutura(base, { unidade: 'semanas', quantidade: 2 });
  H.assertIncludes(r, '2026-06-15');
});
H.test('soma anos', () => {
  const base = new Date('2026-06-01T12:00:00');
  const r = Agenda.calcularDataFutura(base, { unidade: 'anos', quantidade: 1 });
  H.assertIncludes(r, '2027-06');
});

H.section('calcularRetornoDe (texto livre → data)');
H.test('extrai prazo e calcula data', () => {
  const base = new Date('2026-06-01T12:00:00');
  const r = Agenda.calcularRetornoDe('retorno em 1 mês', base);
  H.assert(r && r.includes('2026-07'), 'data de retorno incorreta: ' + r);
});
H.test('texto sem prazo → null', () => {
  H.assertEq(Agenda.calcularRetornoDe('sem data definida'), null);
});

H.section('Utilitários de data');
H.test('hojeIso formato YYYY-MM-DD', () => {
  const h = Agenda.hojeIso();
  H.assert(/^\d{4}-\d{2}-\d{2}$/.test(h), 'formato inválido: ' + h);
});
H.test('diasEntre calcula diferença', () => {
  const d = Agenda.diasEntre('2026-06-01', '2026-06-11');
  H.assertEq(Math.abs(d), 10);
});
H.test('distanciaHoje devolve string descritiva', () => {
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  H.assertEq(Agenda.distanciaHoje(ontem), 'ontem');
  H.assertEq(Agenda.distanciaHoje(Agenda.hojeIso()), 'hoje');
});
H.test('proximosNDias gera N datas', () => {
  const dias = Agenda.proximosNDias(7);
  H.assert(Array.isArray(dias) && dias.length === 7, 'esperava 7 datas');
});

H.run();
