/* ============================================================
   backup.js — Export/import de backup do cofre

   Estratégia:
   - O arquivo de backup contém TODO o IndexedDB serializado
   - Pacientes/consultas/audit já estão AEAD-cifrados em-place
   - O envelope tem um checksum SHA-256 para detectar corrupção
   - Para restaurar, basta substituir o IndexedDB e fazer login normal
   - O backup só serve se a pessoa lembrar da frase-passe OU tiver a
     chave de recuperação que existia quando o backup foi feito.
   ============================================================ */

const Backup = (() => {

  const FORMAT_NAME = 'consultorio-do-vovo-backup';
  const FORMAT_VERSION = 1;

  // -----------------------------------------------------------
  // EXPORT
  // -----------------------------------------------------------
  async function exportToFile() {
    const dexie = DB.db;

    // Marca o backup ANTES de coletar config, para que lastBackupAt entre no envelope
    await markBackupDone();

    // Coleta todos os registros de todas as tabelas
    const [pacientes, consultas, agendamentos, templatesPrescricao, anexos, auditLog, config] = await Promise.all([
      dexie.pacientes.toArray(),
      dexie.consultas.toArray(),
      dexie.agendamentos.toArray(),
      dexie.templatesPrescricao.toArray(),
      dexie.anexos.toArray(),
      dexie.auditLog.toArray(),
      dexie.config.toArray()
    ]);

    const versionInfo = await fetchVersionInfo();

    // Monta o payload (sem checksum ainda)
    const payload = {
      format: FORMAT_NAME,
      formatVersion: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: versionInfo.version || '?',
      counts: {
        pacientes: pacientes.length,
        consultas: consultas.length,
        agendamentos: agendamentos.length,
        templatesPrescricao: templatesPrescricao.length,
        anexos: anexos.length,
        auditLog: auditLog.length,
        config: config.length
      },
      data: {
        pacientes,
        consultas,
        agendamentos,
        templatesPrescricao,
        anexos,
        auditLog,
        config
      }
    };

    // Calcula checksum SHA-256 do payload serializado
    const payloadStr = JSON.stringify(payload);
    const checksum = await sha256Hex(payloadStr);

    // Envelope final com checksum
    const envelope = {
      ...payload,
      checksum: checksum
    };

    const finalStr = JSON.stringify(envelope, null, 2);
    const blob = new Blob([finalStr], { type: 'application/json' });

    // Audit
    try {
      await DB.audit('EXPORT_BACKUP', 'system', null, {
        counts: envelope.counts,
        bytes: blob.size
      });
    } catch (e) {
      // Audit falhar não deve impedir export
      console.warn('Falha ao registrar audit do backup:', e);
    }

    return { blob, envelope, filename: gerarNomeArquivo() };
  }

  async function downloadBackup() {
    const { blob, filename } = await exportToFile();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { filename, bytes: blob.size };
  }

  // -----------------------------------------------------------
  // VALIDAÇÃO (sem alterar o banco)
  // -----------------------------------------------------------
  async function validateBackupFile(file) {
    if (!file) {
      throw new Error('Nenhum arquivo selecionado');
    }
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('Arquivo muito grande (>50 MB). Verifique se é um backup válido.');
    }

    const text = await file.text();
    let envelope;
    try {
      envelope = JSON.parse(text);
    } catch (e) {
      throw new Error('Arquivo não é JSON válido');
    }

    if (envelope.format !== FORMAT_NAME) {
      throw new Error('Arquivo não é um backup do Consultório do Vovô');
    }

    if (envelope.formatVersion > FORMAT_VERSION) {
      throw new Error(
        `Backup foi feito em uma versão mais nova (v${envelope.formatVersion}). ` +
        `Atualize o sistema antes de restaurar.`
      );
    }

    if (!envelope.data || !envelope.data.pacientes || !envelope.data.config) {
      throw new Error('Backup incompleto ou corrompido (falta tabelas)');
    }

    // Verifica checksum
    const { checksum, ...payloadOnly } = envelope;
    const payloadStr = JSON.stringify(payloadOnly);
    const calc = await sha256Hex(payloadStr);
    if (calc !== checksum) {
      throw new Error('Checksum inválido — arquivo pode estar corrompido ou ter sido modificado');
    }

    // Verifica se tem vault dentro do config
    const vaultEntry = envelope.data.config.find(c => c.key === 'vault');
    if (!vaultEntry || !vaultEntry.value) {
      throw new Error('Backup não contém metadados do cofre (vault)');
    }

    return {
      valid: true,
      envelope,
      info: {
        exportedAt: envelope.exportedAt,
        appVersion: envelope.appVersion,
        counts: envelope.counts
      }
    };
  }

  // -----------------------------------------------------------
  // IMPORT (destrutivo — substitui tudo)
  // -----------------------------------------------------------
  async function importFromEnvelope(envelope) {
    const dexie = DB.db;

    // Bloqueia o cofre atual (segurança)
    if (typeof Auth !== 'undefined' && Auth.isUnlocked && Auth.isUnlocked()) {
      Auth.lock();
    } else if (DB && DB.lock) {
      DB.lock();
    }

    // Limpa todas as tabelas
    await dexie.transaction('rw', dexie.pacientes, dexie.consultas, dexie.agendamentos, dexie.templatesPrescricao, dexie.anexos, dexie.auditLog, dexie.config,
      async () => {
        await dexie.pacientes.clear();
        await dexie.consultas.clear();
        await dexie.agendamentos.clear();
        await dexie.templatesPrescricao.clear();
        await dexie.anexos.clear();
        await dexie.auditLog.clear();
        await dexie.config.clear();

        // Restaura todos os dados
        if (envelope.data.pacientes.length > 0) {
          await dexie.pacientes.bulkAdd(envelope.data.pacientes);
        }
        if (envelope.data.consultas.length > 0) {
          await dexie.consultas.bulkAdd(envelope.data.consultas);
        }
        // Sprint A1: backups antigos (pre-v0.10.0) não têm agendamentos — retrocompatível
        if (envelope.data.agendamentos && envelope.data.agendamentos.length > 0) {
          await dexie.agendamentos.bulkAdd(envelope.data.agendamentos);
        }
        // Sprint A2: backups antigos (pre-v0.11.0) não têm templates — retrocompatível
        if (envelope.data.templatesPrescricao && envelope.data.templatesPrescricao.length > 0) {
          await dexie.templatesPrescricao.bulkAdd(envelope.data.templatesPrescricao);
        }
        // Sprint B2: backups antigos (pre-v0.12.0) não têm anexos — retrocompatível
        if (envelope.data.anexos && envelope.data.anexos.length > 0) {
          await dexie.anexos.bulkAdd(envelope.data.anexos);
        }
        if (envelope.data.auditLog.length > 0) {
          await dexie.auditLog.bulkAdd(envelope.data.auditLog);
        }
        if (envelope.data.config.length > 0) {
          await dexie.config.bulkAdd(envelope.data.config);
        }
      }
    );

    return {
      success: true,
      counts: envelope.counts,
      exportedAt: envelope.exportedAt
    };
  }

  // -----------------------------------------------------------
  // ESTADO / LEMBRETES
  // -----------------------------------------------------------
  async function getStatus() {
    const dexie = DB.db;
    const lastEntry = await dexie.config.get('lastBackupAt');
    const lastBackupAt = lastEntry ? lastEntry.value : null;

    // Conta consultas criadas após o último backup
    let consultasDesdeBackup;
    if (lastBackupAt) {
      const consultas = await dexie.consultas
        .where('createdAt').above(lastBackupAt)
        .count();
      consultasDesdeBackup = consultas;
    } else {
      consultasDesdeBackup = await dexie.consultas.count();
    }

    const daysSinceBackup = lastBackupAt
      ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      lastBackupAt,
      daysSinceBackup,
      consultasDesdeBackup,
      precisaBackup: shouldReminder(daysSinceBackup, consultasDesdeBackup)
    };
  }

  async function markBackupDone() {
    await DB.db.config.put({
      key: 'lastBackupAt',
      value: new Date().toISOString()
    });
  }

  function shouldReminder(daysSince, consultasNovas) {
    // Lembrete quando:
    // - Nunca fez backup E tem >= 1 consulta
    // - Última >= 7 dias E houve nova atividade (>=1 consulta)
    // - Houve 5 ou mais novas consultas desde o último backup
    if (daysSince === null && consultasNovas >= 1) return true;
    if (daysSince !== null && daysSince >= 7 && consultasNovas >= 1) return true;
    if (consultasNovas >= 5) return true;
    return false;
  }

  // -----------------------------------------------------------
  // HELPERS
  // -----------------------------------------------------------
  async function sha256Hex(str) {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function fetchVersionInfo() {
    try {
      const resp = await fetch('./version.json');
      return await resp.json();
    } catch (e) {
      return { version: '?' };
    }
  }

  function gerarNomeArquivo() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `consultorio-do-vovo-backup_${yyyy}-${mm}-${dd}_${hh}h${mi}.cdv-backup`;
  }

  return {
    downloadBackup,
    exportToFile,
    validateBackupFile,
    importFromEnvelope,
    getStatus,
    markBackupDone,
    FORMAT_NAME,
    FORMAT_VERSION
  };
})();

window.Backup = Backup;
if (typeof module !== 'undefined' && module.exports) module.exports = window.Backup;
