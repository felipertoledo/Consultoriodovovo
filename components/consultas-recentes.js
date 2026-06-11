/* ============================================================
   consultas-recentes.js — Sprint v0.18
   Feed cronológico global das últimas consultas de TODOS os
   pacientes (não por paciente). Para retomar o trabalho e ter
   visão panorâmica da atividade clínica recente.
   ============================================================ */

function renderConsultasRecentes(container) {
  container.innerHTML = `
    <div x-data="consultasRecentes()" x-init="carregar()">
      <div class="ficha-head">
        <div class="ficha-id">
          <div class="ficha-nome">Últimas consultas</div>
          <div class="ficha-sub">Atividade clínica recente de todos os pacientes — mais novas primeiro</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" @click="carregar()" :disabled="loading">
            <svg class="icon"><use href="#i-sync"></use></svg>
            Atualizar
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div x-show="loading" x-cloak aria-hidden="true">
        <div class="skel" style="height: 64px; margin-bottom: 10px"></div>
        <div class="skel" style="height: 64px; margin-bottom: 10px"></div>
        <div class="skel" style="height: 64px"></div>
      </div>

      <!-- Vazio -->
      <div x-show="!loading && consultas.length === 0" class="folha" x-cloak>
        <div class="empty-state" style="padding: var(--space-7) 0">
          <h3>Nenhuma consulta registrada ainda</h3>
          <p class="text-sm muted mt-2">As consultas que você registrar aparecerão aqui em ordem cronológica.</p>
        </div>
      </div>

      <!-- Filtro rápido por texto -->
      <div x-show="!loading && consultas.length > 0" class="search-box mb-4" x-cloak>
        <svg class="search-icon icon"><use href="#i-search"></use></svg>
        <input type="text" class="input" placeholder="Filtrar por paciente ou queixa…"
               x-model="filtro" @input="aplicarFiltro()">
      </div>

      <!-- Feed (ledger) -->
      <div x-show="!loading && filtradas.length > 0" class="folha" x-cloak>
        <div class="ledger">
          <template x-for="c in filtradas" :key="c.id">
            <div class="ledger-item" style="cursor: pointer" @click="abrir(c)">
              <div class="ledger-date">
                <div style="font-weight: var(--weight-bold); color: var(--text-primary)"
                     x-text="dia(c.dataHora) + ' ' + mes(c.dataHora)"></div>
                <div x-text="hora(c.dataHora)"></div>
              </div>
              <div class="ledger-body">
                <div style="font-weight: var(--weight-bold); color: var(--color-primary-700)"
                     class="consulta-feed-paciente" x-text="c.pacienteNome"></div>
                <div style="font-weight: var(--weight-medium)">
                  <span x-text="c.queixaPrincipal || 'Consulta'"></span>
                  <span x-show="c.queixaDuracao" class="text-sm muted" x-text="' · ' + c.queixaDuracao"></span>
                </div>

                <div class="flex gap-2 mt-2" style="flex-wrap: wrap" x-show="c.hipoteses && c.hipoteses.length > 0">
                  <template x-for="(h, hi) in (c.hipoteses || [])" :key="hi">
                    <span class="consulta-hip-chip">
                      <span x-text="textoHip(h)"></span>
                      <span class="code-pill ciap" style="margin-left: 0" x-show="ciapHip(h)" x-text="ciapHip(h)"></span>
                    </span>
                  </template>
                </div>

                <div class="flex items-center gap-2 mt-2" style="flex-wrap: wrap">
                  <span class="snap-pill pa" x-show="paFmt(c)">
                    <svg class="icon"><use href="#i-vitals"></use></svg>
                    PA <span x-text="paFmt(c)"></span>
                  </span>
                  <span class="snap-pill" x-show="c.peso"><span x-text="c.peso + ' kg'"></span></span>
                  <span class="snap-icons">
                    <svg class="icon" x-show="temExames(c)"><title>Exames laboratoriais</title><use href="#i-flask"></use></svg>
                    <svg class="icon" x-show="temConduta(c)"><title>Conduta/prescrição</title><use href="#i-pill"></use></svg>
                    <svg class="icon" x-show="c.exameFisicoDescricao"><title>Exame físico</title><use href="#i-heart-pulse"></use></svg>
                  </span>
                </div>
              </div>
              <svg class="icon" style="width: 14px; height: 14px; color: var(--text-muted); align-self: center"><use href="#i-chevron-right"></use></svg>
            </div>
          </template>
        </div>
      </div>

      <!-- Filtro sem resultado -->
      <div x-show="!loading && consultas.length > 0 && filtradas.length === 0" class="folha" x-cloak>
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
        [data-theme="dark"] .consulta-feed-paciente { color: var(--color-primary) !important; }
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
