/* ============================================================
   paciente-form.js — Cadastro e edição de paciente
   Campos: nome*, dataNascimento*, sexo, CPF, RG, endereço,
   whatsapp, contato de emergência, profissão, etc.
   ============================================================ */

function renderPacienteForm(container, id) {
  const isNew = (id === 'novo' || id == null);
  const idParam = isNew ? 'null' : parseInt(id, 10);
  container.innerHTML = `
    <div x-data="pacienteForm(${idParam})" x-init="load()">
      <div class="page-header">
        <div>
          <button class="btn btn-ghost" @click="$dispatch('navigate', '/pacientes')">
            ← Voltar
          </button>
          <h1 class="page-title mt-2" x-text="isNew ? 'Novo paciente' : (paciente.nome || 'Paciente')"></h1>
          <p class="page-subtitle" x-show="!isNew">
            Cadastrado em <span x-text="formatDate(paciente.createdAt)"></span> ·
            atualizado em <span x-text="formatDate(paciente.updatedAt)"></span>
          </p>
        </div>
        <div class="page-actions">
          <span class="text-xs muted" x-show="autoSaveStatus" x-text="autoSaveStatus"></span>
          <button class="btn btn-danger" @click="remove()" x-show="!isNew">Excluir</button>
          <button class="btn btn-primary" @click="save()" :disabled="!isValid() || saving">
            <span x-show="!saving" x-text="isNew ? 'Cadastrar' : 'Salvar'"></span>
            <span x-show="saving">Salvando…</span>
          </button>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title mb-4">Dados pessoais</h3>

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
      </div>

      <div class="card mt-4">
        <h3 class="card-title mb-4">Documentos</h3>
        <div class="form-row cols-2">
          <div class="form-group">
            <label class="label" for="f_cpf">CPF</label>
            <input id="f_cpf" type="text" class="input" x-model="paciente.cpf"
                   @input="touch(); formatCPF()" placeholder="000.000.000-00" maxlength="14">
          </div>
          <div class="form-group">
            <label class="label" for="f_rg">RG</label>
            <input id="f_rg" type="text" class="input" x-model="paciente.rg" @input="touch()"
                   placeholder="00.000.000-0">
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label class="label" for="f_cns">Cartão SUS (CNS)</label>
            <input id="f_cns" type="text" class="input" x-model="paciente.cns" @input="touch()"
                   placeholder="000 0000 0000 0000">
          </div>
          <div class="form-group">
            <label class="label" for="f_conv">Convênio / particular</label>
            <input id="f_conv" type="text" class="input" x-model="paciente.convenio" @input="touch()"
                   placeholder="SUS, particular, nome do plano">
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <h3 class="card-title mb-4">Contato</h3>
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
        <div class="form-group">
          <label class="label" for="f_email">E-mail</label>
          <input id="f_email" type="email" class="input" x-model="paciente.email" @input="touch()"
                 placeholder="email@exemplo.com">
        </div>
      </div>

      <div class="card mt-4">
        <h3 class="card-title mb-4">Endereço</h3>
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
            <input id="f_cep" type="text" class="input" x-model="paciente.cep" @input="touch()"
                   placeholder="00000-000">
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <h3 class="card-title mb-4">Contato de emergência / responsável</h3>
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
      </div>

      <div class="card mt-4">
        <h3 class="card-title mb-4">Observações gerais</h3>
        <div class="form-group">
          <label class="label" for="f_obs">Notas não-clínicas sobre o paciente
            <span class="hint">(rede de apoio, acessibilidade, preferências de contato)</span>
          </label>
          <textarea id="f_obs" class="textarea auto-grow" x-model="paciente.observacoes"
                    @input="touch(); autoGrow($event.target)" rows="4"
                    placeholder="Mora sozinho? Tem dificuldade de locomoção? Quem traz à consulta?"></textarea>
        </div>
      </div>

      <!-- ========== TIMELINE DE CONSULTAS ========== -->
      <div class="card mt-4" x-show="!isNew">
        <div class="flex justify-between items-center mb-4" style="flex-wrap: wrap; gap: var(--space-3)">
          <h3 class="card-title">📋 Consultas (<span x-text="consultas.length"></span>)</h3>
          <button class="btn btn-primary" @click="novaConsulta()">+ Nova consulta</button>
        </div>

        <div x-show="loadingConsultas" class="empty-state">
          <div class="spinner" style="margin: 0 auto"></div>
        </div>

        <div x-show="!loadingConsultas && consultas.length === 0" class="empty-state">
          <h3>Nenhuma consulta registrada</h3>
          <p>Comece registrando a primeira consulta deste paciente.</p>
          <button class="btn btn-primary mt-3" @click="novaConsulta()">+ Registrar primeira consulta</button>
        </div>

        <div class="consultas-timeline" x-show="!loadingConsultas && consultas.length > 0">
          <template x-for="c in consultas" :key="c.id">
            <div class="consulta-item" @click="abrirConsulta(c.id)">
              <div class="consulta-data">
                <div class="consulta-data-day" x-text="formatConsultaDay(c.dataHora)"></div>
                <div class="consulta-data-month" x-text="formatConsultaMonth(c.dataHora)"></div>
                <div class="consulta-data-time" x-text="formatConsultaTime(c.dataHora)"></div>
              </div>
              <div class="consulta-info">
                <div class="consulta-titulo">
                  <span x-text="c.queixaPrincipal || 'Consulta'"></span>
                  <span x-show="c.queixaDuracao" class="text-sm muted"
                        x-text="' · ' + c.queixaDuracao"></span>
                </div>
                <div class="consulta-resumo">
                  <span x-show="c.hipoteses && c.hipoteses.length > 0">
                    Hipóteses: <span x-text="(c.hipoteses || []).slice(0, 2).join(', ')"></span>
                    <span x-show="c.hipoteses.length > 2"
                          x-text="' (+' + (c.hipoteses.length - 2) + ')'"></span>
                  </span>
                  <span x-show="!c.hipoteses || c.hipoteses.length === 0" class="muted">
                    Sem hipóteses registradas
                  </span>
                </div>
              </div>
              <div class="consulta-acoes">
                <button class="btn btn-ghost text-sm">Abrir →</button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="mt-6 mb-6 flex justify-between items-center" style="flex-wrap: wrap; gap: var(--space-3)">
        <span class="text-xs muted">
          🔒 Dados criptografados localmente com AES-GCM 256
        </span>
        <div class="flex gap-2">
          <button class="btn btn-secondary" @click="$dispatch('navigate', '/pacientes')">Cancelar</button>
          <button class="btn btn-primary" @click="save()" :disabled="!isValid() || saving">
            <span x-show="!saving" x-text="isNew ? 'Cadastrar' : 'Salvar alterações'"></span>
            <span x-show="saving">Salvando…</span>
          </button>
        </div>
      </div>
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

window.renderPacienteForm = renderPacienteForm;
window.pacienteForm = pacienteForm;
