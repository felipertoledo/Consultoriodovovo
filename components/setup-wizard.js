/* ============================================================
   setup-wizard.js — Primeiro acesso
   ============================================================ */

function renderSetupWizard(container) {
  container.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card wide" x-data="setupWizard()">
        <div class="auth-brand">
          <div class="logo">CV</div>
          <h1>Consultório do Vovô</h1>
          <p class="tagline">Configuração inicial — Felipe Ribeiro Toledo · CRM-SP 216.986</p>
        </div>

        <!-- Etapa 0: escolha entre criar novo ou restaurar -->
        <template x-if="step === 0">
          <div>
            <div class="alert alert-info">
              <div>
                <strong>Bem-vindo.</strong> Este é o primeiro acesso ao seu prontuário.
                Você pode criar um cofre novo ou restaurar um backup anterior.
              </div>
            </div>

            <div class="form-group">
              <button class="btn btn-primary btn-block btn-lg" @click="step = 1">
                ➕ Criar cofre novo
              </button>
              <p class="text-sm muted mt-2">Para começar do zero com um cofre criptografado novo.</p>
            </div>

            <div class="form-group mt-4">
              <button class="btn btn-secondary btn-block btn-lg" @click="$refs.fileInput.click()">
                📥 Restaurar de backup
              </button>
              <input type="file" x-ref="fileInput" style="display: none"
                     accept=".cdv-backup,.json,application/json"
                     @change="arquivoSelecionado($event)">
              <p class="text-sm muted mt-2">Tem um arquivo <code>.cdv-backup</code> de outro dispositivo ou cópia de segurança.</p>
            </div>

            <!-- Painel de info do backup selecionado -->
            <div x-show="arquivoInfo" class="card mt-4" style="background: var(--bg-sunken)">
              <h4 style="margin-top: 0">📁 Backup selecionado</h4>
              <p class="text-sm mb-2"><strong>Feito em:</strong>
                <span x-text="arquivoInfo && formatDateLocal(arquivoInfo.exportedAt)"></span>
              </p>
              <p class="text-sm mb-3"><strong>Conteúdo:</strong>
                <span x-text="arquivoInfo && arquivoInfo.counts.pacientes"></span> pacientes,
                <span x-text="arquivoInfo && arquivoInfo.counts.consultas"></span> consultas
              </p>
              <button class="btn btn-danger btn-block" @click="restaurarDoBackup()" :disabled="working">
                <span x-show="!working">Restaurar este backup agora</span>
                <span x-show="working">Restaurando…</span>
              </button>
              <p class="text-xs muted mt-2">Após restaurar, você fará login com a senha que existia quando este backup foi gerado.</p>
            </div>
          </div>
        </template>

        <!-- Etapa 1: Senha -->
        <template x-if="step === 1">
          <div>
            <button class="btn btn-ghost btn-sm mb-3" @click="step = 0">← Voltar</button>
            <div class="alert alert-info">
              <div>
                <strong>Criando cofre novo.</strong>
                Vamos criar uma senha mestra que <strong>nunca sai deste navegador</strong> —
                ela protege todos os dados dos seus pacientes com criptografia AES-256.
              </div>
            </div>

            <div class="form-group">
              <label class="label" for="setupPwd">Senha mestra <span class="required">*</span>
                <span class="hint">(mínimo 12 caracteres)</span>
              </label>
              <input id="setupPwd" type="password" class="input" x-model="password"
                     placeholder="Pelo menos 12 caracteres" autocomplete="new-password">
              <div class="field-help" x-show="password">
                Força: <strong x-text="strength.label" :style="'color: ' + strengthColor()"></strong>
              </div>
            </div>

            <div class="form-group">
              <label class="label" for="setupPwd2">Repita a senha <span class="required">*</span></label>
              <input id="setupPwd2" type="password" class="input" x-model="password2"
                     placeholder="Repita exatamente a senha acima" autocomplete="new-password">
              <div class="field-error" x-show="password2 && password !== password2">
                As senhas não coincidem
              </div>
            </div>

            <div class="alert alert-warning">
              <div>
                <strong>Importante:</strong> Se você esquecer a senha, os dados ficam inacessíveis para sempre.
                Na próxima tela, geraremos uma <strong>chave de recuperação</strong> — anote-a em local físico seguro.
              </div>
            </div>

            <button class="btn btn-primary btn-block btn-lg mt-4"
                    @click="advanceToRecovery()"
                    :disabled="!canAdvance() || working">
              <span x-show="!working">Continuar</span>
              <span x-show="working">Criando cofre…</span>
            </button>
          </div>
        </template>

        <!-- Etapa 2: Chave de recuperação -->
        <template x-if="step === 2">
          <div>
            <h2 class="mb-2">Sua chave de recuperação</h2>
            <p class="mb-4">Anote esta chave em <strong>local físico seguro</strong> (papel, gerenciador de senhas).
            Ela permite recuperar o acesso caso você esqueça a senha mestra.</p>

            <div class="recovery-box">
              <div class="recovery-key" x-text="recoveryKey"></div>
            </div>

            <div class="flex gap-2 mb-4">
              <button class="btn btn-secondary" @click="copyRecovery()">📋 Copiar</button>
              <button class="btn btn-secondary" @click="printRecovery()">🖨️ Imprimir</button>
              <button class="btn btn-secondary" @click="downloadRecovery()">💾 Baixar .txt</button>
            </div>

            <div class="alert alert-danger">
              <div>
                <strong>Esta chave NÃO será mostrada novamente.</strong>
                Anote agora antes de continuar.
              </div>
            </div>

            <div class="form-group mt-4">
              <label class="flex items-center gap-2" style="cursor: pointer">
                <input type="checkbox" x-model="confirmed">
                <span>Anotei a chave de recuperação em local seguro</span>
              </label>
            </div>

            <button class="btn btn-primary btn-block btn-lg" :disabled="!confirmed" @click="finish()">
              Entrar no Consultório do Vovô
            </button>
          </div>
        </template>
      </div>
    </div>
  `;
}

function setupWizard() {
  return {
    step: 0,
    password: '',
    password2: '',
    recoveryKey: '',
    confirmed: false,
    working: false,
    strength: { score: 0, label: '' },
    arquivoInfo: null,
    envelopePendente: null,

    init() {
      this.$watch('password', () => {
        this.strength = Auth.passwordStrength(this.password);
      });
    },

    formatDateLocal(d) { return UI.formatDate(d); },

    async arquivoSelecionado(event) {
      const file = event.target.files[0];
      if (!file) return;
      event.target.value = '';
      try {
        const result = await Backup.validateBackupFile(file);
        this.arquivoInfo = result.info;
        this.envelopePendente = result.envelope;
      } catch (e) {
        console.error(e);
        UI.toast('Backup inválido: ' + e.message, 'error', 8000);
        this.arquivoInfo = null;
        this.envelopePendente = null;
      }
    },

    async restaurarDoBackup() {
      if (!this.envelopePendente || this.working) return;
      if (!UI.confirm('Confirma a restauração? Você fará login com a senha que existia quando este backup foi gerado.')) return;
      this.working = true;
      try {
        await Backup.importFromEnvelope(this.envelopePendente);
        UI.toast('Backup restaurado. Faça login com a senha original.', 'success', 8000);
        setTimeout(() => location.reload(), 1500);
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao restaurar: ' + e.message, 'error', 8000);
        this.working = false;
      }
    },

    strengthColor() {
      const colors = ['#DC2626', '#DC2626', '#D97706', '#D97706', '#16A34A', '#16A34A', '#16A34A'];
      return colors[this.strength.score] || '#94A3B8';
    },

    canAdvance() {
      return this.password.length >= 12 && this.password === this.password2;
    },

    async advanceToRecovery() {
      this.working = true;
      try {
        const { recoveryKey } = await Auth.setup(this.password);
        this.recoveryKey = recoveryKey;
        this.password = '';
        this.password2 = '';
        this.step = 2;
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      } finally {
        this.working = false;
      }
    },

    copyRecovery() {
      navigator.clipboard.writeText(this.recoveryKey).then(
        () => UI.toast('Chave copiada', 'success'),
        () => UI.toast('Falha ao copiar', 'error')
      );
    },

    printRecovery() {
      const w = window.open('', '_blank');
      w.document.write(`
        <html><head><title>Chave de Recuperação — Consultório do Vovô</title>
        <style>body{font-family:monospace;padding:40px;max-width:600px;margin:auto}
        .key{font-size:24px;padding:20px;border:2px dashed #166534;background:#F0FDF4;
             text-align:center;letter-spacing:.05em;word-break:break-all}</style>
        </head><body>
        <h1>Chave de Recuperação</h1>
        <p>Consultório do Vovô · Felipe Ribeiro Toledo · CRM-SP 216.986</p>
        <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
        <div class="key">${this.recoveryKey}</div>
        <p><strong>Guarde em local físico seguro.</strong> Esta chave permite recuperar
        o acesso ao prontuário caso a senha mestra seja esquecida. Sem ela, os dados
        ficam permanentemente inacessíveis.</p>
        </body></html>
      `);
      w.document.close();
      w.print();
    },

    downloadRecovery() {
      const content = `Chave de Recuperação — Consultório do Vovô
=================================================
Felipe Ribeiro Toledo · CRM-SP 216.986
Data: ${new Date().toLocaleString('pt-BR')}

CHAVE:
${this.recoveryKey}

IMPORTANTE:
Guarde este arquivo em local físico seguro (pendrive separado,
papel impresso em cofre). Sem essa chave e sem a senha mestra,
os dados do prontuário ficam permanentemente inacessíveis.
`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `chave-recuperacao-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    },

    finish() {
      Router.navigate('/');
    }
  };
}

window.renderSetupWizard = renderSetupWizard;
window.setupWizard = setupWizard;
