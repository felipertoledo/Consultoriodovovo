/* ============================================================
   config.js — Configurações (senha, audit, wipe)
   ============================================================ */

function renderConfig(container) {
  container.innerHTML = `
    <div x-data="configScreen()" x-init="load()">
      <div class="page-header">
        <div>
          <h1 class="page-title">Configurações</h1>
          <p class="page-subtitle">Segurança, manutenção e auditoria</p>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title mb-4">🔐 Trocar senha mestra</h3>
        <p class="text-sm mb-4">A nova senha re-protege a chave de criptografia.
        A chave de recuperação <strong>não muda</strong>.</p>

        <div class="form-row cols-2">
          <div class="form-group">
            <label class="label">Nova senha</label>
            <input type="password" class="input" x-model="newPwd" placeholder="Mínimo 12 caracteres">
            <div class="field-help" x-show="newPwd">
              Força: <strong x-text="strength.label"></strong>
            </div>
          </div>
          <div class="form-group">
            <label class="label">Repita a nova senha</label>
            <input type="password" class="input" x-model="newPwd2">
            <div class="field-error" x-show="newPwd2 && newPwd !== newPwd2">As senhas não coincidem</div>
          </div>
        </div>
        <button class="btn btn-primary" @click="changePassword()"
                :disabled="newPwd.length < 12 || newPwd !== newPwd2 || working">
          <span x-show="!working">Trocar senha</span>
          <span x-show="working">Re-cifrando…</span>
        </button>
      </div>

      <div class="card mt-4">
        <h3 class="card-title mb-4">📋 Trilha de auditoria recente</h3>
        <p class="text-sm muted mb-4">Últimas 50 ações registradas neste navegador.</p>
        <div x-show="auditEntries.length === 0" class="empty-state">
          <p>Nenhuma ação registrada ainda.</p>
        </div>
        <table x-show="auditEntries.length > 0" style="width: 100%; font-size: var(--text-sm); border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle)">
              <th style="text-align: left; padding: var(--space-2)">Data/hora</th>
              <th style="text-align: left; padding: var(--space-2)">Ação</th>
              <th style="text-align: left; padding: var(--space-2)">Entidade</th>
              <th style="text-align: left; padding: var(--space-2)">ID</th>
            </tr>
          </thead>
          <tbody>
            <template x-for="entry in auditEntries" :key="entry.id">
              <tr style="border-bottom: 1px solid var(--border-subtle)">
                <td style="padding: var(--space-2)" class="text-mono text-xs"
                    x-text="formatDate(entry.timestamp)"></td>
                <td style="padding: var(--space-2)">
                  <span class="badge"
                        :class="entry.action === 'DELETE' ? 'badge-warning' : 'badge-info'"
                        x-text="entry.action"></span>
                </td>
                <td style="padding: var(--space-2)" x-text="entry.entity"></td>
                <td style="padding: var(--space-2)" class="text-mono text-xs" x-text="entry.entityId || '—'"></td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="card mt-4">
        <h3 class="card-title mb-4">🔒 Bloquear cofre</h3>
        <p class="text-sm mb-4">Trava o acesso imediatamente. Você precisará digitar a senha novamente.
        Bloqueio automático ocorre após 15 minutos de inatividade.</p>
        <button class="btn btn-secondary" @click="lock()">Bloquear agora</button>
      </div>

      <div class="card mt-4" style="border-color: var(--color-danger)">
        <h3 class="card-title mb-4" style="color: var(--color-danger)">⚠️ Zona de perigo</h3>
        <p class="text-sm mb-4">Apagar todos os dados deste navegador. Operação <strong>irreversível</strong>.
        Útil apenas para reset completo (testes, troca de equipamento sem migração).</p>
        <button class="btn btn-danger" @click="wipe()">Apagar TUDO deste navegador</button>
      </div>

      <div class="card mt-4">
        <h3 class="card-title mb-4">ℹ️ Sobre este sistema</h3>
        <p class="text-sm">Consultório do Vovô <span x-text="version"></span></p>
        <p class="text-sm">Build: <span x-text="buildDate"></span></p>
        <p class="text-sm mt-2">Desenvolvido por Felipe Ribeiro Toledo — Médico — CRM-SP 216.986</p>
        <p class="text-sm mt-2">Criptografia: AES-GCM 256 + PBKDF2 SHA-256 600.000 iterações</p>
        <p class="text-sm">Armazenamento: IndexedDB local (offline-first)</p>
        <p class="text-sm mt-2">
          <a href="./docs/PRIVACIDADE.md" target="_blank">Política de Privacidade</a> ·
          <a href="./docs/TERMO_CONSENTIMENTO.md" target="_blank">Termo de Consentimento</a> ·
          <a href="./docs/RIPD.md" target="_blank">Relatório de Impacto (RIPD)</a>
        </p>
      </div>
    </div>
  `;
}

function configScreen() {
  return {
    newPwd: '',
    newPwd2: '',
    working: false,
    auditEntries: [],
    version: '0.1.0',
    buildDate: '',
    strength: { score: 0, label: '' },

    async load() {
      try {
        this.auditEntries = await DB.getRecentAudit(50);
      } catch (e) { console.error(e); }
      try {
        const res = await fetch('./version.json');
        const v = await res.json();
        this.version = 'v' + v.version;
        this.buildDate = v.buildDate;
      } catch {}

      this.$watch('newPwd', () => {
        this.strength = Auth.passwordStrength(this.newPwd);
      });
    },

    async changePassword() {
      this.working = true;
      try {
        await Auth.changePassword(this.newPwd);
        UI.toast('Senha alterada com sucesso', 'success');
        this.newPwd = '';
        this.newPwd2 = '';
        await this.load();
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      } finally {
        this.working = false;
      }
    },

    async lock() {
      await Auth.lock();
      Router.navigate('/');
    },

    async wipe() {
      if (!UI.confirm('Tem certeza? Isso vai APAGAR todos os pacientes, consultas e o cofre. Operação IRREVERSÍVEL.')) return;
      if (!UI.confirm('Confirmação final: APAGAR TUDO?')) return;
      try {
        await DB.wipeEverything();
        UI.toast('Todos os dados apagados', 'success');
        setTimeout(() => location.reload(), 1500);
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      }
    },

    formatDate(d) { return UI.formatDate(d); }
  };
}

window.renderConfig = renderConfig;
window.configScreen = configScreen;
