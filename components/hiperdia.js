/* ================================================================
   components/hiperdia.js — Sprint B3
   Painel Hiperdia: lista de pacientes em acompanhamento de HAS/DM2
   com semáforo de descompensação e priorização clínica.
   ================================================================ */

function renderHiperdia(container) {
  container.innerHTML = `
    <div x-data="hiperdiaComponent()" x-init="carregar()">
      <div class="page-header">
        <h1 class="page-title">🩺 Painel Hiperdia</h1>
        <p class="page-subtitle">
          Acompanhamento de pacientes com hipertensão (K86/K87) e diabetes (T90).
          Semáforo baseado em PA, HbA1c e tempo desde última consulta.
        </p>
      </div>

      <!-- Loading -->
      <div x-show="loading" class="card" x-cloak>
        <p>Carregando dados de Hiperdia…</p>
      </div>

      <!-- Vazio -->
      <div x-show="!loading && lista.length === 0" class="card" x-cloak>
        <h3 class="card-title mb-3">Nenhum paciente Hiperdia ainda</h3>
        <p class="text-sm">
          Pacientes aparecem aqui quando recebem hipóteses com CIAP-2:
        </p>
        <ul class="text-sm" style="margin: 8px 0 0 24px;">
          <li><strong>K86</strong> — Hipertensão sem complicação</li>
          <li><strong>K87</strong> — Hipertensão com complicação</li>
          <li><strong>T90</strong> — Diabetes mellitus tipo 2</li>
        </ul>
      </div>

      <!-- Estatísticas + filtros -->
      <div x-show="!loading && lista.length > 0" x-cloak>
        <!-- Card resumo (semáforo agregado) -->
        <div class="card mb-3">
          <h3 class="card-title mb-3">📊 Resumo do território</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-3);">
            <div class="hiperdia-stat" :class="filtroNivel === 'todos' ? 'selected' : ''" @click="filtroNivel = 'todos'">
              <div class="hiperdia-stat-num" x-text="resumo.total"></div>
              <div class="hiperdia-stat-label">Total Hiperdia</div>
            </div>
            <div class="hiperdia-stat hiperdia-vermelho" :class="filtroNivel === 'vermelho' ? 'selected' : ''" @click="filtroNivel = 'vermelho'">
              <div class="hiperdia-stat-num" x-text="resumo.vermelho"></div>
              <div class="hiperdia-stat-label">🔴 Descompensados</div>
            </div>
            <div class="hiperdia-stat hiperdia-amarelo" :class="filtroNivel === 'amarelo' ? 'selected' : ''" @click="filtroNivel = 'amarelo'">
              <div class="hiperdia-stat-num" x-text="resumo.amarelo"></div>
              <div class="hiperdia-stat-label">🟡 Atenção</div>
            </div>
            <div class="hiperdia-stat hiperdia-verde" :class="filtroNivel === 'verde' ? 'selected' : ''" @click="filtroNivel = 'verde'">
              <div class="hiperdia-stat-num" x-text="resumo.verde"></div>
              <div class="hiperdia-stat-label">🟢 Controlados</div>
            </div>
          </div>
        </div>

        <!-- Filtro de condição -->
        <div class="card mb-3">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <strong style="font-size: 0.9em;">Condição:</strong>
            <button class="btn btn-sm" :class="filtroCondicao === 'todas' ? 'btn-primary' : ''"
                    @click="filtroCondicao = 'todas'">Todas</button>
            <button class="btn btn-sm" :class="filtroCondicao === 'has' ? 'btn-primary' : ''"
                    @click="filtroCondicao = 'has'">Só HAS</button>
            <button class="btn btn-sm" :class="filtroCondicao === 'dm' ? 'btn-primary' : ''"
                    @click="filtroCondicao = 'dm'">Só DM</button>
            <button class="btn btn-sm" :class="filtroCondicao === 'ambos' ? 'btn-primary' : ''"
                    @click="filtroCondicao = 'ambos'">HAS + DM</button>
            <span class="text-xs muted" style="margin-left: auto;"
                  x-text="listaFiltrada.length + ' paciente(s) listado(s)'"></span>
          </div>
        </div>

        <!-- Lista de pacientes -->
        <div x-show="listaFiltrada.length === 0" class="card" x-cloak>
          <p class="text-sm muted">Nenhum paciente com este filtro.</p>
        </div>

        <template x-for="item in listaFiltrada" :key="item.paciente.id">
          <div class="card mb-2 hiperdia-card"
               :class="'hiperdia-card-' + item.classificacao.nivel"
               @click="abrir(item.paciente.id)"
               style="cursor: pointer;">
            <div style="display: flex; gap: 16px; align-items: flex-start;">
              <!-- Indicador de nível -->
              <div class="hiperdia-bullet" :class="'hiperdia-bullet-' + item.classificacao.nivel"
                   x-text="iconeNivel(item.classificacao.nivel)"></div>

              <!-- Info principal -->
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; font-size: 1.05em; margin-bottom: 4px;"
                     x-text="item.paciente.nome"></div>
                <div class="text-sm muted" style="margin-bottom: 8px;">
                  <span x-text="(item.paciente.dataNascimento ? idade(item.paciente.dataNascimento) + ' anos · ' : '')"></span>
                  <span x-text="rotuloCondicoes(item.classificacao.detalhes)"></span>
                </div>

                <!-- Motivos (semáforo detalhado) -->
                <div class="hiperdia-motivos">
                  <template x-for="m in item.classificacao.motivos" :key="m.razao">
                    <div class="hiperdia-motivo" :class="'hiperdia-motivo-' + m.nivel">
                      <span x-text="iconeNivel(m.nivel)"></span>
                      <span x-text="m.razao"></span>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Ação -->
              <div style="flex-shrink: 0;">
                <button class="btn btn-ghost btn-sm" @click.stop="abrir(item.paciente.id)">
                  Abrir →
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <style>
      .hiperdia-stat {
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-surface);
        text-align: center;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .hiperdia-stat:hover { border-color: var(--color-primary); }
      .hiperdia-stat.selected {
        border-color: var(--color-primary);
        background: rgba(34, 197, 94, 0.06);
      }
      [data-theme="dark"] .hiperdia-stat.selected {
        background: rgba(34, 197, 94, 0.10);
      }
      .hiperdia-stat-num {
        font-size: 1.8em;
        font-weight: 700;
        color: var(--color-primary);
      }
      .hiperdia-stat-label {
        font-size: 0.8em;
        color: var(--text-secondary);
      }
      .hiperdia-vermelho .hiperdia-stat-num { color: #DC2626; }
      .hiperdia-amarelo .hiperdia-stat-num { color: #D97706; }
      .hiperdia-verde .hiperdia-stat-num { color: #16A34A; }
      [data-theme="dark"] .hiperdia-vermelho .hiperdia-stat-num { color: #F87171; }
      [data-theme="dark"] .hiperdia-amarelo .hiperdia-stat-num { color: #FBBF24; }
      [data-theme="dark"] .hiperdia-verde .hiperdia-stat-num { color: #4ADE80; }

      .hiperdia-card { transition: all 0.15s ease; }
      .hiperdia-card:hover { transform: translateX(2px); }

      .hiperdia-card-vermelho { border-left: 4px solid #DC2626; }
      .hiperdia-card-amarelo  { border-left: 4px solid #D97706; }
      .hiperdia-card-verde    { border-left: 4px solid #16A34A; }
      .hiperdia-card-cinza    { border-left: 4px solid #94A3B8; }

      .hiperdia-bullet {
        flex-shrink: 0;
        width: 32px; height: 32px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.2em;
      }
      .hiperdia-bullet-vermelho { background: rgba(220, 38, 38, 0.12); }
      .hiperdia-bullet-amarelo  { background: rgba(217, 119, 6, 0.12); }
      .hiperdia-bullet-verde    { background: rgba(22, 163, 74, 0.12); }
      .hiperdia-bullet-cinza    { background: rgba(148, 163, 184, 0.12); }
      [data-theme="dark"] .hiperdia-bullet-vermelho { background: rgba(248, 113, 113, 0.20); }
      [data-theme="dark"] .hiperdia-bullet-amarelo  { background: rgba(251, 191, 36, 0.20); }
      [data-theme="dark"] .hiperdia-bullet-verde    { background: rgba(74, 222, 128, 0.20); }

      .hiperdia-motivos {
        display: flex; flex-direction: column; gap: 4px;
        margin-top: 4px;
      }
      .hiperdia-motivo {
        font-size: 0.85em;
        display: flex; gap: 6px; align-items: center;
      }
      .hiperdia-motivo-vermelho { color: #B91C1C; }
      .hiperdia-motivo-amarelo  { color: #B45309; }
      .hiperdia-motivo-verde    { color: #15803D; }
      .hiperdia-motivo-cinza    { color: var(--text-muted); }
      [data-theme="dark"] .hiperdia-motivo-vermelho { color: #FCA5A5; }
      [data-theme="dark"] .hiperdia-motivo-amarelo  { color: #FDE68A; }
      [data-theme="dark"] .hiperdia-motivo-verde    { color: #86EFAC; }
    </style>
  `;
}

