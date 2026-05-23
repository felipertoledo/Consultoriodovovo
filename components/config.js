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

      <div class="card mt-4" style="border-color: var(--color-primary); border-width: 2px">
        <h3 class="card-title mb-4">💾 Backup do cofre</h3>

        <div x-show="!backupStatus?.loaded" class="muted text-sm">Carregando status…</div>

        <div x-show="backupStatus?.loaded">
          <!-- Status atual -->
          <div class="mb-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3);">
            <div style="background: var(--bg-sunken); padding: var(--space-3); border-radius: var(--radius-md);">
              <div class="text-xs muted">Último backup</div>
              <div class="text-sm" style="font-weight: var(--weight-semibold)"
                   x-text="backupStatus?.lastBackupAt ? formatDate(backupStatus?.lastBackupAt) : 'Nunca feito'"></div>
            </div>
            <div style="background: var(--bg-sunken); padding: var(--space-3); border-radius: var(--radius-md);">
              <div class="text-xs muted">Tempo decorrido</div>
              <div class="text-sm" style="font-weight: var(--weight-semibold)"
                   x-text="backupStatus?.daysSinceBackup === null ? '—' : (backupStatus?.daysSinceBackup + ' dias')"></div>
            </div>
            <div style="background: var(--bg-sunken); padding: var(--space-3); border-radius: var(--radius-md);">
              <div class="text-xs muted">Consultas novas desde então</div>
              <div class="text-sm" style="font-weight: var(--weight-semibold)"
                   :style="backupStatus?.precisaBackup ? 'color: var(--color-danger)' : ''"
                   x-text="backupStatus?.consultasDesdeBackup"></div>
            </div>
          </div>

          <!-- Alerta de necessidade -->
          <div x-show="backupStatus?.precisaBackup" class="alert alert-warning mb-4">
            <div>
              <strong>Recomendado fazer backup agora.</strong>
              Você tem novas consultas registradas. Se o navegador limpar os dados,
              você perderia este trabalho. Baixe um backup e guarde em local seguro
              (pen-drive, Drive, e-mail).
            </div>
          </div>
        </div>

        <p class="text-sm mb-3">
          O arquivo de backup contém TODOS os pacientes, consultas e auditoria deste
          cofre, ainda criptografados. Para restaurar você precisa do mesmo cofre
          original OU da senha/chave de recuperação que existia quando o backup foi feito.
        </p>

        <div class="flex gap-2 mb-4" style="flex-wrap: wrap">
          <button class="btn btn-primary" @click="baixarBackup()" :disabled="working">
            <span x-show="!working">💾 Baixar backup agora</span>
            <span x-show="working">Preparando…</span>
          </button>
          <button class="btn btn-secondary" @click="$refs.fileInput.click()" :disabled="working">
            📥 Restaurar de arquivo
          </button>
          <input type="file" x-ref="fileInput" style="display: none"
                 accept=".cdv-backup,.json,application/json"
                 @change="arquivoSelecionado($event)">
        </div>

        <!-- Painel de informação do arquivo selecionado -->
        <div x-show="arquivoInfo" class="card" style="background: var(--bg-sunken); padding: var(--space-4)">
          <h4 style="margin-top: 0">📁 Backup selecionado</h4>
          <p class="text-sm mb-2"><strong>Feito em:</strong>
            <span x-text="arquivoInfo && formatDate(arquivoInfo.exportedAt)"></span>
            (versão <span x-text="arquivoInfo && arquivoInfo.appVersion"></span>)</p>
          <p class="text-sm mb-2"><strong>Conteúdo:</strong>
            <span x-text="arquivoInfo && arquivoInfo.counts.pacientes"></span> pacientes,
            <span x-text="arquivoInfo && arquivoInfo.counts.consultas"></span> consultas,
            <span x-text="arquivoInfo && arquivoInfo.counts.auditLog"></span> registros de auditoria
          </p>
          <div class="alert alert-warning mt-3">
            <div>
              <strong>Atenção:</strong> restaurar vai <strong>SUBSTITUIR</strong> todos
              os dados atuais deste navegador. O cofre será bloqueado e você precisará
              fazer login com a senha que estava em vigor quando este backup foi gerado.
            </div>
          </div>
          <div class="flex gap-2 mt-3" style="flex-wrap: wrap">
            <button class="btn btn-danger" @click="confirmarRestauracao()" :disabled="working">
              <span x-show="!working">⚠ Substituir tudo e restaurar</span>
              <span x-show="working">Restaurando…</span>
            </button>
            <button class="btn btn-ghost" @click="cancelarRestauracao()">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- ASSINATURA DIGITAL ICP-Brasil A1                              -->
      <!-- ============================================================ -->
      <div class="card mt-4" style="border-color: var(--color-primary); border-width: 2px">
        <h3 class="card-title mb-4">🔏 Assinatura digital ICP-Brasil</h3>

        <!-- Estado: SEM certificado -->
        <div x-show="!certInfo">
          <p class="text-sm mb-3">
            Cadastre seu certificado digital <strong>A1 (.pfx/.p12)</strong> ICP-Brasil para assinar
            documentos com validade jurídica plena (MP 2.200-2/2001, CFM 2.299/2021).
          </p>
          <p class="text-sm mb-4 muted">
            O arquivo do certificado fica armazenado <strong>criptografado neste dispositivo</strong>,
            protegido pela senha do cofre. A senha do certificado nunca é salva.
          </p>

          <div class="form-group">
            <label class="label">Arquivo do certificado (.pfx ou .p12)</label>
            <input type="file" class="input" accept=".pfx,.p12,application/x-pkcs12"
                   @change="certFileSelected($event)">
            <div class="field-help" x-show="certFile">
              Arquivo selecionado: <strong x-text="certFile && certFile.name"></strong>
              (<span x-text="certFile && (certFile.size/1024).toFixed(1) + ' KB'"></span>)
            </div>
          </div>

          <div class="form-group" x-show="certFile">
            <label class="label">Senha do certificado</label>
            <input type="password" class="input" x-model="certPassword"
                   placeholder="A senha que você usa quando assina algo digitalmente"
                   @keydown.enter="cadastrarCertificado()">
            <div class="field-help">A senha protege a chave privada do .pfx — informe a senha do arquivo, não a senha do cofre.</div>
          </div>

          <button class="btn btn-primary" @click="cadastrarCertificado()"
                  :disabled="!certFile || !certPassword || certWorking">
            <span x-show="!certWorking">📥 Validar e cadastrar certificado</span>
            <span x-show="certWorking">Validando…</span>
          </button>

          <p class="text-xs muted mt-4">
            Não tem certificado A1? Compre em qualquer AC ICP-Brasil (~R$ 200/ano):
            <a href="https://www.solutinet.com.br" target="_blank" rel="noopener">Soluti</a>,
            <a href="https://www.certisign.com.br" target="_blank" rel="noopener">Certisign</a>,
            <a href="https://www.serasaexperian.com.br/certificado-digital" target="_blank" rel="noopener">Serasa</a>,
            entre outras. Não funciona com A3 (token USB físico) por limitação de browser.
          </p>
        </div>

        <!-- Estado: COM certificado cadastrado -->
        <div x-show="certInfo">
          <div class="alert" :class="certInfo?.expirado ? 'alert-danger' : (certInfo?.diasParaExpirar < 30 ? 'alert-warning' : 'alert-success')">
            <div>
              <strong x-show="certInfo?.expirado">⚠ Certificado EXPIRADO</strong>
              <strong x-show="!certInfo?.expirado && certInfo?.diasParaExpirar < 30">⚠ Certificado expira em breve</strong>
              <strong x-show="!certInfo?.expirado && certInfo?.diasParaExpirar >= 30">✓ Certificado válido</strong>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); margin-top: var(--space-4);">
            <div style="background: var(--bg-sunken); padding: var(--space-3); border-radius: var(--radius-md);">
              <div class="text-xs muted">Titular</div>
              <div class="text-sm" style="font-weight: var(--weight-semibold)" x-text="certInfo?.commonName || '—'"></div>
            </div>
            <div style="background: var(--bg-sunken); padding: var(--space-3); border-radius: var(--radius-md);" x-show="certInfo?.cpf">
              <div class="text-xs muted">CPF</div>
              <div class="text-sm text-mono" x-text="certInfo?.cpf"></div>
            </div>
            <div style="background: var(--bg-sunken); padding: var(--space-3); border-radius: var(--radius-md);">
              <div class="text-xs muted">Autoridade Certificadora</div>
              <div class="text-sm" x-text="certInfo?.acEmissora || '—'"></div>
            </div>
            <div style="background: var(--bg-sunken); padding: var(--space-3); border-radius: var(--radius-md);">
              <div class="text-xs muted">Validade</div>
              <div class="text-sm">
                até <span x-text="certInfo?.validTo ? new Date(certInfo.validTo).toLocaleDateString('pt-BR') : '—'"></span>
                <span x-show="certInfo?.diasParaExpirar !== null && !certInfo?.expirado" class="muted">
                  (<span x-text="certInfo?.diasParaExpirar"></span> dias)
                </span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 mt-4" style="flex-wrap: wrap">
            <button class="btn btn-danger" @click="removerCertificado()">🗑 Remover certificado</button>
            <button class="btn btn-ghost" @click="limparCacheSenha()" x-show="senhaCacheAtiva">
              🔒 Esquecer senha em cache
            </button>
          </div>

          <p class="text-xs muted mt-4">
            Para trocar para um certificado novo (renovação anual), primeiro remova o atual.
          </p>
        </div>
      </div>

      <div class="card mt-4">
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

      <div class="card mt-4">
        <h3 class="card-title mb-4">📱 Status do aplicativo (PWA)</h3>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-4);">
          <div style="background: var(--bg-sunken); padding: var(--space-3); border-radius: var(--radius-md);">
            <div class="text-xs muted">Funcionamento offline</div>
            <div class="text-sm" style="font-weight: var(--weight-semibold)"
                 x-text="swStatus.cached ? '✓ Pronto' : 'Carregando…'"></div>
          </div>
          <div style="background: var(--bg-sunken); padding: var(--space-3); border-radius: var(--radius-md);">
            <div class="text-xs muted">Service Worker</div>
            <div class="text-sm" style="font-weight: var(--weight-semibold)"
                 x-text="swStatus.swVersion || '—'"></div>
          </div>
          <div style="background: var(--bg-sunken); padding: var(--space-3); border-radius: var(--radius-md);">
            <div class="text-xs muted">Instalado como app</div>
            <div class="text-sm" style="font-weight: var(--weight-semibold)"
                 x-text="swStatus.installed ? '✓ Sim' : 'Não'"></div>
          </div>
        </div>

        <p class="text-sm mb-3" x-show="!swStatus.installed && swStatus.canInstall">
          Você pode instalar o Consultório do Vovô como aplicativo neste dispositivo —
          ele fica no menu Iniciar/área de trabalho e abre em janela própria, sem barra do navegador.
          Funciona <strong>sem internet</strong> depois de instalado.
        </p>

        <div class="flex gap-2" style="flex-wrap: wrap">
          <button class="btn btn-primary" x-show="swStatus.canInstall" @click="instalar()">
            📥 Instalar app
          </button>
          <button class="btn btn-secondary" @click="verificarAtualizacao()" :disabled="checkingUpdate">
            <span x-show="!checkingUpdate">🔄 Verificar atualizações</span>
            <span x-show="checkingUpdate">Verificando…</span>
          </button>
        </div>

        <p class="text-xs muted mt-3" x-show="!swStatus.canInstall && !swStatus.installed">
          O botão de instalação aparece quando o navegador detecta que o aplicativo está pronto.
          No Chrome desktop, você também pode clicar no ícone 📲 no canto direito da barra de endereços.
        </p>
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
    backupStatus: {
      lastBackupAt: null,
      daysSinceBackup: null,
      consultasDesdeBackup: 0,
      precisaBackup: false,
      loaded: false
    },
    arquivoInfo: null,
    envelopePendente: null,
    swStatus: {
      cached: false,
      swVersion: null,
      installed: false,
      canInstall: false
    },
    checkingUpdate: false,
    certInfo: null,
    certFile: null,
    certPassword: '',
    certWorking: false,
    senhaCacheAtiva: false,

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

      // Status de backup
      try {
        const s = await Backup.getStatus();
        this.backupStatus = { ...s, loaded: true };
      } catch (e) {
        console.error('Erro ao carregar status de backup:', e);
      }

      // Status do Service Worker / PWA
      await this.atualizarStatusSW();

      // Estado do certificado ICP-Brasil
      await this.carregarStatusCertificado();

      this.$watch('newPwd', () => {
        this.strength = Auth.passwordStrength(this.newPwd);
      });
    },

    async carregarStatusCertificado() {
      try {
        const entry = await Signer.getConfiguredCertificate();
        this.certInfo = entry ? entry.info : null;
        this.senhaCacheAtiva = !!Signer.getCachedPassword();
      } catch (e) {
        console.error('Erro ao carregar status do certificado:', e);
        this.certInfo = null;
      }
    },

    certFileSelected(event) {
      const file = event.target.files[0];
      if (!file) return;
      this.certFile = file;
      this.certPassword = '';
    },

    async cadastrarCertificado() {
      if (!this.certFile || !this.certPassword || this.certWorking) return;
      this.certWorking = true;
      try {
        const info = await Signer.loadAndStoreCertificate(this.certFile, this.certPassword);
        UI.toast(`Certificado de ${info.commonName} cadastrado.`, 'success', 6000);
        this.certFile = null;
        this.certPassword = '';
        // Limpa o input file
        const input = document.querySelector('input[type="file"][accept*="pfx"]');
        if (input) input.value = '';
        await this.carregarStatusCertificado();
      } catch (e) {
        console.error(e);
        UI.toast('Erro: ' + e.message, 'error', 8000);
      } finally {
        this.certWorking = false;
      }
    },

    async removerCertificado() {
      if (!UI.confirm('Remover o certificado cadastrado? Você não conseguirá mais assinar PDFs até cadastrar outro.')) return;
      try {
        await Signer.removeCertificate();
        UI.toast('Certificado removido', 'success');
        await this.carregarStatusCertificado();
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      }
    },

    limparCacheSenha() {
      Signer.clearCachedPassword();
      this.senhaCacheAtiva = false;
      UI.toast('Senha do certificado removida da memória', 'info');
    },

    async atualizarStatusSW() {
      // Cached?
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        this.swStatus.cached = true;
        // Pergunta a versão via MessageChannel
        try {
          const channel = new MessageChannel();
          const versionPromise = new Promise((resolve) => {
            channel.port1.onmessage = (e) => resolve(e.data && e.data.version);
            setTimeout(() => resolve(null), 2000);
          });
          navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
          this.swStatus.swVersion = await versionPromise || 'ativo';
        } catch (e) {
          this.swStatus.swVersion = 'ativo';
        }
      } else {
        this.swStatus.cached = false;
      }

      // Instalado como PWA?
      this.swStatus.installed = window.matchMedia('(display-mode: standalone)').matches ||
                                window.navigator.standalone === true;

      // Pode ser instalado?
      this.swStatus.canInstall = !!window.deferredInstallPrompt && !this.swStatus.installed;
    },

    async instalar() {
      if (!window.deferredInstallPrompt) {
        UI.toast('Instalação não disponível neste momento. Tente recarregar a página.', 'info', 6000);
        return;
      }
      try {
        window.deferredInstallPrompt.prompt();
        const choice = await window.deferredInstallPrompt.userChoice;
        window.deferredInstallPrompt = null;
        if (choice.outcome === 'accepted') {
          UI.toast('App instalado com sucesso', 'success');
          setTimeout(() => this.atualizarStatusSW(), 500);
        }
      } catch (e) {
        UI.toast('Erro ao instalar: ' + e.message, 'error');
      }
    },

    async verificarAtualizacao() {
      if (this.checkingUpdate) return;
      this.checkingUpdate = true;
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            UI.toast('Verificação concluída. Se houver atualização, um aviso aparecerá.', 'info', 5000);
          } else {
            UI.toast('Service Worker ainda não registrado.', 'info');
          }
        }
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      } finally {
        this.checkingUpdate = false;
      }
    },

    async baixarBackup() {
      if (this.working) return;
      this.working = true;
      try {
        const { filename, bytes } = await Backup.downloadBackup();
        const kb = (bytes / 1024).toFixed(1);
        UI.toast(`Backup baixado: ${filename} (${kb} KB)`, 'success', 6000);
        // Recarrega status
        const s = await Backup.getStatus();
        this.backupStatus = { ...s, loaded: true };
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao gerar backup: ' + e.message, 'error');
      } finally {
        this.working = false;
      }
    },

    async arquivoSelecionado(event) {
      const file = event.target.files[0];
      if (!file) return;
      // Reseta o input para permitir selecionar o mesmo arquivo de novo depois
      event.target.value = '';

      try {
        const result = await Backup.validateBackupFile(file);
        this.arquivoInfo = result.info;
        this.envelopePendente = result.envelope;
        // Rola para o painel
        setTimeout(() => {
          const el = document.querySelector('.alert.alert-warning');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } catch (e) {
        console.error(e);
        UI.toast('Backup inválido: ' + e.message, 'error', 8000);
        this.arquivoInfo = null;
        this.envelopePendente = null;
      }
    },

    cancelarRestauracao() {
      this.arquivoInfo = null;
      this.envelopePendente = null;
    },

    async confirmarRestauracao() {
      if (!this.envelopePendente) return;
      if (this.working) return;

      // Dupla confirmação
      if (!UI.confirm('Tem certeza? Todos os dados atuais serão SUBSTITUÍDOS pelo backup. Esta ação é IRREVERSÍVEL.')) return;
      if (!UI.confirm('Confirmação final: substituir TUDO pelo backup?')) return;

      this.working = true;
      try {
        await Backup.importFromEnvelope(this.envelopePendente);
        UI.toast('Backup restaurado. Faça login com a senha original.', 'success', 8000);
        // Recarrega a página para começar do zero (com o cofre travado)
        setTimeout(() => location.reload(), 1500);
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao restaurar: ' + e.message, 'error', 8000);
        this.working = false;
      }
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
