// test_refresh_visual.js — Sprint v0.17
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let passed = 0, failed = 0;
function test(nome, fn) {
  try { fn(); console.log(`  ✓ ${nome}`); passed++; }
  catch (e) { console.log(`  ✗ ${nome}`); console.log(`      ${e.message}`); failed++; }
}
function assert(c, m) { if (!c) throw new Error(m || 'falhou'); }
function assertEq(a, b, m) { if (a !== b) throw new Error(`${m || ''}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }

const ROOT = require('path').resolve(__dirname, '..');
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;

// Carrega Hiperdia (necessário para extrairCodigoCiap) e codigos-clinicos
// Define tanto global.Hiperdia (bare name dentro de eval) quanto window.Hiperdia
global.Hiperdia = require(path.join(ROOT, 'modules/hiperdia.js'));
global.window.Hiperdia = global.Hiperdia;

// Mock mínimo de UI e DB para carregar pacientes-lista
global.UI = {
  calculateAge: () => 50, getInitials: () => 'XX',
  avatarColorFromName: () => '#166534', toast: () => {}
};
global.window.UI = global.UI;

// Carrega o componente pacientes-lista (expõe condicoesCronicas + CONDICOES_CRONICAS_MAP)
const codigoLista = fs.readFileSync(path.join(ROOT, 'components/pacientes-lista.js'), 'utf8');
eval(codigoLista);

console.log('\n=== 1. condicoesCronicas (formato real de hipótese) ===');

test('K86 → tag HAS', () => {
  const consultas = [{ hipoteses: [{ texto: 'Hipertensão', ciap: { codigo: 'K86', descricao: 'HAS' } }] }];
  const tags = condicoesCronicas(consultas);
  assert(tags.includes('HAS'), 'esperava HAS, veio: ' + JSON.stringify(tags));
});

test('T90 → tag DM2', () => {
  const consultas = [{ hipoteses: [{ ciap: { codigo: 'T90' } }] }];
  const tags = condicoesCronicas(consultas);
  assert(tags.includes('DM2'));
});

test('K86 + T90 + T93 → HAS, DM2, Dislipidemia', () => {
  const consultas = [{
    hipoteses: [
      { ciap: { codigo: 'K86' } },
      { ciap: { codigo: 'T90' } },
      { ciap: { codigo: 'T93' } }
    ]
  }];
  const tags = condicoesCronicas(consultas);
  assert(tags.includes('HAS'));
  assert(tags.includes('DM2'));
  assert(tags.includes('Dislipidemia'));
});

test('Condições duplicadas em consultas diferentes não repetem', () => {
  const consultas = [
    { hipoteses: [{ ciap: { codigo: 'K86' } }] },
    { hipoteses: [{ ciap: { codigo: 'K87' } }] }  // ambos mapeiam HAS
  ];
  const tags = condicoesCronicas(consultas);
  assertEq(tags.filter(t => t === 'HAS').length, 1, 'HAS deveria aparecer 1 vez');
});

test('CIAP não-crônico não vira tag', () => {
  const consultas = [{ hipoteses: [{ ciap: { codigo: 'R74' } }] }];
  const tags = condicoesCronicas(consultas);
  assertEq(tags.length, 0);
});

test('Máximo 5 tags', () => {
  const consultas = [{
    hipoteses: [
      { ciap: { codigo: 'K86' } }, { ciap: { codigo: 'T90' } },
      { ciap: { codigo: 'T93' } }, { ciap: { codigo: 'T82' } },
      { ciap: { codigo: 'P76' } }, { ciap: { codigo: 'R96' } },
      { ciap: { codigo: 'L95' } }
    ]
  }];
  const tags = condicoesCronicas(consultas);
  assert(tags.length <= 5, 'máximo 5, veio ' + tags.length);
});

test('Consulta deletada ignorada', () => {
  const consultas = [{ deleted: 1, hipoteses: [{ ciap: { codigo: 'K86' } }] }];
  const tags = condicoesCronicas(consultas);
  assertEq(tags.length, 0);
});

console.log('\n=== 2. Renderização dos componentes ===');

test('renderPacientesLista injeta HTML', () => {
  const c = document.createElement('div');
  renderPacientesLista(c);
  assert(c.innerHTML.includes('pacientesLista()'));
  assert(c.innerHTML.includes('patient-semaforo'));
  assert(c.innerHTML.includes('vaga-badge-mini'));
});

test('pacientesLista expõe helpers novos', () => {
  const comp = pacientesLista();
  assertEq(comp.semaforoIcone('vermelho'), '🔴');
  assertEq(comp.semaforoIcone('amarelo'), '🟡');
  assertEq(comp.semaforoIcone('verde'), '🟢');
  assertEq(comp.semaforoIcone(null), '');
  assertEq(comp.vagaMini('sus'), 'SUS');
  assertEq(comp.vagaMini('particular'), 'PART');
  assertEq(comp.vagaMini('convenio'), 'CONV');
});

test('rotuloUltima formata tempos relativos', () => {
  const comp = pacientesLista();
  assertEq(comp.rotuloUltima(null), '—');
  assertEq(comp.rotuloUltima(new Date().toISOString()), 'hoje');
  const ontem = new Date(Date.now() - 86400000).toISOString();
  assertEq(comp.rotuloUltima(ontem), 'ontem');
  const cincoDias = new Date(Date.now() - 5 * 86400000).toISOString();
  assertEq(comp.rotuloUltima(cincoDias), 'há 5 dias');
});

console.log('\n=== 3. paciente-form: ROTULOS_SOCIO ===');

// Carrega paciente-form (expõe ROTULOS_SOCIO + emptyPaciente)
const codigoForm = fs.readFileSync(path.join(ROOT, 'components/paciente-form.js'), 'utf8');
eval(codigoForm);

test('emptyPaciente inclui campos socioeconômicos', () => {
  const p = emptyPaciente();
  assert('tipoVaga' in p);
  assert('rendaPessoal' in p);
  assert('rendaFamiliar' in p);
  assert('fonteRenda' in p);
});

test('ROTULOS_SOCIO tem labels de vaga', () => {
  assertEq(window.ROTULOS_SOCIO.tipoVaga.sus, '🏥 SUS');
  assertEq(window.ROTULOS_SOCIO.tipoVaga.particular, '💳 Particular');
  assertEq(window.ROTULOS_SOCIO.tipoVaga.convenio, '📋 Convênio');
});

test('ROTULOS_SOCIO tem labels de renda e fonte', () => {
  assertEq(window.ROTULOS_SOCIO.renda.ate_1, 'Até 1 salário mínimo');
  assertEq(window.ROTULOS_SOCIO.fonteRenda.bpc, 'BPC/LOAS');
  assertEq(window.ROTULOS_SOCIO.fonteRenda.bolsa_familia, 'Bolsa Família / auxílio');
});

test('renderPacienteForm injeta bloco socioeconômico', () => {
  const c = document.createElement('div');
  renderPacienteForm(c, 'novo');
  assert(c.innerHTML.includes('Situação socioeconômica'));
  assert(c.innerHTML.includes('Tipo de atendimento'));
  assert(c.innerHTML.includes('Fonte de renda principal'));
  assert(c.innerHTML.includes('Renda pessoal'));
  assert(c.innerHTML.includes('Renda familiar'));
});

console.log('\n=== Resumo ===');
console.log(`✓ ${passed} testes passaram`);
if (failed > 0) { console.log(`✗ ${failed} falharam`); process.exit(1); }
else { console.log(`Total: ${passed}/${passed} ✓`); }
