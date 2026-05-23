/* ============================================================
   prosa-generator.js — Converte seleções estruturadas em prosa
   ============================================================ */

const ProsaGenerator = (() => {

  // Prefixos por domínio. Quando há seleções, a prosa fica "prefixo: lista de seleções".
  // Domínios cujas opções já são descritivas por si só (ex: "Vigil", "Orientado") usam prefixo vazio.
  const PREFIXOS_DOMINIO = {
    // Exame completo (18 domínios Dalgalarrondo)
    apresentacao: 'apresenta-se com',
    consciencia: '',
    atencao: 'atenção',
    orientacao: '',
    memoria: 'memória',
    sensopercepcao: 'sensopercepção',
    pensamento_forma: 'pensamento de forma',
    pensamento_curso: 'curso do pensamento',
    pensamento_conteudo: 'conteúdo do pensamento:',
    linguagem: 'linguagem',
    vontade: 'pragmatismo',
    psicomotricidade: 'psicomotricidade',
    inteligencia: 'inteligência',
    insight: 'insight e crítica',
    juizo: 'juízo de realidade',
    comportamento: 'comportamento',
    // Versão breve (10 domínios consolidados)
    consciencia_orientacao: '',
    afeto_humor: 'afeto e humor',
    pensamento: 'pensamento'
  };

  // ---- Concatena lista com vírgulas e "e" final ----
  function concatList(items) {
    if (!items || items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items[0] + ' e ' + items[1];
    return items.slice(0, -1).join(', ') + ' e ' + items[items.length - 1];
  }

  // ---- Detecta se a opção já contém o nome do domínio (evita redundância) ----
  function opcaoJaContemDominio(opcao, prefixo) {
    if (!prefixo) return false;
    const opLower = opcao.toLowerCase();
    // Pega a primeira palavra significativa do prefixo
    const palavraChave = prefixo.toLowerCase().split(/\s|:/)[0];
    return opLower.startsWith(palavraChave) || opLower.includes(' ' + palavraChave);
  }

  // ---- Gera prosa de um domínio do exame psíquico ----
  function gerarProsaDominio(dominio, selecoes) {
    if (!selecoes || selecoes.length === 0) {
      return dominio.sumarioDefault;
    }

    // Severity (afeto/humor no exame completo): primeiro = estado, resto = modificadores
    if (dominio.tipo === 'severity') {
      const estado = selecoes[0];
      const modificadores = selecoes.slice(1);
      const nomeDominio = dominio.id === 'afeto' ? 'afeto' :
                         dominio.id === 'humor' ? 'humor' : dominio.nome.toLowerCase();
      if (modificadores.length > 0) {
        return `${nomeDominio} ${estado.toLowerCase()}, ${concatList(modificadores.map(m => m.toLowerCase()))}`;
      }
      return `${nomeDominio} ${estado.toLowerCase()}`;
    }

    // Single/multi: usa prefixo do domínio + lista de seleções
    const prefixo = PREFIXOS_DOMINIO[dominio.id] !== undefined
      ? PREFIXOS_DOMINIO[dominio.id]
      : dominio.nome.toLowerCase();

    // Se a opção única já contém o nome do domínio, evita repetição
    if (selecoes.length === 1 && prefixo && opcaoJaContemDominio(selecoes[0], prefixo)) {
      return selecoes[0].toLowerCase();
    }

    const listaConcat = concatList(selecoes.map(s => s.toLowerCase()));

    if (!prefixo) {
      return listaConcat;
    }

    // Se prefixo termina com ":" usa ele direto; senão adiciona espaço
    const conector = prefixo.endsWith(':') ? ' ' : ' ';
    return prefixo + conector + listaConcat;
  }

  // ---- Gera prosa do exame psíquico inteiro ----
  function gerarProsaExamePsiquico(dominios, selecoesPorDominio, observacoesPorDominio) {
    const frases = [];

    for (const dom of dominios) {
      const sels = selecoesPorDominio[dom.id] || [];
      const obs = (observacoesPorDominio || {})[dom.id] || '';

      let frase = gerarProsaDominio(dom, sels);
      if (obs.trim()) {
        frase += ' (' + obs.trim() + ')';
      }
      frases.push(frase);
    }

    // Capitaliza a primeira letra de cada frase e adiciona ponto final
    return frases.map(f => {
      const t = f.trim();
      if (!t) return '';
      const capitalized = t.charAt(0).toUpperCase() + t.slice(1);
      return capitalized.endsWith('.') ? capitalized : capitalized + '.';
    }).filter(Boolean).join(' ');
  }

  // ---- Gera prosa completa da consulta ----
  function gerarProsaConsulta(consulta) {
    const partes = [];

    if (consulta.queixaPrincipal) {
      const dur = consulta.queixaDuracao ? ` (${consulta.queixaDuracao})` : '';
      partes.push(`**Queixa principal:** ${consulta.queixaPrincipal}${dur}.`);
    }

    if (consulta.hpma) {
      partes.push(`**História da Doença Atual:** ${consulta.hpma}`);
    }

    if (consulta.medicacoesUso && consulta.medicacoesUso.length > 0) {
      partes.push(`**Medicação em uso:** ${consulta.medicacoesUso.join('; ')}.`);
    }

    if (consulta.antecedentes && consulta.antecedentes.length > 0) {
      partes.push(`**Antecedentes pessoais:** ${concatList(consulta.antecedentes)}.`);
    }

    if (consulta.cirurgias && consulta.cirurgias.length > 0) {
      partes.push(`**Cirurgias prévias:** ${concatList(consulta.cirurgias)}.`);
    }

    if (consulta.familiares && consulta.familiares.length > 0) {
      partes.push(`**Antecedentes familiares:** ${concatList(consulta.familiares)}.`);
    } else if (consulta.familiaresTexto) {
      partes.push(`**Antecedentes familiares:** ${consulta.familiaresTexto}`);
    }

    // Hábitos
    const habitos = [];
    if (consulta.tabagismo) habitos.push(`tabagismo: ${consulta.tabagismo}` + (consulta.macosAno ? ` (${consulta.macosAno} maços-ano)` : ''));
    if (consulta.alcool) habitos.push(`álcool: ${consulta.alcool}`);
    if (consulta.atividadeFisica) habitos.push(`atividade física: ${consulta.atividadeFisica}`);
    if (consulta.sono) habitos.push(`sono: ${consulta.sono}`);
    if (habitos.length > 0) {
      partes.push(`**Hábitos:** ${habitos.join('; ')}.`);
    }

    // Exame físico
    const exameFis = [];
    if (consulta.pa) exameFis.push(`PA ${consulta.pa}`);
    if (consulta.fc) exameFis.push(`FC ${consulta.fc} bpm`);
    if (consulta.fr) exameFis.push(`FR ${consulta.fr} irpm`);
    if (consulta.tax) exameFis.push(`Tax ${consulta.tax}°C`);
    if (consulta.peso) exameFis.push(`peso ${consulta.peso} kg`);
    if (consulta.altura) exameFis.push(`altura ${consulta.altura} m`);
    if (consulta.imc) exameFis.push(`IMC ${consulta.imc}`);
    if (consulta.satO2) exameFis.push(`SatO2 ${consulta.satO2}%`);
    if (consulta.glicemiaCapilar) exameFis.push(`glicemia capilar ${consulta.glicemiaCapilar} mg/dL`);

    let exameFisStr = '';
    if (exameFis.length > 0) exameFisStr = exameFis.join(', ') + '. ';
    if (consulta.exameFisicoDescricao) exameFisStr += consulta.exameFisicoDescricao;
    if (exameFisStr) partes.push(`**Exame físico:** ${exameFisStr.trim()}`);

    // Exame psíquico
    if (consulta.examePsiquicoProsa) {
      partes.push(`**Exame psíquico:** ${consulta.examePsiquicoProsa}`);
    }

    // Hipóteses
    if (consulta.hipoteses && consulta.hipoteses.length > 0) {
      partes.push(`**Hipóteses diagnósticas:** ${consulta.hipoteses.join('; ')}.`);
    }

    // Conduta
    if (consulta.conduta) {
      partes.push(`**Conduta e plano terapêutico:** ${consulta.conduta}`);
    }

    // Retorno
    if (consulta.retorno) {
      partes.push(`**Retorno:** ${consulta.retorno}`);
    }

    if (consulta.sinaisAlerta) {
      partes.push(`**Sinais de alerta orientados:** ${consulta.sinaisAlerta}`);
    }

    return partes.join('\n\n');
  }

  // ---- Versão sem identificadores (para teleorientação) ----
  // Inclui contexto clínico relevante: profissão, escolaridade, convênio
  // e medicações de uso contínuo (puxadas automaticamente da última consulta)
  function gerarProsaSemIdentificadores(consulta, paciente, ultimaConsulta) {
    const idade = paciente.dataNascimento ?
      UI.calculateAge(paciente.dataNascimento) : null;

    let header = `CONSULTA — ${new Date(consulta.dataHora || consulta.createdAt || Date.now()).toLocaleDateString('pt-BR')}\n`;
    header += `Paciente: ${paciente.sexo || 'sem registro de sexo'}`;
    if (idade !== null) header += `, ${idade} anos`;

    // Contexto sociodemográfico (sem identificar a pessoa)
    const contextoSocial = [];
    if (paciente.profissao) contextoSocial.push(`profissão/ocupação: ${paciente.profissao}`);
    if (paciente.escolaridade) contextoSocial.push(`escolaridade: ${paciente.escolaridade}`);
    if (paciente.convenio) contextoSocial.push(`cobertura: ${paciente.convenio}`);
    if (contextoSocial.length > 0) {
      header += `. ${contextoSocial.join('; ')}`;
    }
    header += '.\n';

    // Medicações de uso contínuo (da última consulta do paciente)
    if (ultimaConsulta && ultimaConsulta.medicacoesUso && ultimaConsulta.medicacoesUso.length > 0) {
      header += `Medicações em uso contínuo: ${ultimaConsulta.medicacoesUso.join('; ')}.\n`;
    }

    header += '_(Identificação completa omitida — uso para discussão clínica)_\n\n';

    return header + gerarProsaConsulta(consulta);
  }

  return {
    gerarProsaDominio,
    gerarProsaExamePsiquico,
    gerarProsaConsulta,
    gerarProsaSemIdentificadores,
    concatList
  };
})();

window.ProsaGenerator = ProsaGenerator;
