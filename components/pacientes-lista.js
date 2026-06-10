/* ============================================================
   pacientes-lista.js — Listagem e busca de pacientes
   Redesign "Botica Moderna" v2: o fichário vivo.
   Lombada = semáforo Hiperdia. Tags clínicas viram filtros.
   Sparkline de PA sistólica em cada pasta (linha de 140 mmHg
   como referência). Ordenação por nome, última consulta ou risco.
   ============================================================ */

function renderPacientesLista(container) {
  container.innerHTML = `
    <div x-data="pacientesLista()" x-init="load()">
      <div class="page-header">
        <div>
          <p class="eyebrow">Fichário</p>
          <h1 class="page-title">Pacientes</h1>
          <p class="page-subtitle">
            <span x-text="filtered.length"></span> de <span x-text="all.length"></span> pacientes
            <span x-show="filtroCond || filtroVaga" class="text-mono"> · filtro ativo</span>
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" @click="$dispatch('navigate', '/paciente/novo')">
            <svg class="icon"><use href="#i-plus"></use></svg>
            Novo paciente
          </button>
        </div>
      </div>

      <!-- Busca + ordenação -->
      <div class="toolbar-row">
        <div class="search-box">
          <svg class="search-icon"><use href="#i-search"></use></svg>
          <input type="text" class="input" placeholder="Buscar por nome…  (ou Ctrl+K em qualquer tela)"
                 x-model="search" @input="filter()">
        </div>
        <select class="select-sm" x-model="ordem" @change="filter()" title="Ordenar fichário">
          <option value="nome">A → Z</option>
          <option value="ultima">Última consulta</option>
          <option value="risco">Risco Hiperdia</option>
        </select>
      </div>

      <!-- Chips: condições crônicas + vaga -->
      <div class="chip-row" x-show="!loading && (condicoesChips().length > 0 || vagaChips().length > 0)">
        <span class="chip-row-label">Filtrar:</span>
        <template x-for="c in condicoesChips()" :key="'cond-' + c.rotulo">
          <button class="chip" :class="{ active: filtroCond === c.rotulo }"
                  @click="toggleCond(c.rotulo)">
            <span x-text="c.rotulo"></span>
            <span class="count" x-text="c.n"></span>
          </button>
        </template>
        <template x-for="v in vagaChips()" :key="'vaga-' + v.tipo">
          <button class="chip" :class="{ active: filtroVaga === v.tipo }"
                  @click="toggleVaga(v.tipo)">
            <span x-text="v.rotulo"></span>
            <span class="count" x-text="v.n"></span>
          </button>
        </template>
        <button class="chip" x-show="filtroCond || filtroVaga" @click="limparFiltros()">
          <svg class="icon" style="width: 11px; height: 11px"><use href="#i-x"></use></svg>
          limpar
        </button>
      </div>

      <!-- Skeleton: pastas-fantasma enquanto decifra -->
      <div x-show="loading" class="patient-list" aria-hidden="true">
        <template x-for="i in 6" :key="'skel-' + i">
          <div class="skel-card">
            <div class="skel skel-circle"></div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 8px">
              <div class="skel skel-line w40"></div>
              <div class="skel skel-line w60"></div>
            </div>
            <div class="skel skel-line w25" style="width: 70px"></div>
          </div>
        </template>
      </div>

      <div x-show="!loading && filtered.length === 0 && all.length === 0" class="empty-state">
        <svg class="empty-illo" viewBox="0 0 120 96" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 30v44a6 6 0 0 0 6 6h80a6 6 0 0 0 6-6V36a6 6 0 0 0-6-6H62l-8-9H20a6 6 0 0 0-6 6z"/>
          <path d="M60 44v24" stroke-width="3"/>
          <path d="M60 50c-3.4-1.4-5.6-4-6.3-7.4 3.5.3 6 1.9 7.4 4.8M60 50c3.4-1.4 5.6-4 6.3-7.4-3.5.3-6 1.9-7.4 4.8" stroke-width="2.4"/>
          <path d="M54 68h12" stroke-width="3"/>
        </svg>
        <h3>Nenhum paciente cadastrado ainda</h3>
        <p>Comece adicionando o primeiro paciente.</p>
        <button class="btn btn-primary mt-4" @click="$dispatch('navigate', '/paciente/novo')">
          <svg class="icon"><use href="#i-plus"></use></svg>
          Cadastrar primeiro paciente
        </button>
      </div>

      <div x-show="!loading && filtered.length === 0 && all.length > 0" class="empty-state">
        <svg class="icon"><use href="#i-search"></use></svg>
        <h3>Nenhum paciente encontrado</h3>
        <p>Tente outro termo de busca<span x-show="filtroCond || filtroVaga"> ou limpe os filtros</span>.</p>
        <button class="btn btn-secondary mt-4" x-show="filtroCond || filtroVaga" @click="limparFiltros()">
          Limpar filtros
        </button>
      </div>

      <div class="patient-list" x-show="!loading && filtered.length > 0">
        <template x-for="p in filtered" :key="p.id">
          <div class="patient-card" @click="open(p.id)"
               :style="'--spine-color: ' + spineColor(enriq[p.id] && enriq[p.id].nivel)">
            <div class="patient-avatar"
                 :style="'background: ' + avatarColor(p.nome)"
                 x-text="initials(p.nome)"></div>
            <div class="patient-info">
              <div class="patient-name-row">
                <span class="patient-name" x-text="p.nome"></span>
                <span class="patient-semaforo"
                      x-show="enriq[p.id] && enriq[p.id].nivel && enriq[p.id].nivel !== 'cinza'"
                      :class="'dot-' + (enriq[p.id] && enriq[p.id].nivel)"
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
              <!-- Tags de condições crônicas (clicáveis → viram filtro) -->
              <div class="patient-tags" x-show="enriq[p.id] && enriq[p.id].condicoes && enriq[p.id].condicoes.length > 0">
                <template x-for="cond in (enriq[p.id] ? enriq[p.id].condicoes : [])" :key="cond">
                  <span class="patient-tag" x-text="cond"
                        style="cursor: pointer"
                        :title="'Filtrar por ' + cond"
                        @click.stop="toggleCond(cond)"></span>
                </template>
              </div>
            </div>

            <!-- Tendência de PA sistólica (referência: 140 mmHg) -->
            <div class="patient-spark"
                 x-show="enriq[p.id] && enriq[p.id].paSerie && enriq[p.id].paSerie.length >= 3"
                 :title="tituloSpark(enriq[p.id])">
              <span class="spark" x-html="sparkPA(enriq[p.id])"></span>
              <span class="spark-label">PA sist.</span>
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
  `;
}

