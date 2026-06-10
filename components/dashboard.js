/* ============================================================
   dashboard.js — Tela inicial após login
   Redesign "Botica Moderna": a mesa do dia.
   Prioriza triagem (quem chega, quem faltou, semáforo Hiperdia)
   antes de estatísticas.
   ============================================================ */

function renderDashboard(container) {
  container.innerHTML = `
    <div x-data="dashboardScreen()" x-init="load()">
      <div class="page-header">
        <div>
          <p class="eyebrow">Mesa do dia</p>
          <h1 class="page-title"><span x-text="saudacao">Bom dia</span>, Felipe</h1>
          <p class="page-subtitle" x-text="today"></p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/prescricao')"
                  title="Gerar uma prescrição rápida sem criar consulta antes">
            <svg class="icon"><use href="#i-rx"></use></svg>
            Prescrição
          </button>
          <button class="btn btn-primary" @click="$dispatch('navigate', '/paciente/novo')">
            <svg class="icon"><use href="#i-plus"></use></svg>
            Novo paciente
          </button>
        </div>
      </div>

      <!-- Aviso de backup pendente -->
      <div x-show="backupStatus?.loaded && backupStatus?.precisaBackup" class="alert alert-warning mb-4"
           style="border-left: 4px solid var(--color-warning)">
        <div style="display: flex; gap: var(--space-3); align-items: flex-start; flex-wrap: wrap">
          <div style="flex: 1; min-width: 250px">
            <strong>Backup recomendado</strong>
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
              <span x-show="!working">Baixar backup</span>
              <span x-show="working">Preparando…</span>
            </button>
            <button class="btn btn-ghost text-sm" @click="$dispatch('navigate', '/config')">
              Detalhes
            </button>
          </div>
        </div>
      </div>

      <!-- Operacional do dia: métricas + fila + faltosos -->
      <div class="card card-spine mb-4" style="--spine-color: var(--color-primary-500)"
           x-show="agendaHoje.length > 0 || faltosos.length > 0 || metricas.consultasHoje > 0">
        <div class="card-header" style="border-bottom: none; padding-bottom: 0; margin-bottom: var(--space-4)">
          <h3 class="card-title" style="margin: 0">Operacional do dia</h3>
          <button class="btn btn-ghost btn-sm" @click="$dispatch('navigate', '/agenda')">
            Ver agenda completa
            <svg class="icon"><use href="#i-arrow-right"></use></svg>
          </button>
        </div>

        <!-- Métricas em grid -->
        <div class="stat-grid">
          <div class="stat-tile tone-verde">
            <div class="stat-tile-num" x-text="metricas.consultasHoje"></div>
            <div class="stat-tile-label">consultas hoje</div>
          </div>
          <div class="stat-tile tone-amarelo">
            <div class="stat-tile-num" x-text="metricas.consultasSemana"></div>
            <div class="stat-tile-label">consultas na semana</div>
          </div>
          <div class="stat-tile tone-pinho">
            <div class="stat-tile-num" x-text="metricas.consultasMes"></div>
            <div class="stat-tile-label">consultas no mês</div>
          </div>
          <div class="stat-tile tone-vermelho clickable" @click="$dispatch('navigate', '/agenda')">
            <div class="stat-tile-num" x-text="faltosos.length"></div>
            <div class="stat-tile-label">faltosos (busca ativa)</div>
          </div>
        </div>

        <!-- Hoje na agenda -->
        <div x-show="agendaHoje.length > 0" class="mt-4">
          <div class="text-sm" style="font-weight: var(--weight-semibold); margin-bottom: var(--space-2)">
            Chegam hoje (<span x-text="agendaHoje.length"></span>)
          </div>
          <div class="queue-list">
            <template x-for="ag in agendaHoje" :key="ag.id">
              <div class="queue-item">
                <div class="queue-time" x-text="ag.hora || '—'"></div>
                <div class="queue-who" @click="$dispatch('navigate', '/paciente/' + ag.pacienteId)">
                  <span class="queue-name" x-text="ag.pacienteNome || '(sem nome)'"></span>
                  <span class="queue-note" x-show="ag.observacao" x-text="ag.observacao"></span>
                </div>
                <button class="btn btn-sm btn-primary"
                        @click="$dispatch('navigate', '/paciente/' + ag.pacienteId + '/consulta/nova?agendamento=' + ag.id)">
                  Atender
                  <svg class="icon"><use href="#i-arrow-right"></use></svg>
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- Faltosos -->
        <div x-show="faltosos.length > 0" class="mt-4">
          <div class="text-sm" style="font-weight: var(--weight-semibold); margin-bottom: var(--space-2); color: var(--semaforo-vermelho)">
            Para busca ativa (<span x-text="faltosos.length"></span>)
          </div>
          <div class="queue-list">
            <template x-for="ag in faltosos.slice(0, 5)" :key="ag.id">
              <div class="queue-item is-falta">
                <div class="queue-time" x-text="formatarDataDash(ag.data)"></div>
                <div class="queue-who" @click="$dispatch('navigate', '/paciente/' + ag.pacienteId)">
                  <span class="queue-name" x-text="ag.pacienteNome || '(sem nome)'"></span>
                  <span class="queue-note" x-show="ag.observacao" x-text="ag.observacao"></span>
                </div>
              </div>
            </template>
          </div>
          <div x-show="faltosos.length > 5" class="text-center mt-2">
            <button class="btn btn-ghost btn-sm" @click="$dispatch('navigate', '/agenda')">
              + <span x-text="faltosos.length - 5"></span> mais — ver todos
            </button>
          </div>
        </div>
      </div>

      <!-- Widget Hiperdia -->
      <div class="card mb-4" x-show="hiperdiaResumo.total > 0">
        <div class="card-header" style="border-bottom: none; padding-bottom: 0; margin-bottom: var(--space-4)">
          <h3 class="card-title" style="margin: 0">Hiperdia — HAS/DM</h3>
          <button class="btn btn-ghost btn-sm" @click="$dispatch('navigate', '/hiperdia')">
            Ver painel completo
            <svg class="icon"><use href="#i-arrow-right"></use></svg>
          </button>
        </div>
        <div class="semaforo-strip">
          <button class="semaforo-pill" @click="$dispatch('navigate', '/hiperdia')">
            <svg class="icon" style="width:14px;height:14px"><use href="#i-heart-pulse"></use></svg>
            <strong x-text="hiperdiaResumo.total"></strong> em acompanhamento
          </button>
          <button class="semaforo-pill" @click="$dispatch('navigate', '/hiperdia')"
                  x-show="hiperdiaResumo.vermelho > 0">
            <span class="dot dot-vermelho"></span>
            <strong x-text="hiperdiaResumo.vermelho"></strong> descompensados
          </button>
          <button class="semaforo-pill" @click="$dispatch('navigate', '/hiperdia')"
                  x-show="hiperdiaResumo.amarelo > 0">
            <span class="dot dot-amarelo"></span>
            <strong x-text="hiperdiaResumo.amarelo"></strong> em atenção
          </button>
          <button class="semaforo-pill" @click="$dispatch('navigate', '/hiperdia')"
                  x-show="hiperdiaResumo.verde > 0">
            <span class="dot dot-verde"></span>
            <strong x-text="hiperdiaResumo.verde"></strong> controlados
          </button>
        </div>
      </div>

      <!-- Acervo + versão -->
      <div class="stat-grid" style="margin-bottom: var(--space-6)">
        <div class="stat-tile tone-pinho clickable" @click="$dispatch('navigate', '/pacientes')">
          <div class="stat-tile-num" x-text="stats.pacientes"></div>
          <div class="stat-tile-label">pacientes cadastrados</div>
        </div>
        <div class="stat-tile tone-pinho clickable" @click="$dispatch('navigate', '/consultas')">
          <div class="stat-tile-num" x-text="stats.consultas"></div>
          <div class="stat-tile-label">consultas registradas</div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile-num text-mono" style="font-size: var(--text-lg)" x-text="version"></div>
          <div class="stat-tile-label" x-text="'build ' + buildDate"></div>
        </div>
      </div>

      <!-- Atalhos -->
      <div class="card">
        <h3 class="mb-4">Atalhos</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3);">
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/pacientes')">
            <svg class="icon"><use href="#i-users"></use></svg>
            Lista de pacientes
          </button>
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/paciente/novo')">
            <svg class="icon"><use href="#i-plus"></use></svg>
            Cadastrar paciente
          </button>
          <button class="btn btn-primary" @click="$dispatch('navigate', '/prescricao')"
                  title="Gerar uma prescrição rápida sem criar consulta antes">
            <svg class="icon"><use href="#i-rx"></use></svg>
            Nova prescrição
          </button>
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/config')">
            <svg class="icon"><use href="#i-settings"></use></svg>
            Configurações
          </button>
        </div>
        <p class="text-xs muted mt-4">
          Dica: pressione <kbd>Ctrl</kbd> + <kbd>K</kbd> em qualquer tela para buscar pacientes e ações.
        </p>
      </div>

      <!-- Status do sistema -->
      <div class="card mt-6">
        <h3 class="mb-3">Status do sistema</h3>
        <p class="text-sm muted mb-4">
          Consultório do Vovô <strong x-text="version"></strong> ·
          local-first, criptografia client-side, zero-knowledge.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-5);">
          <div>
            <h4 style="margin-top: 0; color: var(--color-primary-700); font-size: var(--text-base); margin-bottom: var(--space-2)">
              Funcionando
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
              <li><strong>Agenda e busca ativa</strong> — retornos em PT-BR ("30 dias", "3 meses"), faltosos</li>
              <li><strong>Painel Hiperdia</strong> — semáforo de risco HAS/DM por última PA/glicemia</li>
              <li><strong>Templates de prescrição</strong> — receitas frequentes salvas e re-aplicáveis</li>
              <li><strong>Busca rápida Ctrl+K</strong> — paleta de comandos global, pacientes e ações</li>
              <li><strong>Sync entre dispositivos</strong> — Supabase zero-knowledge (opcional)</li>
            </ul>
          </div>

          <div>
            <h4 style="margin-top: 0; color: var(--text-secondary); font-size: var(--text-base); margin-bottom: var(--space-2)">
              Em planejamento
            </h4>
            <ul style="font-size: var(--text-sm); color: var(--text-secondary); padding-left: var(--space-5); line-height: var(--leading-relaxed); margin: 0">
              <li><strong>2FA TOTP</strong> — segundo fator além da senha mestra</li>
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
    saudacao: 'Olá',
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
    // Sprint A1
    agendaHoje: [],
    faltosos: [],
    metricas: { consultasHoje: 0, consultasSemana: 0, consultasMes: 0 },

    // Sprint B3
    hiperdiaResumo: { total: 0, verde: 0, amarelo: 0, vermelho: 0, cinza: 0 },

    formatarDataDash(iso) {
      return window.Agenda ? Agenda.formatarData(iso) : iso;
    },

    async load() {
      const hora = new Date().getHours();
      this.saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

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

      // Sprint A1: agenda + faltosos + métricas
      try {
        if (window.Agenda && window.DB.listAgendaHoje) {
          this.agendaHoje = await DB.listAgendaHoje();
          this.faltosos = await DB.listFaltosos(30);

          const hoje = Agenda.hojeIso();
          const inicioSemana = new Date();
          inicioSemana.setDate(inicioSemana.getDate() - 7);
          const inicioSemanaIso = inicioSemana.toISOString().slice(0, 10);
          const inicioMes = new Date();
          inicioMes.setDate(1);
          const inicioMesIso = inicioMes.toISOString().slice(0, 10);

          this.metricas.consultasHoje = await DB.contarConsultasPeriodo(hoje, hoje);
          this.metricas.consultasSemana = await DB.contarConsultasPeriodo(inicioSemanaIso, hoje);
          this.metricas.consultasMes = await DB.contarConsultasPeriodo(inicioMesIso, hoje);
        }
      } catch (e) {
        console.warn('Erro ao carregar operacional:', e);
      }

      // Sprint B3: resumo Hiperdia (lazy — pode demorar se houver muitos pacientes)
      try {
        if (window.Hiperdia && window.DB.listConsultasByPaciente) {
          const pacientes = await DB.listPacientes();
          const cpp = {};
          // Carrega consultas em paralelo
          await Promise.all(pacientes.slice(0, 500).map(async (p) => {
            if (p.deleted) return;
            try {
              cpp[p.id] = await DB.listConsultasByPaciente(p.id);
            } catch (_) { cpp[p.id] = []; }
          }));
          const lista = Hiperdia.listarHiperdia(pacientes, cpp);
          this.hiperdiaResumo = Hiperdia.resumirHiperdia(lista);
        }
      } catch (e) {
        console.warn('Erro ao carregar resumo Hiperdia:', e);
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
