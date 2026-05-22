/* ============================================================
   crypto.js — Criptografia client-side
   PBKDF2 600.000 iterações (OWASP 2023+) + AES-GCM 256
   Envelope encryption com chave de recuperação Crockford Base32
   ============================================================ */

const CryptoModule = (() => {
  const PBKDF2_ITERATIONS = 600000;
  const PBKDF2_HASH = 'SHA-256';
  const AES_KEY_LENGTH = 256;
  const SALT_LENGTH = 16;
  const IV_LENGTH = 12;
  // Crockford Base32 (sem 0/O/I/L/U para evitar confusões na transcrição manual)
  const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // ---- Helpers de codificação ----
  function bytesToBase64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function base64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function bytesToCrockfordBase32(bytes) {
    let bits = 0, value = 0, output = '';
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        output += CROCKFORD_ALPHABET[(value >>> (bits - 5)) & 0x1f];
        bits -= 5;
      }
    }
    if (bits > 0) {
      output += CROCKFORD_ALPHABET[(value << (5 - bits)) & 0x1f];
    }
    return output;
  }

  function crockfordBase32ToBytes(str) {
    // Normalização: maiúsculas, remove hífens e espaços, corrige confusões
    str = str.toUpperCase().replace(/[-\s]/g, '')
             .replace(/O/g, '0').replace(/I/g, '1').replace(/L/g, '1').replace(/U/g, 'V');
    const bytes = [];
    let bits = 0, value = 0;
    for (let i = 0; i < str.length; i++) {
      const idx = CROCKFORD_ALPHABET.indexOf(str[i]);
      if (idx === -1) throw new Error(`Caractere inválido na chave de recuperação: ${str[i]}`);
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return new Uint8Array(bytes);
  }

  function formatRecoveryKey(b32) {
    // XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (7 grupos de 4)
    return b32.match(/.{1,4}/g).join('-');
  }

  // ---- Derivação de chave a partir de senha (KEK) ----
  async function deriveKeyFromPassword(password, salt) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password),
      { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
      keyMaterial,
      { name: 'AES-GCM', length: AES_KEY_LENGTH },
      false,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  // ---- Gera uma DEK (Data Encryption Key) AES-256 random ----
  async function generateDEK() {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: AES_KEY_LENGTH },
      true,  // extractable, para podermos "embrulhar" com a KEK
      ['encrypt', 'decrypt']
    );
  }

  // ---- Wrap/Unwrap DEK com KEK ----
  async function wrapDEK(dek, kek) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const wrapped = await crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv });
    return {
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(wrapped))
    };
  }

  async function unwrapDEK(wrappedObj, kek) {
    const iv = base64ToBytes(wrappedObj.iv);
    const data = base64ToBytes(wrappedObj.data);
    return crypto.subtle.unwrapKey(
      'raw', data, kek,
      { name: 'AES-GCM', iv },
      { name: 'AES-GCM', length: AES_KEY_LENGTH },
      true,  // extractable: true — necessário para permitir troca de senha (re-wrap)
      ['encrypt', 'decrypt']
    );
  }

  // ---- Cifrar/decifrar payloads arbitrários com a DEK ----
  async function encrypt(dek, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const data = enc.encode(typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, data);
    return {
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(ct))
    };
  }

  async function decrypt(dek, ciphertext) {
    const iv = base64ToBytes(ciphertext.iv);
    const data = base64ToBytes(ciphertext.data);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dek, data);
    const text = dec.decode(pt);
    try { return JSON.parse(text); } catch { return text; }
  }

  async function decryptToString(dek, ciphertext) {
    const iv = base64ToBytes(ciphertext.iv);
    const data = base64ToBytes(ciphertext.data);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dek, data);
    return dec.decode(pt);
  }

  // ---- Setup inicial: cria DEK + envelope dupla (senha + recuperação) ----
  async function createVault(password) {
    // Gera DEK
    const dek = await generateDEK();
    // Gera chave de recuperação (20 bytes = 160 bits de entropia, 32 chars base32)
    const recoveryBytes = crypto.getRandomValues(new Uint8Array(20));
    const recoveryB32 = bytesToCrockfordBase32(recoveryBytes);
    const recoveryFormatted = formatRecoveryKey(recoveryB32);

    // Salts independentes
    const saltPassword = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const saltRecovery = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

    // Deriva KEKs
    const kekPassword = await deriveKeyFromPassword(password, saltPassword);
    const kekRecovery = await deriveKeyFromPassword(recoveryFormatted, saltRecovery);

    // Embrulha DEK com cada KEK
    const wrappedByPassword = await wrapDEK(dek, kekPassword);
    const wrappedByRecovery = await wrapDEK(dek, kekRecovery);

    const vaultMetadata = {
      version: 1,
      created: new Date().toISOString(),
      saltPassword: bytesToBase64(saltPassword),
      saltRecovery: bytesToBase64(saltRecovery),
      wrappedByPassword,
      wrappedByRecovery,
      iterations: PBKDF2_ITERATIONS
    };

    return { vaultMetadata, dek, recoveryKey: recoveryFormatted };
  }

  // ---- Desbloqueio via senha ----
  async function unlockWithPassword(vaultMetadata, password) {
    const salt = base64ToBytes(vaultMetadata.saltPassword);
    const kek = await deriveKeyFromPassword(password, salt);
    try {
      const dek = await unwrapDEK(vaultMetadata.wrappedByPassword, kek);
      return dek;
    } catch (e) {
      throw new Error('Senha incorreta');
    }
  }

  // ---- Desbloqueio via chave de recuperação ----
  async function unlockWithRecovery(vaultMetadata, recoveryKey) {
    // Normaliza a chave de recuperação (remove hífens/espaços, padroniza maiúsculas)
    const normalized = formatRecoveryKey(
      recoveryKey.toUpperCase().replace(/[-\s]/g, '')
    );
    const salt = base64ToBytes(vaultMetadata.saltRecovery);
    const kek = await deriveKeyFromPassword(normalized, salt);
    try {
      const dek = await unwrapDEK(vaultMetadata.wrappedByRecovery, kek);
      return dek;
    } catch (e) {
      throw new Error('Chave de recuperação inválida');
    }
  }

  // ---- Trocar senha (re-embrulha DEK) ----
  async function changePassword(vaultMetadata, currentDEK, newPassword) {
    const newSalt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const newKek = await deriveKeyFromPassword(newPassword, newSalt);
    const newWrapped = await wrapDEK(currentDEK, newKek);
    return {
      ...vaultMetadata,
      saltPassword: bytesToBase64(newSalt),
      wrappedByPassword: newWrapped,
      passwordChangedAt: new Date().toISOString()
    };
  }

  // ---- Hash determinístico para indexação cega (busca por nome sem expor) ----
  async function blindHash(text, salt) {
    const saltBytes = typeof salt === 'string' ? base64ToBytes(salt) : salt;
    const normalized = enc.encode(text.toLowerCase().trim());
    const combined = new Uint8Array(saltBytes.length + normalized.length);
    combined.set(saltBytes, 0);
    combined.set(normalized, saltBytes.length);
    const hash = await crypto.subtle.digest('SHA-256', combined);
    return bytesToBase64(new Uint8Array(hash));
  }

  // ---- Verificação rápida (KDF check sem decifrar) ----
  // Útil para verificar senha sem precisar carregar/decifrar dados
  async function quickVerify(vaultMetadata, password) {
    try {
      await unlockWithPassword(vaultMetadata, password);
      return true;
    } catch {
      return false;
    }
  }

  return {
    // Setup
    createVault,
    // Unlock
    unlockWithPassword,
    unlockWithRecovery,
    changePassword,
    quickVerify,
    // Operações com DEK
    encrypt,
    decrypt,
    decryptToString,
    blindHash,
    // Utils
    bytesToBase64,
    base64ToBytes,
    formatRecoveryKey,
    // Constants (para teste)
    PBKDF2_ITERATIONS
  };
})();

window.CryptoModule = CryptoModule;
