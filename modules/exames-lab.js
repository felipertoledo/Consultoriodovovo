/* ================================================================
   modules/exames-lab.js — Sprint LAB
   Catálogo de exames laboratoriais, unidades, faixas de referência,
   fórmula de TFG (CKD-EPI 2021), templates rápidos para MFC/psiquiatria
   ================================================================ */
(function () {
  'use strict';

  // ----------------------------------------------------------------
  // CATÁLOGO DE EXAMES
  // Cada exame: { id, nome, unidade, ref?, casas? }
  // Agrupados por categoria. Categorias renderizadas como subseções.
  // ----------------------------------------------------------------
  const CATEGORIAS = [
    {
      id: 'hemograma',
      titulo: 'Hemograma',
      icone: '🩸',
      campos: [
        { id: 'hb', nome: 'Hb', unidade: 'g/dL', ref: 'M:13–17 · F:12–15', casas: 1 },
        { id: 'ht', nome: 'Ht', unidade: '%', ref: 'M:40–52 · F:36–46', casas: 1 },
        { id: 'vcm', nome: 'VCM', unidade: 'fL', ref: '80–100', casas: 1 },
        { id: 'rdw', nome: 'RDW', unidade: '%', ref: '11,5–14,5', casas: 1 },
        { id: 'leucocitos', nome: 'Leucócitos', unidade: '/mm³', ref: '4 000–11 000', casas: 0 },
        { id: 'bastoes', nome: 'Bastões', unidade: '%', ref: '0–5', casas: 1 },
        { id: 'segmentados', nome: 'Segmentados', unidade: '%', ref: '45–65', casas: 1 },
        { id: 'linfocitos', nome: 'Linfócitos', unidade: '%', ref: '20–45', casas: 1 },
        { id: 'eosinofilos', nome: 'Eosinófilos', unidade: '%', ref: '1–4', casas: 1 },
        { id: 'plaquetas', nome: 'Plaquetas', unidade: '/mm³', ref: '150 000–450 000', casas: 0 }
      ],
      textoLivre: { id: 'outros', placeholder: 'Outros achados do hemograma (granulações tóxicas, blastos, etc.)' }
    },
    {
      id: 'glicemico',
      titulo: 'Metabolismo glicêmico',
      icone: '🍬',
      campos: [
        { id: 'glicemia', nome: 'Glicemia jejum', unidade: 'mg/dL', ref: '70–99', casas: 0 },
        { id: 'hba1c', nome: 'HbA1c', unidade: '%', ref: '<5,7', casas: 1 },
        { id: 'totg_jejum', nome: 'TOTG — jejum', unidade: 'mg/dL', ref: '<100', casas: 0, grupo: 'totg' },
        { id: 'totg_60', nome: 'TOTG — 60 min', unidade: 'mg/dL', ref: '<180', casas: 0, grupo: 'totg' },
        { id: 'totg_120', nome: 'TOTG — 120 min', unidade: 'mg/dL', ref: '<140', casas: 0, grupo: 'totg' }
      ]
    },
    {
      id: 'renal',
      titulo: 'Função renal',
      icone: '🧬',
      campos: [
        { id: 'creatinina', nome: 'Creatinina', unidade: 'mg/dL', ref: 'M:0,7–1,3 · F:0,6–1,1', casas: 2, calcTfg: true },
        { id: 'ureia', nome: 'Ureia', unidade: 'mg/dL', ref: '15–40', casas: 0 },
        { id: 'microalbumin', nome: 'Microalbuminúria/RAC', unidade: 'mg/g', ref: '<30', casas: 1 }
      ]
    },
    {
      id: 'hepatico',
      titulo: 'Função hepática',
      icone: '🧪',
      campos: [
        { id: 'tgo', nome: 'TGO (AST)', unidade: 'U/L', ref: '<40', casas: 0 },
        { id: 'tgp', nome: 'TGP (ALT)', unidade: 'U/L', ref: '<41', casas: 0 },
        { id: 'bt', nome: 'Bilirrubina total', unidade: 'mg/dL', ref: '0,1–1,2', casas: 2 },
        { id: 'bd', nome: 'Bilirrubina direta', unidade: 'mg/dL', ref: '<0,3', casas: 2 },
        { id: 'bi', nome: 'Bilirrubina indireta', unidade: 'mg/dL', ref: '<1,0', casas: 2 },
        { id: 'ggt', nome: 'Gama GT', unidade: 'U/L', ref: 'M:<60 · F:<40', casas: 0 },
        { id: 'fa', nome: 'Fosfatase alcalina', unidade: 'U/L', ref: '40–129', casas: 0 },
        { id: 'albumina', nome: 'Albumina', unidade: 'g/dL', ref: '3,5–5,2', casas: 2 }
      ]
    },
    {
      id: 'tireoide',
      titulo: 'Tireoide',
      icone: '🦋',
      campos: [
        { id: 'tsh', nome: 'TSH', unidade: 'mUI/L', ref: '0,4–4,5', casas: 2 },
        { id: 't4l', nome: 'T4 livre', unidade: 'ng/dL', ref: '0,9–1,8', casas: 2 },
        { id: 'anti_tpo', nome: 'Anti-TPO', unidade: 'UI/mL', ref: '<35', casas: 0 }
      ]
    },
    {
      id: 'eletrolitos',
      titulo: 'Eletrólitos e minerais',
      icone: '⚡',
      campos: [
        { id: 'na', nome: 'Sódio', unidade: 'mEq/L', ref: '135–145', casas: 0 },
        { id: 'k', nome: 'Potássio', unidade: 'mEq/L', ref: '3,5–5,0', casas: 2 },
        { id: 'ca_total', nome: 'Cálcio total', unidade: 'mg/dL', ref: '8,5–10,5', casas: 2 },
        { id: 'ca_ionico', nome: 'Cálcio iônico', unidade: 'mg/dL', ref: '4,5–5,3', casas: 2 },
        { id: 'mg', nome: 'Magnésio', unidade: 'mg/dL', ref: '1,7–2,5', casas: 2 },
        { id: 'fosforo', nome: 'Fósforo', unidade: 'mg/dL', ref: '2,5–4,5', casas: 2 },
        { id: 'zinco', nome: 'Zinco', unidade: 'mcg/dL', ref: '70–120', casas: 0 }
      ]
    },
    {
      id: 'vitaminas',
      titulo: 'Vitaminas',
      icone: '☀️',
      campos: [
        { id: 'vit_d', nome: 'Vitamina D (25-OH)', unidade: 'ng/mL', ref: '>30 suficiente · 20–30 insuf · <20 deficiência', casas: 1 },
        { id: 'vit_b12', nome: 'Vitamina B12', unidade: 'pg/mL', ref: '>300 (>500 ideal)', casas: 0 },
        { id: 'folato', nome: 'Ácido fólico', unidade: 'ng/mL', ref: '>4', casas: 1 }
      ]
    },
    {
      id: 'lipidograma',
      titulo: 'Lipidograma',
      icone: '🫀',
      campos: [
        { id: 'ct', nome: 'Colesterol total', unidade: 'mg/dL', ref: '<190', casas: 0 },
        { id: 'ldl', nome: 'LDL', unidade: 'mg/dL', ref: 'depende do risco CV', casas: 0 },
        { id: 'hdl', nome: 'HDL', unidade: 'mg/dL', ref: 'M:>40 · F:>50', casas: 0 },
        { id: 'tg', nome: 'Triglicérides', unidade: 'mg/dL', ref: '<150', casas: 0 }
      ]
    },
    {
      id: 'outros_lab',
      titulo: 'Outros exames bioquímicos',
      icone: '🧫',
      campos: [
        { id: 'ac_urico', nome: 'Ácido úrico', unidade: 'mg/dL', ref: 'M:3,4–7 · F:2,4–6', casas: 1 },
        { id: 'ferritina', nome: 'Ferritina', unidade: 'ng/mL', ref: 'M:30–400 · F:13–150', casas: 0 },
        { id: 'ferro_serico', nome: 'Ferro sérico', unidade: 'mcg/dL', ref: '60–170', casas: 0 },
        { id: 'sat_transferrina', nome: 'Sat. transferrina', unidade: '%', ref: '20–50', casas: 1 },
        { id: 'vhs', nome: 'VHS', unidade: 'mm/h', ref: 'M:<15 · F:<20', casas: 0 },
        { id: 'pcr', nome: 'PCR', unidade: 'mg/L', ref: '<5', casas: 1 }
      ]
    },
    {
      id: 'urina1',
      titulo: 'Urina tipo 1 (EAS)',
      icone: '💧',
      campos: [
        { id: 'leucocituria', nome: 'Leucocitúria', unidade: '/campo', ref: '<10 (ou <5 leuco/campo)', casas: 0 },
        { id: 'hematuria', nome: 'Hematúria', unidade: '/campo', ref: '<5', casas: 0 },
        { id: 'proteinuria', nome: 'Proteinúria', unidade: '', ref: 'ausente / negativa', tipo: 'texto' },
        { id: 'cilindros', nome: 'Cilindros', unidade: '', ref: 'ausentes', tipo: 'texto' },
        { id: 'ph', nome: 'pH', unidade: '', ref: '5,0–7,5', casas: 1 },
        { id: 'densidade', nome: 'Densidade', unidade: '', ref: '1.005–1.030', casas: 3 }
      ],
      textoLivre: { id: 'outros', placeholder: 'Outros achados (bactérias, cristais, cetose, glicosúria, nitrito)' }
    },
    {
      id: 'sorologias',
      titulo: 'Sorologias / IST',
      icone: '🦠',
      campos: [
        { id: 'hiv', nome: 'HIV', unidade: '', tipo: 'select', opcoes: ['', 'Não reagente', 'Reagente', 'Indeterminado'] },
        { id: 'vdrl', nome: 'VDRL', unidade: 'título', ref: 'NR ou título; >1:8 sugere atividade', tipo: 'texto' },
        { id: 'hbsag', nome: 'HBsAg', unidade: '', tipo: 'select', opcoes: ['', 'Não reagente', 'Reagente'] },
        { id: 'anti_hbs', nome: 'Anti-HBs', unidade: 'UI/L', ref: '≥10 = imune', casas: 0 },
        { id: 'anti_hbc', nome: 'Anti-HBc', unidade: '', tipo: 'select', opcoes: ['', 'Não reagente', 'Reagente IgG', 'Reagente IgM'] },
        { id: 'anti_hcv', nome: 'Anti-HCV', unidade: '', tipo: 'select', opcoes: ['', 'Não reagente', 'Reagente'] }
      ]
    },
    {
      id: 'rastreio_oncologico',
      titulo: 'Rastreio oncológico',
      icone: '⚠️',
      avisoP4: 'Marcadores tumorais NÃO são exames de rastreamento populacional. Uso é em seguimento de neoplasia diagnosticada, não em assintomático. Pedir sem indicação produz mais malefício que benefício.',
      campos: [
        { id: 'psa', nome: 'PSA total', unidade: 'ng/mL', ref: 'depende idade · <4 referência tradicional', casas: 2 },
        { id: 'psa_livre', nome: 'PSA livre/total', unidade: '%', ref: '>25% sugere benigno', casas: 1 },
        { id: 'ca125', nome: 'CA-125', unidade: 'U/mL', ref: '<35', casas: 1 },
        { id: 'ca19_9', nome: 'CA 19-9', unidade: 'U/mL', ref: '<37', casas: 1 },
        { id: 'ca15_3', nome: 'CA 15-3', unidade: 'U/mL', ref: '<25', casas: 1 },
        { id: 'cea', nome: 'CEA', unidade: 'ng/mL', ref: '<5', casas: 2 },
        { id: 'afp', nome: 'Alfa-fetoproteína', unidade: 'ng/mL', ref: '<10', casas: 1 }
      ]
    },
    {
      id: 'psiquiatrico',
      titulo: 'Investigação para queixas mentais',
      icone: '🧠',
      descricao: 'Conjunto específico de exames a considerar diante de sintomas psiquiátricos novos ou quando em uso de psicofármacos com janela terapêutica.',
      campos: [
        { id: 'litemia', nome: 'Litemia', unidade: 'mEq/L', ref: '0,6–1,2 (manutenção) · 1,5+ tóxico', casas: 2 },
        { id: 'carbamazepinemia', nome: 'Carbamazepinemia', unidade: 'mcg/mL', ref: '4–12 terapêutico', casas: 1 },
        { id: 'ac_valproico', nome: 'Ácido valproico sérico', unidade: 'mcg/mL', ref: '50–100 terapêutico', casas: 1 },
        { id: 'prolactina', nome: 'Prolactina', unidade: 'ng/mL', ref: 'M:<20 · F:<29 (alto: pensar antipsicótico)', casas: 1 }
      ]
    }
  ];

  // ----------------------------------------------------------------
  // TEMPLATES RÁPIDOS
  // Cada template marca campos como "ativos" para focar atenção.
  // Não preenche valores — só sinaliza quais foram considerados/pedidos.
  // ----------------------------------------------------------------
  const TEMPLATES = [
    {
      id: 'rastreio_mfc_adulto',
      nome: 'Rastreio MFC adulto (rotina)',
      descricao: 'Lote básico para check-up de adulto assintomático com risco usual',
      campos: [
        'hemograma.hb', 'hemograma.ht', 'hemograma.leucocitos', 'hemograma.plaquetas',
        'glicemico.glicemia', 'glicemico.hba1c',
        'renal.creatinina', 'renal.ureia',
        'hepatico.tgo', 'hepatico.tgp', 'hepatico.ggt',
        'tireoide.tsh',
        'lipidograma.ct', 'lipidograma.ldl', 'lipidograma.hdl', 'lipidograma.tg',
        'urina1.leucocituria', 'urina1.hematuria', 'urina1.proteinuria', 'urina1.densidade'
      ]
    },
    {
      id: 'rastreio_psiquiatrico_inicial',
      nome: 'Rastreio psiquiátrico inicial',
      descricao: 'Investigação de causas orgânicas para sintomas psiquiátricos novos: tireoide, deficiências, eletrólitos, infecções neurotrópicas',
      campos: [
        'hemograma.hb', 'hemograma.leucocitos',
        'tireoide.tsh', 'tireoide.t4l',
        'vitaminas.vit_d', 'vitaminas.vit_b12', 'vitaminas.folato',
        'eletrolitos.na', 'eletrolitos.k', 'eletrolitos.ca_ionico', 'eletrolitos.mg',
        'renal.creatinina', 'renal.ureia',
        'hepatico.tgo', 'hepatico.tgp',
        'glicemico.glicemia',
        'sorologias.hiv', 'sorologias.vdrl'
      ]
    },
    {
      id: 'monitor_lit',
      nome: 'Monitor uso de Lítio',
      descricao: 'Controle terapêutico e segurança no uso crônico de lítio',
      campos: [
        'psiquiatrico.litemia',
        'tireoide.tsh', 'tireoide.t4l',
        'renal.creatinina', 'renal.ureia',
        'eletrolitos.na', 'eletrolitos.k', 'eletrolitos.ca_total',
        'hemograma.leucocitos'
      ]
    },
    {
      id: 'pre_natal_basico',
      nome: 'Pré-natal — 1º trimestre',
      descricao: 'Conjunto sorológico e bioquímico inicial da gestação',
      campos: [
        'hemograma.hb', 'hemograma.ht', 'hemograma.plaquetas',
        'glicemico.glicemia',
        'sorologias.hiv', 'sorologias.vdrl', 'sorologias.hbsag', 'sorologias.anti_hcv',
        'urina1.leucocituria', 'urina1.proteinuria',
        'tireoide.tsh'
      ]
    },
    {
      id: 'investigacao_anemia',
      nome: 'Investigação de anemia',
      descricao: 'Diferencial entre carenciais, doença crônica e hemorrágica',
      campos: [
        'hemograma.hb', 'hemograma.ht', 'hemograma.vcm', 'hemograma.rdw', 'hemograma.plaquetas',
        'outros_lab.ferritina', 'outros_lab.ferro_serico', 'outros_lab.sat_transferrina',
        'vitaminas.vit_b12', 'vitaminas.folato',
        'renal.creatinina'
      ]
    }
  ];

  // ----------------------------------------------------------------
  // CÁLCULO DE TFG via CKD-EPI 2021 (sem ajuste racial)
  // Inker LA, Eneanya ND, et al. N Engl J Med 2021.
  // ----------------------------------------------------------------
  function calcularTFG(creatinina, idadeAnos, sexo) {
    if (!creatinina || creatinina <= 0 || !idadeAnos || idadeAnos <= 0 || !sexo) return null;
    const cr = parseFloat(creatinina);
    if (isNaN(cr)) return null;

    // CKD-EPI 2021 (refit sem coeficiente racial)
    // Feminino: k=0.7, alpha=-0.241, beta=-1.200, fator sexo=1.012
    // Masculino: k=0.9, alpha=-0.302, beta=-1.200, fator sexo=1.000
    const feminino = (sexo === 'F' || sexo === 'Feminino' || sexo === 'f');
    const k = feminino ? 0.7 : 0.9;
    const alpha = feminino ? -0.241 : -0.302;
    const fatorSexo = feminino ? 1.012 : 1.000;

    const crk = cr / k;
    const minTerm = Math.pow(Math.min(crk, 1), alpha);
    const maxTerm = Math.pow(Math.max(crk, 1), -1.200);
    const ageTerm = Math.pow(0.9938, idadeAnos);

    const tfg = 142 * minTerm * maxTerm * ageTerm * fatorSexo;
    return Math.round(tfg);
  }

  function classificarTFG(tfg) {
    if (!tfg && tfg !== 0) return null;
    if (tfg >= 90) return { estagio: 'G1', cor: '#16a34a', desc: 'Normal ou alta' };
    if (tfg >= 60) return { estagio: 'G2', cor: '#16a34a', desc: 'Levemente reduzida' };
    if (tfg >= 45) return { estagio: 'G3a', cor: '#d97706', desc: 'Leve a moderadamente reduzida' };
    if (tfg >= 30) return { estagio: 'G3b', cor: '#d97706', desc: 'Moderadamente reduzida' };
    if (tfg >= 15) return { estagio: 'G4', cor: '#dc2626', desc: 'Gravemente reduzida' };
    return { estagio: 'G5', cor: '#7f1d1d', desc: 'Falência renal' };
  }

  // ----------------------------------------------------------------
  // Calcula idade em anos a partir de dataNascimento (YYYY-MM-DD)
  // ----------------------------------------------------------------
  function idadeEmAnos(dataNascimento) {
    if (!dataNascimento) return null;
    const nasc = new Date(dataNascimento + 'T12:00:00');
    if (isNaN(nasc.getTime())) return null;
    const hoje = new Date();
    let anos = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
    return anos;
  }

  // ----------------------------------------------------------------
  // Estrutura inicial vazia de exames
  // ----------------------------------------------------------------
  function estruturaVazia() {
    const obj = { dataColeta: '', _ativos: [] };
    for (const cat of CATEGORIAS) {
      obj[cat.id] = {};
      for (const c of cat.campos) {
        obj[cat.id][c.id] = '';
      }
      if (cat.textoLivre) {
        obj[cat.id][cat.textoLivre.id] = '';
      }
    }
    obj.outros_livre = '';
    return obj;
  }

  // ----------------------------------------------------------------
  // Marca campos como "ativos" a partir de um template
  // ----------------------------------------------------------------
  function aplicarTemplate(exames, templateId) {
    const tpl = TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return exames;
    exames._ativos = [...(tpl.campos || [])];
    return exames;
  }

  // ----------------------------------------------------------------
  // Helper: dado um exame com valores parciais, retorna lista de [categoria, campo, valor]
  // só dos preenchidos (para PDF e auditoria).
  // ----------------------------------------------------------------
  function listarPreenchidos(exames) {
    if (!exames) return [];
    const out = [];
    for (const cat of CATEGORIAS) {
      const grupo = exames[cat.id] || {};
      for (const c of cat.campos) {
        const v = grupo[c.id];
        if (v !== null && v !== undefined && v !== '' && String(v).trim() !== '') {
          out.push({
            categoria: cat.titulo,
            categoriaId: cat.id,
            campo: c.nome,
            campoId: c.id,
            valor: v,
            unidade: c.unidade || ''
          });
        }
      }
      if (cat.textoLivre) {
        const tv = grupo[cat.textoLivre.id];
        if (tv && String(tv).trim() !== '') {
          out.push({
            categoria: cat.titulo,
            categoriaId: cat.id,
            campo: 'Observações',
            campoId: cat.textoLivre.id,
            valor: tv,
            unidade: '',
            textoLivre: true
          });
        }
      }
    }
    return out;
  }

  function temAlgumPreenchido(exames) {
    if (!exames) return false;
    if (listarPreenchidos(exames).length > 0) return true;
    if (exames.outros_livre && exames.outros_livre.trim() !== '') return true;
    return false;
  }

  const api = {
    CATEGORIAS,
    TEMPLATES,
    calcularTFG,
    classificarTFG,
    idadeEmAnos,
    estruturaVazia,
    aplicarTemplate,
    listarPreenchidos,
    temAlgumPreenchido
  };

  if (typeof window !== 'undefined') window.ExamesLab = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
