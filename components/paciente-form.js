/* ============================================================
   paciente-form.js — Cadastro e edição de paciente
   Campos: nome*, dataNascimento*, sexo, CPF, RG, endereço,
   whatsapp, contato de emergência, profissão, etc.
   ============================================================ */

function renderPacienteForm(container, id) {
  const isNew = (id === 'novo' || id == null);
  const idParam = isNew ? 'null' : parseInt(id, 10);
  container.innerHTML = `
    <div x-data="pacienteForm(${idParam})"
         x-init="load(); $nextTick(() => window.ScrollSpy && ScrollSpy.ligar($root))">

      <div class="ficha-head">
        <button class="btn btn-ghost btn-icon" @click="$dispatch('navigate', '/pacientes')" title="Voltar ao fichário">
          <svg class="icon" style="transform: rotate(180deg)"><use href="#i-arrow-right"></use></svg>
        </button>
        <div class="ficha-id">
          <div class="ficha-nome" x-text="isNew ? 'Novo paciente' : (paciente.nome || 'Paciente')"></div>
          <div class="ficha-sub" x-show="!isNew">
            <span x-show="paciente.dataNascimento" x-text="calcAge(paciente.dataNascimento) + ' anos'"></span>
            <span x-show="paciente.sexo" x-text="paciente.sexo"></span>
            <span x-show="paciente.tipoVaga" class="vaga-badge-mini"
                  :class="'vaga-badge-' + paciente.tipoVaga"
                  x-text="rotuloVaga(paciente.tipoVaga)"></span>
            <span class="muted">cadastro <span x-text="formatDate(paciente.createdAt)"></span> · atualizado <span x-text="formatDate(paciente.updatedAt)"></span></span>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" @click="abrirImportar()" x-show="isNew">
            <svg class="icon"><use href="#i-clipboard"></use></svg>
            Importar pré-cadastro
          </button>
          <button class="btn btn-secondary" @click="abrirDocumentos()" x-show="!isNew">
            <svg class="icon"><use href="#i-file"></use></svg>
            Gerar documento
          </button>
          <button class="btn btn-primary" @click="novaConsulta()" x-show="!isNew">
            <svg class="icon"><use href="#i-plus"></use></svg>
            Nova consulta
          </button>
        </div>
      </div>

      <!-- Histórico de consultas (ledger) -->
      <div class="folha mb-4" x-show="!isNew" data-spy="hist">
        <div class="sec-head" style="margin-bottom: var(--space-4)">
          <h3 class="sec-title">Histórico de consultas</h3>
          <span class="sec-meta"><span x-text="consultas.length"></span> registro(s)</span>
        </div>

        <div x-show="loadingConsultas" aria-hidden="true">
          <div class="skel" style="height: 56px; margin-bottom: 8px"></div>
          <div class="skel" style="height: 56px"></div>
        </div>

        <div x-show="!loadingConsultas && consultas.length === 0" class="empty-state" style="padding: var(--space-6) 0">
          <h3>Nenhuma consulta registrada</h3>
          <p>Comece registrando a primeira consulta deste paciente.</p>
          <button class="btn btn-primary mt-3" @click="novaConsulta()">
            <svg class="icon"><use href="#i-plus"></use></svg>
            Registrar primeira consulta
          </button>
        </div>

        <div class="ledger" x-show="!loadingConsultas && consultas.length > 0">
          <template x-for="c in consultas" :key="c.id">
            <div class="ledger-item" style="cursor: pointer" @click="abrirConsulta(c.id)">
              <div class="ledger-date">
                <div style="font-weight: var(--weight-bold); color: var(--text-primary)"
                     x-text="formatConsultaDay(c.dataHora) + ' ' + formatConsultaMonth(c.dataHora)"></div>
                <div x-text="formatConsultaTime(c.dataHora)"></div>
              </div>
              <div class="ledger-body">
                <div style="font-weight: var(--weight-semibold)">
                  <span x-text="c.queixaPrincipal || 'Consulta'"></span>
                  <span x-show="c.queixaDuracao" class="text-sm muted" x-text="' · ' + c.queixaDuracao"></span>
                </div>

                <div class="flex gap-2 mt-2" style="flex-wrap: wrap" x-show="c.hipoteses && c.hipoteses.length > 0">
                  <template x-for="(h, hi) in (c.hipoteses || [])" :key="hi">
                    <span class="consulta-hip-chip">
                      <span x-text="textoHipotese(h)"></span>
                      <span class="code-pill ciap" style="margin-left: 0" x-show="ciapHipotese(h)" x-text="ciapHipotese(h)"></span>
                    </span>
                  </template>
                </div>
                <div class="text-sm muted mt-1" x-show="!c.hipoteses || c.hipoteses.length === 0">
                  Sem hipóteses registradas
                </div>

                <div class="flex items-center gap-2 mt-2" style="flex-wrap: wrap">
                  <span class="snap-pill pa" x-show="paFormatada(c)">
                    <svg class="icon"><use href="#i-vitals"></use></svg>
                    PA <span x-text="paFormatada(c)"></span>
                  </span>
                  <span class="snap-pill" x-show="c.peso">
                    <span x-text="c.peso + ' kg'"></span>
                  </span>
                  <span class="snap-icons">
                    <svg class="icon" x-show="temExames(c)"><title>Exames laboratoriais</title><use href="#i-flask"></use></svg>
                    <svg class="icon" x-show="temConduta(c)"><title>Conduta/prescrição registrada</title><use href="#i-pill"></use></svg>
                    <svg class="icon" x-show="c.exameFisicoDescricao"><title>Exame físico</title><use href="#i-heart-pulse"></use></svg>
                  </span>
                </div>
              </div>
              <svg class="icon" style="width: 14px; height: 14px; color: var(--text-muted); align-self: center"><use href="#i-chevron-right"></use></svg>
            </div>
          </template>
        </div>
      </div>

      <div class="workbench has-map">
        <div>
          <div class="folha">

            <!-- 01 · Dados pessoais -->
            <section class="sec" data-spy="p1">
              <span class="sec-num">01</span>
              <div class="sec-head"><h3 class="sec-title">Dados pessoais</h3></div>

              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="label" for="f_nome">Nome completo <span class="required">*</span></label>
                  <input id="f_nome" type="text" class="input" x-model="paciente.nome"
                         @input="touch()" placeholder="Nome completo do paciente">
                  <div class="field-error" x-show="touched && !paciente.nome">Campo obrigatório</div>
                </div>
                <div class="form-group">
                  <label class="label" for="f_nasc">Data de nascimento <span class="required">*</span></label>
                  <input id="f_nasc" type="date" class="input" x-model="paciente.dataNascimento" @input="touch()">
                  <div class="field-help" x-show="paciente.dataNascimento">
                    <span x-text="calcAge(paciente.dataNascimento)"></span> anos
                  </div>
                  <div class="field-error" x-show="touched && !paciente.dataNascimento">Campo obrigatório</div>
                </div>
              </div>

              <div class="form-row cols-3">
                <div class="form-group">
                  <label class="label" for="f_sexo">Sexo</label>
                  <select id="f_sexo" class="select" x-model="paciente.sexo" @change="touch()">
                    <option value="">—</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Intersexo">Intersexo</option>
                    <option value="Não declarado">Não declarado</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="label" for="f_genero">Identidade de gênero</label>
                  <input id="f_genero" type="text" class="input" x-model="paciente.identidadeGenero"
                         @input="touch()" placeholder="(opcional)">
                </div>
                <div class="form-group">
                  <label class="label" for="f_civil">Estado civil</label>
                  <select id="f_civil" class="select" x-model="paciente.estadoCivil" @change="touch()">
                    <option value="">—</option>
                    <option>Solteiro(a)</option>
                    <option>Casado(a)</option>
                    <option>União estável</option>
                    <option>Divorciado(a)</option>
                    <option>Viúvo(a)</option>
                    <option>Separado(a)</option>
                  </select>
                </div>
              </div>

              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="label" for="f_profissao">Profissão / ocupação</label>
                  <input id="f_profissao" type="text" class="input" x-model="paciente.profissao"
                         @input="touch()" placeholder="Ex: Aposentado, Professora">
                </div>
                <div class="form-group">
                  <label class="label" for="f_escolaridade">Escolaridade</label>
                  <select id="f_escolaridade" class="select" x-model="paciente.escolaridade" @change="touch()">
                    <option value="">—</option>
                    <option>Sem escolaridade</option>
                    <option>Fundamental incompleto</option>
                    <option>Fundamental completo</option>
                    <option>Médio incompleto</option>
                    <option>Médio completo</option>
                    <option>Superior incompleto</option>
                    <option>Superior completo</option>
                    <option>Pós-graduação</option>
                  </select>
                </div>
              </div>
            </section>

            <!-- 02 · Situação socioeconômica -->
            <section class="sec" data-spy="p2">
              <span class="sec-num">02</span>
              <div class="sec-head">
                <h3 class="sec-title">Situação socioeconômica</h3>
                <span class="sec-meta">cuidado inversamente proporcional ao privilégio</span>
              </div>

              <div class="form-group">
                <label class="label">Tipo de atendimento</label>
                <div class="vaga-radios">
                  <label class="vaga-radio" :class="paciente.tipoVaga === 'sus' ? 'vaga-radio-active vaga-sus' : ''">
                    <input type="radio" name="tipoVaga" value="sus" x-model="paciente.tipoVaga" @change="touch()">
                    <span>SUS</span>
                  </label>
                  <label class="vaga-radio" :class="paciente.tipoVaga === 'particular' ? 'vaga-radio-active vaga-particular' : ''">
                    <input type="radio" name="tipoVaga" value="particular" x-model="paciente.tipoVaga" @change="touch()">
                    <span>Particular</span>
                  </label>
                  <label class="vaga-radio" :class="paciente.tipoVaga === 'convenio' ? 'vaga-radio-active vaga-convenio' : ''">
                    <input type="radio" name="tipoVaga" value="convenio" x-model="paciente.tipoVaga" @change="touch()">
                    <span>Convênio</span>
                  </label>
                  <button type="button" class="vaga-radio-clear" x-show="paciente.tipoVaga"
                          @click="paciente.tipoVaga = ''; touch()" title="Limpar seleção">×</button>
                </div>
                <small class="field-help" x-show="paciente.tipoVaga === 'convenio'">
                  Informe o nome do plano no campo "Convênio / particular" abaixo (seção Documentos).
                </small>
              </div>

              <div class="form-row cols-3">
                <div class="form-group">
                  <label class="label" for="f_fonte_renda">Fonte de renda principal</label>
                  <select id="f_fonte_renda" class="select" x-model="paciente.fonteRenda" @change="touch()">
                    <option value="">—</option>
                    <option value="formal">Trabalho formal (CLT/servidor)</option>
                    <option value="informal">Trabalho informal / autônomo</option>
                    <option value="aposentadoria">Aposentadoria</option>
                    <option value="pensao">Pensão</option>
                    <option value="bpc">BPC/LOAS</option>
                    <option value="bolsa_familia">Bolsa Família / auxílio</option>
                    <option value="desempregado">Sem fonte de renda / desempregado(a)</option>
                    <option value="outra">Outra</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="label" for="f_renda_pessoal">Renda pessoal</label>
                  <select id="f_renda_pessoal" class="select" x-model="paciente.rendaPessoal" @change="touch()">
                    <option value="">—</option>
                    <option value="sem_renda">Sem renda</option>
                    <option value="ate_1">Até 1 salário mínimo</option>
                    <option value="1_2">1 a 2 salários mínimos</option>
                    <option value="2_3">2 a 3 salários mínimos</option>
                    <option value="3_5">3 a 5 salários mínimos</option>
                    <option value="mais_5">Mais de 5 salários mínimos</option>
                    <option value="nao_informado">Prefere não informar</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="label" for="f_renda_familiar">Renda familiar</label>
                  <select id="f_renda_familiar" class="select" x-model="paciente.rendaFamiliar" @change="touch()">
                    <option value="">—</option>
                    <option value="sem_renda">Sem renda</option>
                    <option value="ate_1">Até 1 salário mínimo</option>
                    <option value="1_2">1 a 2 salários mínimos</option>
                    <option value="2_3">2 a 3 salários mínimos</option>
                    <option value="3_5">3 a 5 salários mínimos</option>
                    <option value="mais_5">Mais de 5 salários mínimos</option>
                    <option value="nao_informado">Prefere não informar</option>
                  </select>
                </div>
              </div>
            </section>

            <!-- 03 · Documentos -->
            <section class="sec" data-spy="p3">
              <span class="sec-num">03</span>
              <div class="sec-head"><h3 class="sec-title">Documentos</h3></div>
              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="label" for="f_cpf">CPF</label>
                  <input id="f_cpf" type="text" class="input text-mono" x-model="paciente.cpf"
                         @input="touch(); formatCPF()" placeholder="000.000.000-00" maxlength="14">
                </div>
                <div class="form-group">
                  <label class="label" for="f_rg">RG</label>
                  <input id="f_rg" type="text" class="input text-mono" x-model="paciente.rg" @input="touch()"
                         placeholder="00.000.000-0">
                </div>
              </div>
              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="label" for="f_cns">Cartão SUS (CNS)</label>
                  <input id="f_cns" type="text" class="input text-mono" x-model="paciente.cns" @input="touch()"
                         placeholder="000 0000 0000 0000">
                </div>
                <div class="form-group">
                  <label class="label" for="f_conv">Convênio / particular</label>
                  <input id="f_conv" type="text" class="input" x-model="paciente.convenio" @input="touch()"
                         placeholder="SUS, particular, nome do plano">
                </div>
              </div>
            </section>

            <!-- 04 · Contato -->
            <section class="sec" data-spy="p4">
              <span class="sec-num">04</span>
              <div class="sec-head"><h3 class="sec-title">Contato</h3></div>
              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="label" for="f_whats">WhatsApp / celular</label>
                  <input id="f_whats" type="text" class="input" x-model="paciente.whatsapp" @input="touch()"
                         placeholder="(19) 99999-9999">
                </div>
                <div class="form-group">
                  <label class="label" for="f_tel">Telefone fixo</label>
                  <input id="f_tel" type="text" class="input" x-model="paciente.telefone" @input="touch()"
                         placeholder="(19) 3333-3333">
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 0">
                <label class="label" for="f_email">E-mail</label>
                <input id="f_email" type="email" class="input" x-model="paciente.email" @input="touch()"
                       placeholder="email@exemplo.com">
              </div>
            </section>

            <!-- 05 · Endereço -->
            <section class="sec" data-spy="p5">
              <span class="sec-num">05</span>
              <div class="sec-head"><h3 class="sec-title">Endereço</h3></div>
              <div class="form-row cols-3">
                <div class="form-group" style="grid-column: span 2">
                  <label class="label" for="f_logr">Logradouro</label>
                  <input id="f_logr" type="text" class="input" x-model="paciente.logradouro"
                         @input="touch()" placeholder="Rua, avenida...">
                </div>
                <div class="form-group">
                  <label class="label" for="f_num">Número</label>
                  <input id="f_num" type="text" class="input" x-model="paciente.numero" @input="touch()">
                </div>
              </div>
              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="label" for="f_compl">Complemento</label>
                  <input id="f_compl" type="text" class="input" x-model="paciente.complemento" @input="touch()">
                </div>
                <div class="form-group">
                  <label class="label" for="f_bairro">Bairro</label>
                  <input id="f_bairro" type="text" class="input" x-model="paciente.bairro" @input="touch()">
                </div>
              </div>
              <div class="form-row cols-3">
                <div class="form-group">
                  <label class="label" for="f_cidade">Cidade</label>
                  <input id="f_cidade" type="text" class="input" x-model="paciente.cidade" @input="touch()">
                </div>
                <div class="form-group">
                  <label class="label" for="f_uf">UF</label>
                  <input id="f_uf" type="text" class="input" x-model="paciente.uf" @input="touch()"
                         maxlength="2" placeholder="SP">
                </div>
                <div class="form-group">
                  <label class="label" for="f_cep">CEP</label>
                  <input id="f_cep" type="text" class="input text-mono" x-model="paciente.cep" @input="touch()"
                         placeholder="00000-000">
                </div>
              </div>
            </section>

            <!-- 06 · Emergência -->
            <section class="sec" data-spy="p6">
              <span class="sec-num">06</span>
              <div class="sec-head"><h3 class="sec-title">Contato de emergência / responsável</h3></div>
              <div class="form-row cols-3">
                <div class="form-group">
                  <label class="label" for="f_emerg_nome">Nome</label>
                  <input id="f_emerg_nome" type="text" class="input" x-model="paciente.emergenciaNome"
                         @input="touch()" placeholder="Nome do contato">
                </div>
                <div class="form-group">
                  <label class="label" for="f_emerg_par">Parentesco / vínculo</label>
                  <input id="f_emerg_par" type="text" class="input" x-model="paciente.emergenciaParentesco"
                         @input="touch()" placeholder="Filha, cônjuge, cuidador">
                </div>
                <div class="form-group">
                  <label class="label" for="f_emerg_tel">WhatsApp / telefone</label>
                  <input id="f_emerg_tel" type="text" class="input" x-model="paciente.emergenciaTelefone"
                         @input="touch()" placeholder="(19) 99999-9999">
                </div>
              </div>
            </section>

            <!-- 07 · Observações -->
            <section class="sec" data-spy="p7">
              <span class="sec-num">07</span>
              <div class="sec-head"><h3 class="sec-title">Observações gerais</h3></div>
              <div class="form-group" style="margin-bottom: 0">
                <label class="label" for="f_obs">Notas não-clínicas sobre o paciente
                  <span class="hint">(rede de apoio, acessibilidade, preferências de contato)</span>
                </label>
                <textarea id="f_obs" class="textarea auto-grow" x-model="paciente.observacoes"
                          @input="touch(); autoGrow($event.target)" rows="4"
                          placeholder="Mora sozinho? Tem dificuldade de locomoção? Quem traz à consulta?"></textarea>
              </div>
            </section>
          </div>

          <div class="actionbar">
            <svg class="icon" style="width:13px;height:13px;color:var(--text-muted)"><use href="#i-lock"></use></svg>
            <span class="ab-status" x-text="autoSaveStatus || 'AES-GCM 256 local'"></span>
            <div class="ab-spacer"></div>
            <button class="btn btn-ghost" style="color: var(--color-danger)" @click="remove()" x-show="!isNew">
              <svg class="icon"><use href="#i-trash"></use></svg>
              Excluir
            </button>
            <button class="btn btn-secondary" @click="$dispatch('navigate', '/pacientes')">Cancelar</button>
            <button class="btn btn-primary" @click="save()" :disabled="!isValid() || saving">
              <span x-show="!saving" x-text="isNew ? 'Cadastrar' : 'Salvar alterações'"></span>
              <span x-show="saving">Salvando…</span>
            </button>
          </div>
        </div>

        <nav class="minimap" aria-label="Seções do cadastro">
          <div class="minimap-title">Cadastro</div>
          <button class="minimap-item" data-spy-for="hist" x-show="!isNew" @click="ScrollSpy.irPara('hist')">
            <span class="mm-dot" :class="consultas.length ? 'done' : ''"></span> Histórico
          </button>
          <button class="minimap-item" data-spy-for="p1" @click="ScrollSpy.irPara('p1')">
            <span class="mm-dot" :class="(paciente.nome && paciente.dataNascimento) ? 'done' : 'warn'"></span> Dados pessoais
          </button>
          <button class="minimap-item" data-spy-for="p2" @click="ScrollSpy.irPara('p2')">
            <span class="mm-dot" :class="paciente.tipoVaga ? 'done' : ''"></span> Socioeconômica
          </button>
          <button class="minimap-item" data-spy-for="p3" @click="ScrollSpy.irPara('p3')">
            <span class="mm-dot" :class="(paciente.cpf || paciente.cns) ? 'done' : ''"></span> Documentos
          </button>
          <button class="minimap-item" data-spy-for="p4" @click="ScrollSpy.irPara('p4')">
            <span class="mm-dot" :class="(paciente.whatsapp || paciente.telefone || paciente.email) ? 'done' : ''"></span> Contato
          </button>
          <button class="minimap-item" data-spy-for="p5" @click="ScrollSpy.irPara('p5')">
            <span class="mm-dot" :class="(paciente.logradouro || paciente.cidade) ? 'done' : ''"></span> Endereço
          </button>
          <button class="minimap-item" data-spy-for="p6" @click="ScrollSpy.irPara('p6')">
            <span class="mm-dot" :class="paciente.emergenciaNome ? 'done' : ''"></span> Emergência
          </button>
          <button class="minimap-item" data-spy-for="p7" @click="ScrollSpy.irPara('p7')">
            <span class="mm-dot" :class="paciente.observacoes ? 'done' : ''"></span> Observações
          </button>
        </nav>
      </div>

      <!-- Modal: importar pré-cadastro do paciente -->
      <template x-teleport="body">
        <div x-show="modalImportar" x-cloak class="modal-overlay" @click.self="fecharImportar()">
          <div class="modal-sheet" style="max-width: 520px" @click.stop>
            <div class="modal-head">
              <h3>Importar pré-cadastro</h3>
              <button class="btn btn-sm btn-icon btn-ghost" @click="fecharImportar()">
                <svg class="icon"><use href="#i-x"></use></svg>
              </button>
            </div>
            <p class="text-sm muted mb-3">
              Cole abaixo o código que o paciente enviou (começa com <code>CDV1:</code>).
              Os campos preenchidos por ele serão lançados na ficha — depois é só revisar e salvar.
            </p>
            <textarea class="textarea" rows="5" x-model="codigoImportar"
                      placeholder="Cole aqui o código (CDV1:...)"
                      style="font-family: var(--font-mono); font-size: 0.8rem; word-break: break-all;"></textarea>
            <div class="mt-4 flex gap-2" style="justify-content: flex-end">
              <button class="btn btn-secondary" @click="fecharImportar()" :disabled="importando">Cancelar</button>
              <button class="btn btn-primary" @click="confirmarImportar()" :disabled="importando">
                <span x-show="!importando">Preencher ficha</span>
                <span x-show="importando">Lendo…</span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  `;
}