function pacientesLista() {
  return {
    all: [],
    filtered: [],
    search: '',
    loading: true,
    enriq: {},        // pacienteId → { nivel, ultimaConsulta, condicoes, paSerie, carregado }
    filtroCond: null, // rótulo de condição crônica ativa (ex.: 'HAS')
    filtroVaga: null, // 'sus' | 'particular' | 'convenio'
    ordem: 'nome',    // 'nome' | 'ultima' | 'risco'

    async load() {
      this.loading = true;
      try {
        this.all = await DB.listPacientes();
        this.filtered = [...this.all];
        this.aplicarOrdem();
      } catch (e) {
        UI.toast('Erro ao carregar: ' + e.message, 'error');
      } finally {
        this.loading = false;
      }
      // Enriquecimento em background (não bloqueia a renderização da lista)
      this.enriquecer();
    },

    async enriquecer() {
      // Para cada paciente, carrega consultas e computa semáforo + última +
      // condições + série de PA sistólica (cronológica, até 8 pontos).
      // Processa em paralelo mas atualiza o objeto reativo conforme conclui.
      await Promise.all(this.all.map(async (p) => {
        try {
          const consultas = await DB.listConsultasByPaciente(p.id);
          const info = { carregado: true, nivel: null, ultimaConsulta: null, condicoes: [], paSerie: [] };

          // Última consulta (consultas já vêm ordenadas desc por dataHora)
          if (consultas.length > 0) {
            info.ultimaConsulta = consultas[0].dataHora || consultas[0].createdAt || null;
          }

          // Condições crônicas + semáforo Hiperdia
          if (window.Hiperdia) {
            info.condicoes = condicoesCronicas(consultas);
            const cls = Hiperdia.classificarPaciente(consultas);
            info.nivel = cls.detalhes.ehHiperdia ? cls.nivel : null;

            // Série de PA sistólica em ordem cronológica (antiga → recente)
            const cron = [...consultas]
              .filter(c => !c.deleted)
              .sort((a, b) =>
                new Date(a.dataHora || a.createdAt || 0) - new Date(b.dataHora || b.createdAt || 0));
            const serie = [];
            for (const c of cron) {
              const pa = Hiperdia.parsePA(c.pa);
              if (pa && typeof pa.sistolica === 'number') serie.push(pa.sistolica);
            }
            info.paSerie = serie.slice(-8);
          }

          // Atualização reativa
          this.enriq = { ...this.enriq, [p.id]: info };
        } catch (e) {
          this.enriq = { ...this.enriq, [p.id]: { carregado: true, nivel: null, ultimaConsulta: null, condicoes: [], paSerie: [] } };
        }
      }));
      // Reaplica filtro/ordenação agora que risco, última e condições existem
      this.filter();
    },

    filter() {
      const q = (this.search || '').toLowerCase().trim();
      this.filtered = this.all.filter(p => {
        if (q && !(p.nome || '').toLowerCase().includes(q)) return false;
        if (this.filtroVaga && p.tipoVaga !== this.filtroVaga) return false;
        if (this.filtroCond) {
          const info = this.enriq[p.id];
          if (!info || !(info.condicoes || []).includes(this.filtroCond)) return false;
        }
        return true;
      });
      this.aplicarOrdem();
    },

    aplicarOrdem() {
      const rankNivel = { vermelho: 0, amarelo: 1, verde: 2 };
      if (this.ordem === 'ultima') {
        this.filtered.sort((a, b) => {
          const ua = (this.enriq[a.id] || {}).ultimaConsulta;
          const ub = (this.enriq[b.id] || {}).ultimaConsulta;
          if (!ua && !ub) return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
          if (!ua) return 1;
          if (!ub) return -1;
          return new Date(ub) - new Date(ua);
        });
      } else if (this.ordem === 'risco') {
        this.filtered.sort((a, b) => {
          const ra = rankNivel[(this.enriq[a.id] || {}).nivel] ?? 3;
          const rb = rankNivel[(this.enriq[b.id] || {}).nivel] ?? 3;
          if (ra !== rb) return ra - rb;
          return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
        });
      } else {
        this.filtered.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
      }
    },

    // ---- Chips ----
    condicoesChips() {
      const contagem = {};
      for (const p of this.all) {
        const info = this.enriq[p.id];
        for (const c of (info && info.condicoes) || []) {
          contagem[c] = (contagem[c] || 0) + 1;
        }
      }
      return Object.entries(contagem)
        .map(([rotulo, n]) => ({ rotulo, n }))
        .sort((a, b) => b.n - a.n || a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
        .slice(0, 8);
    },

    vagaChips() {
      const contagem = { sus: 0, particular: 0, convenio: 0 };
      for (const p of this.all) {
        if (p.tipoVaga && contagem[p.tipoVaga] !== undefined) contagem[p.tipoVaga]++;
      }
      const rotulos = { sus: 'SUS', particular: 'Particular', convenio: 'Convênio' };
      return Object.entries(contagem)
        .filter(([, n]) => n > 0)
        .map(([tipo, n]) => ({ tipo, rotulo: rotulos[tipo], n }));
    },

    toggleCond(rotulo) {
      this.filtroCond = this.filtroCond === rotulo ? null : rotulo;
      this.filter();
    },

    toggleVaga(tipo) {
      this.filtroVaga = this.filtroVaga === tipo ? null : tipo;
      this.filter();
    },

    limparFiltros() {
      this.filtroCond = null;
      this.filtroVaga = null;
      this.filter();
    },

    open(id) {
      Router.navigate('/paciente/' + id);
    },

    // ---- Sparkline de PA ----
    sparkPA(info) {
      if (!window.Sparkline || !info || !info.paSerie || info.paSerie.length < 3) return '';
      return Sparkline.line(info.paSerie, { w: 88, h: 24, ref: 140 });
    },

    tituloSpark(info) {
      if (!info || !info.paSerie || !info.paSerie.length) return '';
      const ultima = info.paSerie[info.paSerie.length - 1];
      return `PA sistólica — últimas ${info.paSerie.length} medidas · atual ${ultima} mmHg · linha tracejada: 140`;
    },

    // Cor da lombada (spine) conforme semáforo Hiperdia
    spineColor(nivel) {
      if (nivel === 'vermelho') return 'var(--semaforo-vermelho)';
      if (nivel === 'amarelo') return 'var(--semaforo-amarelo)';
      if (nivel === 'verde') return 'var(--semaforo-verde)';
      return 'var(--border-default)';
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
