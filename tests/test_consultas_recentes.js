// test_consultas_recentes.js — Sprint v0.18
require('fake-indexeddb/auto');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let passed = 0, failed = 0;
async function test(nome, fn) {
  try { await fn(); console.log(`  ✓ ${nome}`); passed++; }
  catch (e) { console.log(`  ✗ ${nome}`); console.log(`      ${e.message}`); failed++; }
}
function assert(c, m) { if (!c) throw new Error(m || 'falhou'); }
function assertEq(a, b, m) { if (a !== b) throw new Error(`${m || ''}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }

const ROOT = require('path').resolve(__dirname, '..');
const Dexie = require(path.join(ROOT, 'assets/lib/dexie.min.js'));
global.Dexie = Dexie;
global.window = { crypto: require('crypto').webcrypto };
global.crypto = require('crypto').webcrypto;

(async () => {
  // Carrega CryptoModule + DB
  eval(fs.readFileSync(path.join(ROOT, 'modules/crypto.js'), 'utf8'));
  const CryptoModule = global.window.CryptoModule;
  global.CryptoModule = CryptoModule;
  eval(fs.readFileSync(path.join(ROOT, 'modules/db.js'), 'utf8'));
  const DB = global.window.DB;

  console.log('\n=== 1. listConsultasRecentes (DB) ===');

  await test('Setup cofre', async () => {
    const { dek } = await CryptoModule.createVault('senha-de-teste-123456');
    DB.setDEK(dek);
    await DB.initNameHashSalt();
  });

  let pidA, pidB;
  await test('Criar 2 pacientes + consultas', async () => {
    pidA = await DB.createPaciente({ nome: 'Ana Recente', dataNascimento: '1980-01-01' });
    pidB = await DB.createPaciente({ nome: 'Bruno Antigo', dataNascimento: '1975-01-01' });

    // Consultas de Ana (mais recentes)
    await DB.createConsulta({ pacienteId: pidA, dataHora: '2026-06-07T10:00', queixaPrincipal: 'Cefaleia' });
    await DB.createConsulta({ pacienteId: pidA, dataHora: '2026-06-01T10:00', queixaPrincipal: 'Tosse' });
    // Consulta de Bruno (no meio)
    await DB.createConsulta({ pacienteId: pidB, dataHora: '2026-06-05T10:00', queixaPrincipal: 'Dor lombar' });
  });

  await test('Feed retorna consultas de TODOS os pacientes', async () => {
    const feed = await DB.listConsultasRecentes(50);
    assertEq(feed.length, 3);
  });

  await test('Ordenadas por dataHora desc', async () => {
    const feed = await DB.listConsultasRecentes(50);
    assertEq(feed[0].queixaPrincipal, 'Cefaleia');  // 07/06
    assertEq(feed[1].queixaPrincipal, 'Dor lombar'); // 05/06
    assertEq(feed[2].queixaPrincipal, 'Tosse');      // 01/06
  });

  await test('Cada item traz pacienteNome resolvido', async () => {
    const feed = await DB.listConsultasRecentes(50);
    assertEq(feed[0].pacienteNome, 'Ana Recente');
    assertEq(feed[1].pacienteNome, 'Bruno Antigo');
    assertEq(feed[2].pacienteNome, 'Ana Recente');
  });

  await test('Limite recorta o número de consultas', async () => {
    const feed = await DB.listConsultasRecentes(2);
    assertEq(feed.length, 2);
    assertEq(feed[0].queixaPrincipal, 'Cefaleia');
    assertEq(feed[1].queixaPrincipal, 'Dor lombar');
  });

  await test('Consulta deletada não aparece no feed', async () => {
    const feed1 = await DB.listConsultasRecentes(50);
    const idParaDeletar = feed1.find(c => c.queixaPrincipal === 'Tosse').id;
    await DB.softDeleteConsulta(idParaDeletar);
    const feed2 = await DB.listConsultasRecentes(50);
    assertEq(feed2.length, 2);
    assert(!feed2.some(c => c.queixaPrincipal === 'Tosse'));
  });

  // ============================================================
  console.log('\n=== 2. Componente consultasRecentes ===');

  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', { url: 'http://localhost/' });
  global.window.document = dom.window.document;
  global.document = dom.window.document;
  global.window.Hiperdia = require(path.join(ROOT, 'modules/hiperdia.js'));
  global.Hiperdia = global.window.Hiperdia;

  eval(fs.readFileSync(path.join(ROOT, 'components/consultas-recentes.js'), 'utf8'));

  await test('renderConsultasRecentes injeta HTML', () => {
    const c = document.createElement('div');
    renderConsultasRecentes(c);
    assert(c.innerHTML.includes('consultasRecentes()'));
    assert(c.innerHTML.includes('Últimas consultas'));
    assert(c.innerHTML.includes('consulta-feed-paciente'));
  });

  await test('Componente: filtro por nome de paciente', () => {
    const comp = consultasRecentes();
    comp.consultas = [
      { id: 1, pacienteNome: 'Ana Recente', queixaPrincipal: 'Cefaleia', hipoteses: [] },
      { id: 2, pacienteNome: 'Bruno Antigo', queixaPrincipal: 'Dor lombar', hipoteses: [] }
    ];
    comp.filtro = 'ana';
    comp.aplicarFiltro();
    assertEq(comp.filtradas.length, 1);
    assertEq(comp.filtradas[0].pacienteNome, 'Ana Recente');
  });

  await test('Componente: filtro por queixa', () => {
    const comp = consultasRecentes();
    comp.consultas = [
      { id: 1, pacienteNome: 'Ana', queixaPrincipal: 'Cefaleia', hipoteses: [] },
      { id: 2, pacienteNome: 'Bruno', queixaPrincipal: 'Dor lombar', hipoteses: [] }
    ];
    comp.filtro = 'lombar';
    comp.aplicarFiltro();
    assertEq(comp.filtradas.length, 1);
    assertEq(comp.filtradas[0].queixaPrincipal, 'Dor lombar');
  });

  await test('Componente: filtro vazio mostra tudo', () => {
    const comp = consultasRecentes();
    comp.consultas = [{ id: 1, pacienteNome: 'A', queixaPrincipal: 'x', hipoteses: [] }];
    comp.filtro = '';
    comp.aplicarFiltro();
    assertEq(comp.filtradas.length, 1);
  });

  await test('Componente: ciapHip extrai código (formato real)', () => {
    const comp = consultasRecentes();
    assertEq(comp.ciapHip({ ciap: { codigo: 'K86' } }), 'K86');
  });

  await test('Componente: paFmt formata PA', () => {
    const comp = consultasRecentes();
    assertEq(comp.paFmt({ pa: '120x80' }), '120×80');
  });

  await test('Componente: formatadores de data', () => {
    const comp = consultasRecentes();
    assertEq(comp.dia('2026-06-07T10:00'), '07');
    assertEq(comp.mes('2026-06-07T10:00'), 'JUN/26');
  });

  console.log('\n=== Resumo ===');
  console.log(`✓ ${passed} testes passaram`);
  if (failed > 0) { console.log(`✗ ${failed} falharam`); process.exit(1); }
  else { console.log(`Total: ${passed}/${passed} ✓`); process.exit(0); }
})();
