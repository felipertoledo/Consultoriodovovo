/* ============================================================
   consultas-recentes.js — Sprint v0.18
   Feed cronológico global das últimas consultas de TODOS os
   pacientes (não por paciente). Para retomar o trabalho e ter
   visão panorâmica da atividade clínica recente.
   ============================================================ */

function renderConsultasRecentes(container) {
  container.innerHTML = `
    <div x-data="consultasRecentes()" x-init="carregar()">
      <div class="page-header">
        <div>
          <h1 class="page-title">🕐 Últimas consultas</h1>
          <p class="page-subtitle">
            Atividade clínica recente de todos os pacientes — mais novas primeiro.
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" @click="carregar()" :disabled="loading">
            ↻ Atualizar
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div x-show="loading" class="empty-state" x-cloak>
        <div class="spinner" style="margin: 0 auto"></div>
        <p class="mt-4">Decifrando consultas…</p>
      </div>

      <!-- Vazio -->
      <div x-show="!loading && consultas.length === 0" class="card" x-cloak>
        <h3 class="card-title mb-2">Nenhuma consulta registrada ainda</h3>
        <p class="text-sm muted">As consultas que você registrar aparecerão aqui em ordem cronológica.</p>
      </div>

      <!-- Filtro rápido por texto -->
      <div x-show="!loading && consultas.length > 0" class="search-box" x-cloak>
        <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" class="input" placeholder="Filtrar por paciente ou queixa…"
               x-model="filtro" @input="aplicarFiltro()">
      </div>

      <!-- Feed -->
      <div x-show="!loading && filtradas.length > 0" class="consultas-timeline" x-cloak>
        <template x-for="c in filtradas" :key="c.id">
          <div class="consulta-item consulta-item-v2 consulta-feed-item" @click="abrir(c)">
            <div class="consulta-data consulta-data-v2">
              <div class="consulta-data-day" x-text="dia(c.dataHora)"></div>
              <div class="consulta-data-month" x-text="mes(c.dataHora)"></div>
              <div class="consulta-data-time" x-text="hora(c.dataHora)"></div>
            </div>
            <div class="consulta-info">
              <!-- Nome do paciente em destaque (é o que distingue o feed global) -->
              <div class="consulta-feed-paciente" x-text="c.pacienteNome"></div>
              <div class="consulta-titulo consulta-titulo-v2" style="font-size: 1em;">
                <span x-text="c.queixaPrincipal || 'Consulta'"></span>
                <span x-show="c.queixaDuracao" class="text-sm muted" x-text="' · ' + c.queixaDuracao"></span>
              </div>

              <!-- Chips de hipótese -->
              <div class="consulta-hipoteses-chips" x-show="c.hipoteses && c.hipoteses.length > 0">
                <template x-for="(h, hi) in (c.hipoteses || [])" :key="hi">
                  <span class="consulta-hip-chip">
                    <span x-text="textoHip(h)"></span>
                    <span class="consulta-hip-ciap" x-show="ciapHip(h)" x-text="ciapHip(h)"></span>
                  </span>
                </template>
              </div>

              <!-- Snapshot -->
              <div class="consulta-snapshot">
                <span class="consulta-pill" x-show="paFmt(c)">🩸 PA <span x-text="paFmt(c)"></span></span>
                <span class="consulta-pill" x-show="c.peso">⚖️ <span x-text="c.peso + ' kg'"></span></span>
                <span class="consulta-icon" x-show="temExames(c)" title="Exames laboratoriais">🧪</span>
                <span class="consulta-icon" x-show="temConduta(c)" title="Conduta/prescrição">💊</span>
                <span class="consulta-icon" x-show="c.exameFisicoDescricao" title="Exame físico">🩺</span>
              </div>
            </div>
            <div class="consulta-acoes">
              <button class="btn btn-ghost text-sm">Abrir →</button>
            </div>
          </div>
        </template>
      </div>

      <!-- Filtro sem resultado -->
      <div x-show="!loading && consultas.length > 0 && filtradas.length === 0" class="card" x-cloak>
        <p class="text-sm muted">Nenhuma consulta corresponde ao filtro "<span x-text="filtro"></span>".</p>
      </div>

      <!-- Rodapé: aviso de teto -->
      <div x-show="!loading && consultas.length >= limite" class="text-center mt-4" x-cloak>
        <p class="text-xs muted">
          Mostrando as <span x-text="limite"></span> consultas mais recentes.
          <a href="#" @click.prevent="ampliar()" style="text-decoration: underline;">Carregar mais</a>
        </p>
      </div>

      <style>
        .consulta-feed-item { cursor: pointer; }
        .consulta-feed-paciente {
          font-weight: 700;
          font-size: 1.05em;
          color: var(--color-primary);
          margin-bottom: 2px;
        }
        [data-theme="dark"] .consulta-feed-paciente { color: #4ADE80; }
      </style>
    </div>
  `;
}

