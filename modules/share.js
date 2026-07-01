/* ============================================================
   share.js — Compartilhamento de documentos PDF

   Estratégia em camadas:
   1. Web Share Level 2 (com files): mobile com suporte → share sheet
      do SO. Usuário escolhe WhatsApp, PDF vai como anexo direto.
   2. Fallback wa.me: desktop e mobile antigo → baixa o PDF + abre
      WhatsApp Web/app na conversa do paciente (se tem telefone).
   3. Fallback duplo: se ambos falham, apenas baixa o PDF.

   Importante: o PDF NÃO trafega pelo backend nem por servidor de
   terceiros. Web Share usa IPC do SO; wa.me só abre o app/web
   sem upload do arquivo. O médico arrasta/seleciona o PDF baixado.
   ============================================================ */

const ShareService = (() => {

  // ---- Limpa um número brasileiro e devolve no formato E.164 (55XX) ----
  function limparTelefone(numero) {
    if (!numero) return null;
    // Remove tudo que não é dígito
    let digits = String(numero).replace(/\D/g, '');
    if (digits.length === 0) return null;

    // Já tem prefixo do país?
    if (digits.startsWith('55') && digits.length >= 12) {
      return digits;
    }

    // 10 dígitos (DDD + 8 dígitos antigos) — improvável hoje, mas trata
    if (digits.length === 10) {
      return '55' + digits;
    }

    // 11 dígitos: DDD + 9 dígitos (formato móvel atual)
    if (digits.length === 11) {
      return '55' + digits;
    }

    // 8 ou 9 dígitos: sem DDD — não dá pra usar
    if (digits.length <= 9) {
      return null;
    }

    // Retorna como está se for algo estranho mas plausível
    return digits.startsWith('55') ? digits : '55' + digits;
  }

  // ---- Detecta se o navegador suporta compartilhar arquivos ----
  function suportaShareFiles() {
    return !!(navigator.share && navigator.canShare);
  }

  // ---- Mensagem padrão para o paciente ----
  function montarMensagem(paciente, tipoDocumento) {
    const primeiroNome = (paciente.nome || '').split(/\s+/)[0] || 'paciente';
    const tipoLower = (tipoDocumento || 'documento').toLowerCase();

    const M = (window.PDFBuilder && PDFBuilder.MEDICO) || {};
    const assinatura = [M.nome, M.titulo, M.crm].filter(Boolean).join(' — ');
    const unidade = M.unidade ? ` ${M.unidade}.` : '';
    return `Olá, ${primeiroNome}! Segue o(a) ${tipoLower} da nossa consulta.` +
           (assinatura ? ` Atenciosamente, ${assinatura}.` : '') + unidade;
  }

  // ---- Estratégia 1: Web Share API com arquivos ----
  async function compartilharComArquivo(blob, filename, paciente, tipoDocumento) {
    if (!suportaShareFiles()) {
      throw new Error('Web Share API não disponível');
    }

    const file = new File([blob], filename, { type: 'application/pdf' });

    // canShare confirma se essa combinação de campos é aceita
    if (!navigator.canShare({ files: [file] })) {
      throw new Error('Compartilhamento de arquivos PDF não suportado');
    }

    await navigator.share({
      files: [file],
      title: tipoDocumento || 'Documento médico',
      text: montarMensagem(paciente, tipoDocumento)
    });

    return { method: 'web-share', success: true };
  }

  // ---- Estratégia 2: wa.me direct link ----
  function abrirWhatsAppWeb(paciente, tipoDocumento) {
    const numero = limparTelefone(paciente.whatsapp);
    const mensagem = encodeURIComponent(montarMensagem(paciente, tipoDocumento));

    let url;
    if (numero) {
      // Abre direto na conversa
      url = `https://wa.me/${numero}?text=${mensagem}`;
    } else {
      // Sem telefone: abre WhatsApp e deixa usuário escolher contato
      url = `https://wa.me/?text=${mensagem}`;
    }

    // Abre em nova aba
    window.open(url, '_blank');

    return { method: 'wa.me', numero: numero, success: true };
  }

  // ---- Função principal: tenta a melhor estratégia disponível ----
  // Retorna { method, success, message, askedToDownload }
  async function compartilharPDF(blob, filename, paciente, tipoDocumento, opcoes = {}) {
    const {
      forcarFallback = false,
      avisarDownload = true
    } = opcoes;

    // Tenta Web Share primeiro (melhor UX em mobile)
    if (!forcarFallback && suportaShareFiles()) {
      try {
        const result = await compartilharComArquivo(blob, filename, paciente, tipoDocumento);
        return { ...result, message: 'Compartilhamento aberto no sistema' };
      } catch (e) {
        // Usuário cancelou o sheet OU navegador não aceita arquivos PDF
        if (e.name === 'AbortError') {
          return { method: 'cancelled', success: false, message: 'Compartilhamento cancelado' };
        }
        console.warn('[Share] Web Share falhou, usando fallback:', e.message);
        // Cai para o fallback
      }
    }

    // Fallback: baixa o PDF + abre WhatsApp Web
    if (avisarDownload) {
      // Indica ao chamador que vai baixar — pra UI mostrar instrução
    }

    // Baixa o PDF
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    // Abre WhatsApp (sem o arquivo — usuário arrasta o PDF baixado)
    const result = abrirWhatsAppWeb(paciente, tipoDocumento);

    return {
      ...result,
      message: result.numero
        ? 'PDF baixado. WhatsApp aberto na conversa do paciente — arraste o PDF para a conversa.'
        : 'PDF baixado. WhatsApp aberto — selecione o paciente e arraste o PDF.',
      askedToDownload: true
    };
  }

  // ---- Apenas baixar (sem WhatsApp) ----
  function baixarPDF(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  return {
    compartilharPDF,
    baixarPDF,
    suportaShareFiles,
    limparTelefone,
    montarMensagem
  };
})();

window.ShareService = ShareService;
