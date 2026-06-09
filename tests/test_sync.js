// tests/test_sync.js — empacotamento, ext_id, last-write-wins (mock fetch + DB real)
require('fake-indexeddb/auto');
const path = require('path');
const H = require('./helpers');

let DB, CryptoModule, Sync, dek;

H.section('Setup');
H.test('Cofre + módulos de sync carregados', async () => {
  const ctx = await H.setupVault();
  DB = ctx.DB; CryptoModule = ctx.CryptoModule; dek = ctx.dek;
  // Sync depende de SupabaseClient, DB, CryptoModule como globais
  const SupabaseClient = require(path.join(H.ROOT, 'modules/supabase-client.js'));
  global.SupabaseClient = SupabaseClient;
  global.window.SupabaseClient = SupabaseClient;
  Sync = require(path.join(H.ROOT, 'modules/sync.js'));
  global.Sync = Sync;
  H.assert(Sync && typeof Sync._prepararUpload === 'function', 'sync não carregou');
});

H.section('Funções utilitárias');
H.test('configValida exige url+anonKey+vaultId', () => {
  H.assertEq(Sync.configValida({ url: 'u', anonKey: 'k', vaultId: 'v' }), true);
  H.assertEq(Sync.configValida({ url: 'u' }), false);
  H.assertEq(Sync.configValida(null), false);
});
H.test('TABELAS_SYNC inclui as 5 tabelas', () => {
  H.assert(Sync.TABELAS_SYNC.includes('pacientes'), 'falta pacientes');
  H.assert(Sync.TABELAS_SYNC.includes('consultas'), 'falta consultas');
  H.assert(Sync.TABELAS_SYNC.includes('agendamentos'), 'falta agendamentos');
});

H.section('prepararUpload');
let pid;
H.test('atribui _extId a registro novo e empacota', async () => {
  pid = await DB.createPaciente({ nome: 'Sync Teste', dataNascimento: '1980-01-01' });
  const { uploads, modificados } = await Sync._prepararUpload('pacientes', null);
  H.assert(uploads.length >= 1, 'sem uploads');
  H.assert(modificados.length >= 1, 'deveria marcar _extId como modificado');
  const u = uploads.find(x => x.record_key.startsWith('pacientes/'));
  H.assert(u, 'record_key formato errado');
  H.assert(u.encrypted_blob && u.encrypted_blob.iv && u.encrypted_blob.data, 'blob não cifrado');
});
H.test('record_key contém o ext_id atribuído', async () => {
  // prepararUpload marca _extId no objeto em memória e devolve em "modificados";
  // quem persiste é sincronizar(). Aqui simulamos a persistência.
  const { uploads, modificados } = await Sync._prepararUpload('pacientes', null);
  for (const r of modificados) {
    await DB.db.pacientes.update(r.id, { _extId: r._extId });
  }
  const row = (await DB.db.pacientes.toArray()).find(r => r.id === pid);
  H.assert(row._extId, 'registro não recebeu _extId após persistir modificados');
  H.assert(uploads.some(u => u.record_key === 'pacientes/' + row._extId), 'record_key não casa ext_id');
});

H.section('aplicarDownloads — inserção');
// Helper: monta um blob de sync como prepararUpload faria — a linha inteira do
// banco, cujo campo `data` é o objeto do paciente já cifrado.
async function blobSyncPaciente(dadosPaciente, updatedAt) {
  const innerData = await CryptoModule.encrypt(dek, dadosPaciente);
  const linhaBanco = { data: innerData, createdAt: updatedAt, updatedAt, nameHash: 'hash-teste' };
  return await CryptoModule.encrypt(dek, linhaBanco);
}

H.test('registro remoto novo é inserido e legível', async () => {
  const extId = global.SupabaseClient.gerarVaultId();
  const blob = await blobSyncPaciente({ nome: 'Veio do Servidor', dataNascimento: '1990-05-05' }, '2026-06-08T10:00:00Z');
  const linhas = [{
    record_key: 'pacientes/' + extId,
    encrypted_blob: blob,
    client_updated_at: '2026-06-08T10:00:00Z',
    server_updated_at: '2026-06-08T10:00:01Z',
    deleted: false, version: 1
  }];
  const r = await Sync._aplicarDownloads(linhas);
  H.assert(r.aplicados >= 1, 'não aplicou inserção');
  const inserido = (await DB.db.pacientes.toArray()).find(p => p._extId === extId);
  H.assert(inserido, 'registro remoto não foi inserido');
  const lido = await DB.getPaciente(inserido.id);
  H.assertEq(lido.nome, 'Veio do Servidor');
});

