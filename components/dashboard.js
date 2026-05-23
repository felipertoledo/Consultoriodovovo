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

      <!-- Aviso de backup pendente -->
      <div x-show="backupStatus?.loaded && backupStatus?.precisaBackup" class="alert alert-warning mb-4"
           style="border-left: 4px solid var(--color-warning, #d97706)">
        <div style="display: flex; gap: var(--space-3); align-items: flex-start; flex-wrap: wrap">
          <div style="flex: 1; min-width: 250px">
            <strong>⚠ Backup recomendado</strong>
            <div class="text-sm mt-1">
              <span x-show="backupStatus?.lastBackupAt === null">
                Você ainda não tem nenhum backup. Se o navegador limpar os dados,
                você perderá <strong x-text="backupStatus?.consultasDesdeBackup + ' consultas'"></strong>.
              </span>
              <span x-show="backupStatus?.lastBackupAt !== null">
                Último backup há <strong x-text="backupStatus?.daysSinceBackup + ' dias'"></strong>.
                <strong x-text="backupStatus?.consultasDesdeBackup"></strong> consultas novas desde então.
              </span>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-primary text-sm" @click="baixarBackup()" :disabled="working">
              <span x-show="!working">💾 Baixar backup</span>
              <span x-show="working">Preparando…</span>
            </button>
            <button class="btn btn-ghost text-sm" @click="$dispatch('navigate', '/config')">
              Detalhes
            </button>
          </div>
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
          <button class="btn btn-primary" @click="$dispatch('navigate', '/prescricao')"
                  title="Gerar uma prescrição rápida sem criar consulta antes">
            💊 Nova prescrição
          </button>
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/config')">
            ⚙️ Configurações
          </button>
        </div>
      </div>

      <div class="card mt-6">
        <h3 class="mb-3">📊 Status do sistema</h3>
        <p class="text-sm muted mb-4">
          Consultório do Vovô <strong x-text="version"></strong> ·
          local-first, criptografia client-side, zero-knowledge.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-5);">
          <div>
            <h4 style="margin-top: 0; color: var(--color-primary); font-size: var(--text-base); margin-bottom: var(--space-2)">
              ✅ Funcionando
            </h4>
            <ul style="font-size: var(--text-sm); color: var(--text-secondary); padding-left: var(--space-5); line-height: var(--leading-relaxed); margin: 0">
              <li><strong>Cofre criptografado</strong> AES-GCM 256 + PBKDF2 600k, chave de recuperação Crockford</li>
              <li><strong>Pacientes</strong> — cadastro com busca cega por hash, edição, soft-delete</li>
              <li><strong>Prontuário</strong> com 18 domínios de exame psíquico (Dalgalarrondo)</li>
              <li><strong>7 tipos de PDF</strong> — receita comum, controle especial, azul B1/B2, atestado, exames, relatório, cópia integral</li>
              <li><strong>WhatsApp</strong> — share sheet do sistema ou wa.me na conversa do paciente</li>
              <li><strong>Assinatura ICP-Brasil A1</strong> — PAdES PKCS#7, verificável em Adobe Reader e ITI gov.br</li>
              <li><strong>Backup criptografado</strong> .cdv-backup com checksum SHA-256 + restore</li>
              <li><strong>PWA instalável</strong> — Service Worker, 100% offline depois do primeiro acesso</li>
              <li><strong>Trilha de auditoria</strong> local + idle lock em 15 minutos</li>
            </ul>
          </div>

          <div>
            <h4 style="margin-top: 0; color: var(--text-secondary); font-size: var(--text-base); margin-bottom: var(--space-2)">
              ⏳ Em planejamento
            </h4>
            <ul style="font-size: var(--text-sm); color: var(--text-secondary); padding-left: var(--space-5); line-height: var(--leading-relaxed); margin: 0">
              <li><strong>Agenda e histórico do dia</strong> — visão por data + retornos pendentes</li>
              <li><strong>Busca rápida Ctrl+K</strong> — paleta de comandos global</li>
              <li><strong>Templates de prescrição</strong> — receitas frequentes salvas e re-aplicáveis</li>
              <li><strong>2FA TOTP</strong> — segundo fator além da senha mestra</li>
              <li><strong>Sync entre dispositivos</strong> — Supabase zero-knowledge (opcional)</li>
            </ul>
          </div>
        </div>
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
    backupStatus: {
      lastBackupAt: null,
      daysSinceBackup: null,
      consultasDesdeBackup: 0,
      precisaBackup: false,
      loaded: false
    },
    working: false,

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

      // Status de backup
      try {
        const s = await Backup.getStatus();
        this.backupStatus = { ...s, loaded: true };
      } catch (e) {
        console.error('Erro ao verificar status de backup:', e);
      }
    },

    async baixarBackup() {
      if (this.working) return;
      this.working = true;
      try {
        const { filename, bytes } = await Backup.downloadBackup();
        const kb = (bytes / 1024).toFixed(1);
        UI.toast(`Backup baixado: ${filename} (${kb} KB)`, 'success', 6000);
        const s = await Backup.getStatus();
        this.backupStatus = { ...s, loaded: true };
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao gerar backup: ' + e.message, 'error');
      } finally {
        this.working = false;
      }
    }
  };
}

window.renderDashboard = renderDashboard;
window.dashboardScreen = dashboardScreen;
