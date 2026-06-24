/* ===> DESTINO: components/sync-tela.js  (TELA de sincronização — contém renderSync) */
/* ================================================================
   components/sync.js — Sprint D2
   Tela /sync — sincronização entre dispositivos via Supabase ZK
   ================================================================ */

function renderSync(container) {
  container.innerHTML = `
    <div x-data="sincronizacaoComponent()" x-init="carregar()">
      <div class="ficha-head">
        <div class="ficha-id">
          <div class="ficha-nome">Sincronização entre dispositivos</div>
        </div>
        <p class="page-subtitle">Cofre criptografado replicado em servidor próprio (Firebase ou Supabase). O servidor nunca decifra seus dados.</p>
      </div>

      <!-- ============================================================ -->
      <!-- NÃO CONFIGURADO — telas de setup                              -->
      <!-- ============================================================ -->
      <div x-show="!status.configurado && !setupAberto" class="card">
        <h3 class="card-title mb-3">Sincronização não configurada</h3>
        <p class="text-sm mb-4">
          A sincronização permite ter o mesmo cofre em mais de um dispositivo (notebook, celular, tablet).
          Os dados sobem ao servidor já criptografados com sua senha mestre — o servidor armazena bytes opacos.
        </p>

        <div class="form-group">
          <label class="label" style="font-weight:600">Onde guardar o cofre</label>
          <div style="display:flex; gap: var(--space-2); margin-top: 6px;">
            <button class="btn" :class="provider === 'firebase' ? 'btn-primary' : ''" @click="provider = 'firebase'" style="flex:1">
              Firebase
            </button>
            <button class="btn" :class="provider === 'supabase' ? 'btn-primary' : ''" @click="provider = 'supabase'" style="flex:1">
              Supabase
            </button>
          </div>
          <small class="muted" x-show="provider === 'firebase'">
            Recomendado: o plano gratuito do Firebase fica sempre disponível (não pausa por inatividade).
          </small>
          <small class="muted" x-show="provider === 'supabase'">
            O plano gratuito do Supabase pausa o projeto após ~1 semana sem uso (precisa reativar no painel).
          </small>
        </div>

        <p class="text-sm mb-4" x-show="provider === 'firebase'">
          Você precisa de um projeto <strong>Firebase</strong> com <strong>Realtime Database</strong>
          (plano Spark, gratuito). Crie em <a href="https://console.firebase.google.com" target="_blank" rel="noopener" style="text-decoration: underline; color: inherit;">console.firebase.google.com</a>.
        </p>
        <p class="text-sm mb-4" x-show="provider === 'supabase'">
          Você precisa de um projeto <strong>Supabase</strong> (free tier funciona: 500 MB de storage, suficiente
          para milhares de consultas). Crie em <a href="https://supabase.com" target="_blank" rel="noopener" style="text-decoration: underline; color: inherit;">supabase.com</a>.
        </p>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
          <button class="btn btn-primary" @click="iniciarSetupPrimario()">
            🏁 É o primeiro dispositivo
          </button>
          <button class="btn" @click="iniciarSetupSecundario()">
            🔗 Conectar a um cofre existente
          </button>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- SETUP PRIMÁRIO — 3 passos                                     -->
      <!-- ============================================================ -->
      <div x-show="!status.configurado && setupAberto === 'primario'" class="card" x-cloak>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom: var(--space-4);">
          <h3 class="card-title" style="margin:0">🏁 Setup do primeiro dispositivo</h3>
          <button class="btn btn-sm" style="margin-left:auto" @click="cancelarSetup()">×</button>
        </div>

        <!-- Passo 1: setup Supabase -->
        <div x-show="passo === 1">
          <!-- Passo 1 — FIREBASE -->
          <div x-show="provider === 'firebase'">
            <h4>Passo 1 de 3 — criar o Realtime Database no Firebase</h4>
            <ol style="font-size:0.9em; line-height:1.7;">
              <li>Acesse <a href="https://console.firebase.google.com" target="_blank" rel="noopener" style="text-decoration:underline">console.firebase.google.com</a> e entre com sua Conta Google</li>
              <li>Clique em <strong>"Adicionar projeto"</strong> e dê um nome (ex: "consultorio-cofre"). Pode pular o Google Analytics</li>
              <li>No menu lateral, vá em <strong>Criação → Realtime Database</strong> e clique em <strong>"Criar banco de dados"</strong></li>
              <li>Escolha a localização e inicie em <strong>"modo bloqueado"</strong> (vamos colar as regras a seguir)</li>
              <li>Abra a aba <strong>Regras</strong>, apague o conteúdo, cole as regras abaixo e clique em <strong>Publicar</strong></li>
            </ol>
            <div style="display:flex; gap:8px; margin: var(--space-3) 0;">
              <button class="btn btn-sm btn-primary" @click="copiarRegrasFirebase()"><svg class="icon"><use href="#i-copy"></use></svg> Copiar regras</button>
              <span class="text-xs muted" x-show="regrasCopiadas">✓ Copiado!</span>
            </div>
            <details style="margin-top: var(--space-3);">
              <summary style="cursor:pointer; font-size:0.9em;">Ver as regras que serão publicadas</summary>
              <pre style="background: var(--bg-sunken); padding: var(--space-3); border-radius: 6px; font-size: 0.75em; overflow-x: auto; max-height: 300px;" x-text="regrasFirebaseTexto"></pre>
            </details>
            <p class="text-xs muted mt-2">
              As regras liberam leitura/escrita por cofre. Como o Vault ID é um código secreto de 128 bits e os dados sobem cifrados, ninguém acha nem lê seu conteúdo sem o código <em>e</em> a sua senha.
            </p>
          </div>

          <!-- Passo 1 — SUPABASE -->
          <div x-show="provider === 'supabase'" x-cloak>
            <h4>Passo 1 de 3 — criar projeto no Supabase</h4>
            <ol style="font-size:0.9em; line-height:1.7;">
              <li>Acesse <a href="https://supabase.com" target="_blank" rel="noopener" style="text-decoration:underline">supabase.com</a> e crie uma conta (login com GitHub é o mais rápido)</li>
              <li>Clique em "New Project" e dê um nome (ex: "consultorio-cofre")</li>
              <li>Escolha uma senha de banco e a região mais próxima (São Paulo)</li>
              <li>Aguarde o projeto provisionar (~2 minutos)</li>
              <li>No painel do projeto, vá em <strong>SQL Editor</strong> → cole e execute o SQL abaixo</li>
            </ol>
            <div style="display:flex; gap:8px; margin: var(--space-3) 0;">
              <button class="btn btn-sm btn-primary" @click="copiarSqlSetup()"><svg class="icon"><use href="#i-copy"></use></svg> Copiar SQL de setup</button>
              <span class="text-xs muted" x-show="sqlCopiado">✓ Copiado!</span>
            </div>
            <details style="margin-top: var(--space-3);">
              <summary style="cursor:pointer; font-size:0.9em;">Ver o SQL que será executado</summary>
              <pre style="background: var(--bg-sunken); padding: var(--space-3); border-radius: 6px; font-size: 0.75em; overflow-x: auto; max-height: 300px;" x-text="sqlSetupTexto"></pre>
            </details>
          </div>

          <div class="mt-4" style="display:flex; gap:8px; justify-content:flex-end;">
            <button class="btn" @click="cancelarSetup()">Cancelar</button>
            <button class="btn btn-primary" @click="passo = 2">
              <span x-show="provider === 'firebase'">Já publiquei as regras →</span>
              <span x-show="provider === 'supabase'">Já executei o SQL →</span>
            </button>
          </div>
        </div>

        <!-- Passo 2: credenciais -->
        <div x-show="passo === 2" x-cloak>
          <h4 x-show="provider === 'firebase'">Passo 2 de 3 — URL do Realtime Database</h4>
          <h4 x-show="provider === 'supabase'">Passo 2 de 3 — Project URL + anon key</h4>
          <p class="text-sm mb-3" x-show="provider === 'firebase'">No painel do Realtime Database (aba <strong>Dados</strong>), copie a URL que aparece no topo:</p>
          <p class="text-sm mb-3" x-show="provider === 'supabase'">No painel do Supabase, vá em <strong>Settings → API</strong> e copie:</p>

          <div class="form-group">
            <label class="label" style="font-weight:600" x-text="provider === 'firebase' ? 'Database URL' : 'Project URL'"></label>
            <input type="text" class="input" x-model.trim="form.url"
                   :placeholder="provider === 'firebase' ? 'https://xxxxxx-default-rtdb.firebaseio.com' : 'https://xxxxxx.supabase.co'">
            <small class="muted" x-show="provider === 'firebase'">URL do banco (começa com https:// e termina em .firebaseio.com ou .firebasedatabase.app)</small>
            <small class="muted" x-show="provider === 'supabase'">URL do projeto (sempre começa com https:// e termina em .supabase.co)</small>
          </div>

          <div class="form-group" x-show="provider === 'supabase'">
            <label class="label" style="font-weight:600">anon (public) key</label>
            <input :type="mostrarKey ? 'text' : 'password'" class="input" x-model.trim="form.anonKey"
                   placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…">
            <small class="muted">
              Chave pública (anon key) — pode ser usada do navegador.
              <a href="#" @click.prevent="mostrarKey = !mostrarKey" x-text="mostrarKey ? 'Ocultar' : 'Mostrar'"></a>
            </small>
          </div>

          <div x-show="erroSetup" class="alert alert-error mt-3" x-text="erroSetup"></div>

          <div class="mt-4" style="display:flex; gap:8px; justify-content:flex-end;">
            <button class="btn" @click="passo = 1">← Voltar</button>
            <button class="btn btn-primary" @click="finalizarSetupPrimario()" :disabled="loading || !form.url || (provider === 'supabase' && !form.anonKey)">
              <span x-show="!loading">Testar conexão e ativar →</span>
              <span x-show="loading">Conectando…</span>
            </button>
          </div>
        </div>

        <!-- Passo 3: sucesso -->
        <div x-show="passo === 3" x-cloak>
          <h4>✅ Passo 3 de 3 — cofre conectado</h4>
          <p class="text-sm mb-3">Sincronização ativada. Seus dados serão criptografados com sua senha mestre antes de subir.</p>

          <div class="lab-warn" style="display: block; margin: var(--space-3) 0;">
            <p class="text-sm" style="margin: 0;">
              <strong>Importante:</strong> para conectar outros dispositivos, você precisará deste <strong>Vault ID</strong> (junto com URL + anon key + a mesma senha mestre):
            </p>
            <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
              <code class="text-mono" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); padding:6px 10px; border-radius: var(--radius-sm); font-size: 0.85em; word-break: break-all;" x-text="status.vaultId"></code>
              <button class="btn btn-sm" @click="copiarVaultId()" title="Copiar Vault ID"><svg class="icon"><use href="#i-copy"></use></svg></button>
              <span class="text-xs" x-show="vaultIdCopiado" style="color: var(--semaforo-verde)">Copiado!</span>
            </div>
            <p class="text-xs mt-2" style="opacity: 0.85;">Anote em local seguro. Sem ele você não consegue parear novos dispositivos.</p>
          </div>

          <div class="mt-4" style="display:flex; gap:8px; justify-content:flex-end;">
            <button class="btn btn-primary" @click="setupAberto = null; passo = 1; sincronizarAgora()">
              Sincronizar agora →
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- SETUP SECUNDÁRIO — conectar a cofre existente                 -->
      <!-- ============================================================ -->
      <div x-show="!status.configurado && setupAberto === 'secundario'" class="card" x-cloak>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom: var(--space-4);">
          <h3 class="card-title" style="margin:0">🔗 Conectar a um cofre existente</h3>
          <button class="btn btn-sm" style="margin-left:auto" @click="cancelarSetup()">×</button>
        </div>

        <div class="form-group">
          <label class="label" style="font-weight:600">Onde está o cofre</label>
          <div style="display:flex; gap: var(--space-2); margin-top: 6px;">
            <button class="btn" :class="provider === 'firebase' ? 'btn-primary' : ''" @click="provider = 'firebase'" style="flex:1">Firebase</button>
            <button class="btn" :class="provider === 'supabase' ? 'btn-primary' : ''" @click="provider = 'supabase'" style="flex:1">Supabase</button>
          </div>
        </div>

        <p class="text-sm mb-4" class="lab-warn">
          Você precisa: <strong>(1)</strong> a mesma senha mestre que está usando neste cofre,
          <strong>(2)</strong> <span x-show="provider === 'firebase'">a URL do Realtime Database</span><span x-show="provider === 'supabase'">URL + anon key do Supabase</span> do outro dispositivo, e <strong>(3)</strong> o Vault ID.
          <br>
          Sem isso, os dados baixados ficam ilegíveis (cifrados com outra senha).
        </p>

        <div class="form-group">
          <label class="label" style="font-weight:600" x-text="provider === 'firebase' ? 'Database URL' : 'Project URL'"></label>
          <input type="text" class="input" x-model.trim="form.url"
                 :placeholder="provider === 'firebase' ? 'https://xxxxxx-default-rtdb.firebaseio.com' : 'https://xxxxxx.supabase.co'">
        </div>

        <div class="form-group" x-show="provider === 'supabase'">
          <label class="label" style="font-weight:600">anon (public) key</label>
          <input :type="mostrarKey ? 'text' : 'password'" class="input" x-model.trim="form.anonKey">
          <small class="muted">
            <a href="#" @click.prevent="mostrarKey = !mostrarKey" x-text="mostrarKey ? 'Ocultar' : 'Mostrar'"></a>
          </small>
        </div>

        <div class="form-group">
          <label class="label" style="font-weight:600">Vault ID</label>
          <input type="text" class="input" x-model.trim="form.vaultId"
                 placeholder="UUID v4 (ex: 9f8e7d6c-...)">
          <small class="muted">O identificador único do cofre, gerado quando o primeiro dispositivo foi configurado.</small>
        </div>

        <div x-show="erroSetup" class="alert alert-error mt-3" x-text="erroSetup"></div>

        <div class="mt-4" style="display:flex; gap:8px; justify-content:flex-end;">
          <button class="btn" @click="cancelarSetup()">Cancelar</button>
          <button class="btn btn-primary" @click="finalizarSetupSecundario()" :disabled="loading || !form.url || (provider === 'supabase' && !form.anonKey) || !form.vaultId">
            <span x-show="!loading">Conectar e baixar dados →</span>
            <span x-show="loading">Conectando…</span>
          </button>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- CONFIGURADO — painel de status                                -->
      <!-- ============================================================ -->
      <div x-show="status.configurado" x-cloak>
        <div class="card mb-3">
          <h3 class="card-title mb-3">
            <span x-show="!sincronizando">📡 Status</span>
            <span x-show="sincronizando">Sincronizando…</span>
          </h3>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3);">
            <div>
              <div class="text-xs muted">Estado</div>
              <div style="font-weight: 600;" x-text="status.online ? '🟢 Online' : '⚫ Offline'"></div>
            </div>
            <div>
              <div class="text-xs muted">Provedor</div>
              <div style="font-weight: 600;" x-text="status.provider === 'firebase' ? 'Firebase' : 'Supabase'"></div>
            </div>
            <div>
              <div class="text-xs muted">Servidor</div>
              <div style="font-size: 0.9em; word-break: break-all;" x-text="status.url"></div>
            </div>
            <div>
              <div class="text-xs muted">Papel</div>
              <div style="font-weight: 600;" x-text="status.papel === 'primario' ? '🏁 Principal' : '🔗 Secundário'"></div>
            </div>
            <div>
              <div class="text-xs muted">Última sincronização</div>
              <div style="font-weight: 600;" x-text="formatarUltimaSync(status.lastSyncedAt)"></div>
            </div>
          </div>

          <div x-show="status.lastSyncError" class="alert alert-error mt-3">
            <strong>Último erro:</strong> <span x-text="status.lastSyncError"></span>
          </div>

          <div class="mt-3" style="display:flex; gap:8px; flex-wrap: wrap;">
            <button class="btn btn-primary" @click="sincronizarAgora()" :disabled="sincronizando || !status.online">
              <span x-show="!sincronizando"><svg class="icon"><use href="#i-sync"></use></svg> Sincronizar agora</span>
              <span x-show="sincronizando">Aguarde…</span>
            </button>
            <button class="btn" @click="autoSyncAtivo = !autoSyncAtivo; aplicarAutoSync()">
              <span x-text="autoSyncAtivo ? '⏸ Pausar auto-sync' : '▶ Ativar auto-sync (5min)'"></span>
            </button>
          </div>
        </div>

        <!-- Vault ID e detalhes -->
        <div class="card mb-3">
          <h3 class="card-title mb-3">🔐 Detalhes do cofre</h3>
          <div class="text-sm">
            <p class="muted">Para parear outro dispositivo, copie esses dados:</p>
            <div style="display: grid; gap: 8px; margin-top: 8px;">
              <div>
                <strong>URL:</strong>
                <code style="background: var(--bg-sunken); padding: 2px 6px; border-radius: 3px; font-size: 0.85em;" x-text="status.url"></code>
              </div>
              <div>
                <strong>Vault ID:</strong>
                <code style="background: var(--bg-sunken); padding: 2px 6px; border-radius: 3px; font-size: 0.85em; word-break: break-all;" x-text="status.vaultId"></code>
                <button class="btn btn-sm" @click="copiarVaultId()" style="margin-left: 6px;" title="Copiar"><svg class="icon"><use href="#i-copy"></use></svg></button>
                <span class="text-xs" x-show="vaultIdCopiado" style="color: var(--semaforo-verde)">✓</span>
              </div>
              <div style="font-size: 0.85em;" class="muted">
                A <strong>anon key</strong> está armazenada localmente e pode ser obtida no painel Supabase (Settings → API).
                A <strong>senha mestre</strong> é a mesma que destranca este cofre — sem ela, os dados baixados ficam ilegíveis.
              </div>
            </div>
          </div>
        </div>

        <!-- Resultado de última sincronização -->
        <div x-show="ultimoResultado" class="card mb-3" x-cloak>
          <h3 class="card-title mb-2">📊 Última operação</h3>
          <div class="text-sm" x-show="ultimoResultado && ultimoResultado.sucesso">
            <p style="color: var(--semaforo-verde);">Sincronização concluída.</p>
            <ul style="font-size: 0.9em;">
              <li>📤 Enviados ao servidor: <strong x-text="(ultimoResultado && ultimoResultado.uploaded) || 0"></strong> registros</li>
              <li>📥 Baixados do servidor: <strong x-text="(ultimoResultado && ultimoResultado.downloaded) || 0"></strong> registros</li>
              <li x-show="ultimoResultado && ultimoResultado.conflitos && ultimoResultado.conflitos.length > 0">
                Conflitos: <strong x-text="(ultimoResultado && ultimoResultado.conflitos && ultimoResultado.conflitos.length) || 0"></strong> (versão local mais recente preservada)
              </li>
            </ul>
          </div>
          <div class="text-sm" x-show="ultimoResultado && !ultimoResultado.sucesso">
            <p style="color: var(--color-danger);">Falhou: <span x-text="ultimoResultado && ultimoResultado.erro"></span></p>
          </div>
        </div>

        <!-- Zona de perigo: desconectar -->
        <div class="card" style="border-color: var(--color-danger);">
          <h3 class="card-title mb-3" style="color: var(--color-danger); display:flex; align-items:center; gap:8px;"><svg class="icon" style="width:15px;height:15px"><use href="#i-alert"></use></svg>Zona de perigo</h3>
          <p class="text-sm mb-3">
            Desconectar este dispositivo NÃO apaga seus dados locais e NÃO apaga os dados do servidor.
            Apenas remove a configuração de sync deste dispositivo.
            <br>Para apagar os dados do servidor, faça pelo painel Supabase (ou rode <code>DELETE FROM cdv_vault_records</code>).
          </p>
          <button class="btn btn-danger" @click="desconectar()">Desconectar este dispositivo</button>
        </div>
      </div>
    </div>
  `;
}