function hiperdiaComponent() {
  return {
    loading: true,
    lista: [],          // [{ paciente, classificacao }]
    resumo: { total: 0, verde: 0, amarelo: 0, vermelho: 0, cinza: 0 },
    filtroNivel: 'todos',     // 'todos' | 'verde' | 'amarelo' | 'vermelho'
    filtroCondicao: 'todas',  // 'todas' | 'has' | 'dm' | 'ambos'

    async carregar() {
      this.loading = true;
      try {
        const pacientes = await DB.listPacientes();
        // Lê consultas de cada paciente em paralelo
        const consultasPorPaciente = {};
        await Promise.all(pacientes.map(async (p) => {
          if (p.deleted) return;
          try {
            consultasPorPaciente[p.id] = await DB.listConsultasByPaciente(p.id);
          } catch (e) {
            consultasPorPaciente[p.id] = [];
          }
        }));

        const bruta = Hiperdia.listarHiperdia(pacientes, consultasPorPaciente);
        this.lista = Hiperdia.ordenarPorPrioridade(bruta);
        this.resumo = Hiperdia.resumirHiperdia(this.lista);
      } catch (e) {
        UI.toast('Erro ao carregar painel Hiperdia: ' + e.message, 'error');
        this.lista = [];
      } finally {
        this.loading = false;
      }
    },

    get listaFiltrada() {
      return this.lista.filter(item => {
        // Filtro por nível
        if (this.filtroNivel !== 'todos' && item.classificacao.nivel !== this.filtroNivel) {
          return false;
        }
        // Filtro por condição
        const d = item.classificacao.detalhes;
        if (this.filtroCondicao === 'has' && !d.temHAS) return false;
        if (this.filtroCondicao === 'dm' && !d.temDM) return false;
        if (this.filtroCondicao === 'ambos' && !(d.temHAS && d.temDM)) return false;
        return true;
      });
    },

    iconeNivel(nivel) {
      if (nivel === 'vermelho') return '🔴';
      if (nivel === 'amarelo') return '🟡';
      if (nivel === 'verde') return '🟢';
      return '⚪';
    },

    rotuloCondicoes(detalhes) {
      const cond = [];
      if (detalhes.temHAS) cond.push('HAS');
      if (detalhes.temDM) cond.push('DM2');
      return cond.join(' + ');
    },

    idade(dn) {
      if (!dn) return '?';
      try { return UI.calcAge(dn); } catch (_) { return '?'; }
    },

    abrir(pid) {
      Router.navigate('/paciente/' + pid);
    }
  };
}

window.renderHiperdia = renderHiperdia;
window.hiperdiaComponent = hiperdiaComponent;
