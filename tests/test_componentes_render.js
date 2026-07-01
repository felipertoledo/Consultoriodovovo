// tests/test_componentes_render.js — smoke tests: cada render injeta HTML sem lançar
const path = require('path');
const H = require('./helpers');

H.setupDOM();

// Mocks mínimos de globais que alguns componentes tocam ao montar.
// (As funções Alpine ficam como string em x-data e não executam aqui.)
function noop() {}
global.window.UI = { toast: noop, confirm: async () => true, modal: noop, fecharModal: noop };
global.window.Auth = { isUnlocked: () => true, lock: noop, temVault: async () => true };
global.window.Router = { navigate: noop, register: noop, params: {} };
global.window.Tema = { get: () => 'auto', getEfetivo: () => 'light', set: noop, toggle: noop, onChange: noop, init: noop };
global.window.DB = {
  listPacientes: async () => [], countPacientes: async () => 0,
  listConsultasRecentes: async () => [], listAgendaHoje: async () => [],
  listTemplates: async () => [], getDEK: () => ({}), isUnlocked: () => true
};
// Helpers clínicos reais (são puros e seguros)
global.window.CodigosClinicos = require(path.join(H.ROOT, 'modules/codigos-clinicos.js'));
global.window.Hiperdia = require(path.join(H.ROOT, 'modules/hiperdia.js'));
global.window.ExamesLab = require(path.join(H.ROOT, 'modules/exames-lab.js'));

// Carrega os componentes (definem window.renderX)
const componentes = [
  'components/dashboard.js',
  'components/agenda.js',
  'components/templates-prescricao.js',
  'components/prescricao-rapida.js',
  'components/config.js',
  'components/documentos.js',
  'components/sync-tela.js',
  'components/consulta-form.js',
  'components/exame-psiquico.js',
  'components/login.js',
  'components/setup-wizard.js',
  'components/paciente-form.js',
  'components/pacientes-lista.js',
  'components/consultas-recentes.js',
  'components/hiperdia.js'
];
for (const c of componentes) {
  try { H.evalApp(c); } catch (e) { /* reportado nos testes */ }
}

function novoContainer() { return global.document.createElement('div'); }
function smoke(nome, fnName, ...args) {
  H.test(nome, () => {
    const fn = global.window[fnName] || global[fnName];
    H.assert(typeof fn === 'function', fnName + ' não está definido');
    const c = novoContainer();
    fn(c, ...args);
    H.assert(c.innerHTML && c.innerHTML.length > 50, fnName + ' não injetou HTML significativo');
  });
}

H.section('Renderização — telas principais');
smoke('renderDashboard injeta HTML', 'renderDashboard');
smoke('renderLogin injeta HTML', 'renderLogin');
smoke('renderSetupWizard injeta HTML', 'renderSetupWizard');
smoke('renderConfig injeta HTML', 'renderConfig');

H.section('Renderização — agenda e prescrição');
H.test('renderAgendaTemplate retorna HTML', () => {
  // Diferente das demais: retorna string em vez de injetar no container
  const html = global.window.renderAgendaTemplate();
  H.assert(typeof html === 'string' && html.length > 50, 'agenda não retornou HTML');
  H.assertIncludes(html, 'componenteAgenda()');
});
smoke('renderTemplates injeta HTML', 'renderTemplates');
smoke('renderPrescricaoRapida injeta HTML', 'renderPrescricaoRapida');

H.section('Renderização — sync e consultas');
smoke('renderSync injeta HTML', 'renderSync');
smoke('renderConsultasRecentes injeta HTML', 'renderConsultasRecentes');
smoke('renderHiperdia injeta HTML', 'renderHiperdia');

H.section('Renderização — paciente/consulta (com args)');
smoke('renderPacienteForm (novo) injeta HTML', 'renderPacienteForm', null);
smoke('renderPacientesLista injeta HTML', 'renderPacientesLista');
smoke('renderConsultaForm injeta HTML', 'renderConsultaForm', 1, null);
smoke('renderDocumentos injeta HTML', 'renderDocumentos', 1, 'atestado');
smoke('renderExamePsiquico injeta HTML', 'renderExamePsiquico', 'completo', {}, () => {});

H.section('Conteúdo esperado em telas-chave');
H.test('dashboard menciona elementos de início', () => {
  const c = novoContainer();
  global.window.renderDashboard(c);
  H.assert(/x-data/.test(c.innerHTML), 'dashboard sem x-data Alpine');
});
H.test('consultas-recentes tem feed e filtro', () => {
  const c = novoContainer();
  global.window.renderConsultasRecentes(c);
  H.assertIncludes(c.innerHTML, 'Últimas consultas');
  H.assertIncludes(c.innerHTML, 'consultasRecentes()');
});
H.test('sync expõe wizard/status', () => {
  const c = novoContainer();
  global.window.renderSync(c);
  H.assert(/sync/i.test(c.innerHTML), 'tela de sync sem conteúdo esperado');
});

H.run();
