/* ================================================================
   modules/hiperdia.js — Sprint B3
   Painel Hiperdia: identificação e classificação de pacientes em
   acompanhamento de HAS e DM2, com semáforo de descompensação.

   Critérios clínicos:
   ─ Hipertensão (CIAP-2 K86 sem complicação, K87 com complicação):
     * Verde:    PA <140×90 (ou <130×80 se DM associado, lente
                 da Diretriz Brasileira de HAS 2020)
     * Amarelo:  PA 140-159×90-99 OU sem aferição registrada
     * Vermelho: PA ≥160×100

   ─ Diabetes Mellitus tipo 2 (CIAP-2 T90):
     * Verde:    HbA1c <7%
     * Amarelo:  HbA1c 7-8,9% OU sem HbA1c há mais de 1 ano
     * Vermelho: HbA1c ≥9% (descompensado)

   ─ Tempo desde última consulta:
     * >180 dias: amarelo
     * >365 dias: vermelho (paciente faltoso)

   Nível global = pior componente.

   Fontes:
   [Diretriz Brasileira de HAS 2020]
   [SBD Diretrizes 2024-2025]
   [CAB-MS HAS / DM]
   ================================================================ */
(function () {
  'use strict';

  // CIAP-2 que classificam o paciente como Hiperdia
  const CIAPS_HAS = ['K86', 'K87'];
  const CIAPS_DM = ['T90'];

  // Alvos pressóricos (mmHg)
  const ALVO_PA_PADRAO = { sis: 140, dia: 90 };
  const ALVO_PA_DM = { sis: 130, dia: 80 };

  // Hierarquia de severidade
  const NIVEIS = { cinza: 0, verde: 1, amarelo: 2, vermelho: 3 };

  /**
   * Faz parse de uma string livre de PA (e.g., "120x80", "130/85",
   * "PA 12x8", "150 90 mmHg") para { sistolica, diastolica }.
   * Retorna null se não conseguir extrair valores plausíveis.
   *
   * Critérios de plausibilidade:
   *   - sistólica entre 60 e 260
   *   - diastólica entre 30 e 160
   *   - sistólica > diastólica
   */
  function parsePA(str) {
    if (!str) return null;
    const s = String(str).trim().toLowerCase();
    // Remove "pa", "mm hg", "mmhg"
    const limpo = s
      .replace(/\bpa\b/g, '')
      .replace(/mm\s*hg/g, '')
      .replace(/mmhg/g, '')
      .replace(/[^\d\sx/.,]/g, ' ')
      .trim();
    // Tenta padrão (\d{2,3})[separador](\d{2,3})
    const m = limpo.match(/(\d{2,3})\s*[xX/\s.,-]\s*(\d{2,3})/);
    if (!m) return null;
    const sis = parseInt(m[1], 10);
    const dia = parseInt(m[2], 10);
    if (isNaN(sis) || isNaN(dia)) return null;
    if (sis < 60 || sis > 260) return null;
    if (dia < 30 || dia > 160) return null;
    if (sis <= dia) return null;  // sanity check
    return { sistolica: sis, diastolica: dia };
  }

  /**
   * Extrai o código CIAP (string tipo "K86") de uma hipótese, que pode
   * ser objeto novo { texto, ciap: { codigo, descricao } } ou — em testes
   * legados — { ciap: "K86" }. Usa o helper canônico CodigosClinicos
   * quando disponível (browser); cai no fallback standalone no Node.
   */
  function extrairCodigoCiap(h) {
    if (!h) return null;
    // Helper canônico (browser)
    if (typeof window !== 'undefined' && window.CodigosClinicos && window.CodigosClinicos.ciapDe) {
      const c = window.CodigosClinicos.ciapDe(h);
      return c ? c.codigo : null;
    }
    // Fallback standalone
    if (typeof h === 'string') return null;
    if (typeof h === 'object' && h.ciap) {
      if (typeof h.ciap === 'object' && h.ciap.codigo) return h.ciap.codigo;
      if (typeof h.ciap === 'string') return h.ciap;
    }
    return null;
  }

  /**
   * Lê o conjunto de CIAPs únicos das hipóteses ATIVAS do paciente
   * (mais recente prevalece em caso de hipótese revogada — aqui união
   * simples basta como heurística clínica para "esse paciente já
   * recebeu o diagnóstico em algum momento")
   */
  function ciapsDoHistorico(consultas) {
    const set = new Set();
    for (const c of (consultas || [])) {
      if (c.deleted) continue;
      for (const h of (c.hipoteses || [])) {
        const cod = extrairCodigoCiap(h);
        if (cod) set.add(String(cod).toUpperCase());
      }
    }
    return set;
  }

  /**
   * Identifica se o paciente é Hiperdia e quais condições.
   */
  function identificarCondicoes(consultas) {
    const ciaps = ciapsDoHistorico(consultas);
    const temHAS = CIAPS_HAS.some(c => ciaps.has(c));
    const temDM = CIAPS_DM.some(c => ciaps.has(c));
    return {
      ciaps: Array.from(ciaps),
      temHAS,
      temDM,
      ehHiperdia: temHAS || temDM
    };
  }

  /**
   * Encontra a última PA válida registrada nas consultas
   * (busca em consulta.pa, ignora deletadas, mais recente primeiro).
   */
  function extrairUltimaPA(consultas) {
    const ativas = (consultas || []).filter(c => !c.deleted);
    const ordenadas = [...ativas].sort((a, b) =>
      new Date(b.dataHora || b.createdAt || 0) - new Date(a.dataHora || a.createdAt || 0));
    for (const c of ordenadas) {
      const valor = parsePA(c.pa);
      if (valor) {
        return {
          valor,
          data: c.dataHora || c.createdAt,
          consultaId: c.id,
          textoOriginal: c.pa
        };
      }
    }
    return null;
  }

  /**
   * Encontra a última HbA1c válida (consulta.exames.glicemico.hba1c).
   */
  function extrairUltimaHbA1c(consultas) {
    const ativas = (consultas || []).filter(c => !c.deleted);
    const ordenadas = [...ativas].sort((a, b) =>
      new Date(b.dataHora || b.createdAt || 0) - new Date(a.dataHora || a.createdAt || 0));
    for (const c of ordenadas) {
      const ex = c.exames;
      if (!ex || !ex.glicemico) continue;
      const raw = ex.glicemico.hba1c;
      if (raw === null || raw === undefined || raw === '') continue;
      const valor = parseFloat(String(raw).replace(',', '.'));
      if (isNaN(valor)) continue;
      if (valor < 3 || valor > 20) continue;  // sanity
      return {
        valor,
        data: c.dataHora || c.createdAt,
        consultaId: c.id
      };
    }
    return null;
  }

  /**
   * Calcula dias entre hoje e uma data ISO.
   */
  function diasDesde(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Classifica um motivo de PA conforme alvos.
   */
  function classificarPA(sistolica, diastolica, temDM) {
    const alvo = temDM ? ALVO_PA_DM : ALVO_PA_PADRAO;
    if (sistolica >= 160 || diastolica >= 100) {
      return {
        nivel: 'vermelho',
        razao: `PA ${sistolica}×${diastolica} — Estágio 2 / hipertensão grave`
      };
    }
    if (sistolica >= alvo.sis || diastolica >= alvo.dia) {
      return {
        nivel: 'amarelo',
        razao: `PA ${sistolica}×${diastolica} — acima do alvo (${alvo.sis}×${alvo.dia})`
      };
    }
    return {
      nivel: 'verde',
      razao: `PA ${sistolica}×${diastolica} — dentro do alvo (${alvo.sis}×${alvo.dia})`
    };
  }

  /**
   * Classifica um motivo de HbA1c.
   * Formata o valor sem floats inúteis (7.0 → "7,0", 8.5 → "8,5")
   */
  function classificarHbA1c(valor) {
    const fmt = valor.toFixed(1).replace('.', ',');
    if (valor >= 9) {
      return { nivel: 'vermelho', razao: `HbA1c ${fmt}% — diabetes descompensado (≥9%)` };
    }
    if (valor >= 7) {
      return { nivel: 'amarelo', razao: `HbA1c ${fmt}% — acima do alvo (7-9%)` };
    }
    return { nivel: 'verde', razao: `HbA1c ${fmt}% — dentro do alvo (<7%)` };
  }

  /**
   * Classifica um paciente Hiperdia com base no histórico de consultas.
   * Retorna { nivel, motivos[], detalhes }
   * - nivel: 'verde' | 'amarelo' | 'vermelho' | 'cinza' (não-Hiperdia ou sem dados)
   * - motivos: lista de objetos { nivel, razao } que justificam
   * - detalhes: { temHAS, temDM, ultimaConsulta, ultimaPA, ultimaHbA1c, diasSemConsulta }
   */
  function classificarPaciente(consultas) {
    const cond = identificarCondicoes(consultas);

    if (!cond.ehHiperdia) {
      return {
        nivel: 'cinza',
        motivos: [{ nivel: 'cinza', razao: 'Não é paciente Hiperdia (sem CIAP K86, K87 ou T90 nas hipóteses)' }],
        detalhes: cond
      };
    }

    const motivos = [];
    const ativas = (consultas || []).filter(c => !c.deleted);

    // 1. Tempo desde última consulta
    const ultima = ativas.reduce((a, b) =>
      new Date(a?.dataHora || 0) > new Date(b?.dataHora || 0) ? a : b, null);
    const diasUC = ultima ? diasDesde(ultima.dataHora) : null;
    if (diasUC !== null) {
      if (diasUC > 365) {
        motivos.push({ nivel: 'vermelho', razao: `Sem consulta há ${diasUC} dias (>1 ano) — paciente faltoso` });
      } else if (diasUC > 180) {
        motivos.push({ nivel: 'amarelo', razao: `Sem consulta há ${diasUC} dias (>6 meses)` });
      } else {
        motivos.push({ nivel: 'verde', razao: `Última consulta há ${diasUC} dia(s)` });
      }
    }

    // 2. HbA1c (se tem DM)
    let ultimaHbA1c = null;
    if (cond.temDM) {
      ultimaHbA1c = extrairUltimaHbA1c(consultas);
      if (ultimaHbA1c) {
        const c = classificarHbA1c(ultimaHbA1c.valor);
        const dias = diasDesde(ultimaHbA1c.data);
        if (dias !== null && dias > 365) {
          motivos.push({
            nivel: 'amarelo',
            razao: `Última HbA1c há ${dias} dias (>1 ano) — pedir nova`
          });
        }
        motivos.push(c);
      } else {
        motivos.push({ nivel: 'amarelo', razao: 'DM sem HbA1c registrada — pedir' });
      }
    }

    // 3. PA (se tem HAS)
    let ultimaPA = null;
    if (cond.temHAS) {
      ultimaPA = extrairUltimaPA(consultas);
      if (ultimaPA) {
        const c = classificarPA(ultimaPA.valor.sistolica, ultimaPA.valor.diastolica, cond.temDM);
        const dias = diasDesde(ultimaPA.data);
        if (dias !== null && dias > 180) {
          motivos.push({
            nivel: 'amarelo',
            razao: `Última PA há ${dias} dias (>6 meses) — aferir`
          });
        }
        motivos.push(c);
      } else {
        motivos.push({ nivel: 'amarelo', razao: 'HAS sem PA registrada nas consultas' });
      }
    }

    // Nível global = pior componente
    const nivelGlobal = motivos.reduce((pior, m) =>
      NIVEIS[m.nivel] > NIVEIS[pior] ? m.nivel : pior, 'verde');

    return {
      nivel: nivelGlobal,
      motivos,
      detalhes: {
        ...cond,
        ultimaConsultaData: ultima ? ultima.dataHora : null,
        diasSemConsulta: diasUC,
        ultimaPA,
        ultimaHbA1c
      }
    };
  }

  /**
   * Recebe lista de pacientes e mapa pacienteId → consultas[]
   * e retorna lista enriquecida com classificação, FILTRANDO apenas
   * pacientes Hiperdia.
   */
  function listarHiperdia(pacientes, consultasPorPaciente) {
    const lista = [];
    for (const p of (pacientes || [])) {
      if (p.deleted) continue;
      const cs = consultasPorPaciente[p.id] || [];
      const cls = classificarPaciente(cs);
      if (cls.detalhes.ehHiperdia) {
        lista.push({ paciente: p, classificacao: cls });
      }
    }
    return lista;
  }

  /**
   * Resumo estatístico para o dashboard:
   * { total, verde, amarelo, vermelho, cinza }
   */
  function resumirHiperdia(lista) {
    const r = { total: 0, verde: 0, amarelo: 0, vermelho: 0, cinza: 0 };
    for (const item of (lista || [])) {
      r.total++;
      r[item.classificacao.nivel]++;
    }
    return r;
  }

  /**
   * Ordena por gravidade (vermelho primeiro), depois por tempo desde
   * última consulta (mais atrasado primeiro).
   */
  function ordenarPorPrioridade(lista) {
    return [...(lista || [])].sort((a, b) => {
      const da = NIVEIS[a.classificacao.nivel];
      const db = NIVEIS[b.classificacao.nivel];
      if (da !== db) return db - da;  // desc (pior primeiro)
      const ta = a.classificacao.detalhes.diasSemConsulta || 0;
      const tb = b.classificacao.detalhes.diasSemConsulta || 0;
      return tb - ta;
    });
  }

  const api = {
    // Constantes
    CIAPS_HAS, CIAPS_DM,
    ALVO_PA_PADRAO, ALVO_PA_DM,
    // Parsers e extratores
    parsePA,
    extrairUltimaPA,
    extrairUltimaHbA1c,
    extrairCodigoCiap,
    ciapsDoHistorico,
    identificarCondicoes,
    // Classificadores
    classificarPA,
    classificarHbA1c,
    classificarPaciente,
    // Listagem
    listarHiperdia,
    resumirHiperdia,
    ordenarPorPrioridade,
    // Helpers
    diasDesde
  };

  if (typeof window !== 'undefined') window.Hiperdia = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
