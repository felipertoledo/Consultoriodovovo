// test_financeiro.js — módulo de controle financeiro (lógica + persistência)
require('fake-indexeddb/auto');
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
async function test(nome, fn) {
  try { await fn(); console.log(`  ✓ ${nome}`); passed++; }
  catch (e) { console.log(`  ✗ ${nome}`); console.log(`      ${e.message}`); failed++; }
}
function assert(c, m) { if (!c) throw new Error(m || 'falhou'); }
function assertEq(a, b, m) { if (a !== b) throw new Error(`${m || ''}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }

const ROOT = path.resolve(__dirname, '..');
const F = require(path.join(ROOT, 'modules/financeiro-core.js'));

(async () => {
  // ============================================================
  console.log('\n=== 1. Formatação e parsing de moeda ===');

  await test('formatarMoeda inteiro', () => assertEq(F.formatarMoeda(1234), 'R$ 1.234,00'));
  await test('formatarMoeda com centavos', () => assertEq(F.formatarMoeda(1234.5), 'R$ 1.234,50'));
  await test('formatarMoeda milhões', () => assertEq(F.formatarMoeda(1234567.89), 'R$ 1.234.567,89'));
  await test('formatarMoeda zero', () => assertEq(F.formatarMoeda(0), 'R$ 0,00'));
  await test('formatarMoeda negativo', () => assertEq(F.formatarMoeda(-50.5), '-R$ 50,50'));
  await test('formatarNumero sem símbolo', () => assertEq(F.formatarNumero(1234.5), '1.234,50'));

  await test('parseMoeda "200"', () => assertEq(F.parseMoeda('200'), 200));
  await test('parseMoeda "1.234,56" (pt-BR)', () => assertEq(F.parseMoeda('1.234,56'), 1234.56));
  await test('parseMoeda "1234,56" (só vírgula)', () => assertEq(F.parseMoeda('1234,56'), 1234.56));
  await test('parseMoeda "1234.56" (ponto decimal)', () => assertEq(F.parseMoeda('1234.56'), 1234.56));
  await test('parseMoeda "R$ 1.234,56"', () => assertEq(F.parseMoeda('R$ 1.234,56'), 1234.56));
  await test('parseMoeda vazio → 0', () => assertEq(F.parseMoeda(''), 0));
  await test('parseMoeda lixo → 0', () => assertEq(F.parseMoeda('abc'), 0));
  await test('parseMoeda número passa direto', () => assertEq(F.parseMoeda(99.9), 99.9));

  // ============================================================
  console.log('\n=== 2. Impostos / deduções ===');

  await test('calcularImpostos lista vazia', () => {
    const r = F.calcularImpostos(1000, []);
    assertEq(r.totalValor, 0); assertEq(r.totalPercentual, 0); assertEq(r.detalhes.length, 0);
  });
  await test('calcularImpostos uma linha 6%', () => {
    const r = F.calcularImpostos(1000, [{ nome: 'Simples', percentual: 6 }]);
    assertEq(r.totalValor, 60); assertEq(r.totalPercentual, 6);
    assertEq(r.detalhes[0].valor, 60);
  });
  await test('calcularImpostos várias linhas (ISS+IR+INSS)', () => {
    const imp = [{ nome: 'ISS', percentual: 5 }, { nome: 'IR', percentual: 15 }, { nome: 'INSS', percentual: 11 }];
    const r = F.calcularImpostos(1000, imp);
    assertEq(r.totalPercentual, 31);
    assertEq(r.totalValor, 310);
    assertEq(r.detalhes[1].nome, 'IR');
    assertEq(r.detalhes[1].valor, 150);
  });
  await test('calcularImpostos arredonda corretamente', () => {
    const r = F.calcularImpostos(333.33, [{ nome: 'x', percentual: 7.5 }]);
    assertEq(r.totalValor, 25); // 333.33 * 0.075 = 24.99975 → 25
  });
  await test('liquido = bruto − impostos', () => {
    assertEq(F.liquido(1000, [{ nome: 'a', percentual: 20 }]), 800);
  });
  await test('liquido sem impostos = bruto', () => {
    assertEq(F.liquido(1000, []), 1000);
  });
  await test('percentual ignora linhas inválidas (NaN vira 0)', () => {
    const r = F.calcularImpostos(1000, [{ nome: 'x', percentual: 'abc' }]);
    assertEq(r.totalValor, 0);
  });

  // ============================================================
  console.log('\n=== 3. Resumo e agregação ===');

  const lancs = [
    { valor: 200, data: '2026-06-01', mes: '2026-06', formaPagamento: 'PIX' },
    { valor: 150.50, data: '2026-06-10', mes: '2026-06', formaPagamento: 'Dinheiro' },
    { valor: 300, data: '2026-06-15', mes: '2026-06', formaPagamento: 'PIX' }
  ];

  await test('somaBruto', () => assertEq(F.somaBruto(lancs), 650.50));
  await test('resumo bruto', () => assertEq(F.resumo(lancs, []).bruto, 650.50));
  await test('resumo quantidade', () => assertEq(F.resumo(lancs, []).quantidade, 3));
  await test('resumo ticket médio', () => {
    const r = F.resumo(lancs, []);
    assertEq(r.ticketMedio, 216.83); // 650.50 / 3 = 216.833... → 216.83
  });
  await test('resumo líquido com 10%', () => {
    const r = F.resumo(lancs, [{ nome: 'x', percentual: 10 }]);
    assertEq(r.liquido, 585.45); // 650.50 - 65.05
  });
  await test('resumo agrupa por forma de pagamento', () => {
    const r = F.resumo(lancs, []);
    assertEq(r.porForma['PIX'], 500);
    assertEq(r.porForma['Dinheiro'], 150.50);
  });
  await test('resumo lista vazia', () => {
    const r = F.resumo([], []);
    assertEq(r.bruto, 0); assertEq(r.quantidade, 0); assertEq(r.ticketMedio, 0);
  });
  await test('agruparPorMes', () => {
    const multi = [
      { valor: 100, mes: '2026-05' }, { valor: 200, mes: '2026-06' }, { valor: 50, mes: '2026-06' }
    ];
    const g = F.agruparPorMes(multi);
    assertEq(g['2026-05'], 100); assertEq(g['2026-06'], 250);
  });
  await test('agruparPorMes deriva mes da data se faltar', () => {
    const g = F.agruparPorMes([{ valor: 100, data: '2026-03-15' }]);
    assertEq(g['2026-03'], 100);
  });

  // ============================================================
  console.log('\n=== 4. Meses e evolução ===');

  await test('mesDe extrai YYYY-MM', () => assertEq(F.mesDe('2026-06-21'), '2026-06'));
  await test('mesAtual formato', () => assert(/^\d{4}-\d{2}$/.test(F.mesAtual())));
  await test('deslocarMes +1', () => assertEq(F.deslocarMes('2026-06', 1), '2026-07'));
  await test('deslocarMes -1 vira ano', () => assertEq(F.deslocarMes('2026-01', -1), '2025-12'));
  await test('deslocarMes +7 vira ano', () => assertEq(F.deslocarMes('2026-06', 7), '2027-01'));
  await test('ultimosNMeses ordem cronológica', () => {
    assertEq(JSON.stringify(F.ultimosNMeses(3, '2026-06')), JSON.stringify(['2026-04', '2026-05', '2026-06']));
  });
  await test('rotuloMes', () => assertEq(F.rotuloMes('2026-06'), 'Junho de 2026'));
  await test('rotuloMesCurto', () => assertEq(F.rotuloMesCurto('2026-06'), 'jun/26'));
  await test('evolucaoMensal preenche meses sem lançamento com 0', () => {
    const ev = F.evolucaoMensal([{ valor: 500, mes: '2026-06' }], 3, [], '2026-06');
    assertEq(ev.length, 3);
    assertEq(ev[0].bruto, 0);          // 2026-04 sem lançamento
    assertEq(ev[2].bruto, 500);        // 2026-06
    assertEq(ev[2].mes, '2026-06');
  });
  await test('evolucaoMensal aplica impostos no líquido', () => {
    const ev = F.evolucaoMensal([{ valor: 1000, mes: '2026-06' }], 1, [{ nome: 'x', percentual: 20 }], '2026-06');
    assertEq(ev[0].bruto, 1000); assertEq(ev[0].liquido, 800);
  });

  // ============================================================
  console.log('\n=== 5. Persistência de lançamentos (DB) ===');

  // Carrega CryptoModule + DB (padrão self-contained)
  const Dexie = require(path.join(ROOT, 'assets/lib/dexie.min.js'));
  global.Dexie = Dexie;
  global.window = { crypto: require('crypto').webcrypto };
  global.crypto = require('crypto').webcrypto;
  eval(fs.readFileSync(path.join(ROOT, 'modules/crypto.js'), 'utf8'));
  const CryptoModule = global.window.CryptoModule;
  global.CryptoModule = CryptoModule;
  eval(fs.readFileSync(path.join(ROOT, 'modules/db.js'), 'utf8'));
  const DB = global.window.DB;

  await test('Setup cofre', async () => {
    const { dek } = await CryptoModule.createVault('senha-de-teste-123456');
    DB.setDEK(dek);
    await DB.initNameHashSalt();
  });

  let idA;
  await test('createLancamento retorna id', async () => {
    idA = await DB.createLancamento({
      pacienteId: 42, pacienteNome: 'João Teste', valor: 200,
      data: '2026-06-15', descricao: 'Consulta', formaPagamento: 'PIX', observacao: 'primeira'
    });
    assert(idA != null);
  });
  await test('getLancamento decifra payload', async () => {
    const l = await DB.getLancamento(idA);
    assertEq(l.valor, 200);
    assertEq(l.pacienteNome, 'João Teste');
    assertEq(l.descricao, 'Consulta');
    assertEq(l.formaPagamento, 'PIX');
    assertEq(l.mes, '2026-06');
    assertEq(l.pacienteId, 42);
  });
  await test('valor e nome NÃO ficam em texto plano na linha', async () => {
    const row = await DB.db.lancamentos.get(idA);
    const raw = JSON.stringify(row);
    assert(!raw.includes('João Teste'), 'nome vazou em texto plano');
    assert(raw.includes('2026-06'), 'mes deveria estar em texto plano para índice');
    // data top-level presente, payload cifrado (não contém "200" como valor cru localizável é difícil garantir, então checamos nome)
  });
  await test('listLancamentos por mês', async () => {
    await DB.createLancamento({ valor: 150, data: '2026-06-20', descricao: 'Retorno' });
    await DB.createLancamento({ valor: 999, data: '2026-05-10', descricao: 'Outro mês' });
    const jun = await DB.listLancamentos({ mes: '2026-06' });
    assertEq(jun.length, 2);
    assert(jun.every(l => l.mes === '2026-06'));
  });
  await test('listLancamentos ordena por data desc', async () => {
    const jun = await DB.listLancamentos({ mes: '2026-06' });
    assert(jun[0].data >= jun[1].data);
  });
  await test('listLancamentos por paciente', async () => {
    const doPac = await DB.listLancamentos({ pacienteId: 42 });
    assertEq(doPac.length, 1);
    assertEq(doPac[0].pacienteId, 42);
  });
  await test('updateLancamento altera valor e mês', async () => {
    await DB.updateLancamento(idA, { pacienteId: 42, pacienteNome: 'João Teste', valor: 250, data: '2026-07-01', descricao: 'Consulta', formaPagamento: 'Dinheiro' });
    const l = await DB.getLancamento(idA);
    assertEq(l.valor, 250);
    assertEq(l.mes, '2026-07');
    assertEq(l.formaPagamento, 'Dinheiro');
  });
  await test('softDeleteLancamento remove da listagem', async () => {
    const antes = await DB.listLancamentos({ mes: '2026-07' });
    assertEq(antes.length, 1);
    await DB.softDeleteLancamento(idA);
    const depois = await DB.listLancamentos({ mes: '2026-07' });
    assertEq(depois.length, 0);
    assertEq(await DB.getLancamento(idA), null);
  });
  await test('listMesesComLancamentos retorna meses únicos desc', async () => {
    const meses = await DB.listMesesComLancamentos();
    assert(meses.includes('2026-06'));
    assert(meses.includes('2026-05'));
    // desc
    assert(meses.indexOf('2026-06') < meses.indexOf('2026-05'));
  });

  // ============================================================
  console.log('\n=== 6. Configuração de impostos (DB) ===');

  await test('getImpostos default vazio', async () => {
    const imp = await DB.getImpostos();
    assert(Array.isArray(imp)); assertEq(imp.length, 0);
  });
  await test('setImpostos salva e getImpostos retorna', async () => {
    await DB.setImpostos([{ nome: 'ISS', percentual: 5 }, { nome: 'IR', percentual: 15 }]);
    const imp = await DB.getImpostos();
    assertEq(imp.length, 2);
    assertEq(imp[0].nome, 'ISS');
    assertEq(imp[1].percentual, 15);
  });
  await test('setImpostos filtra linhas sem nome', async () => {
    const salvos = await DB.setImpostos([{ nome: 'ISS', percentual: 5 }, { nome: '', percentual: 10 }, { nome: '  ', percentual: 3 }]);
    assertEq(salvos.length, 1);
    assertEq(salvos[0].nome, 'ISS');
  });
  await test('setImpostos coage percentual para número', async () => {
    const salvos = await DB.setImpostos([{ nome: 'X', percentual: '7.5' }]);
    assertEq(salvos[0].percentual, 7.5);
    assertEq(typeof salvos[0].percentual, 'number');
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${passed} passaram · ${failed} falharam`);
  console.log('='.repeat(50));
  process.exit(failed > 0 ? 1 : 0);
})();
