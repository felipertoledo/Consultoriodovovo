// tests/test_supabase_client.js — cliente REST zero-knowledge (mock fetch)
const path = require('path');
const H = require('./helpers');
H.setupWindow();
const SC = require(path.join(H.ROOT, 'modules/supabase-client.js'));

// ---- Mock de fetch controlável ----
let fetchCalls = [];
let nextResponse = null;
function mockFetch(resp) { nextResponse = resp; }
global.fetch = async (url, opts) => {
  fetchCalls.push({ url, opts });
  const r = nextResponse || { ok: true, status: 200 };
  return {
    ok: r.ok !== undefined ? r.ok : true,
    status: r.status || 200,
    json: async () => r.json || [],
    text: async () => r.text || '',
    headers: { get: (k) => (r.headers && r.headers[k]) || null }
  };
};
function resetFetch() { fetchCalls = []; nextResponse = null; }

H.section('gerarVaultId');
H.test('gera UUID v4 válido', () => {
  const id = SC.gerarVaultId();
  H.assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
    'formato UUID v4 inválido: ' + id);
});
H.test('gera ids distintos', () => {
  H.assert(SC.gerarVaultId() !== SC.gerarVaultId(), 'ids deveriam diferir');
});

H.section('urlValida');
H.test('aceita https supabase', () => {
  H.assertEq(SC.urlValida('https://abc.supabase.co'), true);
});
H.test('rejeita http (não-https)', () => {
  H.assertEq(SC.urlValida('http://abc.supabase.co'), false);
});
H.test('rejeita domínio não-supabase', () => {
  H.assertEq(SC.urlValida('https://exemplo.com'), false);
});
H.test('rejeita string vazia/invalida', () => {
  H.assertEq(SC.urlValida(''), false);
  H.assertEq(SC.urlValida('nao-e-url'), false);
});

H.section('criar (validação)');
H.test('lança sem url/anonKey/vaultId', () => {
  H.assertThrows(() => SC.criar({}));
  H.assertThrows(() => SC.criar({ url: 'x' }));
});
H.test('cria cliente com config completa', () => {
  const c = SC.criar({ url: 'https://x.supabase.co', anonKey: 'key', vaultId: 'v1' });
  H.assertEq(c.vaultId, 'v1');
  H.assert(typeof c.uploadLote === 'function', 'sem uploadLote');
});
H.test('normaliza URL com barra final', () => {
  const c = SC.criar({ url: 'https://x.supabase.co/', anonKey: 'k', vaultId: 'v' });
  H.assert(!c.url.endsWith('/'), 'barra final não removida');
});

H.section('testar (conectividade)');
H.test('retorna true quando servidor responde OK', async () => {
  resetFetch();
  mockFetch({ ok: true, status: 200 });
  const c = SC.criar({ url: 'https://x.supabase.co', anonKey: 'k', vaultId: 'v' });
  const ok = await c.testar();
  H.assertEq(ok, true);
  H.assert(fetchCalls.length === 1, 'deveria chamar fetch uma vez');
  H.assertIncludes(fetchCalls[0].opts.headers.apikey, 'k');
});

H.section('uploadLote');
H.test('lista vazia não chama fetch', async () => {
  resetFetch();
  const c = SC.criar({ url: 'https://x.supabase.co', anonKey: 'k', vaultId: 'v' });
  const r = await c.uploadLote([]);
  H.assertEq(r.uploaded, 0);
  H.assertEq(fetchCalls.length, 0);
});
H.test('envia registros com vault_id e upsert', async () => {
  resetFetch();
  mockFetch({ ok: true, status: 201 });
  const c = SC.criar({ url: 'https://x.supabase.co', anonKey: 'k', vaultId: 'vault-xyz' });
  const r = await c.uploadLote([
    { record_key: 'pacientes:1', encrypted_blob: { iv: 'aa', data: 'bb' }, client_updated_at: '2026-06-01T00:00:00Z' }
  ]);
  H.assertEq(r.uploaded, 1);
  const body = JSON.parse(fetchCalls[0].opts.body);
  H.assertEq(body[0].vault_id, 'vault-xyz');
  H.assertIncludes(fetchCalls[0].opts.headers.Prefer, 'merge-duplicates');
});

H.section('downloadDesde');
H.test('reconstrói encrypted_blob a partir das colunas', async () => {
  resetFetch();
  mockFetch({
    ok: true, status: 200,
    json: [
      { record_key: 'pacientes:1', encrypted_iv: 'iv1', encrypted_data: 'data1', client_updated_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:01Z', deleted: false, version: 1 }
    ]
  });
  const c = SC.criar({ url: 'https://x.supabase.co', anonKey: 'k', vaultId: 'v' });
  const rows = await c.downloadDesde('2026-05-01T00:00:00Z');
  H.assertEq(rows.length, 1);
  H.assertEq(rows[0].record_key, 'pacientes:1');
  H.assertEq(rows[0].encrypted_blob.iv, 'iv1');
  H.assertEq(rows[0].encrypted_blob.data, 'data1');
});
H.test('inclui filtro updated_at quando sinceIso dado', async () => {
  resetFetch();
  mockFetch({ ok: true, status: 200, json: [] });
  const c = SC.criar({ url: 'https://x.supabase.co', anonKey: 'k', vaultId: 'v' });
  await c.downloadDesde('2026-05-01T00:00:00Z');
  H.assertIncludes(decodeURIComponent(fetchCalls[0].url), 'updated_at=gt.2026-05-01');
});

H.section('contar');
H.test('extrai total do Content-Range', async () => {
  resetFetch();
  mockFetch({ ok: true, status: 200, headers: { 'Content-Range': '0-0/123' } });
  const c = SC.criar({ url: 'https://x.supabase.co', anonKey: 'k', vaultId: 'v' });
  const n = await c.contar();
  H.assertEq(n, 123);
});

H.section('apagarTudo');
H.test('faz DELETE filtrado por vault_id', async () => {
  resetFetch();
  mockFetch({ ok: true, status: 200 });
  const c = SC.criar({ url: 'https://x.supabase.co', anonKey: 'k', vaultId: 'vault-del' });
  const ok = await c.apagarTudo();
  H.assertEq(ok, true);
  H.assertEq(fetchCalls[0].opts.method, 'DELETE');
  H.assertIncludes(fetchCalls[0].url, 'vault_id=eq.vault-del');
});

H.run();
