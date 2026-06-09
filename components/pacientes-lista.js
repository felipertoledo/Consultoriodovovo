/* ============================================================
   pacientes-lista.js — Listagem e busca de pacientes
   ============================================================ */

function renderPacientesLista(container) {
  container.innerHTML = `
    <div x-data="pacientesLista()" x-init="load()">
      <div class="page-header">
        <div>
          <h1 class="page-title">Pacientes</h1>
          <p class="page-subtitle">
            <span x-text="filtered.length"></span> de <span x-text="all.length"></span> pacientes
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" @click="$dispatch('navigate', '/paciente/novo')">
            + Novo paciente
          </button>
        </div>
      </div>

      <div class="search-box">
        <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" class="input" placeholder="Buscar por nome…"
               x-model="search" @input="filter()">
      </div>

      <div x-show="loading" class="empty-state">
        <div class="spinner" style="margin: 0 auto"></div>
        <p class="mt-4">Decifrando registros…</p>
      </div>

      <div x-show="!loading && filtered.length === 0 && all.length === 0" class="empty-state">
        <h3>Nenhum paciente cadastrado ainda</h3>
        <p>Comece adicionando o primeiro paciente.</p>
        <button class="btn btn-primary mt-4" @click="$dispatch('navigate', '/paciente/novo')">
          + Cadastrar primeiro paciente
        </button>
      </div>

      <div x-show="!loading && filtered.length === 0 && all.length > 0" class="empty-state">
        <h3>Nenhum paciente encontrado</h3>
        <p>Tente outro termo de busca.</p>
      </div>

      <div class="patient-list" x-show="!loading && filtered.length > 0">
        <template x-for="p in filtered" :key="p.id">
          <div class="patient-card" @click="open(p.id)">
            <div class="patient-avatar"
                 :style="'background: ' + avatarColor(p.nome)"
                 x-text="initials(p.nome)"></div>
            <div class="patient-info">
              <div class="patient-name-row">
                <span class="patient-name" x-text="p.nome"></span>
                <span class="patient-semaforo"
                      x-show="enriq[p.id] && enriq[p.id].nivel && enriq[p.id].nivel !== 'cinza'"
                      x-text="semaforoIcone(enriq[p.id] && enriq[p.id].nivel)"
                      :title="'Hiperdia: ' + (enriq[p.id] && enriq[p.id].nivel)"></span>
                <span class="vaga-badge-mini" x-show="p.tipoVaga"
                      :class="'vaga-badge-' + p.tipoVaga"
                      x-text="vagaMini(p.tipoVaga)"></span>
              </div>
              <div class="patient-meta">
                <span x-show="p.dataNascimento" x-text="age(p.dataNascimento) + ' anos'"></span>
                <span x-show="p.dataNascimento && p.sexo"> · </span>
                <span x-show="p.sexo" x-text="p.sexo"></span>
                <span x-show="p.whatsapp"> · </span>
                <span x-show="p.whatsapp" x-text="p.whatsapp"></span>
              </div>
              <!-- Tags de condições crônicas -->
              <div class="patient-tags" x-show="enriq[p.id] && enriq[p.id].condicoes && enriq[p.id].condicoes.length > 0">
                <template x-for="cond in (enriq[p.id] ? enriq[p.id].condicoes : [])" :key="cond">
                  <span class="patient-tag" x-text="cond"></span>
                </template>
              </div>
            </div>
            <div class="text-xs muted text-right patient-ultima" style="flex-shrink: 0">
              <template x-if="enriq[p.id] && enriq[p.id].ultimaConsulta">
                <div>
                  <div>Última consulta</div>
                  <div class="patient-ultima-data" x-text="rotuloUltima(enriq[p.id].ultimaConsulta)"></div>
                </div>
              </template>
              <template x-if="enriq[p.id] && !enriq[p.id].ultimaConsulta && enriq[p.id].carregado">
                <div style="opacity: 0.6">sem consultas</div>
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>

    <style>
      .patient-name-row {
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      }
      .patient-semaforo { font-size: 0.85em; }
      .patient-tags {
        display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;
      }
      .patient-tag {
        font-size: 0.7em; font-weight: 600;
        padding: 2px 8px; border-radius: 10px;
        background: rgba(34, 197, 94, 0.12);
        color: var(--color-primary-700, #15803d);
      }
      [data-theme="dark"] .patient-tag {
        background: rgba(34, 197, 94, 0.18);
        color: #86EFAC;
      }
      .patient-ultima-data { font-weight: 600; color: var(--text-secondary); }
      .vaga-badge-mini {
        font-size: 0.65em; font-weight: 700;
        padding: 1px 7px; border-radius: 8px;
        white-space: nowrap;
      }
      .vaga-badge-sus { background: rgba(22, 163, 74, 0.15); color: #15803d; }
      .vaga-badge-particular { background: rgba(37, 99, 235, 0.15); color: #1d4ed8; }
      .vaga-badge-convenio { background: rgba(217, 119, 6, 0.15); color: #b45309; }
      [data-theme="dark"] .vaga-badge-sus { background: rgba(74, 222, 128, 0.20); color: #86EFAC; }
      [data-theme="dark"] .vaga-badge-particular { background: rgba(96, 165, 250, 0.20); color: #93C5FD; }
      [data-theme="dark"] .vaga-badge-convenio { background: rgba(251, 191, 36, 0.20); color: #FDE68A; }
    </style>
  `;
}

