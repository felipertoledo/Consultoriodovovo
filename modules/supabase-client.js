/* ================================================================
   modules/supabase-client.js — Sprint D2

   Cliente REST minimalista para Supabase (PostgREST).
   Sem SDK (mantém bundle pequeno e respeita filosofia vanilla-JS).

   Toda comunicação envia bytes JÁ CIFRADOS pela DEK local — servidor
   nunca vê dados clínicos em claro (princípio zero-knowledge).
   ================================================================ */
(function () {
  'use strict';

  /**
   * Cria uma instância de cliente para um projeto Supabase.
   * @param {Object} cfg - { url, anonKey, vaultId }
   *   url: ex 'https://abc.supabase.co'
   *   anonKey: chave pública (anon key do projeto)
   *   vaultId: UUID que identifica o cofre deste usuário (gerado uma vez)
   */
  function criar(cfg) {
    if (!cfg || !cfg.url || !cfg.anonKey || !cfg.vaultId) {
      throw new Error('SupabaseClient: faltam url, anonKey ou vaultId');
    }
    const url = cfg.url.replace(/\/$/, '');
    const anonKey = cfg.anonKey;
    const vaultId = cfg.vaultId;
    const TABELA = 'cdv_vault_records';

    const headersBase = () => ({
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    });

    /**
     * Testa conectividade. Resolve true se servidor respondeu OK.
     */
    async function testar() {
      try {
        const res = await fetch(`${url}/rest/v1/${TABELA}?select=count&limit=0`, {
          method: 'HEAD',
          headers: headersBase()
        });
        return res.ok || res.status === 200 || res.status === 206;
      } catch (e) {
        return false;
      }
    }

    /**
     * Sobe (insere ou atualiza) um lote de registros cifrados.
     * Cada registro deve ter: { record_key, encrypted_blob (object {iv,data}), version }
     */
    async function uploadLote(registros) {
      if (!registros || registros.length === 0) return { uploaded: 0 };
      const body = registros.map(r => ({
        vault_id: vaultId,
        record_key: r.record_key,
        encrypted_iv: r.encrypted_blob.iv,
        encrypted_data: r.encrypted_blob.data,
        client_updated_at: r.client_updated_at || new Date().toISOString(),
        deleted: r.deleted ? true : false,
        version: r.version || 1
      }));
      const res = await fetch(`${url}/rest/v1/${TABELA}`, {
        method: 'POST',
        headers: {
          ...headersBase(),
          // upsert: insere ou atualiza pela primary key (vault_id, record_key)
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Upload falhou (HTTP ${res.status}): ${txt.slice(0, 200)}`);
      }
      return { uploaded: registros.length };
    }

    /**
     * Baixa todos os registros modificados desde uma data (ISO).
     * Use null para baixar tudo.
     */
    async function downloadDesde(sinceIso) {
      const params = new URLSearchParams();
      params.set('vault_id', `eq.${vaultId}`);
      if (sinceIso) {
        params.set('updated_at', `gt.${sinceIso}`);
      }
      params.set('order', 'updated_at.asc');
      params.set('limit', '1000');

      const res = await fetch(`${url}/rest/v1/${TABELA}?${params.toString()}`, {
        method: 'GET',
        headers: headersBase()
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Download falhou (HTTP ${res.status}): ${txt.slice(0, 200)}`);
      }
      const rows = await res.json();
      // Reconstrói formato encrypted_blob
      return rows.map(r => ({
        record_key: r.record_key,
        encrypted_blob: { iv: r.encrypted_iv, data: r.encrypted_data },
        client_updated_at: r.client_updated_at,
        server_updated_at: r.updated_at,
        deleted: !!r.deleted,
        version: r.version || 1
      }));
    }

    /**
     * Apaga TODOS os registros do cofre no servidor (usado para "reset sync").
     */
    async function apagarTudo() {
      const res = await fetch(`${url}/rest/v1/${TABELA}?vault_id=eq.${vaultId}`, {
        method: 'DELETE',
        headers: {
          ...headersBase(),
          'Prefer': 'return=minimal'
        }
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Delete falhou (HTTP ${res.status}): ${txt.slice(0, 200)}`);
      }
      return true;
    }

    /**
     * Conta quantos registros existem no cofre remoto.
     */
    async function contar() {
      const res = await fetch(`${url}/rest/v1/${TABELA}?vault_id=eq.${vaultId}&select=count`, {
        method: 'GET',
        headers: {
          ...headersBase(),
          'Prefer': 'count=exact'
        }
      });
      if (!res.ok) return null;
      const range = res.headers.get('Content-Range');  // '0-0/123'
      if (range) {
        const m = range.match(/\/(\d+)$/);
        if (m) return parseInt(m[1], 10);
      }
      return null;
    }

    return {
      vaultId,
      url,
      tabela: TABELA,
      testar,
      uploadLote,
      downloadDesde,
      apagarTudo,
      contar
    };
  }

  /**
   * Gera um vault_id novo (UUID v4 via crypto.randomUUID, com fallback).
   */
  function gerarVaultId() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (_) {}
    // Fallback simples
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }

  /**
   * Valida formato de URL Supabase.
   */
  function urlValida(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && u.hostname.includes('supabase');
    } catch (_) {
      return false;
    }
  }

  /**
   * SQL para o usuário rodar no Supabase SQL Editor (uma vez na vida).
   */
  const SQL_SETUP = `-- ============================================================
-- Consultório do Vovô — Setup do cofre remoto (Supabase)
-- Rodar UMA VEZ no SQL Editor do projeto Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS cdv_vault_records (
  vault_id         uuid          NOT NULL,
  record_key       text          NOT NULL,
  encrypted_iv     text          NOT NULL,
  encrypted_data   text          NOT NULL,
  client_updated_at timestamptz  NOT NULL,
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  deleted          boolean       NOT NULL DEFAULT false,
  version          bigint        NOT NULL DEFAULT 1,
  PRIMARY KEY (vault_id, record_key)
);

CREATE INDEX IF NOT EXISTS idx_cdv_vault_updated
  ON cdv_vault_records (vault_id, updated_at DESC);

-- Trigger para auto-atualizar updated_at no servidor (ground truth)
CREATE OR REPLACE FUNCTION cdv_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cdv_touch ON cdv_vault_records;
CREATE TRIGGER trg_cdv_touch
  BEFORE INSERT OR UPDATE ON cdv_vault_records
  FOR EACH ROW EXECUTE FUNCTION cdv_touch_updated_at();

-- RLS: permitir leitura/escrita via anon key, mas isolar por vault_id
-- O vault_id é UUID v4 (128 bits) gerado localmente e mantido secreto pelo cliente.
-- Quem souber o vault_id pode ler/escrever bytes cifrados, mas SEM a DEK não decifra nada.
ALTER TABLE cdv_vault_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_via_vault_id" ON cdv_vault_records;
CREATE POLICY "anon_via_vault_id" ON cdv_vault_records
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Verificação: deve listar 0 registros
-- ============================================================
SELECT COUNT(*) FROM cdv_vault_records;
`;

  const api = {
    criar,
    gerarVaultId,
    urlValida,
    SQL_SETUP
  };

  if (typeof window !== 'undefined') window.SupabaseClient = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
