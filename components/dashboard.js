/* ============================================================
   dashboard.js — Tela inicial após login
   Redesign "Botica Moderna" v2: o cockpit.
   Hierarquia de triagem: próximo paciente → trilho do dia →
   faltosos → Hiperdia → números (com tendência de 14 dias).
   ============================================================ */

function renderDashboard(container) {
  container.innerHTML = `
    <div x-data="dashboardScreen()" x-init="load()">

      <!-- Masthead: o almanaque do dia -->
      <div class="masthead">
        <div class="page-header" style="margin-bottom: 0">
          <div>
            <p class="eyebrow"><span x-text="saudacao">Bom dia</span><span x-show="nomeMedico" x-text="', ' + nomeMedico"></span><span x-show="plantao"> — bom plantão</span></p>
            <h1 class="masthead-date" x-text="today"></h1>
            <div class="masthead-meta">
              <span x-text="'Dia ' + edicao + ' do ano'"></span>
              <span class="sep">·</span>
              <span x-text="version"></span>
              <span class="sep">·</span>
              <span>cofre local AES-256</span>
            </div>
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

      <!-- Skeleton enquanto carrega o operacional -->
      <div x-show="carregando" class="mb-4">
        <div class="skel" style="height: 110px; border-radius: var(--radius-xl); margin-bottom: var(--space-3)"></div>
        <div class="stat-grid">
          <div class="skel" style="height: 84px"></div>
          <div class="skel" style="height: 84px"></div>
          <div class="skel" style="height: 84px"></div>
          <div class="skel" style="height: 84px"></div>
        </div>
      </div>

      <!-- HERO: próximo da fila -->
      <template x-if="!carregando && proximo">
        <div class="hero-next">
          <div style="flex-shrink: 0">
            <div class="hero-eyebrow"><span class="hero-pulse"></span> Próximo da fila</div>
            <div class="hero-time" x-text="proximo.hora || '—'"></div>
          </div>
          <div class="hero-body">
            <div class="hero-name" x-text="proximo.pacienteNome || '(sem nome)'"></div>
            <div class="hero-note" x-show="proximo.observacao" x-text="proximo.observacao"></div>
            <div class="hero-when" x-text="tempoAte(proximo.hora)"></div>
          </div>
          <div class="hero-actions">
            <button class="btn btn-ghost" @click="$dispatch('navigate', '/paciente/' + proximo.pacienteId)">
              Abrir ficha
            </button>
            <button class="btn btn-primary btn-lg"
                    @click="$dispatch('navigate', '/paciente/' + proximo.pacienteId + '/consulta/nova?agendamento=' + proximo.id)">
              Atender
              <svg class="icon"><use href="#i-arrow-right"></use></svg>
            </button>
          </div>
        </div>
      </template>

      <!-- HERO: fila concluída -->
      <template x-if="!carregando && !proximo && agendaHoje.length > 0">
        <div class="hero-next is-done">
          <div class="hero-time"><svg class="icon" style="width: 34px; height: 34px"><use href="#i-check"></use></svg></div>
          <div class="hero-body">
            <div class="hero-name">Fila do dia concluída</div>
            <div class="hero-note">
              <span x-text="agendaHoje.length"></span> agendamento(s) de hoje já passaram do horário.
            </div>
          </div>
          <div class="hero-actions">
            <button class="btn btn-secondary" @click="$dispatch('navigate', '/agenda')">Ver agenda</button>
          </div>
        </div>
      </template>

      <!-- Operacional do dia -->
      <div class="card card-spine mb-4" style="--spine-color: var(--color-primary-500)"
           x-show="!carregando && (agendaHoje.length > 0 || faltosos.length > 0 || metricas.consultasHoje > 0)">
        <div class="card-header" style="border-bottom: none; padding-bottom: 0; margin-bottom: var(--space-3)">
          <h3 class="card-title" style="margin: 0">O dia em uma linha</h3>
          <button class="btn btn-ghost btn-sm" @click="$dispatch('navigate', '/agenda')">
            Agenda completa
            <svg class="icon"><use href="#i-arrow-right"></use></svg>
          </button>
        </div>

        <!-- Trilho 06h–20h -->
        <div class="dayline" x-show="agendaHoje.length > 0">
          <div class="dayline-track">
            <template x-for="t in railTicks" :key="t.h">
              <span class="dayline-tick" :style="'left: ' + t.pct + '%'" x-text="t.rotulo"></span>
            </template>
            <div class="dayline-now" x-show="nowPct !== null" :style="'left: ' + nowPct + '%'"></div>
            <template x-for="ag in agendaHoje" :key="'rail-' + ag.id">
              <span class="dayline-dot"
                    x-show="horaPct(ag.hora) !== null"
                    :class="{ past: jaPassou(ag.hora) }"
                    :style="'left: ' + horaPct(ag.hora) + '%'"
                    :title="(ag.hora || '') + ' — ' + (ag.pacienteNome || '')"
                    @click="$dispatch('navigate', '/paciente/' + ag.pacienteId)"></span>
            </template>
          </div>
        </div>

        <!-- Fila restante -->
        <div x-show="filaRestante.length > 0" class="mt-4">
          <div class="text-sm" style="font-weight: var(--weight-semibold); margin-bottom: var(--space-2)">
            Depois (<span x-text="filaRestante.length"></span>)
          </div>
          <div class="queue-list">
            <template x-for="ag in filaRestante" :key="ag.id">
              <div class="queue-item">
                <div class="queue-time" x-text="ag.hora || '—'"></div>
                <div class="queue-who" @click="$dispatch('navigate', '/paciente/' + ag.pacienteId)">
                  <span class="queue-name" x-text="ag.pacienteNome || '(sem nome)'"></span>
                  <span class="queue-note" x-show="ag.observacao" x-text="ag.observacao"></span>
                </div>
                <button class="btn btn-sm btn-secondary"
                        @click="$dispatch('navigate', '/paciente/' + ag.pacienteId + '/consulta/nova?agendamento=' + ag.id)">
                  Atender
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
            Painel completo
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

      <!-- Números (animados) + tendência de 14 dias -->
      <div class="stat-grid" style="margin-bottom: var(--space-4)">
        <div class="stat-tile tone-verde">
          <div class="stat-tile-num" x-text="anim.consultasHoje"></div>
          <div class="stat-tile-label">consultas hoje</div>
        </div>
        <div class="stat-tile tone-amarelo">
          <div class="stat-tile-num" x-text="anim.consultasSemana"></div>
          <div class="stat-tile-label">na semana</div>
        </div>
        <div class="stat-tile tone-pinho">
          <div class="stat-tile-num" x-text="anim.consultasMes"></div>
          <div class="stat-tile-label">no mês</div>
          <div class="spark" x-show="serie14.length > 1" x-html="spark14()"></div>
          <div class="spark-label" x-show="serie14.length > 1">últimos 14 dias</div>
        </div>
        <div class="stat-tile tone-vermelho clickable" @click="$dispatch('navigate', '/agenda')">
          <div class="stat-tile-num" x-text="anim.faltosos"></div>
          <div class="stat-tile-label">faltosos (busca ativa)</div>
        </div>
      </div>

      <!-- Acervo + atalhos -->
      <div class="card mb-4">
        <div class="card-header" style="border-bottom: none; padding-bottom: 0; margin-bottom: var(--space-4)">
          <h3 class="card-title" style="margin: 0">Acervo e atalhos</h3>
          <span class="text-xs muted">
            <span class="text-mono" x-text="anim.pacientes"></span> pacientes ·
            <span class="text-mono" x-text="anim.consultas"></span> consultas
          </span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: var(--space-3);">
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/pacientes')">
            <svg class="icon"><use href="#i-users"></use></svg>
            Lista de pacientes
          </button>
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/paciente/novo')">
            <svg class="icon"><use href="#i-plus"></use></svg>
            Cadastrar paciente
          </button>
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/prescricao')"
                  title="Gerar uma prescrição rápida sem criar consulta antes">
            <svg class="icon"><use href="#i-rx"></use></svg>
            Nova prescrição
          </button>
          <button class="btn btn-secondary" @click="window.KbdHelp && KbdHelp.abrir()">
            <svg class="icon"><use href="#i-keyboard"></use></svg>
            Atalhos do teclado
          </button>
        </div>
        <p class="text-xs muted mt-4">
          Dica: <kbd>Ctrl</kbd> + <kbd>K</kbd> busca em qualquer tela · <kbd>G</kbd> depois <kbd>P</kbd> vai para Pacientes · <kbd>?</kbd> mostra tudo.
        </p>
      </div>

      <!-- Status do sistema (dossiê dobrável) -->
      <details class="card sys-status">
        <summary>
          <svg class="chev"><use href="#i-chevron-right"></use></svg>
          Status do sistema
          <span class="sum-meta" x-text="version + ' · build ' + buildDate"></span>
        </summary>
        <div class="sys-body">
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
                <li><strong>Trilha de auditoria</strong> local + bloqueio manual (auto-bloqueio configurável)</li>
                <li><strong>Agenda e busca ativa</strong> — retornos em PT-BR ("30 dias", "3 meses"), faltosos</li>
                <li><strong>Painel Hiperdia</strong> — semáforo de risco HAS/DM por última PA/glicemia</li>
                <li><strong>Templates de prescrição</strong> — receitas frequentes salvas e re-aplicáveis</li>
                <li><strong>Busca rápida Ctrl+K</strong> — paleta de comandos com recentes, pacientes e ações</li>
                <li><strong>Atalhos de teclado</strong> — sequências G/N estilo editor, ajuda em <kbd>?</kbd></li>
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
      </details>
    </div>
  `;
}

