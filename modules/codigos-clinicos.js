/* ================================================================
   modules/codigos-clinicos.js
   Helpers para CIAP-2 + CID-10 — busca, normalização, compat retroativa

   Dependências:
   - window.CIAP2  (carregado de assets/data/ciap2.js)
   - window.CID10  (carregado de assets/data/cid10-aps.js)

   Schema de hipótese (novo):
     { texto: string, ciap?: {codigo, descricao}, cid?: {codigo, descricao} }
   Schema de hipótese (legado, retrocompatível):
     string (texto livre, sem códigos)

   Helpers expostos em window.CodigosClinicos:
   - buscar(query, limite=10): retorna lista unificada [{tipo, codigo, descricao}]
   - normalizar(h): aceita string ou objeto, retorna objeto canônico
   - textoDe(h), ciapDe(h), cidDe(h): extraem campos com fallback seguro
   - formatarBadges(h): retorna string "[K86] [I10]" para PDFs
   ================================================================ */
(function () {
  'use strict';

  function _ciap2() {
    return (typeof window !== 'undefined' && window.CIAP2 && window.CIAP2.lista) ? window.CIAP2.lista : [];
  }
  function _cid10() {
    return (typeof window !== 'undefined' && window.CID10 && window.CID10.lista) ? window.CID10.lista : [];
  }

  /**
   * Remove acentos e normaliza caixa para comparação.
   */
  function _normalizarTexto(s) {
    if (!s) return '';
    return String(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Busca unificada em CIAP-2 + CID-10.
   * Aceita código exato/parcial ou descrição (sem acentos, sem caixa).
   *
   * @param {string} query - termo de busca
   * @param {number} limite - máximo de resultados (default 10)
   * @param {string} [filtro] - 'ciap' | 'cid' | undefined (ambos)
   * @returns {Array<{tipo: 'ciap'|'cid', codigo: string, descricao: string}>}
   */
  function buscar(query, limite, filtro) {
    limite = limite || 10;
    const q = _normalizarTexto(query);
    if (!q) return [];

    const resultados = [];
    const qUpper = String(query).trim().toUpperCase();
    // Detecta se a query parece um código (começa com letra)
    const ehCodigo = /^[A-Z]/.test(qUpper);

    function casa(item, tipo) {
      const codigoUpper = item.codigo.toUpperCase();
      const descNorm = _normalizarTexto(item.descricao);

      // Match por código: prefixo exato (ex: "K86" casa "K86", "K8" casa "K86", "K80", etc)
      if (ehCodigo && codigoUpper.startsWith(qUpper)) {
        // peso: match exato vem primeiro
        return codigoUpper === qUpper ? 0 : 1;
      }
      // Match por descrição
      if (descNorm.includes(q)) {
        // peso: começa com a query vem antes
        return descNorm.startsWith(q) ? 2 : 3;
      }
      return -1;
    }

    function processar(lista, tipo) {
      for (let i = 0; i < lista.length; i++) {
        const item = lista[i];
        const peso = casa(item, tipo);
        if (peso >= 0) {
          resultados.push({
            tipo,
            codigo: item.codigo,
            descricao: item.descricao,
            _peso: peso
          });
        }
      }
    }

    if (filtro !== 'cid') processar(_ciap2(), 'ciap');
    if (filtro !== 'ciap') processar(_cid10(), 'cid');

    // Ordena por peso (menor primeiro), depois alfabético no código
    resultados.sort(function (a, b) {
      if (a._peso !== b._peso) return a._peso - b._peso;
      return a.codigo.localeCompare(b.codigo);
    });

    return resultados.slice(0, limite).map(function (r) {
      return { tipo: r.tipo, codigo: r.codigo, descricao: r.descricao };
    });
  }

  /**
   * Aceita hipótese como string (legado) ou objeto (novo) e devolve forma canônica.
   * Garante que sempre exista pelo menos { texto: string }.
   */
  function normalizar(h) {
    if (!h) return { texto: '' };
    if (typeof h === 'string') return { texto: h };
    if (typeof h === 'object') {
      const out = { texto: h.texto || h.text || '' };
      if (h.ciap && h.ciap.codigo) {
        out.ciap = { codigo: h.ciap.codigo, descricao: h.ciap.descricao || '' };
      }
      if (h.cid && h.cid.codigo) {
        out.cid = { codigo: h.cid.codigo, descricao: h.cid.descricao || '' };
      }
      return out;
    }
    return { texto: String(h) };
  }

  function textoDe(h) {
    return normalizar(h).texto;
  }

  function ciapDe(h) {
    const n = normalizar(h);
    return n.ciap || null;
  }

  function cidDe(h) {
    const n = normalizar(h);
    return n.cid || null;
  }

  /**
   * Formata badges textualmente para impressão em PDF.
   * Ex: "[CIAP K86] [CID I10]" ou "" se sem códigos.
   */
  function formatarBadges(h) {
    const n = normalizar(h);
    const partes = [];
    if (n.ciap) partes.push('[CIAP ' + n.ciap.codigo + ']');
    if (n.cid) partes.push('[CID ' + n.cid.codigo + ']');
    return partes.join(' ');
  }

  /**
   * Formata uma hipótese completa para exibição/impressão linear:
   * "Hipertensão arterial sistêmica [CIAP K86] [CID I10]"
   */
  function formatarCompleto(h) {
    const n = normalizar(h);
    const badges = formatarBadges(n);
    if (!n.texto && !badges) return '';
    if (!badges) return n.texto;
    if (!n.texto) return badges;
    return n.texto + ' ' + badges;
  }

  /**
   * Procura um código exato em CIAP-2 ou CID-10. Útil para hidratar
   * uma descrição a partir só do código (ex: ao carregar consulta antiga).
   */
  function lookup(codigo) {
    if (!codigo) return null;
    const cu = String(codigo).trim().toUpperCase();
    const ciap = _ciap2().find(function (c) { return c.codigo.toUpperCase() === cu; });
    if (ciap) return { tipo: 'ciap', codigo: ciap.codigo, descricao: ciap.descricao };
    const cid = _cid10().find(function (c) { return c.codigo.toUpperCase() === cu; });
    if (cid) return { tipo: 'cid', codigo: cid.codigo, descricao: cid.descricao };
    return null;
  }

  // API global
  const api = {
    buscar: buscar,
    normalizar: normalizar,
    textoDe: textoDe,
    ciapDe: ciapDe,
    cidDe: cidDe,
    formatarBadges: formatarBadges,
    formatarCompleto: formatarCompleto,
    lookup: lookup
  };

  if (typeof window !== 'undefined') {
    window.CodigosClinicos = api;
  }
  // Compatibilidade Node/CommonJS (para testes)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
