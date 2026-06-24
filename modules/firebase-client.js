/* ================================================================
   modules/firebase-client.js

   Cliente REST minimalista para Firebase Realtime Database.
   Sem SDK (mantém bundle pequeno, filosofia vanilla-JS) — usa a
   REST API do RTDB via fetch, espelhando a interface do
   supabase-client.js para o sync.js ser agnóstico ao provedor.

   Toda comunicação envia bytes JÁ CIFRADOS pela DEK local — o
   servidor nunca vê dados clínicos em claro (zero-knowledge).

   Modelo de dados no RTDB:
     /<vaultId>/<keyEncoded> = {
        record_key, iv, data, client_updated_at,
        updated_at (timestamp do servidor via .sv), deleted, version
     }
   Segurança: o vaultId é um UUID v4 (128 bits) secreto. As regras
   liberam leitura/escrita por vault, mas sem o vaultId ninguém
   acha os dados — e sem a senha (DEK) ninguém os decifra.
   ================================================================ */
(function () {
  'use strict';

  /**
   * @param {Object} cfg - { databaseUrl, vaultId }
   *   databaseUrl: ex 'https://meuprojeto-default-rtdb.firebaseio.com'
   *   vaultId: UUID que identifica o cofre deste usuário
   */
  function criar(cfg) {
    if (!cfg || !cfg.databaseUrl || !cfg.vaultId) {
      throw new Error('FirebaseClient: faltam databaseUrl ou vaultId');
    }
    const dbUrl = cfg.databaseUrl.replace(/\/$/, '');
    const vaultId = cfg.vaultId;
    const base = `${dbUrl}/${vaultId}`;

    // record_key → chave válida no RTDB (sem . $ # [ ] /)
    function encKey(rk) {
      const bytes = new TextEncoder().encode(rk);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    /** Testa conectividade/permissão. */
    async function testar() {
      try {
        const res = await fetch(`${base}.json?shallow=true`, { method: 'GET' });
        // 200 (mesmo retornando null) = regras OK e alcançável.
        return res.ok;
      } catch (e) {
        return false;
      }
    }

    /**
     * Sobe (upsert) um lote de registros cifrados num único PATCH.
     * Cada registro: { record_key, encrypted_blob:{iv,data}, client_updated_at, deleted, version }
     */
    async function uploadLote(registros) {
      if (!registros || registros.length === 0) return { uploaded: 0 };
      const patch = {};
      for (const r of registros) {
        patch[encKey(r.record_key)] = {
          record_key: r.record_key,
          iv: r.encrypted_blob.iv,
          data: r.encrypted_blob.data,
          client_updated_at: r.client_updated_at || new Date().toISOString(),
          updated_at: { '.sv': 'timestamp' }, // servidor preenche (ground truth)
          deleted: r.deleted ? true : false,
          version: r.version || 1
        };
      }
      const res = await fetch(`${base}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Upload falhou (HTTP ${res.status}): ${txt.slice(0, 200)}`);
      }
      return { uploaded: registros.length };
    }

    /**
     * Baixa registros modificados desde uma data (ISO). null = tudo.
     * Usa orderBy/startAt (requer índice ".indexOn":["updated_at"] nas regras).
     */
    async function downloadDesde(sinceIso) {
      let urlGet = `${base}.json`;
      if (sinceIso) {
        const ms = new Date(sinceIso).getTime();
        if (!isNaN(ms)) {
          urlGet += `?orderBy=${encodeURIComponent('"updated_at"')}&startAt=${ms}`;
        }
      }
      const res = await fetch(urlGet, { method: 'GET' });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Download falhou (HTTP ${res.status}): ${txt.slice(0, 200)}`);
      }
      const obj = await res.json();
      if (!obj || typeof obj !== 'object') return [];
      return Object.keys(obj).map(k => {
        const r = obj[k] || {};
        return {
          record_key: r.record_key,
          encrypted_blob: { iv: r.iv, data: r.data },
          client_updated_at: r.client_updated_at,
          server_updated_at: typeof r.updated_at === 'number' ? new Date(r.updated_at).toISOString() : null,
          deleted: !!r.deleted,
          version: r.version || 1
        };
      }).filter(r => r.record_key); // ignora entradas malformadas
    }

    /** Apaga TODOS os registros do cofre remoto. */
    async function apagarTudo() {
      const res = await fetch(`${base}.json`, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Delete falhou (HTTP ${res.status}): ${txt.slice(0, 200)}`);
      }
      return true;
    }

    /** Conta registros no cofre remoto (shallow = só as chaves). */
    async function contar() {
      try {
        const res = await fetch(`${base}.json?shallow=true`, { method: 'GET' });
        if (!res.ok) return null;
        const obj = await res.json();
        return obj && typeof obj === 'object' ? Object.keys(obj).length : 0;
      } catch (_) {
        return null;
      }
    }

    return {
      vaultId,
      url: dbUrl,
      provider: 'firebase',
      testar,
      uploadLote,
      downloadDesde,
      apagarTudo,
      contar
    };
  }

  function gerarVaultId() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    } catch (_) {}
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }

  /** Valida URL de Realtime Database. */
  function urlValida(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      const u = new URL(url);
      return u.protocol === 'https:' &&
        (u.hostname.endsWith('firebaseio.com') || u.hostname.endsWith('firebasedatabase.app'));
    } catch (_) {
      return false;
    }
  }

  /** Regras de segurança para o usuário colar no console do Firebase (uma vez). */
  const REGRAS_SETUP = `{
  "rules": {
    "$vault": {
      ".read": true,
      ".write": true,
      ".indexOn": ["updated_at"]
    }
  }
}`;

  const api = { criar, gerarVaultId, urlValida, REGRAS_SETUP };
  if (typeof window !== 'undefined') window.FirebaseClient = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
