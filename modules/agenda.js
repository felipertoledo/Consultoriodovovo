/* ================================================================
   modules/agenda.js — Sprint A1: helpers para agenda

   - Parser PT-BR de prazos de retorno ("3 meses", "1 semana", "15 dias")
   - Cálculo de data futura a partir de hoje
   - Formatação de data (YYYY-MM-DD ↔ pt-BR)
   - Detecção de auto-retorno (callback chamado ao salvar consulta)
   ================================================================ */
(function () {
  'use strict';

  /**
   * Tenta interpretar um prazo em texto livre PT-BR.
   * Aceita: "7 dias", "1 semana", "2 semanas", "15 dias",
   *         "1 mês", "1 mes", "3 meses", "6 meses",
   *         "1 ano", "2 anos"
   * Pode aceitar variações com "em", "de", "a cada", "daqui".
   *
   * @param {string} texto
   * @returns {Object|null} { unidade: 'dias'|'semanas'|'meses'|'anos', quantidade: N } ou null
   */
  function parsePrazo(texto) {
    if (!texto) return null;
    const t = String(texto).toLowerCase().trim();

    // Padrões em ordem: ano antes de mês (pra "1 ano" não cair em "1 a" qualquer coisa)
    const padroes = [
      { re: /(\d+)\s*anos?/i, unidade: 'anos' },
      { re: /(\d+)\s*m[eê]s(?:es)?/i, unidade: 'meses' },
      { re: /(\d+)\s*semanas?/i, unidade: 'semanas' },
      { re: /(\d+)\s*dias?/i, unidade: 'dias' }
    ];

    for (const p of padroes) {
      const m = t.match(p.re);
      if (m) {
        const q = parseInt(m[1], 10);
        if (!isNaN(q) && q > 0 && q < 200) {
          return { unidade: p.unidade, quantidade: q };
        }
      }
    }
    return null;
  }

  /**
   * Calcula data futura a partir de uma data base + prazo.
   * @param {Date|string} base - Data base (default: hoje)
   * @param {Object} prazo - { unidade, quantidade } retornado por parsePrazo
   * @returns {string} YYYY-MM-DD da data calculada
   */
  function calcularDataFutura(base, prazo) {
    if (!prazo) return null;
    const d = base ? new Date(base) : new Date();
    if (isNaN(d.getTime())) return null;

    switch (prazo.unidade) {
      case 'dias':
        d.setDate(d.getDate() + prazo.quantidade);
        break;
      case 'semanas':
        d.setDate(d.getDate() + prazo.quantidade * 7);
        break;
      case 'meses':
        d.setMonth(d.getMonth() + prazo.quantidade);
        break;
      case 'anos':
        d.setFullYear(d.getFullYear() + prazo.quantidade);
        break;
      default:
        return null;
    }
    return d.toISOString().slice(0, 10);
  }

  /**
   * Helper unificado: aplica parser + cálculo em uma chamada.
   * @returns {string|null} YYYY-MM-DD ou null
   */
  function calcularRetornoDe(texto, dataBase) {
    const prazo = parsePrazo(texto);
    if (!prazo) return null;
    return calcularDataFutura(dataBase || new Date(), prazo);
  }

  /**
   * Formata YYYY-MM-DD para dd/mm/yyyy.
   */
  function formatarData(iso) {
    if (!iso) return '';
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  /**
   * Data de hoje em YYYY-MM-DD (timezone local).
   */
  function hojeIso() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Diferença em dias entre duas datas (positivo se b > a).
   */
  function diasEntre(a, b) {
    const da = new Date(a);
    const db = new Date(b);
    return Math.round((db - da) / (1000 * 60 * 60 * 24));
  }

  /**
   * Descreve a distância em dias de uma data até hoje.
   * Ex: "hoje", "amanhã", "ontem", "em 3 dias", "há 5 dias"
   */
  function distanciaHoje(iso) {
    const d = diasEntre(hojeIso(), iso);
    if (d === 0) return 'hoje';
    if (d === 1) return 'amanhã';
    if (d === -1) return 'ontem';
    if (d > 1 && d < 30) return `em ${d} dias`;
    if (d < -1 && d > -30) return `há ${Math.abs(d)} dias`;
    if (d >= 30 && d < 365) return `em ${Math.round(d / 30)} mês(es)`;
    if (d <= -30 && d > -365) return `há ${Math.round(Math.abs(d) / 30)} mês(es)`;
    if (d >= 365) return `em ${Math.round(d / 365)} ano(s)`;
    return `há ${Math.round(Math.abs(d) / 365)} ano(s)`;
  }

  /**
   * Próximos N dias a partir de hoje, como array de YYYY-MM-DD.
   */
  function proximosNDias(n) {
    const out = [];
    const base = new Date();
    for (let i = 0; i < n; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }

  /**
   * Nome do dia da semana em PT-BR para uma data ISO.
   */
  function diaSemana(iso, abreviado) {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');  // meio-dia evita problemas de timezone
    const dias = abreviado
      ? ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
      : ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    return dias[d.getDay()] || '';
  }

  // API
  const api = {
    parsePrazo,
    calcularDataFutura,
    calcularRetornoDe,
    formatarData,
    hojeIso,
    diasEntre,
    distanciaHoje,
    proximosNDias,
    diaSemana
  };

  if (typeof window !== 'undefined') window.Agenda = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