H.section('aplicarDownloads — last-write-wins');
H.test('remoto mais recente sobrescreve local', async () => {
  const localId = await DB.createPaciente({ nome: 'Antigo Local', dataNascimento: '1970-01-01' });
  const extId = global.SupabaseClient.gerarVaultId();
  await DB.db.pacientes.update(localId, { _extId: extId, updatedAt: '2026-06-01T00:00:00Z' });

  const blob = await blobSyncPaciente({ nome: 'Novo Remoto', dataNascimento: '1970-01-01' }, '2026-06-09T00:00:00Z');
  const r = await Sync._aplicarDownloads([{
    record_key: 'pacientes/' + extId,
    encrypted_blob: blob,
    client_updated_at: '2026-06-09T00:00:00Z',
    server_updated_at: '2026-06-09T00:00:01Z',
    deleted: false, version: 1
  }]);
  H.assert(r.aplicados >= 1, 'não sobrescreveu');
  const atual = await DB.getPaciente(localId);
  H.assertEq(atual.nome, 'Novo Remoto');
});
H.test('local mais recente NÃO é sobrescrito (marca conflito)', async () => {
  const localId = await DB.createPaciente({ nome: 'Local Vence', dataNascimento: '1975-01-01' });
  const extId = global.SupabaseClient.gerarVaultId();
  await DB.db.pacientes.update(localId, { _extId: extId, updatedAt: '2026-06-09T12:00:00Z' });

  const blob = await blobSyncPaciente({ nome: 'Remoto Velho', dataNascimento: '1975-01-01' }, '2026-06-01T00:00:00Z');
  const r = await Sync._aplicarDownloads([{
    record_key: 'pacientes/' + extId,
    encrypted_blob: blob,
    client_updated_at: '2026-06-01T00:00:00Z',
    server_updated_at: '2026-06-01T00:00:01Z',
    deleted: false, version: 1
  }]);
  H.assert(r.conflitos.some(c => c.motivo === 'local_mais_recente'), 'deveria marcar conflito');
  const atual = await DB.getPaciente(localId);
  H.assertEq(atual.nome, 'Local Vence', 'local não deveria ter sido sobrescrito');
});

H.section('aplicarDownloads — deleção remota');
H.test('deleção remota marca registro local como deleted', async () => {
  const localId = await DB.createPaciente({ nome: 'Vai Sumir', dataNascimento: '1985-01-01' });
  const extId = global.SupabaseClient.gerarVaultId();
  await DB.db.pacientes.update(localId, { _extId: extId, updatedAt: '2026-06-01T00:00:00Z' });
  const blob = await CryptoModule.encrypt(dek, { nome: 'Vai Sumir', updatedAt: '2026-06-09T00:00:00Z' });
  await Sync._aplicarDownloads([{
    record_key: 'pacientes/' + extId,
    encrypted_blob: blob,
    client_updated_at: '2026-06-09T00:00:00Z',
    server_updated_at: '2026-06-09T00:00:01Z',
    deleted: true, version: 1
  }]);
  const lista = await DB.listPacientes();
  H.assert(!lista.some(p => p.id === localId), 'registro deletado remotamente ainda aparece');
});

H.section('aplicarDownloads — DEK incompatível');
H.test('blob cifrado com outra DEK vira conflito falha_decifrar', async () => {
  const { dek: outraDek } = await CryptoModule.createVault('outra-senha-totalmente-diferente');
  const extId = global.SupabaseClient.gerarVaultId();
  const blob = await CryptoModule.encrypt(outraDek, { nome: 'Cifrado Errado', updatedAt: '2026-06-09T00:00:00Z' });
  const r = await Sync._aplicarDownloads([{
    record_key: 'pacientes/' + extId,
    encrypted_blob: blob,
    client_updated_at: '2026-06-09T00:00:00Z',
    server_updated_at: '2026-06-09T00:00:01Z',
    deleted: false, version: 1
  }]);
  H.assert(r.conflitos.some(c => c.motivo === 'falha_decifrar'), 'deveria registrar falha_decifrar');
});

H.section('record_key de tabela desconhecida é ignorado');
H.test('ignora tabela fora de TABELAS_SYNC', async () => {
  const blob = await CryptoModule.encrypt(dek, { x: 1, updatedAt: '2026-06-09T00:00:00Z' });
  const r = await Sync._aplicarDownloads([{
    record_key: 'tabela_inexistente/abc',
    encrypted_blob: blob,
    client_updated_at: '2026-06-09T00:00:00Z',
    server_updated_at: '2026-06-09T00:00:01Z',
    deleted: false, version: 1
  }]);
  H.assertEq(r.aplicados, 0);
});

H.run();
