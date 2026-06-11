/* ================================================================
   components/hiperdia.js — Painel Hiperdia
   Prancheta v3: board de triagem. Quatro colunas semafóricas
   (descompensados → controlados → sem dados), cards de paciente
   com motivos clínicos. Filtro segmentado por condição.
   ================================================================ */

function renderHiperdia(container) {
  container.innerHTML = `
    <div x-data="hiperdiaComponent()" x-init="carregar()">
      <div class="ficha-head">
        <div class="ficha-id">
          <div class="ficha-nome">Painel Hiperdia</div>
          <div class="ficha-sub">
            HAS (K86/K87) e diabetes (T90) · semáforo por PA, HbA1c e tempo desde a última consulta
          </div>
        </div>
        <div class="page-actions">
          <div class="seg" role="tablist" aria-label="Filtro de condição">
            <button :class="filtroCondicao === 'todas' ? 'on' : ''" @click="filtroCondicao = 'todas'">Todas</button>
            <button :class="filtroCondicao === 'has' ? 'on' : ''" @click="filtroCondicao = 'has'">HAS</button>
            <button :class="filtroCondicao === 'dm' ? 'on' : ''" @click="filtroCondicao = 'dm'">DM</button>
            <button :class="filtroCondicao === 'ambos' ? 'on' : ''" @click="filtroCondicao = 'ambos'">HAS+DM</button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div x-show="loading" x-cloak aria-hidden="true">
        <div class="board">
          <div class="skel" style="height: 180px"></div>
          <div class="skel" style="height: 180px"></div>
          <div class="skel" style="height: 180px"></div>
        </div>
      </div>

      <!-- Vazio -->
      <div x-show="!loading && lista.length === 0" class="folha" x-cloak>
        <div class="empty-state" style="padding: var(--space-7) 0">
          <h3>Nenhum paciente Hiperdia ainda</h3>
          <p class="text-sm mt-2">
            Pacientes aparecem aqui quando recebem hipóteses com CIAP-2
            <strong class="text-mono">K86</strong> (HAS sem complicação),
            <strong class="text-mono">K87</strong> (HAS com complicação) ou
            <strong class="text-mono">T90</strong> (DM2).
          </p>
        </div>
      </div>

      <!-- Board de triagem -->
      <div x-show="!loading && lista.length > 0" x-cloak>
        <p class="text-xs muted mb-3 text-mono">
          <span x-text="listaFiltrada.length"></span> de <span x-text="resumo.total"></span> paciente(s) no filtro atual
        </p>

        <div class="board">
          <div class="board-col col-vermelho">
            <div class="board-col-head">
              Descompensados
              <span class="count" x-text="porNivel('vermelho').length"></span>
            </div>
            <div class="board-cards">
              <template x-for="item in porNivel('vermelho')" :key="item.paciente.id">
                <div class="board-card" @click="abrir(item.paciente.id)">
                  <div class="bc-nome" x-text="item.paciente.nome"></div>
                  <div class="bc-razao">
                    <template x-for="m in item.classificacao.motivos" :key="m.razao">
                      <div x-text="m.razao"></div>
                    </template>
                  </div>
                  <div class="bc-foot">
                    <span x-text="(item.paciente.dataNascimento ? idade(item.paciente.dataNascimento) + 'a' : '')"></span>
                    <span x-text="rotuloCondicoes(item.classificacao.detalhes)"></span>
                  </div>
                </div>
              </template>
              <div class="board-empty" x-show="porNivel('vermelho').length === 0">ninguém descompensado</div>
            </div>
          </div>

          <div class="board-col col-amarelo">
            <div class="board-col-head">
              Atenção
              <span class="count" x-text="porNivel('amarelo').length"></span>
            </div>
            <div class="board-cards">
              <template x-for="item in porNivel('amarelo')" :key="item.paciente.id">
                <div class="board-card" @click="abrir(item.paciente.id)">
                  <div class="bc-nome" x-text="item.paciente.nome"></div>
                  <div class="bc-razao">
                    <template x-for="m in item.classificacao.motivos" :key="m.razao">
                      <div x-text="m.razao"></div>
                    </template>
                  </div>
                  <div class="bc-foot">
                    <span x-text="(item.paciente.dataNascimento ? idade(item.paciente.dataNascimento) + 'a' : '')"></span>
                    <span x-text="rotuloCondicoes(item.classificacao.detalhes)"></span>
                  </div>
                </div>
              </template>
              <div class="board-empty" x-show="porNivel('amarelo').length === 0">nenhum alerta</div>
            </div>
          </div>

          <div class="board-col col-verde">
            <div class="board-col-head">
              Controlados
              <span class="count" x-text="porNivel('verde').length"></span>
            </div>
            <div class="board-cards">
              <template x-for="item in porNivel('verde')" :key="item.paciente.id">
                <div class="board-card" @click="abrir(item.paciente.id)">
                  <div class="bc-nome" x-text="item.paciente.nome"></div>
                  <div class="bc-razao">
                    <template x-for="m in item.classificacao.motivos" :key="m.razao">
                      <div x-text="m.razao"></div>
                    </template>
                  </div>
                  <div class="bc-foot">
                    <span x-text="(item.paciente.dataNascimento ? idade(item.paciente.dataNascimento) + 'a' : '')"></span>
                    <span x-text="rotuloCondicoes(item.classificacao.detalhes)"></span>
                  </div>
                </div>
              </template>
              <div class="board-empty" x-show="porNivel('verde').length === 0">—</div>
            </div>
          </div>

          <div class="board-col col-cinza" x-show="porNivel('cinza').length > 0">
            <div class="board-col-head">
              Sem dados recentes
              <span class="count" x-text="porNivel('cinza').length"></span>
            </div>
            <div class="board-cards">
              <template x-for="item in porNivel('cinza')" :key="item.paciente.id">
                <div class="board-card" @click="abrir(item.paciente.id)">
                  <div class="bc-nome" x-text="item.paciente.nome"></div>
                  <div class="bc-razao">
                    <template x-for="m in item.classificacao.motivos" :key="m.razao">
                      <div x-text="m.razao"></div>
                    </template>
                  </div>
                  <div class="bc-foot">
                    <span x-text="(item.paciente.dataNascimento ? idade(item.paciente.dataNascimento) + 'a' : '')"></span>
                    <span x-text="rotuloCondicoes(item.classificacao.detalhes)"></span>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function hiperdiaComponent() {
  return {
    loading: true,
    lista: [],          // [{ paciente, classificacao }]
    resumo: { total: 0, verde: 0, amarelo: 0, vermelho: 0, cinza: 0 },
    filtroNivel: 'todos',     // mantido por compatibilidade
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
      return this.lista.filter(item => this.passaCondicao(item));
    },

    passaCondicao(item) {
      const d = item.classificacao.detalhes;
      if (this.filtroCondicao === 'has' && !d.temHAS) return false;
      if (this.filtroCondicao === 'dm' && !d.temDM) return false;
      if (this.filtroCondicao === 'ambos' && !(d.temHAS && d.temDM)) return false;
      return true;
    },

    porNivel(nivel) {
      return this.lista.filter(item =>
        item.classificacao.nivel === nivel && this.passaCondicao(item)
      );
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
