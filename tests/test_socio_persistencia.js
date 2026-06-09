// test_socio_persistencia.js — Sprint v0.17: campos socioeconômicos sobrevivem ao ciclo cifrar→salvar→ler
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

const ROOT = require('path').resolve(__dirname, '..');

// Carrega libs vendored (Dexie + nada mais necessário aqui)
const Dexie = require(path.join(ROOT, 'assets/lib/dexie.min.js'));
global.Dexie = Dexie;
global.window = { crypto: require('crypto').webcrypto };
global.crypto = require('crypto').webcrypto;

// Carrega crypto.js e db.js do projeto
function carregarModulo(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const fn = new Function('window', 'Dexie', 'crypto', 'module', 'self', code + '\nreturn (typeof module!=="undefined"&&module.exports)?module.exports:undefined;');
  const mod = { exports: {} };
  const ret = fn(global.window, Dexie, global.crypto, mod, global.window);
  return ret || mod.exports;
}

(async () => {
  console.log('\n=== Persistência socioeconômica (ciclo completo) ===');

  // Carrega CryptoModule e DB no escopo window (como no browser)
  const cryptoCode = fs.readFileSync(path.join(ROOT, 'modules/crypto.js'), 'utf8');
  eval(cryptoCode);
  const CryptoModule = global.window.CryptoModule;
  global.CryptoModule = CryptoModule;

  const dbCode = fs.readFileSync(path.join(ROOT, 'modules/db.js'), 'utf8');
  eval(dbCode);
  const DB = global.window.DB;

  await test('Setup do cofre + DEK', async () => {
    const { dek } = await CryptoModule.createVault('senha-de-teste-12345');
    DB.setDEK(dek);
    await DB.initNameHashSalt();
    assert(dek, 'DEK não criada');
  });

  let novoId;
  await test('Criar paciente COM campos socioeconômicos', async () => {
    novoId = await DB.createPaciente({
      nome: 'Maria Teste Socio',
      dataNascimento: '1970-05-10',
      sexo: 'Feminino',
      tipoVaga: 'sus',
      rendaPessoal: 'ate_1',
      rendaFamiliar: '1_2',
      fonteRenda: 'bolsa_familia'
    });
    assert(novoId, 'paciente não criado');
  });

  await test('Ler paciente preserva campos socioeconômicos', async () => {
    const p = await DB.getPaciente(novoId);
    assertEq(p.tipoVaga, 'sus');
    assertEq(p.rendaPessoal, 'ate_1');
    assertEq(p.rendaFamiliar, '1_2');
    assertEq(p.fonteRenda, 'bolsa_familia');
    assertEq(p.nome, 'Maria Teste Socio');
  });

  await test('Atualizar campos socioeconômicos', async () => {
    await DB.updatePaciente(novoId, {
      nome: 'Maria Teste Socio',
      dataNascimento: '1970-05-10',
      sexo: 'Feminino',
      tipoVaga: 'particular',
      rendaPessoal: '3_5',
      rendaFamiliar: 'mais_5',
      fonteRenda: 'formal'
    });
    const p = await DB.getPaciente(novoId);
    assertEq(p.tipoVaga, 'particular');
    assertEq(p.rendaPessoal, '3_5');
    assertEq(p.fonteRenda, 'formal');
  });

  await test('Paciente sem campos socio (retrocompat) lê com defaults vazios', async () => {
    const id2 = await DB.createPaciente({
      nome: 'João Antigo',
      dataNascimento: '1960-01-01'
      // sem campos socio — simula paciente cadastrado antes da v0.17
    });
    const p = await DB.getPaciente(id2);
    // Campos não existem no registro antigo; o componente usa {...emptyPaciente(), ...data}
    // então no DB eles vêm undefined — o que é OK
    assert(p.tipoVaga === undefined || p.tipoVaga === '', 'campo socio ausente deveria ser undefined/vazio');
    assertEq(p.nome, 'João Antigo');
  });

  console.log('\n=== Resumo ===');
  console.log(`✓ ${passed} testes passaram`);
  if (failed > 0) { console.log(`✗ ${failed} falharam`); process.exit(1); }
  else { console.log(`Total: ${passed}/${passed} ✓`); process.exit(0); }
})();
