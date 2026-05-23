/* ============================================================
   pdf-documents.js — Geradores específicos por tipo de documento
   Sprint 3 Parte 1: receita simples, atestado, solicitação de exames
   ============================================================ */

const PDFDocuments = (() => {

  // ===========================================================
  // 1. RECEITUÁRIO SIMPLES
  // ===========================================================
  function receituarioSimples(paciente, dados) {
    const doc = PDFBuilder.novoPDF();
    let y = PDFBuilder.cabecalho(doc, 'Receituário');
    y = PDFBuilder.blocoPaciente(doc, paciente, y);

    // Caixa de alerta (alergias / antecedentes graves)
    if (dados.alertaClinico && dados.alertaClinico.trim()) {
      y = PDFBuilder.caixaAlerta(doc, dados.alertaClinico, y);
    }

    // Receita
    y = PDFBuilder.tituloSecao(doc, 'PRESCRIÇÃO', y);

    // Lista de medicações (cada uma com nome em negrito e posologia abaixo)
    for (let i = 0; i < dados.medicacoes.length; i++) {
      const m = dados.medicacoes[i];

      // Quebra de página se necessário
      if (y > PDFBuilder.PAGE_HEIGHT - PDFBuilder.MARGIN.bottom - 50) {
        doc.addPage();
        y = PDFBuilder.MARGIN.top;
      }

      // Número da medicação
      y = PDFBuilder.escreverTexto(doc, `${i + 1}. ${m.nome}`, y, {
        fontSize: 12, bold: true, lineHeight: 6
      });

      // Posologia
      if (m.posologia) {
        y = PDFBuilder.escreverTexto(doc, `   ${m.posologia}`, y, {
          fontSize: 11, lineHeight: 5.5
        });
      }

      // Quantidade
      if (m.quantidade) {
        y = PDFBuilder.escreverTexto(doc, `   Quantidade: ${m.quantidade}`, y, {
          fontSize: 10, color: [71, 85, 105], lineHeight: 5
        });
      }

      y += 3;
    }

    // Orientações ao paciente
    if (dados.orientacoes && dados.orientacoes.trim()) {
      y += 4;
      y = PDFBuilder.tituloSecao(doc, 'ORIENTAÇÕES AO PACIENTE', y);
      y = PDFBuilder.escreverTexto(doc, dados.orientacoes, y, { fontSize: 11 });
    }

    PDFBuilder.blocoAssinatura(doc, y);

    const codigo = PDFBuilder.gerarCodigoDocumento('REC', paciente.id);
    PDFBuilder.rodape(doc, codigo);

    return { doc, codigo };
  }

  // ===========================================================
  // 2. ATESTADO MÉDICO
  // ===========================================================
  function atestado(paciente, dados) {
    const doc = PDFBuilder.novoPDF();
    let y = PDFBuilder.cabecalho(doc, 'Atestado Médico');
    y = PDFBuilder.blocoPaciente(doc, paciente, y);

    y += 5;

    // Texto do atestado
    const idade = paciente.dataNascimento ? UI.calculateAge(paciente.dataNascimento) : null;
    const idadeStr = idade !== null ? `, ${idade} anos de idade` : '';

    let texto = '';

    if (dados.tipo === 'comparecimento') {
      const horario = dados.horario || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const dataConsulta = dados.dataConsulta
        ? new Date(dados.dataConsulta + 'T00:00:00').toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR');
      texto = `Atesto, para os devidos fins, que ${paciente.nome}${idadeStr}, ` +
              `compareceu a esta unidade de saúde no dia ${dataConsulta}, ` +
              `por volta das ${horario}, para consulta médica.`;
    } else {
      // afastamento
      const dias = dados.dias || 1;
      const diasTexto = dias === 1 ? '1 (um) dia' : `${dias} (${numeroPorExtenso(dias)}) dias`;
      const dataInicio = dados.dataInicio
        ? new Date(dados.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR');

      texto = `Atesto, para os devidos fins, que ${paciente.nome}${idadeStr}, ` +
              `esteve sob meus cuidados médicos no dia de hoje, necessitando de ` +
              `afastamento de suas atividades habituais pelo período de ${diasTexto}, ` +
              `a contar de ${dataInicio}.`;
    }

    y = PDFBuilder.escreverTexto(doc, texto, y, {
      fontSize: 12, lineHeight: 7
    });

    // CID (se informado e consentido)
    if (dados.incluirCID && dados.cid && dados.cid.trim()) {
      y += 4;
      const textoCID = `Conforme consentimento expresso do paciente, registra-se ` +
                       `o código CID-10: ${dados.cid.toUpperCase()}.`;
      y = PDFBuilder.escreverTexto(doc, textoCID, y, {
        fontSize: 11, color: [71, 85, 105], lineHeight: 6
      });
    }

    // Observação adicional
    if (dados.observacao && dados.observacao.trim()) {
      y += 4;
      y = PDFBuilder.escreverTexto(doc, dados.observacao, y, {
        fontSize: 11, lineHeight: 6
      });
    }

    PDFBuilder.blocoAssinatura(doc, y);

    const codigo = PDFBuilder.gerarCodigoDocumento('ATE', paciente.id);
    PDFBuilder.rodape(doc, codigo);

    return { doc, codigo };
  }

  // ===========================================================
  // 3. SOLICITAÇÃO DE EXAMES
  // ===========================================================
  function solicitacaoExames(paciente, dados) {
    const doc = PDFBuilder.novoPDF();
    let y = PDFBuilder.cabecalho(doc, 'Solicitação de Exames');
    y = PDFBuilder.blocoPaciente(doc, paciente, y);

    if (dados.alertaClinico && dados.alertaClinico.trim()) {
      y = PDFBuilder.caixaAlerta(doc, dados.alertaClinico, y);
    }

    // Hipótese diagnóstica (justificativa)
    if (dados.hipotese && dados.hipotese.trim()) {
      y = PDFBuilder.tituloSecao(doc, 'HIPÓTESE DIAGNÓSTICA / JUSTIFICATIVA', y);
      y = PDFBuilder.escreverTexto(doc, dados.hipotese, y, { fontSize: 11 });
      y += 3;
    }

    // Exames agrupados por categoria
    const categorias = [
      { key: 'sangue', titulo: 'Exames de sangue' },
      { key: 'urina', titulo: 'Exames de urina e fezes' },
      { key: 'imagem', titulo: 'Exames de imagem' },
      { key: 'outros', titulo: 'Outros exames e procedimentos' }
    ];

    for (const cat of categorias) {
      const lista = dados.exames[cat.key] || [];
      if (lista.length === 0) continue;

      y = PDFBuilder.tituloSecao(doc, cat.titulo.toUpperCase(), y);
      for (const ex of lista) {
        y = PDFBuilder.escreverTexto(doc, `• ${ex}`, y, { fontSize: 11, lineHeight: 5.5 });
      }
      y += 3;
    }

    // Orientações
    if (dados.orientacoes && dados.orientacoes.trim()) {
      y += 3;
      y = PDFBuilder.tituloSecao(doc, 'ORIENTAÇÕES', y);
      y = PDFBuilder.escreverTexto(doc, dados.orientacoes, y, { fontSize: 11 });
    }

    PDFBuilder.blocoAssinatura(doc, y);

    const codigo = PDFBuilder.gerarCodigoDocumento('EXA', paciente.id);
    PDFBuilder.rodape(doc, codigo);

    return { doc, codigo };
  }

  // ---- Helper: número por extenso (1-30 — cobre dias de atestado) ----
  function numeroPorExtenso(n) {
    const mapa = {
      1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco',
      6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez',
      11: 'onze', 12: 'doze', 13: 'treze', 14: 'quatorze', 15: 'quinze',
      16: 'dezesseis', 17: 'dezessete', 18: 'dezoito', 19: 'dezenove', 20: 'vinte',
      21: 'vinte e um', 25: 'vinte e cinco', 30: 'trinta'
    };
    return mapa[n] || String(n);
  }

  return {
    receituarioSimples,
    atestado,
    solicitacaoExames
  };
})();

window.PDFDocuments = PDFDocuments;
