#!/usr/bin/env node
/* ============================================================
   tests/run.js — Runner da suíte de testes
   ------------------------------------------------------------
   Descobre todos os tests/test_*.js, roda cada um como
   subprocesso isolado (evita poluição de estado global entre
   testes — fake-indexeddb, window, etc) e agrega os resultados.

   Uso:
     node tests/run.js              # roda tudo
     node tests/run.js hiperdia db  # roda só os que casam o filtro
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const TESTS_DIR = __dirname;
const filtros = process.argv.slice(2);

// Descobre arquivos de teste
let arquivos = fs.readdirSync(TESTS_DIR)
  .filter(f => /^test_.*\.js$/.test(f))
  .sort();

if (filtros.length > 0) {
  arquivos = arquivos.filter(f => filtros.some(flt => f.includes(flt)));
}

if (arquivos.length === 0) {
  console.log('Nenhum arquivo de teste encontrado' + (filtros.length ? ` para: ${filtros.join(', ')}` : ''));
  process.exit(1);
}

console.log('╔════════════════════════════════════════════════╗');
console.log('║  Consultório do Vovô — Suíte de testes          ║');
console.log('╚════════════════════════════════════════════════╝');
console.log(`Arquivos: ${arquivos.length}\n`);

let totalTestes = 0;
let totalFalhas = 0;
const resultados = [];
const t0 = Date.now();

for (const arquivo of arquivos) {
  const caminho = path.join(TESTS_DIR, arquivo);
  const proc = spawnSync('node', [caminho], { encoding: 'utf8', timeout: 60000 });
  const saida = (proc.stdout || '') + (proc.stderr || '');

  // Conta marcadores de teste na saída
  const ok = (saida.match(/\u2713 /g) || []).length;
  const fail = (saida.match(/\u2717 /g) || []).length;
  // Tenta extrair "Total: N"
  const mTotal = saida.match(/Total:\s*(\d+)/);
  const passou = proc.status === 0 && fail === 0;

  // "ok" inclui o "✓ N testes passaram" e o "Total: N/N ✓" — descontar 2 marcadores de resumo
  const testesReais = mTotal ? parseInt(mTotal[1], 10) : Math.max(0, ok - (saida.includes('testes passaram') ? 1 : 0));

  totalTestes += testesReais;
  totalFalhas += fail;

  const nome = arquivo.replace(/^test_/, '').replace(/\.js$/, '');
  resultados.push({ nome, testesReais, fail, passou, saida });

  const status = passou ? '\u2713' : '\u2717';
  const linha = `${status} ${nome.padEnd(28)} ${String(testesReais).padStart(3)} testes` +
                (fail > 0 ? `  (${fail} falhas)` : '');
  console.log(linha);

  // Em caso de falha, imprime as linhas com ✗ e mensagens de erro
  if (!passou) {
    const linhasErro = saida.split('\n').filter(l =>
      l.includes('\u2717') || l.trim().startsWith('      ') || /Error|TypeError|ReferenceError/.test(l));
    linhasErro.slice(0, 20).forEach(l => console.log('    ' + l.trim()));
  }
}

const dt = ((Date.now() - t0) / 1000).toFixed(1);

console.log('\n╔════════════════════════════════════════════════╗');
const arquivosOk = resultados.filter(r => r.passou).length;
console.log(`║  ${arquivosOk}/${resultados.length} arquivos · ${totalTestes} testes · ${totalFalhas} falhas · ${dt}s`.padEnd(50) + '║');
console.log('╚════════════════════════════════════════════════╝');

process.exit(totalFalhas > 0 || arquivosOk < resultados.length ? 1 : 0);
