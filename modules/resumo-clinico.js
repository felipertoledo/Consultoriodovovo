/* ================================================================
   resumo-clinico.js — Resumo clínico do paciente (face sheet)
   ----------------------------------------------------------------
   Deriva, a partir das consultas (mais recente primeiro), o que o
   médico precisa ver de relance: alergias, problemas ativos,
   medicações em uso, hábitos e últimos sinais vitais com tendência.
   Funções puras, sem DOM — testáveis em Node.
   ================================================================ */
(function () {
  'use strict';

  const VITAIS = ['pa', 'fc', 'fr', 'tax', 'satO2', 'glicemiaCapilar', 'peso', 'altura', 'imc'];
  const ROTULO_VITAL = { pa: 'PA', fc: 'FC', fr: 'FR', tax: 'Tax', satO2: 'SatO₂', glicemiaCapilar: 'Glicemia', peso: 'Peso', altura: 'Altura', imc: 'IMC' };
  // Campos que pertencem ao paciente (não à consulta) — espelha consulta-form.camposHerdaveis
  const PERSISTENTES = ['antecedentes', 'antecedentesTexto', 'cirurgias', 'familiares', 'familiaresTexto',
    'tabagismo', 'macosAno', 'alcool', 'atividadeFisica', 'sono', 'medicacoesUso', 'alergias'];

  function temVitais(c) {
    return !!c && VITAIS.some(k => String(c[k] == null ? '' : c[k]).trim() !== '');
  }
  function num(v) {
    if (v == null) return null;
    const m = String(v).replace(',', '.').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }
  function sistolica(pa) {
    const m = String(pa == null ? '' : pa).match(/(\d{2,3})/);
    return m ? parseInt(m[1], 10) : null;
  }
  /** Tendência do valor atual vs anterior: 'up' | 'down' | 'flat' | null (sem base de comparação). */
  function tendencia(campo, atual, anterior) {
    const a = campo === 'pa' ? sistolica(atual) : num(atual);
    const b = campo === 'pa' ? sistolica(anterior) : num(anterior);
    if (a == null || b == null) return null;
    return a > b ? 'up' : (a < b ? 'down' : 'flat');
  }

  /**
   * @param {Array} consultas — consultas do paciente, mais recente primeiro
   * @returns {Object} resumo
   */
  function derivar(consultas) {
    const lista = (Array.isArray(consultas) ? consultas : []).filter(Boolean);
    const ultima = lista[0] || null;
    const src = ultima || {};

    // Vitais: última consulta que TEM vitais (pode não ser a última consulta) + a anterior a ela, p/ tendência
    const comVitais = lista.filter(temVitais);
    const v1 = comVitais[0] || null;
    const v2 = comVitais[1] || null;
    let vitais = null;
    if (v1) {
      vitais = { data: v1.dataHora || '', anteriorData: v2 ? (v2.dataHora || '') : '', itens: [] };
      for (const k of VITAIS) {
        const atual = v1[k] == null ? '' : String(v1[k]).trim();
        if (!atual) continue;
        const ant = v2 && v2[k] != null ? String(v2[k]).trim() : '';
        vitais.itens.push({ campo: k, rotulo: ROTULO_VITAL[k], valor: atual, anterior: ant, tendencia: ant ? tendencia(k, atual, ant) : null });
      }
    }

    const chips = Array.isArray(src.antecedentes) ? src.antecedentes : [];
    const alergias = String(src.alergias || '').trim();
    const alergiaChip = chips.some(x => /alergia/i.test(String(x)));

    return {
      total: lista.length,
      ultima: ultima ? { id: ultima.id, dataHora: ultima.dataHora || '', queixa: String(ultima.queixaPrincipal || '').trim() } : null,
      alergias,
      alergiaSemDetalhe: alergiaChip && !alergias,
      problemas: chips.filter(x => !/alergia/i.test(String(x))),
      cirurgias: Array.isArray(src.cirurgias) ? src.cirurgias : [],
      familiares: Array.isArray(src.familiares) ? src.familiares : [],
      familiaresTexto: String(src.familiaresTexto || '').trim(),
      antecedentesTexto: String(src.antecedentesTexto || '').trim(),
      medicacoes: Array.isArray(src.medicacoesUso) ? src.medicacoesUso : [],
      habitos: {
        tabagismo: src.tabagismo || '', macosAno: src.macosAno || '', alcool: src.alcool || '',
        atividadeFisica: src.atividadeFisica || '', sono: src.sono || ''
      },
      vitais
    };
  }

  const API = { derivar, tendencia, temVitais, VITAIS, ROTULO_VITAL, PERSISTENTES };
  if (typeof window !== 'undefined') window.ResumoClinico = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
