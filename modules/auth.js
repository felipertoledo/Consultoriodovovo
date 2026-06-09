/* ============================================================
   auth.js — Senha mestra, idle lock e gestão de sessão
   ============================================================ */

const Auth = (() => {
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000;  // 15 minutos
  const MIN_PASSWORD_LENGTH = 12;

  let idleTimer = null;
  let listeners = [];

  // ---- Setup inicial (primeiro acesso) ----
  async function setup(password) {
    validatePassword(password);
    if (await DB.hasVault()) {
      throw new Error('Já existe um cofre. Use unlock ou wipe.');
    }
    await DB.initNameHashSalt();
    const { vaultMetadata, dek, recoveryKey } = await CryptoModule.createVault(password);
    await DB.saveVault(vaultMetadata);
    DB.setDEK(dek);
    await DB.audit('SETUP', 'vault', null);
    startIdleTimer();
    notify('unlocked');
    return { recoveryKey };
  }

  // ---- Desbloqueio com senha ----
  async function unlockWithPassword(password) {
    const vault = await DB.getVault();
    if (!vault) throw new Error('Nenhum cofre encontrado. Faça o setup inicial.');
    const dek = await CryptoModule.unlockWithPassword(vault, password);
    DB.setDEK(dek);
    await DB.audit('UNLOCK', 'vault', null, { method: 'password' });
    startIdleTimer();
    notify('unlocked');
  }

  // ---- Desbloqueio com chave de recuperação ----
  async function unlockWithRecovery(recoveryKey) {
    const vault = await DB.getVault();
    if (!vault) throw new Error('Nenhum cofre encontrado.');
    const dek = await CryptoModule.unlockWithRecovery(vault, recoveryKey);
    DB.setDEK(dek);
    await DB.audit('UNLOCK', 'vault', null, { method: 'recovery' });
    startIdleTimer();
    notify('unlocked');
  }

  // ---- Trocar senha (precisa estar destrancado) ----
  async function changePassword(newPassword) {
    validatePassword(newPassword);
    if (!DB.isUnlocked()) throw new Error('Destranque o cofre primeiro.');
    const vault = await DB.getVault();
    const dek = DB.getDEK();
    const newVault = await CryptoModule.changePassword(vault, dek, newPassword);
    await DB.saveVault(newVault);
    await DB.audit('CHANGE_PASSWORD', 'vault', null);
  }

  // ---- Lock manual ----
  async function lock() {
    if (DB.isUnlocked()) {
      await DB.audit('LOCK', 'vault', null);
    }
    DB.lock();
    stopIdleTimer();
    notify('locked');
  }

  // ---- Idle timer ----
  function resetIdle() {
    if (!DB.isUnlocked()) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      console.log('Idle timeout — trancando cofre');
      lock();
    }, IDLE_TIMEOUT_MS);
  }

  function startIdleTimer() {
    resetIdle();
    ['mousemove', 'keydown', 'click', 'touchstart'].forEach(ev => {
      window.addEventListener(ev, resetIdle, { passive: true });
    });
  }

  function stopIdleTimer() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  }

  // ---- Validação de senha ----
  function validatePassword(password) {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
    // Recomendado: ter letras + números (mas não bloqueamos)
    return true;
  }

  function passwordStrength(password) {
    let score = 0;
    if (!password) return { score: 0, label: 'Vazia' };
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Muito forte', 'Excelente'];
    return { score, label: labels[Math.min(score, labels.length - 1)] };
  }

  // ---- Listeners de eventos ----
  function on(callback) {
    listeners.push(callback);
    return () => { listeners = listeners.filter(l => l !== callback); };
  }

  function notify(event) {
    listeners.forEach(l => { try { l(event); } catch (e) { console.error(e); } });
  }

  return {
    setup,
    unlockWithPassword,
    unlockWithRecovery,
    changePassword,
    lock,
    passwordStrength,
    on,
    isUnlocked: () => DB.isUnlocked(),
    IDLE_TIMEOUT_MS,
    MIN_PASSWORD_LENGTH
  };
})();

window.Auth = Auth;
if (typeof module !== 'undefined' && module.exports) module.exports = window.Auth;
