/* ============================================================
   financeiro.js — Lógica de controle financeiro do consultório
   ------------------------------------------------------------
   Cálculos puros (testáveis): totais mensais, aplicação de
   impostos/deduções configuráveis, agregação para gráfico,
   formatação e parsing de moeda em pt-BR.

   IMPORTANTE: o "líquido" é uma ESTIMATIVA — aplica os
   percentuais informados pelo usuário linearmente sobre o
   bruto. Não é apuração fiscal (não considera faixas
   progressivas, deduções, fator R, etc.). Não substitui a
   contabilidade.
   ============================================================ */
const Financeiro = (function () {
  'use strict';

  /** Arredonda para 2 casas, evitando lixo de ponto flutuante. */
  function round2(v) {
    return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  }

  /** 'YYYY-MM-DD' ou ISO → 'YYYY-MM'. */
  function mesDe(dataIso) {
    if (!dataIso) return '';
    return String(dataIso).slice(0, 7);
  }

  /** Rótulo amigável de um mês 'YYYY-MM' → 'Junho de 2026'. */
  function rotuloMes(mes) {
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return mes || '';
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const [a, m] = mes.split('-');
    const nome = meses[parseInt(m, 10) - 1] || '';
    return nome.charAt(0).toUpperCase() + nome.slice(1) + ' de ' + a;
  }

  /** Rótulo curto 'YYYY-MM' → 'jun/26'. */
  function rotuloMesCurto(mes) {
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return mes || '';
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const [a, m] = mes.split('-');
    return (meses[parseInt(m, 10) - 1] || '') + '/' + a.slice(2);
  }

  /** Mês atual 'YYYY-MM' no fuso local. */
  function mesAtual() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  /** Soma N meses (pode ser negativo) a um 'YYYY-MM'. */
  function deslocarMes(mes, delta) {
    const [a, m] = mes.split('-').map(Number);
    const d = new Date(a, m - 1 + delta, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  /** Lista os últimos n meses até `ate` (inclusive), em ordem cronológica. */
  function ultimosNMeses(n, ate) {
    const fim = ate || mesAtual();
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(deslocarMes(fim, -i));
    return out;
  }

  /** Formata número em moeda pt-BR: 1234.5 → 'R$ 1.234,50'. */
  function formatarMoeda(valor) {
    const v = round2(valor || 0);
    const neg = v < 0;
    const abs = Math.abs(v).toFixed(2);
    const [int, dec] = abs.split('.');
    const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + 'R$ ' + intFmt + ',' + dec;
  }

  /** Sem o símbolo, para inputs: 1234.5 → '1.234,50'. */
  function formatarNumero(valor) {
    return formatarMoeda(valor).replace('R$ ', '');
  }

  /**
   * Converte string digitada em número. Aceita '1.234,56', '1234,56',
   * '1234.56', 'R$ 1.234,56', '1234'. Retorna número ou 0.
   */
  function parseMoeda(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    let s = String(str).replace(/[R$\s]/g, '').trim();
    if (!s) return 0;
    const temVirgula = s.includes(',');
    const temPonto = s.includes('.');
    if (temVirgula && temPonto) {
      // vírgula é decimal, ponto é milhar → remove pontos, vírgula vira ponto
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (temVirgula) {
      // só vírgula → decimal
      s = s.replace(',', '.');
    }
    // só ponto: assume decimal (1234.56) — não tenta adivinhar milhar
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  /**
   * Aplica a lista de impostos sobre um valor bruto.
   * impostos: [{ nome, percentual }]
   * → { detalhes:[{nome,percentual,valor}], totalPercentual, totalValor }
   */
  function calcularImpostos(bruto, impostos) {
    const base = Number(bruto) || 0;
    const lista = Array.isArray(impostos) ? impostos : [];
    let totalPercentual = 0;
    const detalhes = lista.map(i => {
      const pct = Number(i.percentual) || 0;
      totalPercentual += pct;
      return { nome: i.nome || '', percentual: pct, valor: round2(base * pct / 100) };
    });
    const totalValor = round2(detalhes.reduce((s, d) => s + d.valor, 0));
    return { detalhes, totalPercentual: round2(totalPercentual), totalValor };
  }

  /** Líquido = bruto − soma dos impostos. */
  function liquido(bruto, impostos) {
    return round2((Number(bruto) || 0) - calcularImpostos(bruto, impostos).totalValor);
  }

  /** Soma o valor bruto de uma lista de lançamentos. */
  function somaBruto(lancamentos) {
    return round2((lancamentos || []).reduce((s, l) => s + (Number(l.valor) || 0), 0));
  }

  /**
   * Resumo de um conjunto de lançamentos (geralmente de um mês).
   * → { bruto, impostos:{detalhes,totalValor,totalPercentual}, liquido,
   *     quantidade, porForma:{forma:total}, ticketMedio }
   */
  function resumo(lancamentos, impostos) {
    const lista = lancamentos || [];
    const bruto = somaBruto(lista);
    const imp = calcularImpostos(bruto, impostos);
    const porForma = {};
    for (const l of lista) {
      const f = l.formaPagamento || 'Não informado';
      porForma[f] = round2((porForma[f] || 0) + (Number(l.valor) || 0));
    }
    return {
      bruto,
      impostos: imp,
      liquido: round2(bruto - imp.totalValor),
      quantidade: lista.length,
      porForma,
      ticketMedio: lista.length ? round2(bruto / lista.length) : 0
    };
  }

  /** Agrupa lançamentos por mês: { 'YYYY-MM': bruto }. */
  function agruparPorMes(lancamentos) {
    const out = {};
    for (const l of (lancamentos || [])) {
      const m = l.mes || mesDe(l.data);
      if (!m) continue;
      out[m] = round2((out[m] || 0) + (Number(l.valor) || 0));
    }
    return out;
  }

  /**
   * Série para gráfico: últimos n meses, com bruto e líquido de cada.
   * → [{ mes, rotulo, bruto, liquido }]
   */
  function evolucaoMensal(lancamentos, n, impostos, ate) {
    const porMes = agruparPorMes(lancamentos);
    return ultimosNMeses(n || 6, ate).map(mes => {
      const bruto = porMes[mes] || 0;
      return { mes, rotulo: rotuloMesCurto(mes), bruto, liquido: liquido(bruto, impostos) };
    });
  }

  const api = {
    round2, mesDe, rotuloMes, rotuloMesCurto, mesAtual, deslocarMes, ultimosNMeses,
    formatarMoeda, formatarNumero, parseMoeda,
    calcularImpostos, liquido, somaBruto, resumo, agruparPorMes, evolucaoMensal
  };
  return api;
})();

if (typeof window !== 'undefined') window.Financeiro = Financeiro;
if (typeof module !== 'undefined' && module.exports) module.exports = Financeiro;
