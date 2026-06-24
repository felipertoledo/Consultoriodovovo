/* ================================================================
   modules/sync.js — Sprint D2

   Lógica de sincronização entre o IndexedDB local e o Supabase.

   Princípios:
   - Zero-knowledge: cada registro é cifrado com a DEK ANTES de subir.
     O servidor armazena bytes opacos.
   - Last-write-wins por registro, comparando client_updated_at.
   - Cada registro recebe um "record_key" universal: '{tabela}/{id}'.
   - O ID local pode diferir entre dispositivos — usamos um id_externo
     (ext_id) cifrado dentro do payload para casar registros entre
     dispositivos. Primeiro dispositivo gera UUID; ao baixar em outro
     dispositivo, o ext_id ancora a identidade.

   Estado de sync local (em DB.config):
     - sync.url, sync.anonKey, sync.vaultId — credenciais
     - sync.lastSyncedAt — ISO da última pull bem-sucedida
     - sync.ext_id_map — mapa { ext_id -> id_local } por tabela
   ================================================================ */
(function () {
  'use strict';

  // Tabelas que entram no sync
  const TABELAS_SYNC = [
    'pacientes',
    'consultas',
    'agendamentos',
    'templatesPrescricao',
    'anexos',
    'lancamentos'
  ];

  // ============================================================
  // CONFIGURAÇÃO LOCAL
  // ============================================================
  async function getConfig() {
    if (typeof DB === 'undefined') return null;
    try {
      const r = await DB.db.config.get('sync');
      return r ? r.value : null;
    } catch (_) {
      return null;
    }
  }

  async function setConfig(cfg) {
    await DB.db.config.put({ key: 'sync', value: cfg });
  }

  async function clearConfig() {
    await DB.db.config.delete('sync');
  }

  function configValida(cfg) {
    if (!cfg || !cfg.vaultId) return false;
    if (cfg.provider === 'firebase') {
      return !!cfg.databaseUrl;
    }
    // padrão (retrocompatível): Supabase
    return !!(cfg.url && cfg.anonKey);
  }

  /**
   * Factory: cria o cliente do provedor certo a partir da config.
   * Config sem `provider` é tratada como Supabase (retrocompatibilidade).
   */
  function criarClient(cfg) {
    if (cfg && cfg.provider === 'firebase') {
      if (typeof FirebaseClient === 'undefined') {
        throw new Error('FirebaseClient não carregado');
      }
      return FirebaseClient.criar(cfg);
    }
    return SupabaseClient.criar(cfg);
  }

  // ============================================================
  // HELPERS — ext_id (identificador externo, persistente entre dispositivos)
  // ============================================================
  function gerarExtId() {
    return SupabaseClient.gerarVaultId();  // reutiliza UUID v4
  }

  function chaveRegistro(tabela, extId) {
    return `${tabela}/${extId}`;
  }

  // ============================================================
  // PREPARA REGISTROS LOCAIS PARA UPLOAD
  // ============================================================
  /**
   * Lê todos os registros de uma tabela e prepara para upload (cifra cada um).
   * Atribui ext_id aos registros que não têm.
   * Retorna { uploads: [...], modificados: [...] }
   *   uploads: prontos para enviar ao servidor
   *   modificados: registros locais que ganharam ext_id (precisam ser salvos)
   */
  async function prepararUpload(tabela, desdeIso) {
    const dek = DB.getDEK();
    const todos = await DB.db[tabela].toArray();
    const uploads = [];
    const modificados = [];

    for (const r of todos) {
      // Atribui ext_id se ainda não tem
      let extId = r._extId;
      if (!extId) {
        extId = gerarExtId();
        r._extId = extId;
        modificados.push(r);
      }

      // Pula registros não modificados desde último sync
      const ultimaMod = r.updatedAt || r.createdAt;
      if (desdeIso && ultimaMod && ultimaMod <= desdeIso && r._lastSyncedAt && r._lastSyncedAt >= ultimaMod) {
        continue;
      }

      // Cifra o objeto inteiro (menos campos transitórios) com a DEK
      const limpo = { ...r };
      delete limpo._lastSyncedAt;
      // _extId fica dentro do payload para identificar o registro em outros dispositivos
      const cifrado = await CryptoModule.encrypt(dek, limpo);

      uploads.push({
        record_key: chaveRegistro(tabela, extId),
        encrypted_blob: cifrado,
        client_updated_at: ultimaMod || new Date().toISOString(),
        deleted: r.deleted ? true : false,
        version: 1
      });
    }

    return { uploads, modificados };
  }

  // ============================================================
  // APLICA REGISTROS REMOTOS NO LOCAL
  // ============================================================
  /**
   * Para cada registro baixado: decifra, encontra correspondente local pelo
   * ext_id (ou cria novo), e aplica last-write-wins por client_updated_at.
   * Retorna { aplicados, conflitos }.
   */
  async function aplicarDownloads(linhas) {
    const dek = DB.getDEK();
    let aplicados = 0;
    const conflitos = [];

    for (const linha of linhas) {
      // record_key: 'tabela/extId'
      const m = (linha.record_key || '').match(/^([^/]+)\/(.+)$/);
      if (!m) continue;
      const tabela = m[1];
      const extId = m[2];
      if (!TABELAS_SYNC.includes(tabela)) continue;

      let decifrado;
      try {
        decifrado = await CryptoModule.decrypt(dek, linha.encrypted_blob);
      } catch (e) {
        // DEK errada — registro veio cifrado com outra senha
        conflitos.push({ tabela, extId, motivo: 'falha_decifrar' });
        continue;
      }

      // Busca registro local com mesmo ext_id
      const todosLocais = await DB.db[tabela].toArray();
      const local = todosLocais.find(r => r._extId === extId);

      const remotoUpdatedAt = decifrado.updatedAt || linha.client_updated_at;
      const localUpdatedAt = local ? (local.updatedAt || local.createdAt) : null;

      if (linha.deleted) {
        // Deleção remota
        if (local) {
          await DB.db[tabela].update(local.id, {
            deleted: 1,
            _lastSyncedAt: linha.server_updated_at,
            updatedAt: remotoUpdatedAt
          });
          aplicados++;
        }
        continue;
      }

      if (!local) {
        // Registro novo: insere
        const { id, ...resto } = decifrado;  // descarta id remoto, deixa Dexie gerar
        resto._extId = extId;
        resto._lastSyncedAt = linha.server_updated_at;
        await DB.db[tabela].add(resto);
        aplicados++;
        continue;
      }

      // Conflito potencial: ambos modificados
      if (localUpdatedAt && localUpdatedAt > remotoUpdatedAt) {
        // Local mais recente — não sobrescreve, marca conflito (mas mantém local)
        conflitos.push({
          tabela, extId,
          motivo: 'local_mais_recente',
          localUpdatedAt, remotoUpdatedAt
        });
        continue;
      }

      // Remoto vence (last-write-wins)
      const { id: _, ...restoRemoto } = decifrado;
      restoRemoto._extId = extId;
      restoRemoto._lastSyncedAt = linha.server_updated_at;
      await DB.db[tabela].update(local.id, restoRemoto);
      aplicados++;

      // Se houve sobrescrita real (não só sync inicial), registra audit
      if (localUpdatedAt && remotoUpdatedAt > localUpdatedAt) {
        await DB.audit('SYNC_OVERWROTE', tabela, local.id, {
          remoteUpdatedAt: remotoUpdatedAt,
          localUpdatedAt
        });
      }
    }

    return { aplicados, conflitos };
  }

  // ============================================================
  // OPERAÇÃO PRINCIPAL: SINCRONIZAR
  // ============================================================
  /**
   * Executa um ciclo completo: pull → apply → push.
   * Retorna { sucesso, uploaded, downloaded, conflitos, erro? }
   */
  async function sincronizar() {
    const cfg = await getConfig();
    if (!configValida(cfg)) {
      return { sucesso: false, erro: 'Sync não configurado' };
    }
    if (!DB.isUnlocked()) {
      return { sucesso: false, erro: 'Cofre bloqueado' };
    }

    const client = criarClient(cfg);

    let downloaded = 0;
    let uploaded = 0;
    let conflitos = [];

    try {
      // 1. PULL: baixa registros modificados desde último sync
      const sinceIso = cfg.lastSyncedAt || null;
      const remotos = await client.downloadDesde(sinceIso);
      const r = await aplicarDownloads(remotos);
      downloaded = r.aplicados;
      conflitos = r.conflitos;

      // 2. PUSH: por tabela, prepara e envia
      const novoSinceIso = new Date().toISOString();
      for (const tabela of TABELAS_SYNC) {
        const { uploads, modificados } = await prepararUpload(tabela, cfg.lastSyncedAt);
        // Persiste os _extId atribuídos
        for (const m of modificados) {
          await DB.db[tabela].update(m.id, { _extId: m._extId });
        }
        if (uploads.length > 0) {
          await client.uploadLote(uploads);
          // Marca registros como sincronizados
          for (const r of await DB.db[tabela].toArray()) {
            if (r._extId && (!r._lastSyncedAt || r._lastSyncedAt < novoSinceIso)) {
              await DB.db[tabela].update(r.id, { _lastSyncedAt: novoSinceIso });
            }
          }
          uploaded += uploads.length;
        }
      }

      // 3. Atualiza marca de último sync (use servidor como referência)
      cfg.lastSyncedAt = novoSinceIso;
      cfg.lastSyncSucess = true;
      cfg.lastSyncError = null;
      await setConfig(cfg);

      await DB.audit('SYNC_OK', 'sync', null, { downloaded, uploaded, conflitos: conflitos.length });

      return { sucesso: true, downloaded, uploaded, conflitos };
    } catch (e) {
      cfg.lastSyncSucess = false;
      cfg.lastSyncError = e.message || String(e);
      cfg.lastSyncErrorAt = new Date().toISOString();
      await setConfig(cfg);
      await DB.audit('SYNC_FAIL', 'sync', null, { erro: e.message });
      return { sucesso: false, erro: e.message || String(e), downloaded, uploaded };
    }
  }

  // ============================================================
  // AUTO-SYNC PERIÓDICO
  // ============================================================
  let autoTimer = null;
  let autoIntervaloMs = 5 * 60 * 1000;  // 5 min default

  function iniciarAutoSync(callback) {
    pararAutoSync();
    autoTimer = setInterval(async () => {
      const cfg = await getConfig();
      if (!configValida(cfg) || !DB.isUnlocked()) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      const r = await sincronizar();
      if (callback) callback(r);
    }, autoIntervaloMs);
  }

  function pararAutoSync() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  // ============================================================
  // PAREAMENTO ENTRE DISPOSITIVOS
  // ============================================================
  /**
   * Setup inicial: cria configuração de sync no primeiro dispositivo.
   * Retorna o vaultId que precisa ser copiado para outros dispositivos.
   */
  async function configurarPrimario(url, anonKey) {
    const vaultId = SupabaseClient.gerarVaultId();
    const cfg = {
      url, anonKey, vaultId,
      lastSyncedAt: null,
      configuradoEm: new Date().toISOString(),
      papel: 'primario'
    };
    // Testa conexão
    const client = criarClient(cfg);
    const ok = await client.testar();
    if (!ok) {
      throw new Error('Não consegui conectar ao Supabase. Verifique URL e chave anon.');
    }
    await setConfig(cfg);
    return vaultId;
  }

  /**
   * Pareamento secundário: usa vault_id de outro dispositivo + mesma senha mestre.
   * NÃO altera a senha local, apenas configura sync usando a DEK atual.
   */
  async function configurarSecundario(url, anonKey, vaultId) {
    const cfg = {
      url, anonKey, vaultId,
      lastSyncedAt: null,
      configuradoEm: new Date().toISOString(),
      papel: 'secundario'
    };
    const client = criarClient(cfg);
    const ok = await client.testar();
    if (!ok) {
      throw new Error('Não consegui conectar ao Supabase. Verifique URL/chave.');
    }
    await setConfig(cfg);
    // Faz um pull inicial para popular este dispositivo
    return await sincronizar();
  }

  /**
   * Setup inicial com Firebase (Realtime Database) no primeiro dispositivo.
   * Retorna o vaultId que precisa ser copiado para os outros dispositivos.
   */
  async function configurarPrimarioFirebase(databaseUrl) {
    const vaultId = SupabaseClient.gerarVaultId();
    const cfg = {
      provider: 'firebase',
      databaseUrl, vaultId,
      lastSyncedAt: null,
      configuradoEm: new Date().toISOString(),
      papel: 'primario'
    };
    const client = criarClient(cfg);
    const ok = await client.testar();
    if (!ok) {
      throw new Error('Não consegui conectar ao Firebase. Verifique a URL do banco e as regras de acesso.');
    }
    await setConfig(cfg);
    return vaultId;
  }

  /**
   * Pareamento secundário com Firebase: usa o vaultId do primeiro dispositivo
   * + a mesma senha mestre. Faz um pull inicial para popular este aparelho.
   */
  async function configurarSecundarioFirebase(databaseUrl, vaultId) {
    const cfg = {
      provider: 'firebase',
      databaseUrl, vaultId,
      lastSyncedAt: null,
      configuradoEm: new Date().toISOString(),
      papel: 'secundario'
    };
    const client = criarClient(cfg);
    const ok = await client.testar();
    if (!ok) {
      throw new Error('Não consegui conectar ao Firebase. Verifique a URL do banco e as regras.');
    }
    await setConfig(cfg);
    return await sincronizar();
  }

  /**
   * Desconecta este dispositivo do sync. Não apaga dados nem do servidor nem locais.
   * Apenas remove a configuração local — outros dispositivos continuam funcionando.
   */
  async function desconectar() {
    pararAutoSync();
    await clearConfig();
  }

  /**
   * Estado atual para a UI: configurado? última sync? online?
   */
  async function status() {
    const cfg = await getConfig();
    if (!cfg) return { configurado: false };
    const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    return {
      configurado: true,
      provider: cfg.provider || 'supabase',
      vaultId: cfg.vaultId,
      url: cfg.provider === 'firebase' ? cfg.databaseUrl : cfg.url,
      papel: cfg.papel || 'primario',
      lastSyncedAt: cfg.lastSyncedAt || null,
      lastSyncSucess: cfg.lastSyncSucess === true,
      lastSyncError: cfg.lastSyncError || null,
      online
    };
  }

  const api = {
    TABELAS_SYNC,
    getConfig, setConfig, clearConfig, configValida,
    configurarPrimario,
    configurarSecundario,
    configurarPrimarioFirebase,
    configurarSecundarioFirebase,
    desconectar,
    sincronizar,
    iniciarAutoSync, pararAutoSync,
    status,
    // helpers expostos para testes
    _prepararUpload: prepararUpload,
    _aplicarDownloads: aplicarDownloads
  };

  if (typeof window !== 'undefined') window.Sync = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
