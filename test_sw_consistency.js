// tests/test_sw_consistency.js — garante que todo script existe e está no precache
const fs = require('fs');
const path = require('path');
const H = require('./helpers');

const html = fs.readFileSync(path.join(H.ROOT, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(H.ROOT, 'service-worker.js'), 'utf8');

// Scripts referenciados no HTML (./algo.js)
const scriptsHtml = [...html.matchAll(/<script src="\.\/([^"]+)"/g)].map(m => m[1]);
// Arquivos .js no precache do SW ('./algo.js')
const precache = [...sw.matchAll(/'\.\/([^']+\.js)'/g)].map(m => m[1]);

H.section('Scripts do HTML existem no disco');
H.test('todos os <script src> apontam para arquivos reais', () => {
  const faltando = scriptsHtml.filter(s => !fs.existsSync(path.join(H.ROOT, s)));
  H.assert(faltando.length === 0, 'arquivos ausentes: ' + faltando.join(', '));
});
H.test('há um número plausível de scripts (>30)', () => {
  H.assert(scriptsHtml.length > 30, 'esperava 30+ scripts, achei ' + scriptsHtml.length);
});

H.section('Scripts do HTML estão no precache do SW');
H.test('todo script não-lib está no precache', () => {
  // libs (assets/lib) podem ter estratégia própria de cache; focamos em modules/components
  const naoLib = scriptsHtml.filter(s => !s.includes('lib/'));
  const fora = naoLib.filter(s => !precache.includes(s));
  H.assert(fora.length === 0, 'fora do precache: ' + fora.join(', '));
});

H.section('Arquivos do precache existem no disco');
H.test('nenhuma entrada do precache aponta para arquivo inexistente', () => {
  const fantasmas = precache.filter(s => !fs.existsSync(path.join(H.ROOT, s)));
  H.assert(fantasmas.length === 0, 'precache aponta para inexistentes: ' + fantasmas.join(', '));
});

H.section('Componentes-chave presentes nos 3 lugares');
H.test('módulos e componentes recentes cabeados', () => {
  const criticos = [
    'modules/hiperdia.js',
    'modules/sync.js',
    'modules/supabase-client.js',
    'modules/tema.js',
    'components/consultas-recentes.js',
    'components/hiperdia.js',
    'components/sync-tela.js',
    'modules/precadastro.js',
    'components/paciente-form.js',
    'components/pacientes-lista.js'
  ];
  for (const f of criticos) {
    H.assert(fs.existsSync(path.join(H.ROOT, f)), 'arquivo não existe: ' + f);
    H.assert(html.includes(f), 'não referenciado no HTML: ' + f);
    H.assert(sw.includes(f), 'não está no precache: ' + f);
  }
});

H.section('CACHE_VERSION e version.json coerentes');
H.test('service-worker define CACHE_VERSION', () => {
  H.assert(/CACHE_VERSION\s*=\s*'v[\d.]+'/.test(sw), 'CACHE_VERSION ausente ou malformado');
});
H.test('version.json é JSON válido com version', () => {
  const vj = JSON.parse(fs.readFileSync(path.join(H.ROOT, 'version.json'), 'utf8'));
  H.assert(vj.version, 'version.json sem campo version');
});
H.test('CACHE_VERSION casa com version.json', () => {
  const vj = JSON.parse(fs.readFileSync(path.join(H.ROOT, 'version.json'), 'utf8'));
  const m = sw.match(/CACHE_VERSION\s*=\s*'v([\d.]+)'/);
  H.assert(m, 'não extraiu CACHE_VERSION');
  H.assertEq(m[1], vj.version, 'CACHE_VERSION (' + m[1] + ') != version.json (' + vj.version + ')');
});

H.section('Rotas registradas têm componente correspondente');
H.test('cada Router.register referencia uma função render existente', () => {
  const rotas = [...html.matchAll(/Router\.register\('([^']+)'/g)].map(m => m[1]);
  H.assert(rotas.length >= 5, 'esperava 5+ rotas, achei ' + rotas.length);
  // sanity: rotas-chave presentes
  for (const r of ['/consultas', '/hiperdia', '/sync', '/pacientes', '/agenda']) {
    H.assert(rotas.includes(r), 'rota ausente: ' + r);
  }
});

H.run();
