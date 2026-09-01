/* ============================================================
   config.js — Configurações (senha, audit, wipe)
   ============================================================ */

function renderConfig(container) {
  container.innerHTML = `
    <div x-data="configScreen()" x-init="load()">
      <div class="ficha-head">
        <div class="ficha-id">
          <div class="ficha-nome">Configurações</div>
          <p class="page-subtitle">Segurança, manutenção e auditoria</p>
        </div>
      </div>

      <div class="card mt-4">
        <h3 class="card-title mb-4">👤 Identificação profissional</h3>
        <p class="field-help mb-3">Sai no cabeçalho e na assinatura de receitas, laudos e PDFs.</p>
        <div class="form-group">
          <label>Nome completo</label>
          <input type="text" class="input" x-model="perfil.nome">
        </div>
        <div class="flex gap-2">
          <div class="form-group" style="flex:0 0 88px"><label>Título</label><input type="text" class="input" x-model="perfil.titulo"></div>
          <div class="form-group" style="flex:0 0 92px"><label>Conselho</label><input type="text" class="input" x-model="perfil.conselho"></div>
          <div class="form-group" style="flex:0 0 70px"><label>UF</label><input type="text" class="input" x-model="perfil.uf" maxlength="2"></div>
          <div class="form-group" style="flex:1"><label>Nº registro</label><input type="text" class="input" x-model="perfil.registro"></div>
        </div>
        <div class="form-group"><label>Especialidade <span style="color:var(--text-muted)">(opcional)</span></label><input type="text" class="input" x-model="perfil.especialidade"></div>
        <div class="form-group"><label>Unidade / estabelecimento <span style="color:var(--text-muted)">(opcional)</span></label><input type="text" class="input" x-model="perfil.unidade"></div>
        <div class="flex gap-2">
          <div class="form-group" style="flex:1"><label>Município/UF p/ assinatura <span style="color:var(--text-muted)">(opcional)</span></label><input type="text" class="input" x-model="perfil.municipio"></div>
          <div class="form-group" style="flex:1"><label>Contato p/ assinatura digital <span style="color:var(--text-muted)">(opcional)</span></label><input type="text" class="input" x-model="perfil.contato"></div>
        </div>
        <div class="field-help mt-2" x-show="perfil.nome.trim()">Sai como: <strong x-text="assinaturaPreview()"></strong></div>
        <button class="btn btn-primary mt-3" :disabled="perfilOcupado" @click="salvarPerfil()">
          <svg class="icon"><use href="#i-check"></use></svg> Salvar identificação
        </button>
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
              <span x-show="!working">Substituir tudo e restaurar</span>
              <span x-show="working">Restaurando…</span>
            </button>
            <button class="btn btn-ghost" @click="cancelarRestauracao()">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- APARÊNCIA (Sprint C3)                                          -->
      <!-- ============================================================ -->
      <div class="card mt-4">
        <h3 class="card-title mb-4">🎨 Aparência</h3>
        <p class="text-sm mb-3">
          Tema visual da interface. PDFs gerados sempre saem em modo claro
          (preto sobre branco) para impressão padrão, independente do tema escolhido aqui.
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-3);">
          <label class="tipo-card" :class="temaAtual === 'light' ? 'selected' : ''" @click="trocarTema('light')" style="cursor:pointer;">
            <input type="radio" name="tema" value="light" :checked="temaAtual === 'light'" style="display:none;">
            <div style="font-size: 1.5em; text-align:center;">☀️</div>
            <div style="font-weight: var(--weight-semibold); text-align:center; margin-top: var(--space-1);">Claro</div>
            <div class="text-xs muted" style="text-align:center;">sempre fundo branco</div>
          </label>
          <label class="tipo-card" :class="temaAtual === 'dark' ? 'selected' : ''" @click="trocarTema('dark')" style="cursor:pointer;">
            <input type="radio" name="tema" value="dark" :checked="temaAtual === 'dark'" style="display:none;">
            <div style="font-size: 1.5em; text-align:center;">🌙</div>
            <div style="font-weight: var(--weight-semibold); text-align:center; margin-top: var(--space-1);">Escuro</div>
            <div class="text-xs muted" style="text-align:center;">sempre fundo escuro</div>
          </label>
          <label class="tipo-card" :class="temaAtual === 'auto' ? 'selected' : ''" @click="trocarTema('auto')" style="cursor:pointer;">
            <input type="radio" name="tema" value="auto" :checked="temaAtual === 'auto'" style="display:none;">
            <div style="font-size: 1.5em; text-align:center;">🌗</div>
            <div style="font-weight: var(--weight-semibold); text-align:center; margin-top: var(--space-1);">Automático</div>
            <div class="text-xs muted" style="text-align:center;">segue o sistema operacional</div>
          </label>
        </div>
        <p class="text-xs muted mt-3">
          Atalho: também é possível alternar pelo botão "Tema" no menu lateral.
        </p>
      </div>

      <!-- ============================================================ -->
      <!-- SINCRONIZAÇÃO ENTRE DISPOSITIVOS (Sprint D2)                  -->
      <!-- ============================================================ -->
      <div class="card mt-4">
        <h3 class="card-title mb-3">☁️ Sincronização entre dispositivos</h3>

        <!-- ESTADO 1: NÃO CONFIGURADO -->
        <div x-show="!syncStatus.configurado">
          <p class="text-sm mb-3">
            Sincronize seu cofre entre notebook, celular e tablet. Os dados são cifrados <strong>antes</strong> de sair daqui — o servidor só vê bytes opacos. Mesmo que invadam o servidor, não conseguem ler nada sem sua senha.
          </p>

          <div class="alert alert-info mb-3">
            <strong>Como funciona:</strong>
            <ol style="margin: 4px 0 0 20px; padding: 0;">
              <li>Você cria conta gratuita no <a href="https://supabase.com" target="_blank">supabase.com</a></li>
              <li>Cria um projeto e roda o SQL que eu te dou (1 minuto)</li>
              <li>Cola URL + chave anon aqui</li>
              <li>Em outros dispositivos, usa <strong>o mesmo Vault ID + mesma senha mestre</strong></li>
            </ol>
          </div>

          <div class="form-group">
            <label class="label">URL do projeto Supabase</label>
            <input class="input" type="url" x-model="syncForm.url" placeholder="https://abcdefgh.supabase.co">
          </div>

          <div class="form-group">
            <label class="label">Chave pública (anon key)
              <span class="hint">"public anon key" da página API do Supabase</span>
            </label>
            <input class="input" type="text" x-model="syncForm.anonKey" placeholder="eyJ...">
          </div>

          <div class="form-group">
            <label class="label">Vault ID (deixe vazio para gerar um novo, ou cole de outro dispositivo)
              <span class="hint">UUID que identifica seu cofre. Mantenha secreto.</span>
            </label>
            <input class="input" type="text" x-model="syncForm.vaultId" placeholder="opcional — para parear com outro dispositivo">
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-primary" @click="conectarSync()" :disabled="syncOcupado || !syncForm.url || !syncForm.anonKey">
              <span x-show="!syncOcupado" x-text="syncForm.vaultId ? '🔗 Parear com cofre existente' : '✨ Criar novo cofre remoto'"></span>
              <span x-show="syncOcupado">Conectando…</span>
            </button>
            <button class="btn btn-ghost" @click="copiarSqlSetup()"><svg class="icon"><use href="#i-copy"></use></svg> Copiar SQL do setup</button>
          </div>
        </div>

        <!-- ESTADO 2: CONFIGURADO -->
        <div x-show="syncStatus.configurado">
          <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom: var(--space-3);">
            <span style="font-size: 1.5em">✅</span>
            <div style="flex:1; min-width:200px;">
              <strong>Sincronização ativa</strong>
              <div class="text-xs muted" x-text="syncStatus.url || ''"></div>
              <div class="text-xs muted" x-show="syncStatus.lastSyncedAt">
                Última sync: <span x-text="formatarDataSync(syncStatus.lastSyncedAt)"></span>
              </div>
              <div class="text-xs muted" x-show="!syncStatus.lastSyncedAt">Nunca sincronizou</div>
              <div class="text-xs" x-show="syncStatus.lastSyncError" style="color: var(--color-danger);">
                Último erro: <span x-text="syncStatus.lastSyncError"></span>
              </div>
            </div>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom: var(--space-3);">
            <button class="btn btn-primary" @click="sincronizarAgora()" :disabled="syncOcupado">
              <span x-show="!syncOcupado"><svg class="icon"><use href="#i-sync"></use></svg> Sincronizar agora</span>
              <span x-show="syncOcupado">Sincronizando…</span>
            </button>
            <button class="btn" @click="mostrarVaultId = !mostrarVaultId">
              <span x-text="mostrarVaultId ? '🙈 Esconder' : '👁 Ver'"></span> Vault ID
            </button>
            <button class="btn btn-ghost" @click="desconectarSync()" style="color: var(--color-danger);">
              ⛓️‍💥 Desconectar deste dispositivo
            </button>
          </div>

          <div x-show="mostrarVaultId" x-cloak class="alert alert-warning">
            <strong>Vault ID (para parear outros dispositivos):</strong>
            <code style="display:block; padding: 6px; margin-top: 6px; user-select: all; word-break: break-all;" x-text="syncStatus.vaultId"></code>
            <p class="text-xs mt-2">
              Copie isso para usar em outro dispositivo (notebook, celular). Quem souber este código + sua senha mestre tem acesso ao cofre.
              <strong>Sem a senha, este código sozinho não serve para ler nada</strong> (dados cifrados).
            </p>
          </div>

          <p class="text-xs muted">
            Auto-sync a cada 5 minutos quando online. PDFs gerados continuam sempre locais (sem sair do dispositivo).
          </p>
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
              <strong x-show="certInfo?.expirado">Certificado EXPIRADO</strong>
              <strong x-show="!certInfo?.expirado && certInfo?.diasParaExpirar < 30">Certificado expira em breve</strong>
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
              <svg class="icon"><use href="#i-lock"></use></svg> Esquecer senha em cache
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
        <h3 class="card-title mb-4">Trilha de auditoria recente</h3>
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
        <h3 class="card-title mb-4">🔒 Trancar o cofre</h3>
        <p class="text-sm mb-3">Trava o acesso na hora — você precisará digitar a senha de novo.
        O botão <strong>Bloquear cofre</strong> também fica sempre na barra lateral e no topo da tela.</p>
        <button class="btn btn-secondary mb-4" @click="lock()">
          <svg class="icon"><use href="#i-lock"></use></svg> Bloquear agora
        </button>
        <div class="form-group">
          <label>Trancar sozinho após inatividade</label>
          <select class="input" x-model.number="idleTimeoutMin" @change="salvarIdleTimeout()">
            <option :value="0">Nunca — sem tempo limite</option>
            <option :value="15">15 minutos</option>
            <option :value="30">30 minutos</option>
            <option :value="60">1 hora</option>
            <option :value="120">2 horas</option>
            <option :value="240">4 horas</option>
          </select>
          <p class="field-help mt-2">Em <strong>Nunca</strong>, o CDV não tranca sozinho — bom para consultas longas com transcrição. Trancar manualmente, ou fechar/recarregar a aba, sempre encerra a sessão.</p>
        </div>
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
            <span x-show="!checkingUpdate"><svg class="icon"><use href="#i-sync"></use></svg> Verificar atualizações</span>
            <span x-show="checkingUpdate">Verificando…</span>
          </button>
        </div>

        <p class="text-xs muted mt-3" x-show="!swStatus.canInstall && !swStatus.installed">
          O botão de instalação aparece quando o navegador detecta que o aplicativo está pronto.
          No Chrome desktop, você também pode clicar no ícone 📲 no canto direito da barra de endereços.
        </p>
      </div>

      <div class="card mt-4" style="border-color: var(--color-danger)">
        <h3 class="card-title mb-4" style="color: var(--color-danger); display:flex; align-items:center; gap:8px"><svg class="icon" style="width:15px;height:15px"><use href="#i-alert"></use></svg>Zona de perigo</h3>
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
    // Sprint C3: tema
    temaAtual: (typeof window !== 'undefined' && window.Tema ? window.Tema.get() : 'auto'),
    trocarTema(modo) {
      if (window.Tema) {
        window.Tema.set(modo);
        this.temaAtual = modo;
        UI.toast(`Tema ${modo === 'auto' ? 'automático' : modo} aplicado`, 'success');
      }
    },

    // Sprint D2: sincronização
    syncStatus: { configurado: false },
    syncForm: { url: '', anonKey: '', vaultId: '' },
    syncOcupado: false,
    mostrarVaultId: false,

    async carregarSyncStatus() {
      if (typeof window.Sync === 'undefined') return;
      this.syncStatus = await window.Sync.status();
    },

    formatarDataSync(iso) {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        const diff = (Date.now() - d.getTime()) / 1000;
        if (diff < 60) return 'agora';
        if (diff < 3600) return `há ${Math.round(diff/60)} min`;
        if (diff < 86400) return `há ${Math.round(diff/3600)} h`;
        return d.toLocaleString('pt-BR');
      } catch (_) {
        return iso;
      }
    },

    async conectarSync() {
      if (this.syncOcupado) return;
      const url = (this.syncForm.url || '').trim();
      const anonKey = (this.syncForm.anonKey || '').trim();
      const vaultId = (this.syncForm.vaultId || '').trim();

      if (!url || !anonKey) {
        UI.toast('Informe URL e chave anon', 'error');
        return;
      }
      if (!window.SupabaseClient.urlValida(url)) {
        UI.toast('URL do Supabase inválida (deve ser https://*.supabase.co)', 'error');
        return;
      }

      this.syncOcupado = true;
      try {
        if (vaultId) {
          // Pareamento com cofre existente
          const r = await window.Sync.configurarSecundario(url, anonKey, vaultId);
          if (r && r.sucesso === false) {
            throw new Error(r.erro);
          }
          UI.toast(`Pareamento concluído — ${r.downloaded || 0} registros baixados`, 'success');
        } else {
          // Novo cofre primário
          await window.Sync.configurarPrimario(url, anonKey);
          // Faz primeira sync de tudo
          const r = await window.Sync.sincronizar();
          if (r && r.sucesso) {
            UI.toast(`Cofre remoto criado — ${r.uploaded} registros enviados`, 'success');
          } else {
            UI.toast(`Configurado (sync inicial falhou: ${r && r.erro})`, 'info');
          }
        }
        // Limpa form
        this.syncForm = { url: '', anonKey: '', vaultId: '' };
        await this.carregarSyncStatus();
        // Inicia auto-sync
        if (window.Sync && window.Sync.iniciarAutoSync) {
          window.Sync.iniciarAutoSync(() => this.carregarSyncStatus());
        }
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      } finally {
        this.syncOcupado = false;
      }
    },

    async sincronizarAgora() {
      if (this.syncOcupado) return;
      this.syncOcupado = true;
      try {
        const r = await window.Sync.sincronizar();
        if (r.sucesso) {
          const partes = [];
          if (r.uploaded > 0) partes.push(`${r.uploaded} enviado(s)`);
          if (r.downloaded > 0) partes.push(`${r.downloaded} baixado(s)`);
          if (r.conflitos && r.conflitos.length > 0) partes.push(`${r.conflitos.length} conflito(s)`);
          const msg = partes.length > 0 ? partes.join(', ') : 'tudo em dia';
          UI.toast(`Sincronizado — ${msg}`, 'success');
        } else {
          UI.toast(`Falha: ${r.erro || 'erro desconhecido'}`, 'error');
        }
        await this.carregarSyncStatus();
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      } finally {
        this.syncOcupado = false;
      }
    },

    async desconectarSync() {
      if (!confirm('Desconectar este dispositivo? Os dados ficam aqui e no servidor — outros dispositivos pareados continuam funcionando. Para apagar do servidor use o dashboard do Supabase.')) return;
      try {
        await window.Sync.desconectar();
        UI.toast('Desconectado deste dispositivo', 'success');
        await this.carregarSyncStatus();
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      }
    },

    async copiarSqlSetup() {
      try {
        const sql = window.SupabaseClient.SQL_SETUP;
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(sql);
          UI.toast('SQL copiado — cole no SQL Editor do Supabase', 'success');
        } else {
          // Fallback: mostra em modal
          alert('Copie o SQL abaixo e cole no SQL Editor do Supabase:\n\n' + sql);
        }
      } catch (e) {
        UI.toast('Erro ao copiar: ' + e.message, 'error');
      }
    },
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

    perfil: { nome:'', titulo:'Médico', conselho:'CRM', uf:'', registro:'', especialidade:'', unidade:'', municipio:'', contato:'' },
    perfilOcupado: false,
    idleTimeoutMin: 0,
    async salvarIdleTimeout() {
      const min = Number(this.idleTimeoutMin) || 0;
      await DB.setIdleTimeoutMin(min);
      if (window.Auth && Auth.setIdleTimeout) Auth.setIdleTimeout(min);
      UI.toast(min > 0 ? `Trancará após ${min} min de inatividade` : 'Não trancará por inatividade', 'success');
    },
    assinaturaPreview() {
      const p = this.perfil;
      const consUf = [p.conselho || 'CRM', (p.uf||'').toUpperCase()].filter(Boolean).join('-');
      const crm = [consUf, p.registro].filter(Boolean).join(' ').trim();
      return [p.nome, p.titulo, crm].filter(Boolean).join(' — ');
    },
    async carregarPerfil() {
      try {
        const p = await DB.getPerfil();
        if (p) { this.perfil = Object.assign(this.perfil, p); if (window.PDFBuilder) PDFBuilder.setMedico(p); }
      } catch (e) { /* ainda não configurado */ }
    },
    async salvarPerfil() {
      if (this.perfilOcupado) return;
      if (!this.perfil.nome.trim() || !this.perfil.registro.trim()) { UI.toast('Informe ao menos nome e número de registro', 'error'); return; }
      this.perfilOcupado = true;
      try {
        const p = await DB.setPerfil(this.perfil);
        this.perfil = Object.assign(this.perfil, p);
        if (window.PDFBuilder) PDFBuilder.setMedico(p);
        const tag = document.querySelector('.brand-tagline');
        if (tag && window.PDFBuilder) tag.textContent = PDFBuilder.MEDICO.crm || '';
        UI.toast('Identificação salva — já vale para os próximos documentos', 'success');
      } catch (e) { UI.toast('Erro ao salvar: ' + e.message, 'error'); }
      finally { this.perfilOcupado = false; }
    },
    async load() {
      await this.carregarPerfil();
      this.idleTimeoutMin = await DB.getIdleTimeoutMin();
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

      // Sprint D2: status de sync + auto-sync
      try {
        await this.carregarSyncStatus();
        if (this.syncStatus.configurado && window.Sync && window.Sync.iniciarAutoSync) {
          window.Sync.iniciarAutoSync(() => this.carregarSyncStatus());
        }
      } catch (e) {
        console.error('Erro ao carregar status de sync:', e);
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
