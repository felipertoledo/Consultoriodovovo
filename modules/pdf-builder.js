/* ============================================================
   pdf-builder.js — Geração de PDFs com jsPDF
   Padroniza cabeçalho, identificação, rodapé, assinatura
   ============================================================ */

const PDFBuilder = (() => {
  // Margens em mm (jsPDF usa mm por padrão quando configurado)
  const MARGIN = { top: 18, right: 20, bottom: 20, left: 20 };
  const PAGE_WIDTH = 210;   // A4
  const PAGE_HEIGHT = 297;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN.left - MARGIN.right;

  // Identificação do médico (config global)
  const MEDICO = {
    nome: 'Felipe Ribeiro Toledo',
    titulo: 'Médico',
    crm: 'CRM-SP 216.986',
    unidade: 'USF Estiva Gerbi'
  };

  // ---- Cria um novo documento jsPDF com margens e config padrão ----
  function novoPDF() {
    // jsPDF UMD se expõe como window.jspdf (lowercase); fallback para window.jsPDF
    const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDFClass) {
      throw new Error('jsPDF não está carregado. Verifique assets/lib/jspdf.umd.min.js');
    }
    const doc = new jsPDFClass({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    doc.setFont('helvetica', 'normal');
    return doc;
  }

  // ---- Cabeçalho institucional padrão ----
  // Retorna a posição Y após o cabeçalho (para o conteúdo continuar dali)
  function cabecalho(doc, tituloDocumento) {
    let y = MARGIN.top;

    // Logo / nome do consultório (esquerda)
    doc.setFillColor(22, 101, 52); // verde-musgo #166534
    doc.roundedRect(MARGIN.left, y, 14, 14, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CV', MARGIN.left + 7, y + 9, { align: 'center' });

    // Identificação do médico (direita do logo)
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(MEDICO.nome, MARGIN.left + 18, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`${MEDICO.titulo} · ${MEDICO.crm}`, MARGIN.left + 18, y + 9.5);
    doc.text(MEDICO.unidade, MARGIN.left + 18, y + 13.5);

    // Data de emissão (canto superior direito)
    const dataEmissao = new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Emitido em ${dataEmissao}`, PAGE_WIDTH - MARGIN.right, y + 5, { align: 'right' });

    y += 18;

    // Linha separadora
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(MARGIN.left, y, PAGE_WIDTH - MARGIN.right, y);
    y += 6;

    // Título do documento
    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(tituloDocumento.toUpperCase(), PAGE_WIDTH / 2, y + 2, { align: 'center' });
    y += 10;

    doc.setTextColor(15, 23, 42); // reset
    return y;
  }

  // ---- Bloco de identificação do paciente ----
  function blocoPaciente(doc, paciente, y, opcoes = {}) {
    const {
      incluirContato = false,
      incluirEndereco = false
    } = opcoes;

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);

    // Calcula altura necessária
    let linhas = 2;
    if (incluirContato) linhas += 1;
    if (incluirEndereco) linhas += 1;
    const altura = linhas * 5 + 6;

    doc.roundedRect(MARGIN.left, y, CONTENT_WIDTH, altura, 1.5, 1.5, 'FD');

    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('PACIENTE', MARGIN.left + 3, y);
    y += 4;

    // Linha 1: Nome + idade
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const idade = paciente.dataNascimento ? UI.calculateAge(paciente.dataNascimento) : null;
    let linha1 = paciente.nome || '(sem nome registrado)';
    if (idade !== null) linha1 += `, ${idade} anos`;
    doc.text(linha1, MARGIN.left + 3, y);
    y += 5;

    // Linha 2: CPF, RG, CNS
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const docs = [];
    if (paciente.cpf) docs.push(`CPF ${paciente.cpf}`);
    if (paciente.rg) docs.push(`RG ${paciente.rg}`);
    if (paciente.cns) docs.push(`CNS ${paciente.cns}`);
    if (paciente.dataNascimento) {
      const nasc = new Date(paciente.dataNascimento).toLocaleDateString('pt-BR');
      docs.push(`Nasc. ${nasc}`);
    }
    if (docs.length > 0) {
      doc.text(docs.join(' · '), MARGIN.left + 3, y);
    }
    y += 5;

    // Linha 3: contato (se opcional)
    if (incluirContato) {
      const contato = [];
      if (paciente.whatsapp) contato.push(`Tel/WA: ${paciente.whatsapp}`);
      if (paciente.email) contato.push(paciente.email);
      if (contato.length > 0) {
        doc.text(contato.join(' · '), MARGIN.left + 3, y);
      }
      y += 5;
    }

    // Linha 4: endereço (se opcional)
    if (incluirEndereco) {
      const end = [];
      if (paciente.logradouro) end.push(paciente.logradouro + (paciente.numero ? ', ' + paciente.numero : ''));
      if (paciente.bairro) end.push(paciente.bairro);
      if (paciente.cidade) end.push(paciente.cidade + (paciente.uf ? '/' + paciente.uf : ''));
      if (end.length > 0) {
        doc.text(end.join(' · '), MARGIN.left + 3, y);
      }
      y += 5;
    }

    return y + 5;
  }

  // ---- Quebra de texto com word wrap, retorna nova posição Y ----
  function escreverTexto(doc, texto, y, opcoes = {}) {
    const {
      fontSize = 11,
      lineHeight = 5.5,
      maxWidth = CONTENT_WIDTH,
      x = MARGIN.left,
      bold = false,
      color = [15, 23, 42],
      align = 'left'
    } = opcoes;

    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);

    if (!texto) return y;

    const linhas = doc.splitTextToSize(String(texto), maxWidth);

    for (const linha of linhas) {
      // Verifica se precisa de nova página
      if (y > PAGE_HEIGHT - MARGIN.bottom - 20) {
        doc.addPage();
        y = MARGIN.top;
      }
      doc.text(linha, x, y, { align });
      y += lineHeight;
    }
    return y;
  }

  // ---- Título de seção (texto em destaque) ----
  function tituloSecao(doc, texto, y) {
    if (y > PAGE_HEIGHT - MARGIN.bottom - 30) {
      doc.addPage();
      y = MARGIN.top;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(22, 101, 52);
    doc.text(texto, MARGIN.left, y);
    y += 2;
    // Linha embaixo
    doc.setDrawColor(22, 101, 52);
    doc.setLineWidth(0.4);
    doc.line(MARGIN.left, y, MARGIN.left + 30, y);
    y += 5;
    doc.setTextColor(15, 23, 42);
    return y;
  }

  // ---- Caixa de alerta clínico (alergias, antecedentes graves) ----
  function caixaAlerta(doc, conteudo, y) {
    if (!conteudo || conteudo.trim() === '') return y;

    // Calcula linhas necessárias
    doc.setFontSize(9);
    const linhas = doc.splitTextToSize(conteudo, CONTENT_WIDTH - 10);
    const altura = linhas.length * 4.5 + 8;

    // Fundo amarelo claro
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN.left, y, CONTENT_WIDTH, altura, 1.5, 1.5, 'FD');

    // Título
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    doc.text('!  ATENÇÃO CLÍNICA', MARGIN.left + 4, y);
    y += 4;

    // Conteúdo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 53, 15);
    for (const l of linhas) {
      doc.text(l, MARGIN.left + 4, y);
      y += 4.5;
    }

    doc.setTextColor(15, 23, 42);
    return y + 4;
  }

  // ---- Bloco de assinatura ----
  function blocoAssinatura(doc, y) {
    // Se não couber, nova página
    if (y > PAGE_HEIGHT - MARGIN.bottom - 40) {
      doc.addPage();
      y = MARGIN.top + 20;
    } else {
      y = PAGE_HEIGHT - MARGIN.bottom - 32;
    }

    const xCentro = PAGE_WIDTH / 2;
    const larguraLinha = 80;

    // Linha de assinatura
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(xCentro - larguraLinha / 2, y, xCentro + larguraLinha / 2, y);
    y += 4;

    // Nome do médico embaixo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(MEDICO.nome, xCentro, y, { align: 'center' });
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`${MEDICO.titulo} · ${MEDICO.crm}`, xCentro, y, { align: 'center' });
    y += 4;

    // Data de emissão
    const dataEmissao = new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Documento emitido em ${dataEmissao}`, xCentro, y, { align: 'center' });

    return y;
  }

  // ---- Rodapé com paginação e ID do documento ----
  function rodape(doc, codigoDocumento) {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);

      // Linha superior do rodapé
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(MARGIN.left, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN.right, PAGE_HEIGHT - 12);

      // Esquerda: código do documento
      doc.text(`Doc: ${codigoDocumento}`, MARGIN.left, PAGE_HEIGHT - 8);

      // Centro: identificação do sistema
      doc.text('Gerado pelo Consultório do Vovô · Documento digital — válido com assinatura física',
        PAGE_WIDTH / 2, PAGE_HEIGHT - 8, { align: 'center' });

      // Direita: paginação
      doc.text(`Página ${i} de ${totalPages}`, PAGE_WIDTH - MARGIN.right, PAGE_HEIGHT - 8, { align: 'right' });
    }
    doc.setTextColor(15, 23, 42);
  }

  // ---- Gera código único do documento ----
  function gerarCodigoDocumento(tipo, pacienteId) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 0xfff).toString(36).toUpperCase().padStart(3, '0');
    const pid = (pacienteId || '0').toString().padStart(4, '0');
    return `${tipo}-P${pid}-${ts}${rand}`;
  }

  // ---- Helpers para abrir / baixar / imprimir ----
  function abrirEmNovaAba(doc, nomeArquivo) {
    // Garante extensão
    if (!nomeArquivo.endsWith('.pdf')) nomeArquivo += '.pdf';
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  function baixar(doc, nomeArquivo) {
    if (!nomeArquivo.endsWith('.pdf')) nomeArquivo += '.pdf';
    doc.save(nomeArquivo);
  }

  function imprimir(doc) {
    // Gera URL e abre uma janela com auto-print
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      w.addEventListener('load', () => {
        setTimeout(() => w.print(), 250);
      });
    }
  }

  // ---- Helper completo para abrir um modal de preview ----
  function previewModal(doc, nomeArquivo, tipo, paciente) {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);

    // Detecta se é prescrição para mostrar Memed (só faz sentido pra receita)
    const isPrescricao = /receit|prescri/i.test(tipo);

    // Modal
    const overlay = document.createElement('div');
    overlay.className = 'pdf-preview-overlay';
    overlay.innerHTML = `
      <div class="pdf-preview-modal">
        <div class="pdf-preview-header">
          <h3 style="margin:0">${tipo}</h3>
          <div class="flex gap-2" style="flex-wrap: wrap">
            <button class="btn btn-success text-sm" id="pdf-btn-whatsapp" title="Enviar PDF para o paciente via WhatsApp">
              <span style="color: #25D366">📱</span> WhatsApp
            </button>
            <button class="btn btn-secondary text-sm" id="pdf-btn-memed" title="Abrir Memed em nova aba para também gerar essa receita lá"
                    style="${isPrescricao ? '' : 'display: none'}">
              💊 Memed
            </button>
            <button class="btn btn-secondary text-sm" id="pdf-btn-sign" title="Assinar digitalmente com seu certificado ICP-Brasil A1">
              🔏 Assinar (ICP-Brasil)
            </button>
            <button class="btn btn-secondary text-sm" id="pdf-btn-print">🖨️ Imprimir</button>
            <button class="btn btn-primary text-sm" id="pdf-btn-download">💾 Baixar PDF</button>
            <button class="btn btn-ghost text-sm" id="pdf-btn-close">✕ Fechar</button>
          </div>
        </div>
        <iframe class="pdf-preview-iframe" src="${url}"></iframe>
        <div id="pdf-instructions" style="display: none; padding: 12px 16px; background: #FEF3C7; color: #92400E; font-size: 13px; border-top: 1px solid #F59E0B"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    let currentBlob = blob;
    let currentDoc = doc;
    let pdfWasSigned = false;

    const fechar = () => {
      URL.revokeObjectURL(url);
      overlay.remove();
    };
    overlay.querySelector('#pdf-btn-close').onclick = fechar;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fechar();
    });
    overlay.querySelector('#pdf-btn-download').onclick = () => {
      if (pdfWasSigned) {
        // PDF assinado já está em currentBlob
        const a = document.createElement('a');
        a.href = URL.createObjectURL(currentBlob);
        const fname = nomeArquivo.endsWith('.pdf') ? nomeArquivo.replace('.pdf', '_assinado.pdf') : nomeArquivo + '_assinado.pdf';
        a.download = fname;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } else {
        baixar(currentDoc, nomeArquivo);
      }
    };
    overlay.querySelector('#pdf-btn-print').onclick = () => {
      imprimir(currentDoc);
    };
    overlay.querySelector('#pdf-btn-memed').onclick = () => {
      // Abre Memed em nova aba — o médico repete a receita lá se quiser as
      // funcionalidades adicionais (comparativo de preços, etc).
      window.open('https://memed.com.br', '_blank', 'noopener,noreferrer');
      if (typeof DB !== 'undefined' && paciente && paciente.id) {
        DB.audit('OPEN_MEMED', 'documento', null, { tipo, pacienteId: paciente.id }).catch(() => {});
      }
    };
    overlay.querySelector('#pdf-btn-whatsapp').onclick = async () => {
      if (typeof ShareService === 'undefined') {
        alert('Serviço de compartilhamento indisponível');
        return;
      }
      try {
        const filename = (pdfWasSigned && !nomeArquivo.includes('assinado'))
          ? nomeArquivo.replace('.pdf', '_assinado.pdf')
          : (nomeArquivo.endsWith('.pdf') ? nomeArquivo : nomeArquivo + '.pdf');
        const result = await ShareService.compartilharPDF(
          currentBlob,
          filename,
          paciente || { nome: 'Paciente' },
          tipo + (pdfWasSigned ? ' (assinado digitalmente)' : '')
        );
        if (result.askedToDownload || result.method === 'wa.me') {
          const instr = overlay.querySelector('#pdf-instructions');
          instr.style.display = 'block';
          instr.innerHTML = `<strong>📥 PDF baixado.</strong> ${result.message}`;
          if (typeof DB !== 'undefined' && paciente && paciente.id) {
            DB.audit('SHARE_PDF', 'documento', null, {
              tipo, method: result.method, hasNumber: !!result.numero, pacienteId: paciente.id,
              signed: pdfWasSigned
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.error(e);
        if (typeof UI !== 'undefined' && UI.toast) {
          UI.toast('Erro ao compartilhar: ' + e.message, 'error');
        } else {
          alert('Erro ao compartilhar: ' + e.message);
        }
      }
    };

    // ---- Botão Assinar ----
    overlay.querySelector('#pdf-btn-sign').onclick = async () => {
      if (typeof Signer === 'undefined') {
        alert('Módulo de assinatura indisponível');
        return;
      }
      if (pdfWasSigned) {
        UI.toast('Este PDF já foi assinado nesta sessão.', 'info');
        return;
      }

      try {
        // Verifica se tem certificado cadastrado
        const cfg = await Signer.getConfiguredCertificate();
        if (!cfg) {
          UI.toast('Cadastre seu certificado ICP-Brasil em Configurações → Assinatura digital primeiro.', 'info', 7000);
          return;
        }
        if (cfg.info.expirado) {
          UI.toast('Certificado EXPIRADO. Atualize em Configurações antes de assinar.', 'error', 7000);
          return;
        }

        // Pega senha (cache ou pergunta)
        let senha = Signer.getCachedPassword();
        let lembrar = false;
        if (!senha) {
          const result = await promptSenhaCertificado(cfg.info);
          if (!result) return; // cancelado
          senha = result.senha;
          lembrar = result.lembrar;
        }

        // Assina
        const btn = overlay.querySelector('#pdf-btn-sign');
        btn.disabled = true;
        btn.innerHTML = '⏳ Assinando…';

        try {
          const signedBlob = await Signer.signPDF(currentBlob, senha, {
            lembrarSenha: lembrar,
            reason: 'Documento médico - ' + tipo,
            location: 'USF Estiva Gerbi - SP'
          });
          currentBlob = signedBlob;
          pdfWasSigned = true;

          // Atualiza o iframe
          URL.revokeObjectURL(url);
          const newUrl = URL.createObjectURL(signedBlob);
          overlay.querySelector('iframe').src = newUrl;

          // Feedback visual
          btn.innerHTML = '✓ Assinado';
          btn.style.background = '#DCFCE7';
          btn.style.color = '#14532D';
          btn.style.borderColor = '#86EFAC';

          const instr = overlay.querySelector('#pdf-instructions');
          instr.style.display = 'block';
          instr.style.background = '#DCFCE7';
          instr.style.color = '#14532D';
          instr.style.borderColor = '#86EFAC';
          instr.innerHTML = `<strong>✓ PDF assinado digitalmente com certificado ICP-Brasil A1.</strong> ` +
            `Validade verificável em Adobe Reader ou <a href="https://verificador.iti.gov.br" target="_blank" style="color: inherit">verificador.iti.gov.br</a>. ` +
            `Clique em "💾 Baixar PDF" para salvar a versão assinada.`;

          UI.toast('PDF assinado com sucesso', 'success', 5000);
        } catch (e) {
          console.error(e);
          btn.disabled = false;
          btn.innerHTML = '🔏 Assinar (ICP-Brasil)';
          UI.toast('Erro ao assinar: ' + e.message, 'error', 8000);
        }
      } catch (e) {
        console.error(e);
        UI.toast('Erro: ' + e.message, 'error');
      }
    };
  }

  // ---- Modal de senha do certificado ----
  function promptSenhaCertificado(certInfo) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'pdf-preview-overlay';
      overlay.style.zIndex = '10000';
      overlay.innerHTML = `
        <div style="background: white; border-radius: 12px; max-width: 480px; width: 90%; padding: 24px; box-shadow: 0 24px 64px rgba(0,0,0,0.3)">
          <h3 style="margin: 0 0 16px 0">🔏 Senha do certificado</h3>
          <p style="font-size: 14px; color: #475569; margin-bottom: 4px">
            Para assinar com o certificado de:
          </p>
          <p style="font-size: 14px; font-weight: 600; margin-top: 0; margin-bottom: 16px">
            ${certInfo.commonName}
          </p>
          <input type="password" id="cert-pwd-input" placeholder="Digite a senha do .pfx"
                 style="width: 100%; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 14px; box-sizing: border-box" />
          <label style="display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 13px; cursor: pointer">
            <input type="checkbox" id="cert-pwd-cache"> Lembrar nesta sessão (30 min)
          </label>
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px">
            <button id="cert-pwd-cancel" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #CBD5E1; background: white; cursor: pointer">Cancelar</button>
            <button id="cert-pwd-ok" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #166534; background: #166534; color: white; cursor: pointer; font-weight: 600">Assinar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const input = overlay.querySelector('#cert-pwd-input');
      const cache = overlay.querySelector('#cert-pwd-cache');
      input.focus();

      const close = (r) => { overlay.remove(); resolve(r); };
      overlay.querySelector('#cert-pwd-cancel').onclick = () => close(null);
      overlay.querySelector('#cert-pwd-ok').onclick = () => {
        if (!input.value) return;
        close({ senha: input.value, lembrar: cache.checked });
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (input.value) close({ senha: input.value, lembrar: cache.checked });
        }
        if (e.key === 'Escape') close(null);
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
    });
  }

  // ---- API pública ----
  return {
    MEDICO,
    MARGIN,
    PAGE_WIDTH,
    PAGE_HEIGHT,
    CONTENT_WIDTH,
    novoPDF,
    cabecalho,
    blocoPaciente,
    escreverTexto,
    tituloSecao,
    caixaAlerta,
    blocoAssinatura,
    rodape,
    gerarCodigoDocumento,
    abrirEmNovaAba,
    baixar,
    imprimir,
    previewModal
  };
})();

window.PDFBuilder = PDFBuilder;
