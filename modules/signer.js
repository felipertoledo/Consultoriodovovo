/* ============================================================
   signer.js — Assinatura digital ICP-Brasil A1 (.pfx/.p12)

   Workflow:
   1. Felipe cadastra o certificado A1 uma vez (Configurações):
      - sobe o arquivo .pfx
      - informa a senha
      - sistema valida com node-forge
      - .pfx é cifrado com a DEK do cofre e salvo no IndexedDB
        (proteção dupla: senha do cofre + senha do .pfx)
   2. Quando assina um PDF:
      - decifra o .pfx do IndexedDB (precisa do cofre destravado)
      - pede a senha do .pfx (default) ou usa a cacheada em sessão
      - assina via ZgaPdfSigner (PAdES Baseline B, ETSI EN 319 142)
      - retorna PDF assinado (PKCS#7 invisível por padrão)
   3. Validar PDF assinado: https://verificador.iti.gov.br ou Adobe Reader

   Limitações conhecidas (web):
   - Sem timestamp TSA (precisa CORS, blocked em browser)
   - Sem LTV (mesma razão)
   - Para validade legal de receita médica é suficiente (CFM 2.299/2021)
   ============================================================ */

const Signer = (() => {

  // Cache em memória (não persiste) da senha do .pfx para a sessão
  let cachedPassword = null;
  let cachedAt = 0;
  const PASSWORD_CACHE_MS = 30 * 60 * 1000; // 30 min

  // -----------------------------------------------------------
  // Helpers: leitura de arquivo + node-forge
  // -----------------------------------------------------------
  async function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Falha ao ler arquivo'));
      r.readAsArrayBuffer(file);
    });
  }

  function arrayBufferToBinaryString(ab) {
    const bytes = new Uint8Array(ab);
    let str = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return str;
  }

  function arrayBufferToBase64(ab) {
    return btoa(arrayBufferToBinaryString(ab));
  }

  function base64ToArrayBuffer(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  // -----------------------------------------------------------
  // Parse do .pfx com node-forge, valida senha, extrai info
  // -----------------------------------------------------------
  function parseP12(p12Bytes, password) {
    if (typeof forge === 'undefined') {
      throw new Error('Lib node-forge não carregada');
    }
    const p12DerStr = arrayBufferToBinaryString(p12Bytes);
    let p12Asn1, p12;
    try {
      p12Asn1 = forge.asn1.fromDer(p12DerStr);
    } catch (e) {
      throw new Error('Arquivo não é um .pfx/.p12 válido');
    }
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    } catch (e) {
      // node-forge lança erro genérico para senha errada
      const msg = (e.message || '').toLowerCase();
      if (msg.includes('mac') || msg.includes('password') || msg.includes('integrity')) {
        throw new Error('Senha do certificado incorreta');
      }
      throw new Error('Falha ao abrir certificado: ' + (e.message || e));
    }

    // Pega o certificado do titular (primeiro certBag)
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certs = certBags[forge.pki.oids.certBag];
    if (!certs || certs.length === 0) {
      throw new Error('Certificado sem cert do titular');
    }
    const cert = certs[0].cert;

    return { p12, cert };
  }

  function extractCertInfo(cert) {
    function getField(subject, name) {
      const f = subject.getField(name);
      return f ? f.value : null;
    }

    const subject = cert.subject;
    const issuer = cert.issuer;

    const cn = getField(subject, 'CN') || '(sem CN)';
    const acEmissora = getField(issuer, 'CN') || '(AC desconhecida)';

    // Validade
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;
    const agora = new Date();
    const expirado = agora > notAfter;
    const diasParaExpirar = Math.floor((notAfter - agora) / (1000 * 60 * 60 * 24));

    // Tenta extrair CPF do OID padrão ICP-Brasil PF: 2.16.76.1.3.1
    // Estrutura: DDMMAAAA(8) + CPF(11) + NIS(11) + RG(15) = 45 chars
    let cpf = null;
    let dataNascimento = null;
    try {
      const extensions = cert.extensions || [];
      const sanExt = extensions.find(e => e.name === 'subjectAltName' || e.id === '2.5.29.17');
      if (sanExt && sanExt.altNames) {
        for (const altName of sanExt.altNames) {
          // Procura otherName com OID PF
          if (altName.type === 0 && altName.value) {
            // Tenta encontrar o padrão de 45 chars
            const v = String(altName.value);
            const cpfMatch = v.match(/(\d{8})(\d{11})(\d{11})(\d{15})/);
            if (cpfMatch) {
              dataNascimento = cpfMatch[1].slice(0,2) + '/' +
                              cpfMatch[1].slice(2,4) + '/' +
                              cpfMatch[1].slice(4,8);
              cpf = cpfMatch[2];
              break;
            }
          }
        }
      }
    } catch (e) {
      // Falha silenciosa - CPF é nice-to-have
      console.warn('[Signer] Falha ao extrair CPF do certificado:', e.message);
    }

    return {
      commonName: cn,
      acEmissora: acEmissora,
      cpf: cpf ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null,
      dataNascimento,
      validFrom: notBefore.toISOString(),
      validTo: notAfter.toISOString(),
      expirado,
      diasParaExpirar,
      serial: cert.serialNumber
    };
  }

  // -----------------------------------------------------------
  // Carregar e armazenar certificado
  // -----------------------------------------------------------
  async function loadAndStoreCertificate(file, password) {
    if (!file) throw new Error('Nenhum arquivo selecionado');
    if (file.size > 200 * 1024) {
      throw new Error('Arquivo muito grande (>200 KB). .pfx geralmente é menor que 10 KB');
    }
    if (!password || password.length < 1) {
      throw new Error('Senha obrigatória');
    }

    // 1. Lê o arquivo
    const ab = await readFileAsArrayBuffer(file);

    // 2. Valida com node-forge (testa senha + parsea)
    const { cert } = parseP12(ab, password);
    const info = extractCertInfo(cert);

    if (info.expirado) {
      throw new Error(`Certificado EXPIRADO em ${new Date(info.validTo).toLocaleDateString('pt-BR')}. Renove antes de usar.`);
    }

    // 3. Cifra o .pfx com a DEK do cofre e salva
    if (!DB.isUnlocked()) {
      throw new Error('Cofre bloqueado. Faça login antes de cadastrar o certificado.');
    }
    const dek = DB.getDEK();
    const p12B64 = arrayBufferToBase64(ab);
    const ciphered = await CryptoModule.encrypt(dek, { p12: p12B64, fileName: file.name });

    await DB.db.config.put({
      key: 'icpBrasilCert',
      value: {
        ciphered: ciphered,
        info: info,
        registeredAt: new Date().toISOString()
      }
    });

    // Cacheia senha por 30min
    cachedPassword = password;
    cachedAt = Date.now();

    // Audit
    try {
      await DB.audit('REGISTER_CERTIFICATE', 'system', null, {
        commonName: info.commonName,
        acEmissora: info.acEmissora,
        validTo: info.validTo
      });
    } catch {}

    return info;
  }

  // -----------------------------------------------------------
  // Verifica se já tem certificado configurado
  // -----------------------------------------------------------
  async function getConfiguredCertificate() {
    const entry = await DB.db.config.get('icpBrasilCert');
    if (!entry || !entry.value) return null;
    return entry.value;
  }

  async function removeCertificate() {
    await DB.db.config.delete('icpBrasilCert');
    cachedPassword = null;
    cachedAt = 0;
    try {
      await DB.audit('REMOVE_CERTIFICATE', 'system', null, {});
    } catch {}
  }

  // -----------------------------------------------------------
  // Decifra o .pfx armazenado usando a DEK do cofre
  // -----------------------------------------------------------
  async function loadStoredP12Bytes() {
    if (!DB.isUnlocked()) {
      throw new Error('Cofre bloqueado');
    }
    const entry = await getConfiguredCertificate();
    if (!entry) {
      throw new Error('Certificado não cadastrado. Configure em "Assinatura digital" nas Configurações.');
    }
    const dek = DB.getDEK();
    const decifrado = await CryptoModule.decrypt(dek, entry.ciphered);
    return {
      p12Bytes: base64ToArrayBuffer(decifrado.p12),
      fileName: decifrado.fileName,
      info: entry.info
    };
  }

  // -----------------------------------------------------------
  // Senha em cache de sessão
  // -----------------------------------------------------------
  function getCachedPassword() {
    if (!cachedPassword) return null;
    if (Date.now() - cachedAt > PASSWORD_CACHE_MS) {
      cachedPassword = null;
      cachedAt = 0;
      return null;
    }
    return cachedPassword;
  }

  function cachePassword(pwd) {
    cachedPassword = pwd;
    cachedAt = Date.now();
  }

  function clearCachedPassword() {
    cachedPassword = null;
    cachedAt = 0;
  }

  // -----------------------------------------------------------
  // Assinar PDF
  // -----------------------------------------------------------
  async function signPDF(pdfBlob, password, opcoes = {}) {
    // Valida cofre primeiro (mais provável de falhar e mensagem mais clara)
    const stored = await loadStoredP12Bytes();

    if (typeof Zga === 'undefined' || !Zga.PdfSigner) {
      throw new Error('Lib zgapdfsigner não carregada');
    }

    // CRITICAL: desabilita urlFetch do Zga para pular o buildChain online.
    // No Brasil, as ACs (Soluti, Certisign, etc) ainda servem certificados
    // intermediários via HTTP, o que o browser bloqueia (Mixed Content) quando
    // a página está em HTTPS. Sem isso, qualquer assinatura quebra com
    // "Failed to fetch". A validação da assinatura continua funcionando porque
    // o Adobe Reader e o verificador ITI gov.br já confiam na raiz ICP-Brasil
    // e baixam a cadeia eles mesmos no momento da verificação.
    const originalUrlFetch = Zga.urlFetch;
    Zga.urlFetch = null;

    try {
      // Re-valida a senha
      parseP12(stored.p12Bytes, password); // lança se errada

      // Cacheia se solicitado
      if (opcoes.lembrarSenha) cachePassword(password);

      // PDF como ArrayBuffer
      const pdfAB = pdfBlob instanceof Blob ? await pdfBlob.arrayBuffer() : pdfBlob;

      // Configurações da assinatura
      // Importante: NÃO passar signdate como string (zgapdfsigner interpreta como URL de TSA);
      // omitir resulta em new Date() (data atual). Se quiser data específica, passar Date object.
      const sopt = {
        p12cert: stored.p12Bytes,
        pwd: password,
        permission: opcoes.permission || 1, // 1 = permite anotações; 2 = só formulários; 3 = nada
        reason: opcoes.reason || 'Prescrição médica',
        location: opcoes.location || 'USF Estiva Gerbi - SP',
        contact: opcoes.contact || 'felipertoledo@gmail.com'
      };

      const signer = new Zga.PdfSigner(sopt);
      const signedBytes = await signer.sign(new Uint8Array(pdfAB));

      // Audit
      try {
        await DB.audit('SIGN_PDF', 'documento', null, {
          commonName: stored.info.commonName,
          reason: sopt.reason
        });
      } catch {}

      return new Blob([signedBytes], { type: 'application/pdf' });
    } finally {
      // Restaura urlFetch (não deve afetar próximos chamados, mas por bom-cidadão)
      Zga.urlFetch = originalUrlFetch;
    }
  }

  return {
    loadAndStoreCertificate,
    getConfiguredCertificate,
    removeCertificate,
    extractCertInfo,
    parseP12,
    signPDF,
    getCachedPassword,
    cachePassword,
    clearCachedPassword,
    // Para testes
    arrayBufferToBase64,
    base64ToArrayBuffer
  };
})();

window.Signer = Signer;