function pacientesLista() {
  return {
    all: [],
    filtered: [],
    search: '',
    loading: true,
    enriq: {},   // pacienteId → { nivel, ultimaConsulta, condicoes, carregado }

    async load() {
      this.loading = true;
      try {
        this.all = await DB.listPacientes();
        this.filtered = [...this.all];
      } catch (e) {
        UI.toast('Erro ao carregar: ' + e.message, 'error');
      } finally {
        this.loading = false;
      }
      // Enriquecimento em background (não bloqueia a renderização da lista)
      this.enriquecer();
    },

    async enriquecer() {
      // Para cada paciente, carrega consultas e computa semáforo + última + condições.
      // Processa em paralelo mas atualiza o objeto reativo conforme conclui.
      await Promise.all(this.all.map(async (p) => {
        try {
          const consultas = await DB.listConsultasByPaciente(p.id);
          const info = { carregado: true, nivel: null, ultimaConsulta: null, condicoes: [] };

          // Última consulta (consultas já vêm ordenadas desc por dataHora)
          if (consultas.length > 0) {
            info.ultimaConsulta = consultas[0].dataHora || consultas[0].createdAt || null;
          }

          // Condições crônicas + semáforo Hiperdia
          if (window.Hiperdia) {
            info.condicoes = condicoesCronicas(consultas);
            const cls = Hiperdia.classificarPaciente(consultas);
            info.nivel = cls.detalhes.ehHiperdia ? cls.nivel : null;
          }

          // Atualização reativa
          this.enriq = { ...this.enriq, [p.id]: info };
        } catch (e) {
          this.enriq = { ...this.enriq, [p.id]: { carregado: true, nivel: null, ultimaConsulta: null, condicoes: [] } };
        }
      }));
    },

    filter() {
      const q = (this.search || '').toLowerCase().trim();
      if (!q) {
        this.filtered = [...this.all];
        return;
      }
      this.filtered = this.all.filter(p =>
        (p.nome || '').toLowerCase().includes(q)
      );
    },

    open(id) {
      Router.navigate('/paciente/' + id);
    },

    semaforoIcone(nivel) {
      if (nivel === 'vermelho') return '🔴';
      if (nivel === 'amarelo') return '🟡';
      if (nivel === 'verde') return '🟢';
      return '';
    },

    vagaMini(v) {
      if (v === 'sus') return 'SUS';
      if (v === 'particular') return 'PART';
      if (v === 'convenio') return 'CONV';
      return '';
    },

    rotuloUltima(iso) {
      if (!iso) return '—';
      const dias = window.Hiperdia ? Hiperdia.diasDesde(iso) : null;
      if (dias === null) return new Date(iso).toLocaleDateString('pt-BR');
      if (dias === 0) return 'hoje';
      if (dias === 1) return 'ontem';
      if (dias < 30) return `há ${dias} dias`;
      if (dias < 60) return 'há ~1 mês';
      if (dias < 365) return `há ${Math.floor(dias / 30)} meses`;
      return `há ${Math.floor(dias / 365)} ano(s)`;
    },

    age(d) { return UI.calculateAge(d); },
    initials(n) { return UI.getInitials(n); },
    avatarColor(n) { return UI.avatarColorFromName(n); },
    formatDate(d) {
      if (!d) return '—';
      const date = new Date(d);
      return date.toLocaleDateString('pt-BR');
    }
  };
}

// Mapa de CIAP-2 → rótulo de condição crônica (para tags na lista)
const CONDICOES_CRONICAS_MAP = {
  K86: 'HAS', K87: 'HAS',
  T90: 'DM2', T89: 'DM1',
  T93: 'Dislipidemia',
  T82: 'Obesidade',
  K77: 'Insuf. cardíaca', K76: 'Cardiopatia', K74: 'Angina', K75: 'IAM prévio',
  K90: 'AVC prévio',
  P76: 'Depressão', P74: 'Ansiedade', P70: 'Demência', P15: 'Etilismo',
  R95: 'DPOC', R96: 'Asma',
  U99: 'DRC', U88: 'Nefropatia',
  D97: 'Hepatopatia',
  L88: 'Artrite reumatoide', L95: 'Osteoporose',
  N87: 'Parkinson', N88: 'Epilepsia',
  A79: 'Neoplasia', B72: 'Neoplasia',
  T86: 'Hipotireoidismo', T85: 'Hipertireoidismo'
};

function condicoesCronicas(consultas) {
  const tags = new Set();
  for (const c of (consultas || [])) {
    if (c.deleted) continue;
    for (const h of (c.hipoteses || [])) {
      const cod = window.Hiperdia ? Hiperdia.extrairCodigoCiap(h) : null;
      if (cod) {
        const codUpper = String(cod).toUpperCase();
        if (CONDICOES_CRONICAS_MAP[codUpper]) {
          tags.add(CONDICOES_CRONICAS_MAP[codUpper]);
        }
      }
    }
  }
  return Array.from(tags).slice(0, 5);  // máximo 5 tags
}

if (typeof window !== 'undefined') {
  window.condicoesCronicas = condicoesCronicas;
  window.CONDICOES_CRONICAS_MAP = CONDICOES_CRONICAS_MAP;
}

window.renderPacientesLista = renderPacientesLista;
window.pacientesLista = pacientesLista;
