/* ============================================================
   dashboard.js — Tela inicial após login
   ============================================================ */

function renderDashboard(container) {
  container.innerHTML = `
    <div x-data="dashboardScreen()" x-init="load()">
      <div class="page-header">
        <div>
          <h1 class="page-title">Bom dia, Felipe</h1>
          <p class="page-subtitle" x-text="today"></p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" @click="$dispatch('navigate', '/paciente/novo')">
            + Novo paciente
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-8);">
        <div class="card">
          <div class="text-sm muted">Pacientes cadastrados</div>
          <div style="font-size: var(--text-3xl); font-weight: var(--weight-bold); color: var(--color-primary); margin-top: var(--space-2);"
               x-text="stats.pacientes"></div>
        </div>
        <div class="card">
          <div class="text-sm muted">Consultas registradas</div>
          <div style="font-size: var(--text-3xl); font-weight: var(--weight-bold); color: var(--color-primary); margin-top: var(--space-2);"
               x-text="stats.consultas"></div>
        </div>
        <div class="card">
          <div class="text-sm muted">Versão do sistema</div>
          <div style="font-size: var(--text-lg); font-weight: var(--weight-semibold); margin-top: var(--space-2);"
               x-text="version"></div>
          <div class="text-xs muted" x-text="'Build: ' + buildDate"></div>
        </div>
      </div>

      <div class="card">
        <h3 class="mb-4">Atalhos</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3);">
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/pacientes')">
            👥 Lista de pacientes
          </button>
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/paciente/novo')">
            ➕ Cadastrar paciente
          </button>
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/historico')" disabled
                  title="Em construção">
            📋 Histórico do dia
          </button>
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/config')">
            ⚙️ Configurações
          </button>
        </div>
      </div>

      <div class="card mt-6">
        <h3 class="mb-2">Em construção</h3>
        <p class="text-sm">Esta é a versão 0.1 do Consultório do Vovô. Estão funcionando:</p>
        <ul style="margin-top: var(--space-2); padding-left: var(--space-6); color: var(--text-secondary); line-height: var(--leading-relaxed);">
          <li>Cadastro, listagem e edição de pacientes</li>
          <li>Criptografia client-side AES-GCM 256 + PBKDF2 600k</li>
          <li>Chave de recuperação Crockford Base32</li>
          <li>Trilha de auditoria local (IndexedDB)</li>
          <li>Idle lock automático em 15 minutos</li>
        </ul>
        <p class="text-sm mt-4">Próximas sprints: prontuário com 18 domínios de exame psíquico,
        geração de PDFs, sync opcional com Supabase, prescrição digital.</p>
      </div>
    </div>
  `;
}

function dashboardScreen() {
  return {
    stats: { pacientes: 0, consultas: 0 },
    today: '',
    version: '0.1.0',
    buildDate: '',

    async load() {
      this.today = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
      // Capitaliza dia da semana
      this.today = this.today.charAt(0).toUpperCase() + this.today.slice(1);

      try {
        this.stats.pacientes = await DB.countPacientes();
        this.stats.consultas = await DB.db.consultas.where('deleted').equals(0).count();
      } catch (e) {
        console.error(e);
      }

      try {
        const res = await fetch('./version.json');
        const v = await res.json();
        this.version = 'v' + v.version;
        this.buildDate = v.buildDate;
      } catch {}
    }
  };
}

window.renderDashboard = renderDashboard;
window.dashboardScreen = dashboardScreen;
