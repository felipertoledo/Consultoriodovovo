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

  // ---- CONSULTAS (placeholder p/ Sprint 2) ----
  async function createConsulta(consultaData) {
    const dek = getDEK();
    const now = new Date().toISOString();
    const encryptedPayload = await CryptoModule.encrypt(dek, consultaData);
    const id = await db.consultas.add({
      pacienteId: consultaData.pacienteId,
      dataHora: consultaData.dataHora || now,
      createdAt: now,
      updatedAt: now,
      deleted: 0,
      data: encryptedPayload
    });
    await audit('CREATE', 'consulta', id);
    return id;
  }

  async function listConsultasByPaciente(pacienteId) {
    const dek = getDEK();
    const rows = await db.consultas
      .where('pacienteId').equals(pacienteId)
      .and(r => !r.deleted)
      .reverse()
      .sortBy('dataHora');
    const items = [];
    for (const row of rows) {
      const decoded = await CryptoModule.decrypt(dek, row.data);
      items.push({ id: row.id, dataHora: row.dataHora, ...decoded });
    }
    return items;
  }

  // ---- AUDIT ----
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
    // Consultas (stub p/ Sprint 2)
    createConsulta, listConsultasByPaciente,
    // Audit
    audit, getRecentAudit,
    // Danger
    wipeEverything
  };
})();

window.DB = DB;