function pacienteForm(id) {
  return {
    isNew: id === null || id === undefined,
    id: id,
    paciente: emptyPaciente(),
    touched: false,
    saving: false,
    autoSaveStatus: '',
    consultas: [],
    loadingConsultas: false,
    // Importar pré-cadastro
    modalImportar: false,
    codigoImportar: '',
    importando: false,

    async load() {
      if (!this.isNew) {
        try {
          const numericId = typeof this.id === 'string' ? parseInt(this.id, 10) : this.id;
          const data = await DB.getPaciente(numericId);
          if (data) {
            this.paciente = { ...emptyPaciente(), ...data };
            // Auto-grow do textarea após renderização
            this.$nextTick(() => {
              document.querySelectorAll('.textarea.auto-grow').forEach(el => UI.autoGrowTextarea(el));
            });
            // Carrega consultas
            this.carregarConsultas();
          } else {
            UI.toast('Paciente não encontrado', 'error');
            Router.navigate('/pacientes');
          }
        } catch (e) {
          UI.toast('Erro ao carregar: ' + e.message, 'error');
        }
      }
    },

    async carregarConsultas() {
      this.loadingConsultas = true;
      try {
        const numericId = typeof this.id === 'string' ? parseInt(this.id, 10) : this.id;
        this.consultas = await DB.listConsultasByPaciente(numericId);
      } catch (e) {
        console.error('Erro ao carregar consultas:', e);
      } finally {
        this.loadingConsultas = false;
      }
    },

    novaConsulta() {
      const pid = typeof this.id === 'string' ? this.id : String(this.id);
      Router.navigate('/paciente/' + pid + '/consulta/nova');
    },

    // ---- Importar pré-cadastro (preenchido pelo paciente) ----
    abrirImportar() {
      this.codigoImportar = '';
      this.modalImportar = true;
    },
    fecharImportar() {
      this.modalImportar = false;
    },
    confirmarImportar() {
      const txt = (this.codigoImportar || '').trim();
      if (!txt) { UI.toast('Cole o código que o paciente enviou', 'error'); return; }
      if (!window.PreCadastro) { UI.toast('Módulo de pré-cadastro não carregado', 'error'); return; }
      this.importando = true;
      try {
        const dados = PreCadastro.decode(txt);
        if (!dados || Object.keys(dados).length === 0) {
          UI.toast('O código não trouxe nenhuma informação', 'error');
          this.importando = false;
          return;
        }
        // Preenche apenas os campos vindos do código, preservando o restante
        this.paciente = { ...this.paciente, ...dados };
        this.touched = true;
        this.modalImportar = false;
        const n = Object.keys(dados).length;
        UI.toast('Ficha preenchida com ' + n + ' campo(s). Revise e salve.', 'success');
        this.$nextTick(() => {
          document.querySelectorAll('.textarea.auto-grow').forEach(el => UI.autoGrowTextarea(el));
        });
      } catch (e) {
        UI.toast(e.message || 'Código inválido', 'error');
      } finally {
        this.importando = false;
      }
    },

    rotuloVaga(v) {
      return (window.ROTULOS_SOCIO && ROTULOS_SOCIO.tipoVaga[v]) || v;
    },

    abrirDocumentos() {
      const pid = typeof this.id === 'string' ? this.id : String(this.id);
      Router.navigate('/paciente/' + pid + '/documentos');
    },

    abrirConsulta(consultaId) {
      const pid = typeof this.id === 'string' ? this.id : String(this.id);
      Router.navigate('/paciente/' + pid + '/consulta/' + consultaId);
    },

    formatConsultaDay(iso) {
      if (!iso) return '?';
      return new Date(iso).getDate().toString().padStart(2, '0');
    },

    formatConsultaMonth(iso) {
      if (!iso) return '';
      const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
      return months[new Date(iso).getMonth()] + '/' + new Date(iso).getFullYear().toString().slice(-2);
    },

    formatConsultaTime(iso) {
      if (!iso) return '';
      return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    },

    // ---- Helpers da timeline v2 (Sprint v0.17) ----
    textoHipotese(h) {
      if (window.CodigosClinicos) return CodigosClinicos.textoDe(h);
      if (typeof h === 'string') return h;
      return (h && h.texto) || '';
    },

    ciapHipotese(h) {
      const c = window.CodigosClinicos ? CodigosClinicos.ciapDe(h)
                : (window.Hiperdia ? null : null);
      if (c && c.codigo) return c.codigo;
      // fallback Hiperdia
      if (window.Hiperdia) {
        const cod = Hiperdia.extrairCodigoCiap(h);
        return cod || '';
      }
      return '';
    },

    paFormatada(c) {
      if (!c || !c.pa) return '';
      if (window.Hiperdia) {
        const parsed = Hiperdia.parsePA(c.pa);
        if (parsed) return parsed.sistolica + '×' + parsed.diastolica;
      }
      // fallback: mostra texto bruto se curto
      return String(c.pa).length <= 12 ? c.pa : '';
    },

    temExames(c) {
      if (!c || !c.exames) return false;
      // Considera "tem exames" se qualquer subcategoria tem algum valor preenchido
      const ex = c.exames;
      for (const cat of Object.keys(ex)) {
        const grupo = ex[cat];
        if (!grupo || typeof grupo !== 'object') continue;
        for (const campo of Object.keys(grupo)) {
          const v = grupo[campo];
          if (v !== null && v !== undefined && v !== '' && v !== false) return true;
        }
      }
      return false;
    },

    temConduta(c) {
      return !!(c && (c.conduta || (c.prescricao && c.prescricao.length)));
    },

    touch() {
      this.touched = true;
      this.autoSaveStatus = 'Edição não salva…';
    },

    autoGrow(el) { UI.autoGrowTextarea(el); },

    isValid() {
      return !!(this.paciente.nome && this.paciente.dataNascimento);
    },

    formatCPF() {
      let v = (this.paciente.cpf || '').replace(/\D/g, '').slice(0, 11);
      if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
      else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
      else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
      this.paciente.cpf = v;
    },

    calcAge(d) { return UI.calculateAge(d); },
    formatDate(d) { return UI.formatDate(d); },

    async save() {
      if (!this.isValid()) {
        this.touched = true;
        UI.toast('Preencha os campos obrigatórios', 'error');
        return;
      }
      this.saving = true;
      try {
        // Limpa o objeto antes de salvar (remove id se for novo, remove timestamps)
        const data = { ...this.paciente };
        delete data.id;
        delete data.createdAt;
        delete data.updatedAt;

        if (this.isNew) {
          const newId = await DB.createPaciente(data);
          UI.toast('Paciente cadastrado', 'success');
          this.autoSaveStatus = '';
          Router.navigate('/paciente/' + newId);
        } else {
          const numericId = typeof this.id === 'string' ? parseInt(this.id, 10) : this.id;
          await DB.updatePaciente(numericId, data);
          UI.toast('Alterações salvas', 'success');
          this.autoSaveStatus = '✓ Salvo ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          // Recarrega timestamps
          const refreshed = await DB.getPaciente(numericId);
          this.paciente = { ...emptyPaciente(), ...refreshed };
        }
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      } finally {
        this.saving = false;
      }
    },

    async remove() {
      if (!UI.confirm(`Excluir o paciente "${this.paciente.nome}"?\n\nO registro fica retido por 20 anos conforme Lei 13.787/2018, mas sai da lista ativa.`)) return;
      try {
        const numericId = typeof this.id === 'string' ? parseInt(this.id, 10) : this.id;
        await DB.softDeletePaciente(numericId);
        UI.toast('Paciente removido da lista ativa', 'success');
        Router.navigate('/pacientes');
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      }
    }
  };
}