function consultasRecentes() {
  return {
    loading: true,
    consultas: [],
    filtradas: [],
    filtro: '',
    limite: 50,

    async carregar() {
      this.loading = true;
      try {
        this.consultas = await DB.listConsultasRecentes(this.limite);
        this.aplicarFiltro();
      } catch (e) {
        UI.toast('Erro ao carregar consultas: ' + e.message, 'error');
        this.consultas = [];
        this.filtradas = [];
      } finally {
        this.loading = false;
      }
    },

    ampliar() {
      this.limite += 50;
      this.carregar();
    },

    aplicarFiltro() {
      const q = (this.filtro || '').toLowerCase().trim();
      if (!q) {
        this.filtradas = [...this.consultas];
        return;
      }
      this.filtradas = this.consultas.filter(c => {
        const nome = (c.pacienteNome || '').toLowerCase();
        const queixa = (c.queixaPrincipal || '').toLowerCase();
        const hips = (c.hipoteses || []).map(h => this.textoHip(h).toLowerCase()).join(' ');
        return nome.includes(q) || queixa.includes(q) || hips.includes(q);
      });
    },

    abrir(c) {
      Router.navigate('/paciente/' + c.pacienteId + '/consulta/' + c.id);
    },

    // ---- Formatadores de data ----
    dia(iso) { return iso ? new Date(iso).getDate().toString().padStart(2, '0') : '?'; },
    mes(iso) {
      if (!iso) return '';
      const m = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
      return m[new Date(iso).getMonth()] + '/' + new Date(iso).getFullYear().toString().slice(-2);
    },
    hora(iso) {
      return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    },

    // ---- Helpers clínicos (reusam lógica da timeline) ----
    textoHip(h) {
      if (window.CodigosClinicos) return CodigosClinicos.textoDe(h);
      if (typeof h === 'string') return h;
      return (h && h.texto) || '';
    },
    ciapHip(h) {
      if (window.CodigosClinicos) {
        const c = CodigosClinicos.ciapDe(h);
        if (c && c.codigo) return c.codigo;
      }
      if (window.Hiperdia) return Hiperdia.extrairCodigoCiap(h) || '';
      return '';
    },
    paFmt(c) {
      if (!c || !c.pa) return '';
      if (window.Hiperdia) {
        const p = Hiperdia.parsePA(c.pa);
        if (p) return p.sistolica + '×' + p.diastolica;
      }
      return String(c.pa).length <= 12 ? c.pa : '';
    },
    temExames(c) {
      if (!c || !c.exames) return false;
      for (const cat of Object.keys(c.exames)) {
        const grupo = c.exames[cat];
        if (!grupo || typeof grupo !== 'object') continue;
        for (const campo of Object.keys(grupo)) {
          const v = grupo[campo];
          if (v !== null && v !== undefined && v !== '' && v !== false) return true;
        }
      }
      return false;
    },
    temConduta(c) {
      return !!(c && (c.conduta || (c.prescricao && c.prescricao.length)));
    }
  };
}

window.renderConsultasRecentes = renderConsultasRecentes;
window.consultasRecentes = consultasRecentes;
