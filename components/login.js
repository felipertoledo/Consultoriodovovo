/* ============================================================
   login.js — Tela de login (senha ou chave de recuperação)
   Redesign "Botica Moderna": a porta do cofre.
   ============================================================ */

function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card" x-data="loginScreen()">
        <div class="auth-brand">
          <div class="logo" aria-hidden="true">
            <svg><use href="#i-selo"></use></svg>
          </div>
          <h1>Consultório do Vovô</h1>
          <p class="tagline">Prontuário eletrônico · dados criptografados no dispositivo</p>
        </div>

        <template x-if="mode === 'password'">
          <div>
            <div class="form-group">
              <label class="label" for="loginPwd">Senha mestra</label>
              <input id="loginPwd" type="password" class="input input-lg" x-model="password"
                     placeholder="Digite sua senha" autocomplete="current-password"
                     @keydown.enter="login()">
              <div class="field-error" x-show="error" x-text="error"></div>
            </div>

            <button class="btn btn-primary btn-block btn-lg"
                    @click="login()" :disabled="!password || working">
              <svg class="icon" x-show="!working"><use href="#i-lock"></use></svg>
              <span x-show="!working">Abrir o cofre</span>
              <span x-show="working">Verificando…</span>
            </button>

            <div class="text-center mt-4">
              <button class="btn btn-ghost text-sm" @click="mode = 'recovery'; error = ''">
                Esqueci minha senha — usar chave de recuperação
              </button>
            </div>
          </div>
        </template>

        <template x-if="mode === 'recovery'">
          <div>
            <div class="alert alert-info">
              <div>Cole sua chave de recuperação. Após o login você poderá definir uma nova senha.</div>
            </div>

            <div class="form-group">
              <label class="label" for="recoveryKey">Chave de recuperação</label>
              <textarea id="recoveryKey" class="textarea text-mono" x-model="recoveryKey"
                        placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                        style="min-height: 80px"></textarea>
              <div class="field-error" x-show="error" x-text="error"></div>
            </div>

            <button class="btn btn-primary btn-block btn-lg"
                    @click="recover()" :disabled="!recoveryKey || working">
              <span x-show="!working">Recuperar acesso</span>
              <span x-show="working">Verificando…</span>
            </button>

            <div class="text-center mt-4">
              <button class="btn btn-ghost text-sm" @click="mode = 'password'; error = ''">
                ← Voltar para login com senha
              </button>
            </div>
          </div>
        </template>

        <div class="auth-foot">
          <span><svg class="icon"><use href="#i-shield"></use></svg> AES-GCM 256</span>
          <span><svg class="icon"><use href="#i-lock"></use></svg> Dados só neste aparelho</span>
          <span><svg class="icon"><use href="#i-offline"></use></svg> Funciona offline</span>
        </div>
      </div>
    </div>
  `;
}

function loginScreen() {
  return {
    mode: 'password',
    password: '',
    recoveryKey: '',
    error: '',
    working: false,

    async login() {
      this.working = true;
      this.error = '';
      try {
        await Auth.unlockWithPassword(this.password);
        this.password = '';
        Router.navigate('/');
      } catch (e) {
        this.error = e.message || 'Senha incorreta';
      } finally {
        this.working = false;
      }
    },

    async recover() {
      this.working = true;
      this.error = '';
      try {
        await Auth.unlockWithRecovery(this.recoveryKey);
        UI.toast('Acesso recuperado. Defina uma nova senha em Configurações.', 'success', 5000);
        this.recoveryKey = '';
        Router.navigate('/config');
      } catch (e) {
        this.error = e.message || 'Chave inválida';
      } finally {
        this.working = false;
      }
    }
  };
}

window.renderLogin = renderLogin;
window.loginScreen = loginScreen;