function emptyPaciente() {
  return {
    nome: '',
    dataNascimento: '',
    sexo: '',
    identidadeGenero: '',
    estadoCivil: '',
    profissao: '',
    escolaridade: '',
    // Situação socioeconômica (Sprint v0.17)
    tipoVaga: '',        // sus | particular | convenio
    rendaPessoal: '',    // faixas em salários mínimos
    rendaFamiliar: '',   // faixas em salários mínimos
    fonteRenda: '',      // formal | informal | aposentadoria | pensao | bpc | bolsa_familia | desempregado | outra
    cpf: '',
    rg: '',
    cns: '',
    convenio: '',
    whatsapp: '',
    telefone: '',
    email: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    emergenciaNome: '',
    emergenciaParentesco: '',
    emergenciaTelefone: '',
    observacoes: ''
  };
}

// Rótulos legíveis para campos socioeconômicos (usados em exibição)
const ROTULOS_SOCIO = {
  tipoVaga: {
    sus: '🏥 SUS',
    particular: '💳 Particular',
    convenio: '📋 Convênio'
  },
  renda: {
    sem_renda: 'Sem renda',
    ate_1: 'Até 1 salário mínimo',
    '1_2': '1 a 2 salários mínimos',
    '2_3': '2 a 3 salários mínimos',
    '3_5': '3 a 5 salários mínimos',
    mais_5: 'Mais de 5 salários mínimos',
    nao_informado: 'Prefere não informar'
  },
  fonteRenda: {
    formal: 'Trabalho formal (CLT/servidor)',
    informal: 'Trabalho informal / autônomo',
    aposentadoria: 'Aposentadoria',
    pensao: 'Pensão',
    bpc: 'BPC/LOAS',
    bolsa_familia: 'Bolsa Família / auxílio',
    desempregado: 'Sem fonte de renda / desempregado(a)',
    outra: 'Outra'
  }
};
if (typeof window !== 'undefined') window.ROTULOS_SOCIO = ROTULOS_SOCIO;

window.renderPacienteForm = renderPacienteForm;
window.pacienteForm = pacienteForm;
