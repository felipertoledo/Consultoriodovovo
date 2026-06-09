// tests/test_codigos_clinicos.js — busca CIAP/CID e normalização de hipóteses
const path = require('path');
const H = require('./helpers');
H.setupWindow();
const CC = require(path.join(H.ROOT, 'modules/codigos-clinicos.js'));
// Carrega as bases de dados (window.CIAP2 / window.CID10) que buscar() consome
H.evalApp('assets/data/ciap2.js');
H.evalApp('assets/data/cid10-aps.js');

H.section('normalizar (string legado vs objeto novo)');
H.test('string vira { texto }', () => {
  H.assertDeep(CC.normalizar('Cefaleia'), { texto: 'Cefaleia' });
});
H.test('objeto com ciap/cid preserva códigos', () => {
  const n = CC.normalizar({ texto: 'HAS', ciap: { codigo: 'K86', descricao: 'Hipertensão' }, cid: { codigo: 'I10', descricao: 'HAS essencial' } });
  H.assertEq(n.texto, 'HAS');
  H.assertEq(n.ciap.codigo, 'K86');
  H.assertEq(n.cid.codigo, 'I10');
});
H.test('null vira { texto: "" }', () => {
  H.assertDeep(CC.normalizar(null), { texto: '' });
});
H.test('objeto sem código não cria ciap', () => {
  const n = CC.normalizar({ texto: 'X', ciap: {} });
  H.assert(!n.ciap, 'não deveria ter ciap sem código');
});

H.section('textoDe / ciapDe / cidDe');
H.test('textoDe extrai texto', () => {
  H.assertEq(CC.textoDe({ texto: 'Tosse' }), 'Tosse');
  H.assertEq(CC.textoDe('Febre'), 'Febre');
});
H.test('ciapDe extrai objeto ou null', () => {
  H.assertEq(CC.ciapDe({ ciap: { codigo: 'K86' } }).codigo, 'K86');
  H.assertEq(CC.ciapDe({ texto: 'x' }), null);
});
H.test('cidDe extrai objeto ou null', () => {
  H.assertEq(CC.cidDe({ cid: { codigo: 'I10' } }).codigo, 'I10');
  H.assertEq(CC.cidDe({ texto: 'x' }), null);
});

H.section('formatarBadges');
H.test('formata CIAP + CID', () => {
  const s = CC.formatarBadges({ ciap: { codigo: 'K86' }, cid: { codigo: 'I10' } });
  H.assertIncludes(s, 'K86');
  H.assertIncludes(s, 'I10');
});
H.test('sem códigos retorna vazio', () => {
  H.assertEq(CC.formatarBadges({ texto: 'x' }), '');
});

H.section('buscar (autocomplete CIAP/CID)');
H.test('busca por código CIAP encontra', () => {
  const res = CC.buscar('K86', 10);
  H.assert(res.length > 0, 'deveria achar K86');
  H.assert(res.some(r => r.codigo === 'K86'), 'K86 não nos resultados');
});
H.test('busca por termo textual encontra', () => {
  const res = CC.buscar('hipertens', 10);
  H.assert(res.length > 0, 'deveria achar por "hipertens"');
});
H.test('busca devolve tipo (ciap/cid)', () => {
  const res = CC.buscar('diabetes', 10);
  H.assert(res.length > 0);
  H.assert(res.every(r => r.tipo === 'ciap' || r.tipo === 'cid'), 'tipo inválido');
});
H.test('busca vazia devolve array vazio ou poucos', () => {
  const res = CC.buscar('', 10);
  H.assert(Array.isArray(res), 'deveria ser array');
});
H.test('busca respeita limite', () => {
  const res = CC.buscar('a', 5);
  H.assert(res.length <= 5, 'excedeu limite');
});
H.test('termo improvável devolve vazio', () => {
  const res = CC.buscar('zzzxqwk', 10);
  H.assertEq(res.length, 0);
});

H.run();
