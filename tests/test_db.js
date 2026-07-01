// tests/test_db.js — CRUD pacientes/consultas/agendamentos/templates/anexos
require('fake-indexeddb/auto');
const H = require('./helpers');

let DB, CryptoModule;

H.section('Setup');
H.test('Cofre destrancado com DEK', async () => {
  const ctx = await H.setupVault();
  DB = ctx.DB; CryptoModule = ctx.CryptoModule;
  H.assert(DB.isUnlocked(), 'cofre deveria estar destrancado');
});

H.section('Pacientes — CRUD');
let pid;
H.test('createPaciente devolve id', async () => {
  pid = await DB.createPaciente({ nome: 'Maria Teste', dataNascimento: '1970-03-15', sexo: 'Feminino' });
  H.assert(pid, 'sem id');
});
H.test('getPaciente devolve dados decifrados', async () => {
  const p = await DB.getPaciente(pid);
  H.assertEq(p.nome, 'Maria Teste');
  H.assertEq(p.sexo, 'Feminino');
  H.assert(p.createdAt && p.updatedAt, 'sem timestamps');
});
H.test('updatePaciente persiste mudança', async () => {
  await DB.updatePaciente(pid, { nome: 'Maria Teste', dataNascimento: '1970-03-15', sexo: 'Feminino', cidade: 'Estiva Gerbi' });
  const p = await DB.getPaciente(pid);
  H.assertEq(p.cidade, 'Estiva Gerbi');
});
H.test('listPacientes inclui o paciente', async () => {
  const lista = await DB.listPacientes();
  H.assert(lista.some(p => p.id === pid), 'paciente não listado');
});
H.test('countPacientes >= 1', async () => {
  const n = await DB.countPacientes();
  H.assert(n >= 1, 'contagem incorreta');
});
H.test('softDeletePaciente remove da listagem', async () => {
  const id2 = await DB.createPaciente({ nome: 'Para Deletar', dataNascimento: '1980-01-01' });
  await DB.softDeletePaciente(id2);
  const lista = await DB.listPacientes();
  H.assert(!lista.some(p => p.id === id2), 'deletado ainda aparece');
});
H.test('busca por nome (hash cego) encontra', async () => {
  const lista = await DB.listPacientes({ search: 'Maria' });
  H.assert(lista.some(p => p.id === pid), 'busca não encontrou');
});

H.section('Consultas — CRUD');
let cid;
H.test('createConsulta vinculada ao paciente', async () => {
  cid = await DB.createConsulta({ pacienteId: pid, dataHora: '2026-06-01T10:00', queixaPrincipal: 'Cefaleia' });
  H.assert(cid, 'sem id');
});
H.test('getConsulta devolve dados', async () => {
  const c = await DB.getConsulta(cid);
  H.assertEq(c.queixaPrincipal, 'Cefaleia');
  H.assertEq(c.pacienteId, pid);
});
H.test('updateConsulta persiste', async () => {
  await DB.updateConsulta(cid, { pacienteId: pid, dataHora: '2026-06-01T10:00', queixaPrincipal: 'Cefaleia', conduta: 'Dipirona' });
  const c = await DB.getConsulta(cid);
  H.assertEq(c.conduta, 'Dipirona');
});
H.test('listConsultasByPaciente ordena desc', async () => {
  await DB.createConsulta({ pacienteId: pid, dataHora: '2026-06-05T10:00', queixaPrincipal: 'Retorno' });
  const lista = await DB.listConsultasByPaciente(pid);
  H.assert(lista.length >= 2, 'deveria ter 2+');
  H.assert(new Date(lista[0].dataHora) >= new Date(lista[1].dataHora), 'ordem incorreta');
});
H.test('softDeleteConsulta remove', async () => {
  const c2 = await DB.createConsulta({ pacienteId: pid, dataHora: '2026-06-06T10:00', queixaPrincipal: 'X' });
  await DB.softDeleteConsulta(c2);
  const lista = await DB.listConsultasByPaciente(pid);
  H.assert(!lista.some(c => c.id === c2), 'deletada ainda aparece');
});
H.test('contarConsultasPeriodo conta no intervalo', async () => {
  const n = await DB.contarConsultasPeriodo('2026-06-01', '2026-06-30');
  H.assert(n >= 2, 'contagem do período incorreta: ' + n);
});

