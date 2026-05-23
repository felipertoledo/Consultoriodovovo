/* ============================================================
   pdf-documents-extra.js — Documentos da Sprint 3 Parte 2
   - Receituário de controle especial (branco em 2 vias)
   - Receituário azul B1/B2 (psicotrópicos)
   - Relatório clínico para outros profissionais
   - Cópia integral do prontuário (LGPD art. 18, IV)
   ============================================================ */

const PDFDocumentsExtra = (() => {

  // ===========================================================
  // 1. RECEITUÁRIO DE CONTROLE ESPECIAL (branco em 2 vias)
  // Antimicrobianos, retinoides, anticonvulsivantes selecionados,
  // anorexígenos, e outros listados na Portaria 344/98 lista C1
  // ===========================================================
  function receituarioControleEspecial(paciente, dados) {
    const doc = PDFBuilder.novoPDF();

    // Renderiza 2 vias na mesma página (corta no meio)
    renderizarViaControleEspecial(doc, paciente, dados, 'VIA DO PACIENTE', 0);

    // Linha tracejada no meio
    const meio = PDFBuilder.PAGE_HEIGHT / 2;
    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([2, 2], 0);
    doc.setLineWidth(0.3);
    doc.line(PDFBuilder.MARGIN.left, meio, PDFBuilder.PAGE_WIDTH - PDFBuilder.MARGIN.right, meio);
    doc.setLineDashPattern([], 0);

    // Texto "RECORTE AQUI" centralizado na linha
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('— — —  R E C O R T E   A Q U I  — — —',
      PDFBuilder.PAGE_WIDTH / 2, meio - 1, { align: 'center' });

    renderizarViaControleEspecial(doc, paciente, dados, 'VIA DA FARMÁCIA', meio);

    const codigo = PDFBuilder.gerarCodigoDocumento('CTR', paciente.id);
    PDFBuilder.rodape(doc, codigo);

    return { doc, codigo };
  }

  function renderizarViaControleEspecial(doc, paciente, dados, tituloVia, offsetY) {
    // Versão compacta do cabeçalho (cabe em meia página)
    const margemTop = offsetY + 8;
    const margemLeft = PDFBuilder.MARGIN.left;
    const pageWidth = PDFBuilder.PAGE_WIDTH;
    const contentWidth = PDFBuilder.CONTENT_WIDTH;

    let y = margemTop;

    // Cabeçalho compacto
    doc.setFillColor(22, 101, 52);
    doc.roundedRect(margemLeft, y, 10, 10, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CV', margemLeft + 5, y + 6.5, { align: 'center' });

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(PDFBuilder.MEDICO.nome, margemLeft + 13, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`${PDFBuilder.MEDICO.titulo} · ${PDFBuilder.MEDICO.crm} · ${PDFBuilder.MEDICO.unidade}`,
      margemLeft + 13, y + 8);

    // Título da via (canto direito)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52);
    doc.text(tituloVia, pageWidth - PDFBuilder.MARGIN.right, y + 4, { align: 'right' });
    const dataEmissao = new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Emitido ${dataEmissao}`, pageWidth - PDFBuilder.MARGIN.right, y + 8, { align: 'right' });

    y += 13;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margemLeft, y, pageWidth - PDFBuilder.MARGIN.right, y);
    y += 4;

    // Título
    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('RECEITUÁRIO DE CONTROLE ESPECIAL', pageWidth / 2, y + 2, { align: 'center' });
    y += 7;

    // Identificação paciente compacta
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margemLeft, y, contentWidth, 13, 1.5, 1.5, 'FD');

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('PACIENTE', margemLeft + 2, y + 3.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const idade = paciente.dataNascimento ? UI.calculateAge(paciente.dataNascimento) : null;
    let linha1 = paciente.nome || '(sem nome)';
    if (idade !== null) linha1 += `, ${idade} anos`;
    doc.text(linha1, margemLeft + 2, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const docs = [];
    if (paciente.cpf) docs.push(`CPF ${paciente.cpf}`);
    if (paciente.rg) docs.push(`RG ${paciente.rg}`);
    if (paciente.cns) docs.push(`CNS ${paciente.cns}`);
    if (docs.length > 0) doc.text(docs.join(' · '), margemLeft + 2, y + 10.5);
    y += 16;

    // Endereço (obrigatório no controle especial)
    const endereco = [];
    if (paciente.logradouro) endereco.push(paciente.logradouro + (paciente.numero ? ', ' + paciente.numero : ''));
    if (paciente.bairro) endereco.push(paciente.bairro);
    if (paciente.cidade) endereco.push(paciente.cidade + (paciente.uf ? '/' + paciente.uf : ''));

    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Endereço do paciente:', margemLeft, y);
    doc.setFont('helvetica', 'normal');
    doc.text(endereco.length > 0 ? endereco.join(', ') : '_____________________________________________',
      margemLeft + 36, y);
    y += 6;

    // Prescrição
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52);
    doc.text('PRESCRIÇÃO', margemLeft, y);
    doc.setDrawColor(22, 101, 52);
    doc.setLineWidth(0.3);
    doc.line(margemLeft, y + 1, margemLeft + 22, y + 1);
    y += 5;

    doc.setTextColor(15, 23, 42);
    for (let i = 0; i < dados.medicacoes.length; i++) {
      const m = dados.medicacoes[i];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${i + 1}. ${m.nome}`, margemLeft, y);
      y += 4.5;
      if (m.posologia) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`   ${m.posologia}`, margemLeft, y);
        y += 4;
      }
      if (m.quantidade) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`   Quantidade: ${m.quantidade}`, margemLeft, y);
        y += 4;
      }
      doc.setTextColor(15, 23, 42);
      y += 1;
    }

    // Bloco final: identificação do comprador (esquerda) e assinatura (direita)
    // Posiciona próximo à linha de recorte mas com espaçamento mínimo
    const fimVia = offsetY + PDFBuilder.PAGE_HEIGHT / 2 - 4;

    // Campo de identificação do comprador (no canto inferior esquerdo da via)
    const yComprador = fimVia - 22;
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Identificação do comprador (preenchido pela farmácia):', margemLeft, yComprador);
    doc.text('Nome: _________________________________________________',
      margemLeft, yComprador + 4);
    doc.text('RG: _______________  Data: ____/____/______',
      margemLeft, yComprador + 8);

    // Assinatura: centralizada, com linha curta e nome abaixo
    const yAssinatura = fimVia - 22;
    const xCentro = pageWidth - PDFBuilder.MARGIN.right - 35;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(xCentro - 30, yAssinatura, xCentro + 30, yAssinatura);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(PDFBuilder.MEDICO.nome, xCentro, yAssinatura + 3.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`${PDFBuilder.MEDICO.titulo} · ${PDFBuilder.MEDICO.crm}`,
      xCentro, yAssinatura + 7, { align: 'center' });
  }

  // ===========================================================
  // 2. RECEITUÁRIO AZUL B1/B2 (psicotrópicos)
  // Benzodiazepínicos, hipnóticos, outros lista B
  // Cor azul claro de fundo para diferenciação visual
  // ===========================================================
  function receituarioAzul(paciente, dados) {
    const doc = PDFBuilder.novoPDF();

    // Fundo azul claro em toda a página (#EFF6FF — blue-50)
    doc.setFillColor(239, 246, 255);
    doc.rect(0, 0, PDFBuilder.PAGE_WIDTH, PDFBuilder.PAGE_HEIGHT, 'F');

    let y = PDFBuilder.cabecalho(doc, 'Receituário Azul — Notificação B');
    y = PDFBuilder.blocoPaciente(doc, paciente, y, { incluirEndereco: true });

    // Aviso destacado
    doc.setFillColor(219, 234, 254);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.roundedRect(PDFBuilder.MARGIN.left, y, PDFBuilder.CONTENT_WIDTH, 14, 1.5, 1.5, 'FD');
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 64, 175);
    doc.text('NOTIFICAÇÃO DE RECEITA — Lista B', PDFBuilder.MARGIN.left + 4, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    doc.text('Substância sob controle especial — Portaria SVS/MS nº 344/98',
      PDFBuilder.MARGIN.left + 4, y);
    y += 9;

    if (dados.alertaClinico && dados.alertaClinico.trim()) {
      y = PDFBuilder.caixaAlerta(doc, dados.alertaClinico, y);
    }

    y = PDFBuilder.tituloSecao(doc, 'PRESCRIÇÃO', y);

    // Lista de medicações
    for (let i = 0; i < dados.medicacoes.length; i++) {
      const m = dados.medicacoes[i];
      if (y > PDFBuilder.PAGE_HEIGHT - PDFBuilder.MARGIN.bottom - 60) {
        doc.addPage();
        // Re-aplica fundo azul na nova página
        doc.setFillColor(239, 246, 255);
        doc.rect(0, 0, PDFBuilder.PAGE_WIDTH, PDFBuilder.PAGE_HEIGHT, 'F');
        y = PDFBuilder.MARGIN.top;
      }

      y = PDFBuilder.escreverTexto(doc, `${i + 1}. ${m.nome}`, y, {
        fontSize: 12, bold: true, lineHeight: 6
      });
      if (m.posologia) {
        y = PDFBuilder.escreverTexto(doc, `   ${m.posologia}`, y, {
          fontSize: 11, lineHeight: 5.5
        });
      }
      if (m.quantidade) {
        y = PDFBuilder.escreverTexto(doc, `   Quantidade: ${m.quantidade}`, y, {
          fontSize: 10, color: [71, 85, 105], lineHeight: 5
        });
      }
      y += 3;
    }

    // Orientações
    if (dados.orientacoes && dados.orientacoes.trim()) {
      y += 4;
      y = PDFBuilder.tituloSecao(doc, 'ORIENTAÇÕES AO PACIENTE', y);
      y = PDFBuilder.escreverTexto(doc, dados.orientacoes, y, { fontSize: 11 });
    }

    // Campo identificação do comprador (azul exige)
    y += 6;
    if (y > PDFBuilder.PAGE_HEIGHT - PDFBuilder.MARGIN.bottom - 60) {
      doc.addPage();
      doc.setFillColor(239, 246, 255);
      doc.rect(0, 0, PDFBuilder.PAGE_WIDTH, PDFBuilder.PAGE_HEIGHT, 'F');
      y = PDFBuilder.MARGIN.top;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Identificação do comprador (preenchido na farmácia):', PDFBuilder.MARGIN.left, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nome completo: _____________________________________________', PDFBuilder.MARGIN.left, y);
    y += 6;
    doc.text('RG: _________________  Endereço: _________________________________', PDFBuilder.MARGIN.left, y);
    y += 6;
    doc.text('Data: ____/____/______  Assinatura: _____________________________', PDFBuilder.MARGIN.left, y);

    PDFBuilder.blocoAssinatura(doc, y);

    const codigo = PDFBuilder.gerarCodigoDocumento('AZU', paciente.id);
    PDFBuilder.rodape(doc, codigo);

    return { doc, codigo };
  }

  // ===========================================================
  // 3. RELATÓRIO CLÍNICO (para outros profissionais)
  // Estrutura SOAP enxuta, ideal para referência/parecer
  // ===========================================================
  function relatorioClinico(paciente, dados) {
    const doc = PDFBuilder.novoPDF();
    let y = PDFBuilder.cabecalho(doc, 'Relatório Clínico');
    y = PDFBuilder.blocoPaciente(doc, paciente, y, { incluirContato: true });

    // Destinatário
    if (dados.destinatario && dados.destinatario.trim()) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Para:', PDFBuilder.MARGIN.left, y);
      doc.setFont('helvetica', 'normal');
      doc.text(dados.destinatario, PDFBuilder.MARGIN.left + 12, y);
      y += 7;
    }

    if (dados.alertaClinico && dados.alertaClinico.trim()) {
      y = PDFBuilder.caixaAlerta(doc, dados.alertaClinico, y);
    }

    // Antecedentes
    if (dados.antecedentes && dados.antecedentes.trim()) {
      y = PDFBuilder.tituloSecao(doc, 'ANTECEDENTES RELEVANTES', y);
      y = PDFBuilder.escreverTexto(doc, dados.antecedentes, y, { fontSize: 11 });
      y += 3;
    }

    // Medicações em uso
    if (dados.medicacoesUso && dados.medicacoesUso.trim()) {
      y = PDFBuilder.tituloSecao(doc, 'MEDICAÇÕES EM USO', y);
      y = PDFBuilder.escreverTexto(doc, dados.medicacoesUso, y, { fontSize: 11 });
      y += 3;
    }

    // Quadro atual
    if (dados.quadroAtual && dados.quadroAtual.trim()) {
      y = PDFBuilder.tituloSecao(doc, 'QUADRO CLÍNICO ATUAL', y);
      y = PDFBuilder.escreverTexto(doc, dados.quadroAtual, y, { fontSize: 11 });
      y += 3;
    }

    // Achados do exame
    if (dados.exame && dados.exame.trim()) {
      y = PDFBuilder.tituloSecao(doc, 'EXAME', y);
      y = PDFBuilder.escreverTexto(doc, dados.exame, y, { fontSize: 11 });
      y += 3;
    }

    // Hipóteses
    if (dados.hipoteses && dados.hipoteses.trim()) {
      y = PDFBuilder.tituloSecao(doc, 'HIPÓTESES DIAGNÓSTICAS', y);
      y = PDFBuilder.escreverTexto(doc, dados.hipoteses, y, { fontSize: 11 });
      y += 3;
    }

    // Conduta até agora
    if (dados.conduta && dados.conduta.trim()) {
      y = PDFBuilder.tituloSecao(doc, 'CONDUTA REALIZADA / EM CURSO', y);
      y = PDFBuilder.escreverTexto(doc, dados.conduta, y, { fontSize: 11 });
      y += 3;
    }

    // Solicitação / motivo do encaminhamento
    if (dados.solicitacao && dados.solicitacao.trim()) {
      y = PDFBuilder.tituloSecao(doc, 'SOLICITAÇÃO / MOTIVO DO ENCAMINHAMENTO', y);
      y = PDFBuilder.escreverTexto(doc, dados.solicitacao, y, { fontSize: 11 });
      y += 3;
    }

    PDFBuilder.blocoAssinatura(doc, y);

    const codigo = PDFBuilder.gerarCodigoDocumento('REL', paciente.id);
    PDFBuilder.rodape(doc, codigo);

    return { doc, codigo };
  }

  // ===========================================================
  // 4. CÓPIA INTEGRAL DO PRONTUÁRIO (LGPD art. 18, IV)
  // Direito do paciente de acessar seus próprios dados clínicos
  // ===========================================================
  function copiaProntuario(paciente, consultas) {
    const doc = PDFBuilder.novoPDF();
    let y = PDFBuilder.cabecalho(doc, 'Cópia Integral do Prontuário');
    y = PDFBuilder.blocoPaciente(doc, paciente, y, {
      incluirContato: true, incluirEndereco: true
    });

    // Aviso LGPD
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.4);
    doc.roundedRect(PDFBuilder.MARGIN.left, y, PDFBuilder.CONTENT_WIDTH, 16, 1.5, 1.5, 'FD');
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 64, 175);
    doc.text('DIREITO DE ACESSO — LGPD Art. 18, II e IV', PDFBuilder.MARGIN.left + 4, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    const aviso = 'Este documento é cópia fiel dos registros clínicos do paciente, emitida ' +
                  'em atendimento ao direito previsto na Lei Geral de Proteção de Dados.';
    const linhasAviso = doc.splitTextToSize(aviso, PDFBuilder.CONTENT_WIDTH - 10);
    for (const l of linhasAviso) {
      doc.text(l, PDFBuilder.MARGIN.left + 4, y);
      y += 3.5;
    }
    y += 4;

    doc.setTextColor(15, 23, 42);

    // Resumo do prontuário
    y = PDFBuilder.tituloSecao(doc, 'RESUMO DO PRONTUÁRIO', y);
    const dataAbertura = paciente.createdAt ?
      new Date(paciente.createdAt).toLocaleDateString('pt-BR') : '—';
    const totalConsultas = (consultas || []).length;
    y = PDFBuilder.escreverTexto(doc,
      `Paciente cadastrado em: ${dataAbertura}`, y, { fontSize: 11 });
    y = PDFBuilder.escreverTexto(doc,
      `Total de consultas registradas: ${totalConsultas}`, y, { fontSize: 11 });

    if (paciente.observacoes && paciente.observacoes.trim()) {
      y += 3;
      y = PDFBuilder.escreverTexto(doc,
        `Observações gerais: ${paciente.observacoes}`, y, { fontSize: 10, color: [71, 85, 105] });
    }
    y += 5;

    // Consultas em ordem cronológica reversa (já vem assim)
    if (totalConsultas === 0) {
      y = PDFBuilder.escreverTexto(doc,
        '(Nenhuma consulta clínica registrada até a data de emissão deste documento.)',
        y, { fontSize: 10, color: [148, 163, 184] });
    } else {
      for (const c of consultas) {
        y = renderizarConsultaNaCopiaProntuario(doc, c, y);
      }
    }

    // Bloco final de declaração
    y += 6;
    if (y > PDFBuilder.PAGE_HEIGHT - PDFBuilder.MARGIN.bottom - 50) {
      doc.addPage();
      y = PDFBuilder.MARGIN.top;
    }
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const dataEmissao = new Date().toLocaleDateString('pt-BR');
    const declaracao = `Atesto que este documento, emitido em ${dataEmissao}, contém todas as ` +
                       `informações clínicas registradas até a data, conforme a Lei 13.787/2018 ` +
                       `(prontuário eletrônico) e a LGPD (Lei 13.709/2018).`;
    y = PDFBuilder.escreverTexto(doc, declaracao, y, {
      fontSize: 9, color: [71, 85, 105], lineHeight: 5
    });

    PDFBuilder.blocoAssinatura(doc, y);

    const codigo = PDFBuilder.gerarCodigoDocumento('CPP', paciente.id);
    PDFBuilder.rodape(doc, codigo);

    return { doc, codigo };
  }

  function renderizarConsultaNaCopiaProntuario(doc, c, y) {
    // Verifica espaço — uma consulta ocupa ~80mm mínimo, força nova página se não couber
    if (y > PDFBuilder.PAGE_HEIGHT - PDFBuilder.MARGIN.bottom - 80) {
      doc.addPage();
      y = PDFBuilder.MARGIN.top;
    }

    const dataConsulta = c.dataHora ?
      new Date(c.dataHora).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }) : '—';

    // Cabeçalho da consulta (faixa verde)
    doc.setFillColor(240, 253, 244);  // verde-50
    doc.setDrawColor(22, 101, 52);
    doc.setLineWidth(0.4);
    doc.roundedRect(PDFBuilder.MARGIN.left, y, PDFBuilder.CONTENT_WIDTH, 7, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text(`Consulta — ${dataConsulta}`, PDFBuilder.MARGIN.left + 3, y + 5);
    y += 10;

    doc.setTextColor(15, 23, 42);

    // Helpers para escrever campo "label: valor"
    const escreverCampo = (label, valor) => {
      if (!valor || (Array.isArray(valor) && valor.length === 0) ||
          (typeof valor === 'string' && !valor.trim())) return;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(label + ':', PDFBuilder.MARGIN.left, y);
      doc.setFont('helvetica', 'normal');
      const conteudo = Array.isArray(valor) ? valor.join('; ') : valor;
      const linhas = doc.splitTextToSize(conteudo, PDFBuilder.CONTENT_WIDTH - 4);
      let yLocal = y + 4;
      for (const linha of linhas) {
        if (yLocal > PDFBuilder.PAGE_HEIGHT - PDFBuilder.MARGIN.bottom - 15) {
          doc.addPage();
          yLocal = PDFBuilder.MARGIN.top;
        }
        doc.text(linha, PDFBuilder.MARGIN.left + 2, yLocal);
        yLocal += 5;
      }
      y = yLocal + 1;
    };

    if (c.queixaPrincipal) {
      escreverCampo('Queixa principal',
        c.queixaPrincipal + (c.queixaDuracao ? ` (${c.queixaDuracao})` : ''));
    }
    if (c.hpma) escreverCampo('HPMA', c.hpma);
    if (c.medicacoesUso && c.medicacoesUso.length > 0) escreverCampo('Medicações em uso', c.medicacoesUso);
    if (c.antecedentes && c.antecedentes.length > 0) escreverCampo('Antecedentes', c.antecedentes);
    if (c.antecedentesTexto) escreverCampo('Antecedentes (texto)', c.antecedentesTexto);
    if (c.cirurgias && c.cirurgias.length > 0) escreverCampo('Cirurgias prévias', c.cirurgias);
    if (c.familiares && c.familiares.length > 0) escreverCampo('Antecedentes familiares', c.familiares);
    if (c.familiaresTexto) escreverCampo('Detalhamento familiar', c.familiaresTexto);

    // Hábitos
    const habitos = [];
    if (c.tabagismo) habitos.push(`tabagismo: ${c.tabagismo}` + (c.macosAno ? ` (${c.macosAno} maços-ano)` : ''));
    if (c.alcool) habitos.push(`álcool: ${c.alcool}`);
    if (c.atividadeFisica) habitos.push(`atividade física: ${c.atividadeFisica}`);
    if (c.sono) habitos.push(`sono: ${c.sono}`);
    if (habitos.length > 0) escreverCampo('Hábitos', habitos.join('; '));

    // Exame físico
    const exFis = [];
    if (c.pa) exFis.push(`PA ${c.pa}`);
    if (c.fc) exFis.push(`FC ${c.fc} bpm`);
    if (c.fr) exFis.push(`FR ${c.fr} irpm`);
    if (c.tax) exFis.push(`Tax ${c.tax}°C`);
    if (c.satO2) exFis.push(`SatO2 ${c.satO2}%`);
    if (c.glicemiaCapilar) exFis.push(`glicemia capilar ${c.glicemiaCapilar} mg/dL`);
    if (c.peso) exFis.push(`peso ${c.peso} kg`);
    if (c.altura) exFis.push(`altura ${c.altura} m`);
    if (c.imc) exFis.push(`IMC ${c.imc}`);
    if (exFis.length > 0 || c.exameFisicoDescricao) {
      let str = exFis.join(', ');
      if (c.exameFisicoDescricao) str += (str ? '. ' : '') + c.exameFisicoDescricao;
      escreverCampo('Exame físico', str);
    }

    if (c.examePsiquicoProsa) escreverCampo('Exame psíquico', c.examePsiquicoProsa);
    if (c.hipoteses && c.hipoteses.length > 0) escreverCampo('Hipóteses diagnósticas', c.hipoteses);
    if (c.conduta) escreverCampo('Conduta', c.conduta);
    if (c.retorno) escreverCampo('Retorno', c.retorno);
    if (c.sinaisAlerta) escreverCampo('Sinais de alerta orientados', c.sinaisAlerta);

    y += 4;
    return y;
  }

  return {
    receituarioControleEspecial,
    receituarioAzul,
    relatorioClinico,
    copiaProntuario
  };
})();

window.PDFDocumentsExtra = PDFDocumentsExtra;
