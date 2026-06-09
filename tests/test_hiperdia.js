// test_hiperdia.js — Sprint B3 + fix formato real de hipótese
const Hiperdia = require(require('path').resolve(__dirname, '..', 'modules/hiperdia.js'));

let passed = 0, failed = 0;
function test(nome, fn) {
  try { fn(); console.log(`  ✓ ${nome}`); passed++; }
  catch (e) { console.log(`  ✗ ${nome}`); console.log(`      ${e.message}`); failed++; }
}
function assert(c, m) { if (!c) throw new Error(m || 'falhou'); }
function assertEq(a, b, m) { if (a !== b) throw new Error(`${m || ''}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }
function assertDeep(a, b, m) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}

const agora = new Date().toISOString();
const trintaDiasAtras = new Date(Date.now() - 30 * 86400000).toISOString();
const seteMesesAtras = new Date(Date.now() - 210 * 86400000).toISOString();
const umAnoMaisAtras = new Date(Date.now() - 400 * 86400000).toISOString();

console.log('\n=== 1. parsePA ===');
test('120x80', () => assertDeep(Hiperdia.parsePA('120x80'), { sistolica: 120, diastolica: 80 }));
test('120/80', () => assertDeep(Hiperdia.parsePA('120/80'), { sistolica: 120, diastolica: 80 }));
test('120 x 80', () => assertDeep(Hiperdia.parsePA('120 x 80'), { sistolica: 120, diastolica: 80 }));
test('PA 130x85', () => assertDeep(Hiperdia.parsePA('PA 130x85'), { sistolica: 130, diastolica: 85 }));
test('150x90 mmHg', () => assertDeep(Hiperdia.parsePA('150x90 mmHg'), { sistolica: 150, diastolica: 90 }));
test('vazio → null', () => assertEq(Hiperdia.parsePA(''), null));
test('texto → null', () => assertEq(Hiperdia.parsePA('não aferida'), null));
test('implausível sis<60 → null', () => assertEq(Hiperdia.parsePA('40x30'), null));
test('dia>sis → null', () => assertEq(Hiperdia.parsePA('80x120'), null));

console.log('\n=== 2. extrairCodigoCiap (CRÍTICO — formato real) ===');
test('Objeto {ciap:{codigo}} → código', () => {
  assertEq(Hiperdia.extrairCodigoCiap({ ciap: { codigo: 'K86', descricao: 'HAS' } }), 'K86');
});
test('String legado {ciap:"T90"} → código', () => {
  assertEq(Hiperdia.extrairCodigoCiap({ ciap: 'T90' }), 'T90');
});
test('Sem ciap → null', () => {
  assertEq(Hiperdia.extrairCodigoCiap({ texto: 'sem ciap' }), null);
});
test('String pura → null', () => {
  assertEq(Hiperdia.extrairCodigoCiap('texto'), null);
});
test('null → null', () => {
  assertEq(Hiperdia.extrairCodigoCiap(null), null);
});

console.log('\n=== 3. identificarCondicoes (formato real objeto) ===');
test('{ciap:{codigo:K86}} detecta HAS', () => {
  const r = Hiperdia.identificarCondicoes([{ hipoteses: [{ texto: 'HAS', ciap: { codigo: 'K86', descricao: 'Hipertensão' } }] }]);
  assert(r.temHAS, 'HAS não detectada no formato real');
});
test('{ciap:{codigo:T90}} detecta DM', () => {
  const r = Hiperdia.identificarCondicoes([{ hipoteses: [{ texto: 'DM', ciap: { codigo: 'T90', descricao: 'Diabetes' } }] }]);
  assert(r.temDM, 'DM não detectado no formato real');
});
test('Misto real HAS+DM', () => {
  const r = Hiperdia.identificarCondicoes([{
    hipoteses: [
      { texto: 'HAS', ciap: { codigo: 'K86', descricao: '' } },
      { texto: 'DM2', ciap: { codigo: 'T90', descricao: '' } }
    ]
  }]);
  assert(r.temHAS && r.temDM);
});
test('K87 (HAS complicada) detecta HAS', () => {
  const r = Hiperdia.identificarCondicoes([{ hipoteses: [{ ciap: { codigo: 'K87' } }] }]);
  assert(r.temHAS);
});
test('CIAP não-Hiperdia → não é Hiperdia', () => {
  const r = Hiperdia.identificarCondicoes([{ hipoteses: [{ ciap: { codigo: 'R74' } }] }]);
  assert(!r.ehHiperdia);
});
test('Formato legado string ainda funciona', () => {
  const r = Hiperdia.identificarCondicoes([{ hipoteses: [{ ciap: 'K86' }] }]);
  assert(r.temHAS);
});

console.log('\n=== 4. extrairUltimaPA / HbA1c ===');
test('PA mais recente', () => {
  const r = Hiperdia.extrairUltimaPA([
    { id: 1, dataHora: '2026-01-01T10:00', pa: '120x80' },
    { id: 2, dataHora: '2026-05-01T10:00', pa: '150x95' }
  ]);
  assertEq(r.consultaId, 2);
});
test('HbA1c mais recente', () => {
  const r = Hiperdia.extrairUltimaHbA1c([
    { id: 1, dataHora: '2026-01-01T10:00', exames: { glicemico: { hba1c: '7.2' } } },
    { id: 2, dataHora: '2026-05-01T10:00', exames: { glicemico: { hba1c: '6.5' } } }
  ]);
  assertEq(r.valor, 6.5);
});

console.log('\n=== 5. classificarPA / HbA1c ===');
test('PA 120x80 → verde', () => assertEq(Hiperdia.classificarPA(120, 80, false).nivel, 'verde'));
test('PA 145x95 → amarelo', () => assertEq(Hiperdia.classificarPA(145, 95, false).nivel, 'amarelo'));
test('PA 170x110 → vermelho', () => assertEq(Hiperdia.classificarPA(170, 110, false).nivel, 'vermelho'));
test('PA 135x85 DM → amarelo', () => assertEq(Hiperdia.classificarPA(135, 85, true).nivel, 'amarelo'));
test('HbA1c 6.5 → verde', () => assertEq(Hiperdia.classificarHbA1c(6.5).nivel, 'verde'));
test('HbA1c 8.0 → amarelo', () => assertEq(Hiperdia.classificarHbA1c(8.0).nivel, 'amarelo'));
test('HbA1c 9.5 → vermelho', () => assertEq(Hiperdia.classificarHbA1c(9.5).nivel, 'vermelho'));

console.log('\n=== 6. classificarPaciente (integração, formato real) ===');
test('HAS controlada + recente → verde', () => {
  const r = Hiperdia.classificarPaciente([{
    id: 1, dataHora: trintaDiasAtras,
    hipoteses: [{ texto: 'HAS', ciap: { codigo: 'K86', descricao: 'Hipertensão' } }],
    pa: '125x82'
  }]);
  assertEq(r.nivel, 'verde');
  assert(r.detalhes.temHAS);
});
test('HAS estágio 2 → vermelho', () => {
  const r = Hiperdia.classificarPaciente([{
    id: 1, dataHora: trintaDiasAtras,
    hipoteses: [{ ciap: { codigo: 'K86' } }], pa: '170x105'
  }]);
  assertEq(r.nivel, 'vermelho');
});
test('DM2 HbA1c 10 → vermelho', () => {
  const r = Hiperdia.classificarPaciente([{
    id: 1, dataHora: trintaDiasAtras,
    hipoteses: [{ ciap: { codigo: 'T90' } }],
    exames: { glicemico: { hba1c: '10.2' } }
  }]);
  assertEq(r.nivel, 'vermelho');
});
test('Faltoso >1 ano → vermelho', () => {
  const r = Hiperdia.classificarPaciente([{
    id: 1, dataHora: umAnoMaisAtras,
    hipoteses: [{ ciap: { codigo: 'K86' } }], pa: '125x80'
  }]);
  assertEq(r.nivel, 'vermelho');
});
test('~7 meses → amarelo', () => {
  const r = Hiperdia.classificarPaciente([{
    id: 1, dataHora: seteMesesAtras,
    hipoteses: [{ ciap: { codigo: 'K86' } }], pa: '125x80'
  }]);
  assertEq(r.nivel, 'amarelo');
});
test('Não-Hiperdia → cinza', () => {
  const r = Hiperdia.classificarPaciente([{ dataHora: agora, hipoteses: [{ ciap: { codigo: 'R74' } }] }]);
  assertEq(r.nivel, 'cinza');
});

console.log('\n=== 7. listar + resumir + ordenar ===');
test('listarHiperdia filtra Hiperdia (formato real)', () => {
  const pacientes = [{ id: 1, nome: 'A' }, { id: 2, nome: 'B' }, { id: 3, nome: 'C' }];
  const consultas = {
    1: [{ dataHora: agora, hipoteses: [{ ciap: { codigo: 'K86' } }], pa: '125x80' }],
    2: [{ dataHora: agora, hipoteses: [{ ciap: { codigo: 'R74' } }] }],
    3: [{ dataHora: agora, hipoteses: [{ ciap: { codigo: 'T90' } }], exames: { glicemico: { hba1c: '6.5' } } }]
  };
  const lista = Hiperdia.listarHiperdia(pacientes, consultas);
  assertEq(lista.length, 2);
});
test('resumirHiperdia conta por nível', () => {
  const r = Hiperdia.resumirHiperdia([
    { classificacao: { nivel: 'verde' } },
    { classificacao: { nivel: 'vermelho' } }
  ]);
  assertEq(r.total, 2); assertEq(r.verde, 1); assertEq(r.vermelho, 1);
});
test('ordenarPorPrioridade: vermelho primeiro', () => {
  const r = Hiperdia.ordenarPorPrioridade([
    { paciente: { nome: 'A' }, classificacao: { nivel: 'verde', detalhes: { diasSemConsulta: 10 } } },
    { paciente: { nome: 'B' }, classificacao: { nivel: 'vermelho', detalhes: { diasSemConsulta: 30 } } }
  ]);
  assertEq(r[0].paciente.nome, 'B');
});

console.log('\n=== Resumo ===');
console.log(`✓ ${passed} testes passaram`);
if (failed > 0) { console.log(`✗ ${failed} falharam`); process.exit(1); }
else { console.log(`Total: ${passed}/${passed} ✓`); }
