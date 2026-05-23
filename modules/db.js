/* ============================================================
   db.js — Dexie.js (IndexedDB) com criptografia transparente
   Pacientes, consultas, audit log, config
   ============================================================ */

const DB = (() => {
  const db = new Dexie('ConsultorioDoVovo');

  // ---- Schema v1 ----
  // Campos indexados ficam em texto plano APENAS quando não são PII
  // (id, datas, hashes cegos). PII real fica criptografada em `data`.
  db.version(1).stores({
    // pacientes: id auto, busca por hash cego do nome, ordenação por criadoEm
    pacientes: '++id, nameHash, createdAt, updatedAt, deleted',
    // consultas: id auto, FK pacienteId, busca por data
    consultas: '++id, pacienteId, dataHora, createdAt, updatedAt, deleted',
    // audit log: append-only, ordenado por timestamp
    auditLog: '++id, timestamp, action, entity',
    // config: chave-valor (incluindo vault metadata e nameHashSalt)
    config: 'key'
  });

  // ---- Schema v2 (Sprint A1: agendamentos) ----
  // Migração não destrutiva — Dexie preserva os dados das tabelas existentes
  db.version(2).stores({
    pacientes: '++id, nameHash, createdAt, updatedAt, deleted',
    consultas: '++id, pacienteId, dataHora, createdAt, updatedAt, deleted',
    auditLog: '++id, timestamp, action, entity',
    config: 'key',
    // agendamentos: id auto, FK paciente, índice por data (YYYY-MM-DD) e status
    // 'data' = data do agendamento (YYYY-MM-DD)
    // 'status' = marcado | realizado | faltou | cancelado
    // PII (observacao, cache de nome) ficam criptografadas em `payload`
    agendamentos: '++id, pacienteId, data, status, createdAt, deleted'
  });

  // ---- Schema v3 (Sprint A2: templates de prescrição) ----
  db.version(3).stores({
    pacientes: '++id, nameHash, createdAt, updatedAt, deleted',
    consultas: '++id, pacienteId, dataHora, createdAt, updatedAt, deleted',
    auditLog: '++id, timestamp, action, entity',
    config: 'key',
    agendamentos: '++id, pacienteId, data, status, createdAt, deleted',
    // templatesPrescricao: id auto, ordenação por uso e nome (este último em payload cifrado)
    // tipo = simples | controle | azul
    // medicações + nome + orientações criptografadas em `payload`
    templatesPrescricao: '++id, tipo, usoCount, createdAt, deleted'
  });

  // ---- Estado interno (DEK em memória, NUNCA persistida) ----
  let currentDEK = null;
  let nameHashSalt = null;

  function setDEK(dek) {
    currentDEK = dek;
  }

  function getDEK() {
    if (!currentDEK) throw new Error('Cofre bloqueado. Faça login.');
    return currentDEK;
  }

  function isUnlocked() {
    return currentDEK !== null;
  }

  function lock() {
    currentDEK = null;
    nameHashSalt = null;
  }

  // ---- Inicialização: carrega/cria salt para nameHash ----
  async function initNameHashSalt() {
    let saltEntry = await db.config.get('nameHashSalt');
    if (!saltEntry) {
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      const saltB64 = CryptoModule.bytesToBase64(saltBytes);
      await db.config.put({ key: 'nameHashSalt', value: saltB64 });
      nameHashSalt = saltB64;
    } else {
      nameHashSalt = saltEntry.value;
    }
    return nameHashSalt;
  }

  // ---- Vault management ----
  async function getVault() {
    const entry = await db.config.get('vault');
    return entry ? entry.value : null;
  }

  async function saveVault(vaultMetadata) {
    await db.config.put({ key: 'vault', value: vaultMetadata });
  }

  async function hasVault() {
    return (await getVault()) !== null;
  }

  // ---- PACIENTES ----
  async function createPaciente(pacienteData) {
    const dek = getDEK();
    if (!nameHashSalt) await initNameHashSalt();

    const now = new Date().toISOString();
    const nameHash = await CryptoModule.blindHash(pacienteData.nome || '', nameHashSalt);

    // Tudo que é PII vai criptografado em `data`
    const encryptedPayload = await CryptoModule.encrypt(dek, pacienteData);

    const id = await db.pacientes.add({
      nameHash,
      createdAt: now,
      updatedAt: now,
      deleted: 0,
      data: encryptedPayload
    });

    await audit('CREATE', 'paciente', id);
    return id;
  }

  async function getPaciente(id) {
    const dek = getDEK();
    const row = await db.pacientes.get(id);
    if (!row || row.deleted) return null;
    const decoded = await CryptoModule.decrypt(dek, row.data);
    return { id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt, ...decoded };
  }

  async function updatePaciente(id, pacienteData) {
    const dek = getDEK();
    if (!nameHashSalt) await initNameHashSalt();

    const now = new Date().toISOString();
    const nameHash = await CryptoModule.blindHash(pacienteData.nome || '', nameHashSalt);
    const encryptedPayload = await CryptoModule.encrypt(dek, pacienteData);

    await db.pacientes.update(id, {
      nameHash,
      updatedAt: now,
      data: encryptedPayload
    });

    await audit('UPDATE', 'paciente', id);
    return id;
  }

  async function softDeletePaciente(id) {
    await db.pacientes.update(id, { deleted: 1, updatedAt: new Date().toISOString() });
    await audit('DELETE', 'paciente', id);
  }

  // Lista todos os pacientes (descriptografando — usar com paginação no futuro)
  async function listPacientes({ search = '', limit = 200 } = {}) {
    const dek = getDEK();
    if (!nameHashSalt) await initNameHashSalt();

    const rows = await db.pacientes
      .where('deleted').equals(0)
      .reverse()
      .sortBy('updatedAt');

    const items = [];
    for (const row of rows.slice(0, limit)) {
      try {
        const decoded = await CryptoModule.decrypt(dek, row.data);
        // Filtro por busca (substring case-insensitive no nome decifrado)
        if (search) {
          const haystack = (decoded.nome || '').toLowerCase();
          if (!haystack.includes(search.toLowerCase())) continue;
        }
        items.push({
          id: row.id,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          ...decoded
        });
      } catch (e) {
        console.error('Erro ao decifrar paciente', row.id, e);
      }
    }
    return items;
  }

  async function countPacientes() {
    return db.pacientes.where('deleted').equals(0).count();
  }

  // ---- CONSULTAS ----
  async function createConsulta(consultaData) {
    const dek = getDEK();
    const now = new Date().toISOString();
    const dataHora = consultaData.dataHora || now;
    const encryptedPayload = await CryptoModule.encrypt(dek, consultaData);
    const id = await db.consultas.add({
      pacienteId: consultaData.pacienteId,
      dataHora,
      createdAt: now,
      updatedAt: now,
      deleted: 0,
      data: encryptedPayload
    });
    await audit('CREATE', 'consulta', id, { pacienteId: consultaData.pacienteId });
    return id;
  }

  async function getConsulta(id) {
    const dek = getDEK();
    const row = await db.consultas.get(id);
    if (!row || row.deleted) return null;
    const decoded = await CryptoModule.decrypt(dek, row.data);
    return {
      id: row.id,
      pacienteId: row.pacienteId,
      dataHora: row.dataHora,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...decoded
    };
  }

  async function updateConsulta(id, consultaData) {
    const dek = getDEK();
    const now = new Date().toISOString();
    const encryptedPayload = await CryptoModule.encrypt(dek, consultaData);
    await db.consultas.update(id, {
      dataHora: consultaData.dataHora || now,
      updatedAt: now,
      data: encryptedPayload
    });
    await audit('UPDATE', 'consulta', id, { pacienteId: consultaData.pacienteId });
    return id;
  }

  async function softDeleteConsulta(id) {
    await db.consultas.update(id, { deleted: 1, updatedAt: new Date().toISOString() });
    await audit('DELETE', 'consulta', id);
  }

  async function listConsultasByPaciente(pacienteId) {
    const dek = getDEK();
    const pid = typeof pacienteId === 'string' ? parseInt(pacienteId, 10) : pacienteId;
    const rows = await db.consultas
      .where('pacienteId').equals(pid)
      .toArray();
    const items = [];
    for (const row of rows) {
      if (row.deleted) continue;
      try {
        const decoded = await CryptoModule.decrypt(dek, row.data);
        items.push({
          id: row.id,
          pacienteId: row.pacienteId,
          dataHora: row.dataHora,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          ...decoded
        });
      } catch (e) {
        console.error('Erro ao decifrar consulta', row.id, e);
      }
    }
    // Ordena por dataHora decrescente (mais recente primeiro)
    items.sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || ''));
    return items;
  }

  // ---- AUDIT ----
  // ============================================================
  // AGENDAMENTOS (Sprint A1)
  // ============================================================
  /**
   * Cria um agendamento.
   * @param {Object} ag - { pacienteId, data (YYYY-MM-DD), hora?, tipo?, status?, observacao?, consultaOrigemId?, pacienteNome? }
   */
  async function createAgendamento(ag) {
    const dek = getDEK();
    const now = new Date().toISOString();
    const payload = {
      observacao: ag.observacao || '',
      pacienteNome: ag.pacienteNome || ''  // cache para exibição
    };
    const ciphered = await CryptoModule.encrypt(dek, payload);
    const id = await db.agendamentos.add({
      pacienteId: ag.pacienteId,
      data: ag.data,                         // YYYY-MM-DD
      hora: ag.hora || '',                   // HH:MM ou vazio
      tipo: ag.tipo || 'consulta',           // consulta | retorno | grupo | outro
      status: ag.status || 'marcado',        // marcado | realizado | faltou | cancelado
      consultaOrigemId: ag.consultaOrigemId || null,  // se foi auto-criado por uma consulta
      consultaRealizadaId: null,             // preenchido quando vira "realizado"
      payload: ciphered,
      createdAt: now,
      updatedAt: now,
      deleted: 0
    });
    await audit('CREATE_AGENDAMENTO', 'agendamento', id, { data: ag.data });
    return id;
  }

  async function getAgendamento(id) {
    const dek = getDEK();
    const a = await db.agendamentos.get(id);
    if (!a || a.deleted) return null;
    const decrypted = a.payload ? await CryptoModule.decrypt(dek, a.payload) : {};
    return { ...a, ...decrypted, payload: undefined };
  }

  async function updateAgendamento(id, ag) {
    const dek = getDEK();
    const existing = await db.agendamentos.get(id);
    if (!existing) throw new Error('Agendamento não encontrado');

    const oldPayload = existing.payload ? await CryptoModule.decrypt(dek, existing.payload) : {};
    const merged = {
      observacao: ag.observacao !== undefined ? ag.observacao : (oldPayload.observacao || ''),
      pacienteNome: ag.pacienteNome !== undefined ? ag.pacienteNome : (oldPayload.pacienteNome || '')
    };
    const ciphered = await CryptoModule.encrypt(dek, merged);

    const update = {
      payload: ciphered,
      updatedAt: new Date().toISOString()
    };
    if (ag.data !== undefined) update.data = ag.data;
    if (ag.hora !== undefined) update.hora = ag.hora;
    if (ag.tipo !== undefined) update.tipo = ag.tipo;
    if (ag.status !== undefined) update.status = ag.status;
    if (ag.consultaRealizadaId !== undefined) update.consultaRealizadaId = ag.consultaRealizadaId;

    await db.agendamentos.update(id, update);
    await audit('UPDATE_AGENDAMENTO', 'agendamento', id, { status: ag.status });
    return id;
  }

  async function softDeleteAgendamento(id) {
    await db.agendamentos.update(id, { deleted: 1, updatedAt: new Date().toISOString() });
    await audit('DELETE_AGENDAMENTO', 'agendamento', id);
  }

  /**
   * Lista agendamentos por intervalo de datas (inclusivo).
   * @param {Object} opts - { dataInicio (YYYY-MM-DD), dataFim, status? (string ou array), pacienteId?, incluirRealizados? }
   */
  async function listAgendamentos({ dataInicio, dataFim, status, pacienteId, incluirRealizados } = {}) {
    const dek = getDEK();
    let collection = db.agendamentos.toCollection();

    if (dataInicio && dataFim) {
      collection = db.agendamentos.where('data').between(dataInicio, dataFim, true, true);
    } else if (dataInicio) {
      collection = db.agendamentos.where('data').aboveOrEqual(dataInicio);
    } else if (dataFim) {
      collection = db.agendamentos.where('data').belowOrEqual(dataFim);
    }

    let rows = await collection.toArray();
    // Filtros pós-query (deleted, status, pacienteId)
    rows = rows.filter(a => !a.deleted);
    if (pacienteId !== undefined && pacienteId !== null) {
      rows = rows.filter(a => a.pacienteId === pacienteId);
    }
    if (status) {
      const statusList = Array.isArray(status) ? status : [status];
      rows = rows.filter(a => statusList.includes(a.status));
    } else if (!incluirRealizados) {
      // Default: não inclui realizados/cancelados
      rows = rows.filter(a => a.status === 'marcado' || a.status === 'faltou');
    }

    // Ordena: data asc, depois hora asc
    rows.sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return (a.hora || '').localeCompare(b.hora || '');
    });

    // Decifra observação e nome cache de cada um
    const out = [];
    for (const r of rows) {
      try {
        const dec = r.payload ? await CryptoModule.decrypt(dek, r.payload) : {};
        out.push({ ...r, ...dec, payload: undefined });
      } catch (e) {
        console.warn('Falha decifrar agendamento', r.id, e);
        out.push({ ...r, observacao: '', pacienteNome: '?', payload: undefined });
      }
    }
    return out;
  }

  /**
   * Atalho: agendamentos de hoje (data >= hoje, status marcado).
   */
  async function listAgendaHoje() {
    const hoje = new Date().toISOString().slice(0, 10);
    return listAgendamentos({ dataInicio: hoje, dataFim: hoje, status: 'marcado' });
  }

  /**
   * Atalho: faltosos = agendamentos com data <= ontem ainda como "marcado".
   * (Auto-marcação como "faltou" pode ser feita pelo componente.)
   */
  async function listFaltosos(diasAtras) {
    const dias = diasAtras || 30;
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - dias);
    return listAgendamentos({
      dataInicio: inicio.toISOString().slice(0, 10),
      dataFim: ontem.toISOString().slice(0, 10),
      status: 'marcado'
    });
  }

  /**
   * Métricas básicas: consultas realizadas no período.
   * Conta na tabela CONSULTAS (não agendamentos) — fonte da verdade.
   */
  async function contarConsultasPeriodo(dataInicio, dataFim) {
    // dataHora = ISO completo; converto para comparação
    const inicioIso = dataInicio + 'T00:00:00.000Z';
    const fimIso = dataFim + 'T23:59:59.999Z';
    const rows = await db.consultas
      .where('dataHora').between(inicioIso, fimIso, true, true)
      .toArray();
    return rows.filter(c => !c.deleted).length;
  }

  // ============================================================
  // TEMPLATES DE PRESCRIÇÃO (Sprint A2)
  // ============================================================
  /**
   * Cria um template.
   * @param {Object} t - { nome, tipo (simples|controle|azul), medicacoes (Array<string>), orientacoes? }
   */
  async function createTemplate(t) {
    const dek = getDEK();
    const now = new Date().toISOString();
    const payload = {
      nome: t.nome || '',
      medicacoes: Array.isArray(t.medicacoes) ? t.medicacoes : [],
      orientacoes: t.orientacoes || '',
      alertaClinico: t.alertaClinico || ''
    };
    const ciphered = await CryptoModule.encrypt(dek, payload);
    const id = await db.templatesPrescricao.add({
      tipo: t.tipo || 'simples',
      usoCount: 0,
      payload: ciphered,
      createdAt: now,
      updatedAt: now,
      deleted: 0
    });
    await audit('CREATE_TEMPLATE', 'template', id, { tipo: t.tipo });
    return id;
  }

  async function getTemplate(id) {
    const dek = getDEK();
    const t = await db.templatesPrescricao.get(id);
    if (!t || t.deleted) return null;
    const decrypted = t.payload ? await CryptoModule.decrypt(dek, t.payload) : {};
    return { ...t, ...decrypted, payload: undefined };
  }

  async function updateTemplate(id, t) {
    const dek = getDEK();
    const existing = await db.templatesPrescricao.get(id);
    if (!existing) throw new Error('Template não encontrado');

    const oldPayload = existing.payload ? await CryptoModule.decrypt(dek, existing.payload) : {};
    const merged = {
      nome: t.nome !== undefined ? t.nome : (oldPayload.nome || ''),
      medicacoes: t.medicacoes !== undefined ? t.medicacoes : (oldPayload.medicacoes || []),
      orientacoes: t.orientacoes !== undefined ? t.orientacoes : (oldPayload.orientacoes || ''),
      alertaClinico: t.alertaClinico !== undefined ? t.alertaClinico : (oldPayload.alertaClinico || '')
    };
    const ciphered = await CryptoModule.encrypt(dek, merged);

    const update = {
      payload: ciphered,
      updatedAt: new Date().toISOString()
    };
    if (t.tipo !== undefined) update.tipo = t.tipo;
    if (t.usoCount !== undefined) update.usoCount = t.usoCount;

    await db.templatesPrescricao.update(id, update);
    await audit('UPDATE_TEMPLATE', 'template', id);
    return id;
  }

  async function softDeleteTemplate(id) {
    await db.templatesPrescricao.update(id, { deleted: 1, updatedAt: new Date().toISOString() });
    await audit('DELETE_TEMPLATE', 'template', id);
  }

  /**
   * Lista templates (não deletados), ordenado por usoCount desc, depois createdAt desc.
   * Decifra todos para retornar nome+medicações+orientações em claro.
   */
  async function listTemplates(opts) {
    opts = opts || {};
    const dek = getDEK();
    let rows = await db.templatesPrescricao.toArray();
    rows = rows.filter(r => !r.deleted);
    if (opts.tipo) rows = rows.filter(r => r.tipo === opts.tipo);

    const out = [];
    for (const r of rows) {
      try {
        const dec = r.payload ? await CryptoModule.decrypt(dek, r.payload) : {};
        out.push({ ...r, ...dec, payload: undefined });
      } catch (e) {
        console.warn('Falha decifrar template', r.id, e);
        out.push({ ...r, nome: '(erro)', medicacoes: [], orientacoes: '', payload: undefined });
      }
    }

    // Ordena por uso descendente, depois nome alfabético
    out.sort((a, b) => {
      if ((b.usoCount || 0) !== (a.usoCount || 0)) return (b.usoCount || 0) - (a.usoCount || 0);
      return (a.nome || '').localeCompare(b.nome || '');
    });
    return out;
  }

  /**
   * Incrementa o contador de uso de um template (usado quando carregado na Prescrição Rápida).
   */
  async function incrementarUsoTemplate(id) {
    const t = await db.templatesPrescricao.get(id);
    if (!t) return;
    await db.templatesPrescricao.update(id, {
      usoCount: (t.usoCount || 0) + 1,
      updatedAt: new Date().toISOString()
    });
  }

  async function audit(action, entity, entityId, extra = {}) {
    try {
      await db.auditLog.add({
        timestamp: new Date().toISOString(),
        action,
        entity,
        entityId,
        ...extra
      });
    } catch (e) {
      console.warn('Falha ao gravar audit log:', e);
    }
  }

  async function getRecentAudit(limit = 50) {
    return db.auditLog.reverse().limit(limit).toArray();
  }

  // ---- RESET TOTAL (debug / wipe) ----
  async function wipeEverything() {
    await db.pacientes.clear();
    await db.consultas.clear();
    await db.agendamentos.clear();
    await db.templatesPrescricao.clear();
    await db.auditLog.clear();
    await db.config.clear();
    lock();
  }

  return {
    db,
    // Vault
    getVault, saveVault, hasVault,
    // DEK lifecycle
    setDEK, getDEK, isUnlocked, lock,
    initNameHashSalt,
    // Pacientes
    createPaciente, getPaciente, updatePaciente, softDeletePaciente,
    listPacientes, countPacientes,
    // Consultas
    createConsulta, getConsulta, updateConsulta, softDeleteConsulta,
    listConsultasByPaciente,
    // Agendamentos (Sprint A1)
    createAgendamento, getAgendamento, updateAgendamento, softDeleteAgendamento,
    listAgendamentos, listAgendaHoje, listFaltosos, contarConsultasPeriodo,
    // Templates de prescrição (Sprint A2)
    createTemplate, getTemplate, updateTemplate, softDeleteTemplate,
    listTemplates, incrementarUsoTemplate,
    // Audit
    audit, getRecentAudit,
    // Danger
    wipeEverything
  };
})();

window.DB = DB;