H.section('Agendamentos');
let aid;
H.test('createAgendamento', async () => {
  aid = await DB.createAgendamento({ pacienteId: pid, data: '2026-06-20', status: 'marcado', observacao: 'Retorno HAS' });
  H.assert(aid, 'sem id');
});
H.test('listAgendamentos devolve com PII decifrada', async () => {
  const lista = await DB.listAgendamentos();
  const ag = lista.find(a => a.id === aid);
  H.assert(ag, 'agendamento não listado');
  H.assertEq(ag.observacao, 'Retorno HAS');
});
H.test('updateAgendamento muda status', async () => {
  await DB.updateAgendamento(aid, { status: 'realizado' });
  // realizados não aparecem por padrão — usar incluirRealizados
  const lista = await DB.listAgendamentos({ incluirRealizados: true });
  const ag = lista.find(a => a.id === aid);
  H.assert(ag, 'agendamento não encontrado com incluirRealizados');
  H.assertEq(ag.status, 'realizado');
});

H.section('Templates de prescrição');
let tid;
H.test('createTemplate', async () => {
  tid = await DB.createTemplate({ tipo: 'simples', nome: 'HAS leve', medicacoes: [{ nome: 'Losartana' }] });
  H.assert(tid, 'sem id');
});
H.test('listTemplates inclui', async () => {
  const lista = await DB.listTemplates();
  H.assert(lista.some(t => t.id === tid), 'template não listado');
});
H.test('incrementarUsoTemplate aumenta contador', async () => {
  await DB.incrementarUsoTemplate(tid);
  const lista = await DB.listTemplates();
  const t = lista.find(x => x.id === tid);
  H.assert((t.usoCount || 0) >= 1, 'contador não incrementou');
});

H.section('Anexos (metadata cifrada)');
let anexoId;
H.test('createAnexo guarda bytes+thumb+meta cifrados', async () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5]);
  const thumb = new Uint8Array([9, 8, 7]);
  anexoId = await DB.createAnexo({
    consultaId: cid, pacienteId: pid, ordem: 0, tipo: 'foto',
    bytes, thumb,
    titulo: 'Lesão', achados: 'Eritema', largura: 100, altura: 80
  });
  H.assert(anexoId, 'sem id');
});
H.test('getAnexoMeta devolve metadata sem bytes', async () => {
  const meta = await DB.getAnexoMeta(anexoId);
  H.assertEq(meta.titulo, 'Lesão');
  H.assertEq(meta.achados, 'Eritema');
});
H.test('getAnexoCompleto devolve bytes', async () => {
  const a = await DB.getAnexoCompleto(anexoId);
  H.assert(a.bytes && a.bytes.length === 5, 'bytes incorretos');
});
H.test('listAnexosByConsulta lista', async () => {
  const lista = await DB.listAnexosByConsulta(cid);
  H.assert(lista.some(a => a.id === anexoId), 'anexo não listado');
});
H.test('contarAnexosByConsulta conta', async () => {
  const n = await DB.contarAnexosByConsulta(cid);
  H.assert(n >= 1, 'contagem incorreta');
});
H.test('softDeleteAnexo remove', async () => {
  await DB.softDeleteAnexo(anexoId);
  const n = await DB.contarAnexosByConsulta(cid);
  H.assertEq(n, 0);
});

H.section('listConsultasRecentes (feed global)');
H.test('cruza pacientes e resolve nome', async () => {
  const feed = await DB.listConsultasRecentes(50);
  H.assert(feed.length >= 2, 'feed vazio');
  H.assert(feed[0].pacienteNome, 'sem pacienteNome');
  // ordenação desc
  for (let i = 1; i < feed.length; i++) {
    H.assert((feed[i - 1].dataHora || '') >= (feed[i].dataHora || ''), 'ordem incorreta');
  }
});

H.section('Audit log');
H.test('audit registra ações', async () => {
  const recente = await DB.getRecentAudit(10);
  H.assert(Array.isArray(recente) && recente.length > 0, 'audit vazio');
});

H.section('Perfil profissional');
H.test('getPerfil começa null', async () => {
  const p = await DB.getPerfil();
  H.assert(p === null, 'perfil deveria começar null');
});
H.test('setPerfil salva e normaliza', async () => {
  const salvo = await DB.setPerfil({ nome: '  Ana Souza ', conselho: 'crm', uf: 'sp', registro: '123.456', unidade: 'USF X' });
  H.assert(salvo.nome === 'Ana Souza', 'nome não normalizado (trim)');
  H.assert(salvo.conselho === 'CRM', 'conselho não virou maiúsculo');
  H.assert(salvo.uf === 'SP', 'uf não virou maiúscula');
  H.assert(salvo.titulo === 'Médico', 'título default ausente');
});
H.test('getPerfil devolve o que foi salvo', async () => {
  const p = await DB.getPerfil();
  H.assert(p && p.nome === 'Ana Souza' && p.registro === '123.456', 'perfil não persistiu');
});

H.run();