function dashboardScreen() {
  return {
    stats: { pacientes: 0, consultas: 0 },
    today: '',
    saudacao: 'Olá',
    nomeMedico: '',
    plantao: false,
    edicao: 0,
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
    carregando: true,
    // Sprint A1
    agendaHoje: [],
    faltosos: [],
    metricas: { consultasHoje: 0, consultasSemana: 0, consultasMes: 0 },
    serie14: [],

    // Números animados (count-up)
    anim: { consultasHoje: 0, consultasSemana: 0, consultasMes: 0, faltosos: 0, pacientes: 0, consultas: 0 },

    // Hero / trilho
    proximo: null,
    filaRestante: [],
    nowPct: null,
    railTicks: [],

    // Sprint B3
    hiperdiaResumo: { total: 0, verde: 0, amarelo: 0, vermelho: 0, cinza: 0 },

    formatarDataDash(iso) {
      return window.Agenda ? Agenda.formatarData(iso) : iso;
    },

    // ---- Trilho do dia (06h–20h) ----
    horaPct(hhmm) {
      if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) return null;
      const [h, m] = hhmm.split(':').map(Number);
      const min = h * 60 + m;
      const ini = 6 * 60, fim = 20 * 60;
      if (min < ini || min > fim) return null;
      return Math.round(((min - ini) / (fim - ini)) * 1000) / 10;
    },

    jaPassou(hhmm) {
      if (!hhmm) return false;
      const agora = new Date();
      const atual = agora.getHours() * 60 + agora.getMinutes();
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m < atual;
    },

    tempoAte(hhmm) {
      if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) return '';
      const agora = new Date();
      const atual = agora.getHours() * 60 + agora.getMinutes();
      const [h, m] = hhmm.split(':').map(Number);
      const diff = h * 60 + m - atual;
      if (diff <= 0) return 'agora';
      if (diff < 60) return `em ${diff} min`;
      const hrs = Math.floor(diff / 60);
      const mins = diff % 60;
      return mins ? `em ${hrs}h${String(mins).padStart(2, '0')}` : `em ${hrs}h`;
    },

    computarHero() {
      const comHora = this.agendaHoje
        .filter(a => a.hora && /^\d{1,2}:\d{2}/.test(a.hora))
        .sort((a, b) => a.hora.localeCompare(b.hora));
      const semHora = this.agendaHoje.filter(a => !a.hora || !/^\d{1,2}:\d{2}/.test(a.hora));

      this.proximo = comHora.find(a => !this.jaPassou(a.hora)) || semHora[0] || null;
      this.filaRestante = this.agendaHoje.filter(a => !this.proximo || a.id !== this.proximo.id);

      // Posição do "agora" no trilho
      const agora = new Date();
      const min = agora.getHours() * 60 + agora.getMinutes();
      const ini = 6 * 60, fim = 20 * 60;
      this.nowPct = (min >= ini && min <= fim)
        ? Math.round(((min - ini) / (fim - ini)) * 1000) / 10
        : null;

      this.railTicks = [6, 8, 10, 12, 14, 16, 18, 20].map(h => ({
        h,
        pct: ((h * 60 - ini) / (fim - ini)) * 100,
        rotulo: String(h).padStart(2, '0') + 'h'
      }));
    },

    // ---- Count-up suave nos números ----
    tween(chave, alvo, dur = 600) {
      alvo = Number(alvo) || 0;
      if (typeof requestAnimationFrame === 'undefined' || alvo <= 0) {
        this.anim[chave] = alvo;
        return;
      }
      const t0 = performance.now();
      const passo = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const ease = 1 - Math.pow(1 - p, 3);
        this.anim[chave] = Math.round(alvo * ease);
        if (p < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    },

    spark14() {
      return (window.Sparkline && this.serie14.length > 1)
        ? Sparkline.bars(this.serie14, { w: 110, h: 22, highlightLast: true })
        : '';
    },

    async load() {
      try { const _p = await DB.getPerfil(); if (_p) { this.nomeMedico = (_p.nome||'').trim().split(' ')[0] || ''; if (window.PDFBuilder) PDFBuilder.setMedico(_p); } } catch (_e) {}
      const hora = new Date().getHours();
      this.saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
      this.plantao = hora >= 22 || hora < 6;

      const agoraD = new Date();
      const inicioAno = new Date(agoraD.getFullYear(), 0, 1);
      this.edicao = Math.floor((agoraD - inicioAno) / 86400000) + 1;

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

          // Série de 14 dias (contagem por dia, do mais antigo ao hoje)
          try {
            const serie = [];
            for (let i = 13; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const iso = d.toISOString().slice(0, 10);
              serie.push(await DB.contarConsultasPeriodo(iso, iso));
            }
            this.serie14 = serie;
          } catch (_) { this.serie14 = []; }

          this.computarHero();
        }
      } catch (e) {
        console.warn('Erro ao carregar operacional:', e);
      }

      this.carregando = false;

      // Count-up dos números
      this.tween('consultasHoje', this.metricas.consultasHoje);
      this.tween('consultasSemana', this.metricas.consultasSemana);
      this.tween('consultasMes', this.metricas.consultasMes);
      this.tween('faltosos', this.faltosos.length);
      this.tween('pacientes', this.stats.pacientes, 750);
      this.tween('consultas', this.stats.consultas, 750);

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
