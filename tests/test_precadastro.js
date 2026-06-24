// test_precadastro.js — codificação/decodificação do pré-cadastro do paciente
const path = require('path');
let passed = 0, failed = 0;
function test(nome, fn) {
  try { fn(); console.log(`  ✓ ${nome}`); passed++; }
  catch (e) { console.log(`  ✗ ${nome}`); console.log(`      ${e.message}`); failed++; }
}
function assert(c, m) { if (!c) throw new Error(m || 'falhou'); }
function assertEq(a, b, m) { if (a !== b) throw new Error(`${m || ''}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }
function assertThrows(fn, m) { let t = false; try { fn(); } catch (e) { t = true; } if (!t) throw new Error(m || 'deveria lançar'); }

// TextEncoder/Decoder + btoa/atob no escopo Node
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder; global.TextDecoder = TextDecoder;
global.btoa = s => Buffer.from(s, 'binary').toString('base64');
global.atob = s => Buffer.from(s, 'base64').toString('binary');

const PC = require(path.resolve(__dirname, '../modules/precadastro.js'));

console.log('\n=== 1. Round-trip básico ===');
test('encode produz prefixo CDV1:', () => {
  assert(PC.encode({ nome: 'João' }).startsWith('CDV1:'));
});
test('round-trip preserva nome', () => {
  assertEq(PC.decode(PC.encode({ nome: 'João Silva' })).nome, 'João Silva');
});
test('round-trip vários campos', () => {
  const o = { nome: 'Ana', cpf: '111.222.333-44', cidade: 'Estiva Gerbi', uf: 'SP', tipoVaga: 'particular' };
  const d = PC.decode(PC.encode(o));
  assertEq(d.cpf, '111.222.333-44'); assertEq(d.cidade, 'Estiva Gerbi'); assertEq(d.tipoVaga, 'particular');
});

console.log('\n=== 2. Acentuação e UTF-8 ===');
test('acentos preservados', () => {
  const txt = 'Conceição apresentação ção ã é ô';
  assertEq(PC.decode(PC.encode({ nome: 'x', observacoes: txt })).observacoes, txt);
});
test('emoji preservado', () => {
  assertEq(PC.decode(PC.encode({ nome: 'x', observacoes: 'teste 🌱 ok' })).observacoes, 'teste 🌱 ok');
});

console.log('\n=== 3. Sanitização (whitelist) ===');
test('campo fora da whitelist é removido', () => {
  const d = PC.decode(PC.encode({ nome: 'x', __proto__hack: 'y', qualquer: 'z' }));
  assertEq(d.qualquer, undefined);
  assertEq(d.nome, 'x');
});
test('valores não-string viram string', () => {
  // injeta JSON manualmente com tipos errados
  const json = JSON.stringify({ nome: 'x', numero: 42, cpf: true });
  const b64 = global.btoa(unescape(encodeURIComponent(json)));
  const d = PC.decode('CDV1:' + b64);
  assertEq(d.numero, '42'); assertEq(typeof d.numero, 'string');
});
test('campos vazios não entram', () => {
  const d = PC.decode(PC.encode({ nome: 'x', cpf: '', rg: '   ' }));
  assertEq(d.cpf, undefined); assertEq(d.rg, undefined);
});
test('limpar ignora objeto nulo', () => {
  assertEq(Object.keys(PC.limpar(null)).length, 0);
});

console.log('\n=== 4. Tolerância a texto ao redor ===');
test('texto antes do código', () => {
  const c = PC.encode({ nome: 'Maria' });
  assertEq(PC.decode('Oi doutor, segue: ' + c).nome, 'Maria');
});
test('texto depois do código', () => {
  const c = PC.encode({ nome: 'Maria' });
  assertEq(PC.decode(c + ' obrigada!').nome, 'Maria');
});
test('texto antes e depois', () => {
  const c = PC.encode({ nome: 'Maria', cpf: '999.888.777-66' });
  assertEq(PC.decode('segue ' + c + ' valeu').cpf, '999.888.777-66');
});
test('espaços/quebras ao redor', () => {
  const c = PC.encode({ nome: 'Maria' });
  assertEq(PC.decode('\n\n  ' + c + '  \n').nome, 'Maria');
});

console.log('\n=== 5. Entradas inválidas ===');
test('rejeita string sem prefixo', () => assertThrows(() => PC.decode('texto qualquer sem codigo')));
test('rejeita vazio', () => assertThrows(() => PC.decode('')));
test('rejeita null', () => assertThrows(() => PC.decode(null)));
test('rejeita base64 corrompido', () => assertThrows(() => PC.decode('CDV1:@@@###não-é-base64@@@')));
test('pareceCodigo detecta', () => {
  assert(PC.pareceCodigo('blah CDV1:abc'));
  assert(!PC.pareceCodigo('sem codigo'));
  assert(!PC.pareceCodigo(null));
});

console.log('\n=== 6. Compatibilidade com a página (encode idêntico) ===');
test('código gerado pela lógica da página decodifica no módulo', () => {
  // replica EXATA do encode inline de pre-cadastro.html
  const CAMPOS = PC.CAMPOS;
  function utf8ToB64(str){const b=new TextEncoder().encode(str);let s='';for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return global.btoa(s);}
  function encodePagina(obj){const o={};for(const k of CAMPOS){let v=obj[k];if(v==null)continue;v=String(v).slice(0,2000).trim();if(v)o[k]=v;}return 'CDV1:'+utf8ToB64(JSON.stringify(o));}
  const paciente = { nome: 'Sebastião Lima', dataNascimento: '1950-07-01', observacoes: 'Não enxerga bem' };
  const codigo = encodePagina(paciente);
  const d = PC.decode(codigo);
  assertEq(d.nome, 'Sebastião Lima');
  assertEq(d.dataNascimento, '1950-07-01');
  assertEq(d.observacoes, 'Não enxerga bem');
});

console.log(`\n${'='.repeat(50)}`);
console.log(`  ${passed} passaram · ${failed} falharam`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