function sincronizacaoComponent() {
  return {
    status: { configurado: false },
    setupAberto: null,    // null | 'primario' | 'secundario'
    passo: 1,
    provider: 'firebase', // 'firebase' | 'supabase'
    form: { url: '', anonKey: '', vaultId: '' },
    mostrarKey: false,
    erroSetup: null,
    sincronizando: false,
    loading: false,
    autoSyncAtivo: false,
    ultimoResultado: null,
    sqlCopiado: false,
    regrasCopiadas: false,
    vaultIdCopiado: false,
    sqlSetupTexto: '',
    regrasFirebaseTexto: '',
    _timer: null,

    async carregar() {
      this.status = await Sync.status();
      // SQL é estático
      this.sqlSetupTexto = (typeof SupabaseClient !== 'undefined' && SupabaseClient.SQL_SETUP) || '(módulo SupabaseClient não carregado)';
      this.regrasFirebaseTexto = (typeof FirebaseClient !== 'undefined' && FirebaseClient.REGRAS_SETUP) || '(módulo FirebaseClient não carregado)';
      // Recupera preferência de auto-sync (default ativo se já configurado)
      try {
        const cfg = await DB.db.config.get('sync_auto');
        this.autoSyncAtivo = cfg && cfg.value === true;
      } catch (_) {
        this.autoSyncAtivo = false;
      }
      this.aplicarAutoSync();

      // Refresh do status a cada 30s
      this._timer = setInterval(() => this.refreshStatus(), 30 * 1000);
      // Atualiza online/offline imediatamente
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => this.refreshStatus());
        window.addEventListener('offline', () => this.refreshStatus());
      }
    },

    async refreshStatus() {
      this.status = await Sync.status();
    },

    iniciarSetupPrimario() {
      this.setupAberto = 'primario';
      this.passo = 1;
      this.form = { url: '', anonKey: '', vaultId: '' };
      this.erroSetup = null;
    },

    iniciarSetupSecundario() {
      this.setupAberto = 'secundario';
      this.form = { url: '', anonKey: '', vaultId: '' };
      this.erroSetup = null;
    },

    cancelarSetup() {
      this.setupAberto = null;
      this.passo = 1;
      this.erroSetup = null;
    },

    async finalizarSetupPrimario() {
      this.erroSetup = null;
      this.loading = true;
      try {
        let vaultId;
        if (this.provider === 'firebase') {
          if (!FirebaseClient.urlValida(this.form.url)) {
            throw new Error('URL inválida. Deve ser a URL do Realtime Database (https://...firebaseio.com ou ...firebasedatabase.app)');
          }
          vaultId = await Sync.configurarPrimarioFirebase(this.form.url);
        } else {
          if (!SupabaseClient.urlValida(this.form.url)) {
            throw new Error('URL inválida. Deve ser https://...supabase.co');
          }
          vaultId = await Sync.configurarPrimario(this.form.url, this.form.anonKey);
        }
        await this.refreshStatus();
        this.passo = 3;
      } catch (e) {
        this.erroSetup = 'Erro: ' + (e.message || String(e));
      } finally {
        this.loading = false;
      }
    },

    async finalizarSetupSecundario() {
      this.erroSetup = null;
      this.loading = true;
      try {
        if (!this.form.vaultId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          throw new Error('Vault ID inválido. Deve ser UUID v4 (formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');
        }
        let r;
        if (this.provider === 'firebase') {
          if (!FirebaseClient.urlValida(this.form.url)) {
            throw new Error('URL inválida. Deve ser a URL do Realtime Database (https://...firebaseio.com ou ...firebasedatabase.app)');
          }
          r = await Sync.configurarSecundarioFirebase(this.form.url, this.form.vaultId);
        } else {
          if (!SupabaseClient.urlValida(this.form.url)) {
            throw new Error('URL inválida. Deve ser https://...supabase.co');
          }
          r = await Sync.configurarSecundario(this.form.url, this.form.anonKey, this.form.vaultId);
        }
        this.ultimoResultado = r;
        await this.refreshStatus();
        this.setupAberto = null;
        UI.toast(`Conectado! Baixados ${r.downloaded || 0} registros.`, 'success');
      } catch (e) {
        this.erroSetup = 'Erro: ' + (e.message || String(e));
      } finally {
        this.loading = false;
      }
    },

    async sincronizarAgora() {
      if (this.sincronizando) return;
      this.sincronizando = true;
      this.ultimoResultado = null;
      try {
        const r = await Sync.sincronizar();
        this.ultimoResultado = r;
        await this.refreshStatus();
        if (r.sucesso) {
          UI.toast(`✓ Sincronizado · ${r.uploaded || 0}↑ ${r.downloaded || 0}↓`, 'success');
        } else {
          UI.toast('Erro: ' + r.erro, 'error');
        }
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      } finally {
        this.sincronizando = false;
      }
    },

    async desconectar() {
      if (!confirm('Desconectar este dispositivo do sync? Os dados locais permanecem intactos.')) return;
      Sync.pararAutoSync();
      await Sync.desconectar();
      this.autoSyncAtivo = false;
      await DB.db.config.delete('sync_auto');
      await this.refreshStatus();
      UI.toast('Dispositivo desconectado', 'success');
    },

    async aplicarAutoSync() {
      try {
        await DB.db.config.put({ key: 'sync_auto', value: this.autoSyncAtivo });
      } catch (_) {}
      if (this.autoSyncAtivo && this.status.configurado) {
        Sync.iniciarAutoSync((r) => {
          this.ultimoResultado = r;
          this.refreshStatus();
        });
      } else {
        Sync.pararAutoSync();
      }
    },

    async copiarSqlSetup() {
      try {
        await navigator.clipboard.writeText(this.sqlSetupTexto);
        this.sqlCopiado = true;
        setTimeout(() => { this.sqlCopiado = false; }, 3000);
      } catch (e) {
        UI.toast('Erro ao copiar: ' + e.message, 'error');
      }
    },

    async copiarRegrasFirebase() {
      try {
        await navigator.clipboard.writeText(this.regrasFirebaseTexto);
        this.regrasCopiadas = true;
        setTimeout(() => { this.regrasCopiadas = false; }, 3000);
      } catch (e) {
        UI.toast('Erro ao copiar: ' + e.message, 'error');
      }
    },

    async copiarVaultId() {
      try {
        await navigator.clipboard.writeText(this.status.vaultId);
        this.vaultIdCopiado = true;
        setTimeout(() => { this.vaultIdCopiado = false; }, 3000);
      } catch (e) {
        UI.toast('Erro ao copiar: ' + e.message, 'error');
      }
    },

    formatarUltimaSync(iso) {
      if (!iso) return '— nunca';
      const dt = new Date(iso);
      const agora = new Date();
      const diff = (agora - dt) / 1000;
      if (diff < 60) return 'há segundos';
      if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
      return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
  };
}

window.renderSync = renderSync;
window.sincronizacaoComponent = sincronizacaoComponent;
