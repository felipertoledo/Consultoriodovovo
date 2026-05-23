/* ============================================================
   consulta-form.js — Criação e edição de consulta médica
   Estrutura: 11 seções clínicas em cards colapsáveis
   Auto-save a cada 2s de inatividade
   ============================================================ */

function renderConsultaForm(container, pacienteId, consultaId) {
  const isNew = !consultaId || consultaId === 'nova';
  const pidParam = parseInt(pacienteId, 10);
  const cidParam = isNew ? 'null' : parseInt(consultaId, 10);
  container.innerHTML = `
    <div x-data="consultaForm(${pidParam}, ${cidParam})"
         x-init="load()">
      <div class="page-header">
        <div>
          <button class="btn btn-ghost" @click="voltar()">← Voltar ao paciente</button>
          <h1 class="page-title mt-2">
            <span x-show="isNew">Nova consulta</span>
            <span x-show="!isNew">Consulta de <span x-text="formatDate(consulta.dataHora)"></span></span>
          </h1>
          <p class="page-subtitle">
            Paciente: <strong x-text="paciente.nome"></strong>
            <span x-show="paciente.dataNascimento">
              · <span x-text="calcAge(paciente.dataNascimento) + ' anos'"></span>
            </span>
            <span x-show="paciente.sexo"> · <span x-text="paciente.sexo"></span></span>
          </p>
        </div>
        <div class="page-actions">
          <span class="text-xs muted" x-text="autoSaveStatus"></span>
          <button class="btn btn-secondary" @click="copiarSemId()" :disabled="isNew">
            🔒 Copiar sem identificadores
          </button>
          <button class="btn btn-primary" @click="salvar()" :disabled="saving">
            <span x-show="!saving" x-text="isNew ? 'Salvar consulta' : 'Salvar alterações'"></span>
            <span x-show="saving">Salvando…</span>
          </button>
        </div>
      </div>

      <!-- ========== 1. Queixa principal ========== -->
      <div class="card mb-4">
        <h3 class="card-title">1. Queixa principal</h3>
        <div class="form-row cols-2 mt-3">
          <div class="form-group">
            <label class="label">Motivo da consulta</label>
            <input class="input" x-model="consulta.queixaPrincipal" @input="touch()"
                   placeholder="Ex: dor torácica, retorno HAS, vacinação...">
          </div>
          <div class="form-group">
            <label class="label">Duração / início</label>
            <input class="input" x-model="consulta.queixaDuracao" @input="touch()"
                   placeholder="Ex: há 3 dias, há 2 meses, hoje pela manhã">
          </div>
        </div>
      </div>

      <!-- ========== 2. HPMA ========== -->
      <div class="card mb-4">
        <h3 class="card-title">2. História da Doença Atual (HPMA)</h3>
        <textarea class="textarea auto-grow mt-3" rows="4" x-model="consulta.hpma"
                  @input="touch(); autoGrow($event.target)"
                  placeholder="Narrativa cronológica: quando começou, como evoluiu, fatores de melhora/piora, sintomas associados, repercussões..."></textarea>
      </div>

      <!-- ========== 3. Medicação em uso contínuo ========== -->
      <div class="card mb-4">
        <h3 class="card-title">3. Medicação em uso contínuo</h3>
        <div class="position-relative mt-3" style="position: relative">
          <input class="input" x-model="medInput"
                 @input="atualizarSugestoes()"
                 @keydown.enter.prevent="adicionarMed()"
                 @keydown.escape="sugestoes = []"
                 placeholder="Digite a medicação (autocomplete REMUME) e pressione Enter">
          <div x-show="sugestoes.length > 0" class="autocomplete-list" x-cloak>
            <template x-for="(s, i) in sugestoes" :key="i">
              <div class="autocomplete-item" @click="escolherSugestao(s)" x-text="s"></div>
            </template>
          </div>
        </div>
        <div class="chips-container mt-3" x-show="consulta.medicacoesUso.length > 0">
          <template x-for="(m, i) in consulta.medicacoesUso" :key="i">
            <div class="chip chip-removable">
              <span x-text="m"></span>
              <button @click="removerMed(i)" style="margin-left: 6px; opacity: 0.6">×</button>
            </div>
          </template>
        </div>
        <p class="text-xs muted mt-2">Dica: posologia pode ser adicionada digitando livremente. Ex: "Losartana 50mg 1x manhã"</p>
      </div>

      <!-- ========== 4. Antecedentes pessoais ========== -->
      <div class="card mb-4">
        <h3 class="card-title">4. Antecedentes pessoais</h3>
        <p class="text-sm muted mt-2 mb-3">Clique para adicionar/remover. Texto livre abaixo para complemento.</p>
        <div class="chips-container">
          <template x-for="opcao in antecedentesComuns" :key="opcao">
            <button class="chip"
                    :class="consulta.antecedentes.includes(opcao) ? 'chip-selected' : ''"
                    @click="toggleAntecedente(opcao)"
                    x-text="opcao"></button>
          </template>
        </div>
        <div class="form-group mt-4">
          <label class="label text-sm">Cirurgias prévias</label>
          <div class="chips-container">
            <template x-for="opcao in cirurgiasComuns" :key="opcao">
              <button class="chip"
                      :class="consulta.cirurgias.includes(opcao) ? 'chip-selected' : ''"
                      @click="toggleCirurgia(opcao)"
                      x-text="opcao"></button>
            </template>
          </div>
        </div>
        <div class="form-group mt-3">
          <label class="label text-sm">Outros antecedentes (texto livre)</label>
          <textarea class="textarea auto-grow" rows="2" x-model="consulta.antecedentesTexto"
                    @input="touch(); autoGrow($event.target)"
                    placeholder="Outros antecedentes não listados acima"></textarea>
        </div>
      </div>

      <!-- ========== 5. Antecedentes familiares ========== -->
      <div class="card mb-4">
        <h3 class="card-title">5. Antecedentes familiares</h3>
        <div class="chips-container mt-3">
          <template x-for="opcao in familiaresComuns" :key="opcao">
            <button class="chip"
                    :class="consulta.familiares.includes(opcao) ? 'chip-selected' : ''"
                    @click="toggleFamiliar(opcao)"
                    x-text="opcao"></button>
          </template>
        </div>
        <div class="form-group mt-3">
          <label class="label text-sm">Detalhamento (texto livre)</label>
          <textarea class="textarea auto-grow" rows="2" x-model="consulta.familiaresTexto"
                    @input="touch(); autoGrow($event.target)"
                    placeholder="Ex: mãe com IAM aos 52 anos, irmão com diabetes tipo 1..."></textarea>
        </div>
      </div>

      <!-- ========== 6. Hábitos ========== -->
      <div class="card mb-4">
        <h3 class="card-title">6. Hábitos de vida</h3>
        <div class="form-row cols-2 mt-3">
          <div class="form-group">
            <label class="label">Tabagismo</label>
            <select class="select" x-model="consulta.tabagismo" @change="touch()">
              <option value="">—</option>
              <option>nunca fumou</option>
              <option>fumante ativo</option>
              <option>ex-tabagista</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label">Maços-ano <span class="hint">(se aplicável)</span></label>
            <input class="input" x-model="consulta.macosAno" @input="touch()"
                   placeholder="Ex: 30">
          </div>
        </div>
        <div class="form-row cols-3 mt-2">
          <div class="form-group">
            <label class="label">Álcool</label>
            <select class="select" x-model="consulta.alcool" @change="touch()">
              <option value="">—</option>
              <option>nega uso</option>
              <option>uso social</option>
              <option>uso frequente</option>
              <option>uso pesado/dependência</option>
              <option>ex-etilista</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label">Atividade física</label>
            <select class="select" x-model="consulta.atividadeFisica" @change="touch()">
              <option value="">—</option>
              <option>sedentário</option>
              <option>leve (1-2x/sem)</option>
              <option>moderada (3-4x/sem)</option>
              <option>regular (5+x/sem)</option>
              <option>atleta</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label">Sono</label>
            <select class="select" x-model="consulta.sono" @change="touch()">
              <option value="">—</option>
              <option>bom (7-9h reparadoras)</option>
              <option>insuficiente</option>
              <option>fragmentado</option>
              <option>insônia inicial</option>
              <option>insônia de manutenção</option>
              <option>despertar precoce</option>
              <option>sonolência diurna</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ========== 7. Exame físico ========== -->
      <div class="card mb-4">
        <h3 class="card-title">7. Exame físico</h3>
        <div class="form-row cols-3 mt-3">
          <div class="form-group">
            <label class="label">PA <span class="hint">(mmHg)</span></label>
            <input class="input" x-model="consulta.pa" @input="touch()" placeholder="Ex: 130x80">
          </div>
          <div class="form-group">
            <label class="label">FC <span class="hint">(bpm)</span></label>
            <input class="input" x-model="consulta.fc" @input="touch()" placeholder="Ex: 72">
          </div>
          <div class="form-group">
            <label class="label">FR <span class="hint">(irpm)</span></label>
            <input class="input" x-model="consulta.fr" @input="touch()" placeholder="Ex: 16">
          </div>
        </div>
        <div class="form-row cols-3">
          <div class="form-group">
            <label class="label">Tax <span class="hint">(°C)</span></label>
            <input class="input" x-model="consulta.tax" @input="touch()" placeholder="Ex: 36.5">
          </div>
          <div class="form-group">
            <label class="label">SatO2 <span class="hint">(%)</span></label>
            <input class="input" x-model="consulta.satO2" @input="touch()" placeholder="Ex: 98">
          </div>
          <div class="form-group">
            <label class="label">Glicemia capilar <span class="hint">(mg/dL)</span></label>
            <input class="input" x-model="consulta.glicemiaCapilar" @input="touch()" placeholder="Ex: 110">
          </div>
        </div>
        <div class="form-row cols-3">
          <div class="form-group">
            <label class="label">Peso <span class="hint">(kg)</span></label>
            <input class="input" type="number" step="0.1" x-model="consulta.peso"
                   @input="touch(); calcularIMC()" placeholder="Ex: 72.5">
          </div>
          <div class="form-group">
            <label class="label">Altura <span class="hint">(m)</span></label>
            <input class="input" type="number" step="0.01" x-model="consulta.altura"
                   @input="touch(); calcularIMC()" placeholder="Ex: 1.68">
          </div>
          <div class="form-group">
            <label class="label">IMC <span class="hint">(calculado)</span></label>
            <input class="input" x-model="consulta.imc" readonly
                   style="background: var(--bg-sunken)">
          </div>
        </div>
        <div class="form-group mt-3">
          <label class="label">Descrição do exame físico por sistemas</label>
          <textarea class="textarea auto-grow" rows="4" x-model="consulta.exameFisicoDescricao"
                    @input="touch(); autoGrow($event.target)"
                    placeholder="Geral, ACV, AR, AGI, neurológico..."></textarea>
        </div>
      </div>

      <!-- ========== 8. Exame psíquico ========== -->
      <div class="card mb-4">
        <h3 class="card-title">8. Exame psíquico estruturado</h3>
        <div id="exame-psiquico-mount" class="mt-3"></div>
      </div>

      <!-- ========== 9. Hipóteses diagnósticas ========== -->
      <div class="card mb-4">
        <h3 class="card-title">9. Hipóteses diagnósticas</h3>
        <div class="mt-3">
          <input class="input" x-model="hipoteseInput"
                 @keydown.enter.prevent="adicionarHipotese()"
                 placeholder="Digite a hipótese e pressione Enter (pode incluir CID se quiser)">
        </div>
        <div class="chips-container mt-3" x-show="consulta.hipoteses.length > 0">
          <template x-for="(h, i) in consulta.hipoteses" :key="i">
            <div class="chip chip-removable">
              <span x-text="h"></span>
              <button @click="removerHipotese(i)" style="margin-left: 6px; opacity: 0.6">×</button>
            </div>
          </template>
        </div>
      </div>

      <!-- ========== 10. Conduta e Plano Terapêutico ========== -->
      <div class="card mb-4">
        <h3 class="card-title">10. Conduta e Plano Terapêutico</h3>
        <textarea class="textarea auto-grow mt-3" rows="5" x-model="consulta.conduta"
                  @input="touch(); autoGrow($event.target)"
                  placeholder="Prescrição, orientações, solicitação de exames, referenciamento, PTS..."></textarea>
      </div>

      <!-- ========== 11. Retorno + sinais de alerta ========== -->
      <div class="card mb-4">
        <h3 class="card-title">11. Retorno e sinais de alerta</h3>
        <div class="form-group mt-3">
          <label class="label">Quando voltar</label>
          <input class="input" x-model="consulta.retorno" @input="touch()"
                 placeholder="Ex: em 30 dias com exames, em 3 meses se estável, em 7 dias para reavaliação">
        </div>
        <div class="form-group">
          <label class="label">Sinais de alerta orientados ao paciente</label>
          <textarea class="textarea auto-grow" rows="2" x-model="consulta.sinaisAlerta"
                    @input="touch(); autoGrow($event.target)"
                    placeholder="O que faria o paciente voltar antes do retorno marcado"></textarea>
        </div>
      </div>

      <!-- Rodapé de ações -->
      <div class="mb-6 flex justify-between items-center" style="flex-wrap: wrap; gap: var(--space-3)">
        <span class="text-xs muted">🔒 Dados criptografados localmente</span>
        <div class="flex gap-2">
          <button class="btn btn-danger" @click="remover()" x-show="!isNew">Excluir consulta</button>
          <button class="btn btn-secondary" @click="voltar()">Cancelar</button>
          <button class="btn btn-primary" @click="salvar()" :disabled="saving">
            <span x-show="!saving" x-text="isNew ? 'Salvar consulta' : 'Salvar alterações'"></span>
            <span x-show="saving">Salvando…</span>
          </button>
        </div>
      </div>
    </div>

    <style>
      .chip-removable { background: var(--color-primary-100); color: var(--color-primary-900);
                        border-color: var(--color-primary-200); }
      .chip-removable button { background: transparent; border: none; cursor: pointer; color: inherit;
                                font-size: var(--text-lg); line-height: 1; padding: 0; }
      .autocomplete-list { position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
                            background: var(--bg-surface); border: 1px solid var(--border-default);
                            border-top: none; border-radius: 0 0 var(--radius-md) var(--radius-md);
                            box-shadow: var(--shadow-lg); max-height: 240px; overflow-y: auto; }
      .autocomplete-item { padding: var(--space-3); cursor: pointer;
                            border-bottom: 1px solid var(--border-subtle); }
      .autocomplete-item:hover { background: var(--color-primary-50); }
      .autocomplete-item:last-child { border-bottom: none; }
    </style>
  `;
}

function consultaForm(pacienteId, consultaId) {
  return {
    pacienteId: parseInt(pacienteId, 10),
    consultaId: consultaId,
    isNew: !consultaId,
    paciente: { nome: '', dataNascimento: '', sexo: '' },
    consulta: emptyConsulta(),
    saving: false,
    autoSaveStatus: '',
    touchedTimer: null,

    medInput: '',
    sugestoes: [],
    hipoteseInput: '',

    antecedentesComuns: ClinicalData.ANTECEDENTES_COMUNS,
    cirurgiasComuns: ClinicalData.CIRURGIAS_COMUNS,
    familiaresComuns: ClinicalData.FAMILIARES_COMUNS,

    async load() {
      try {
        this.paciente = await DB.getPaciente(this.pacienteId) || this.paciente;

        if (!this.isNew) {
          const cId = typeof this.consultaId === 'string' ? parseInt(this.consultaId, 10) : this.consultaId;
          const c = await DB.getConsulta(cId);
          if (c) {
            this.consulta = { ...emptyConsulta(), ...c };
          }
        } else {
          this.consulta.dataHora = new Date().toISOString();
        }

        // Monta o componente de exame psíquico
        this.$nextTick(() => {
          const mount = document.getElementById('exame-psiquico-mount');
          if (mount) {
            renderExamePsiquico(mount, this.consulta.examePsiquicoModo || 'breve',
              {
                modo: this.consulta.examePsiquicoModo,
                selecoes: this.consulta.examePsiquicoSelecoes,
                observacoes: this.consulta.examePsiquicoObservacoes
              },
              (estado) => {
                this.consulta.examePsiquicoModo = estado.modo;
                this.consulta.examePsiquicoSelecoes = estado.selecoes;
                this.consulta.examePsiquicoObservacoes = estado.observacoes;
                this.consulta.examePsiquicoProsa = estado.prosa;
                this.touch();
              }
            );
          }

          // Auto-grow nos textareas existentes
          document.querySelectorAll('.textarea.auto-grow').forEach(el => UI.autoGrowTextarea(el));
        });
      } catch (e) {
        UI.toast('Erro ao carregar: ' + e.message, 'error');
      }
    },

    touch() {
      this.autoSaveStatus = '✏️ Não salvo';
      if (this.touchedTimer) clearTimeout(this.touchedTimer);
      this.touchedTimer = setTimeout(() => {
        if (!this.isNew && !this.saving) this.salvar(true);  // auto-save silencioso
      }, 2000);
    },

    autoGrow(el) { UI.autoGrowTextarea(el); },
    calcAge(d) { return UI.calculateAge(d); },
    formatDate(d) { return UI.formatDate(d); },

    calcularIMC() {
      const p = parseFloat(this.consulta.peso);
      const a = parseFloat(this.consulta.altura);
      if (p > 0 && a > 0) {
        this.consulta.imc = (p / (a * a)).toFixed(1);
      } else {
        this.consulta.imc = '';
      }
    },

    // Autocomplete REMUME
    atualizarSugestoes() {
      this.sugestoes = ClinicalData.searchMedicamentos(this.medInput);
    },

    escolherSugestao(s) {
      this.medInput = s;
      this.sugestoes = [];
    },

    adicionarMed() {
      const v = this.medInput.trim();
      if (!v) return;
      if (!this.consulta.medicacoesUso.includes(v)) {
        this.consulta.medicacoesUso.push(v);
        this.touch();
      }
      this.medInput = '';
      this.sugestoes = [];
    },

    removerMed(i) {
      this.consulta.medicacoesUso.splice(i, 1);
      this.touch();
    },

    toggleAntecedente(opcao) {
      const idx = this.consulta.antecedentes.indexOf(opcao);
      if (idx === -1) this.consulta.antecedentes.push(opcao);
      else this.consulta.antecedentes.splice(idx, 1);
      this.touch();
    },

    toggleCirurgia(opcao) {
      const idx = this.consulta.cirurgias.indexOf(opcao);
      if (idx === -1) this.consulta.cirurgias.push(opcao);
      else this.consulta.cirurgias.splice(idx, 1);
      this.touch();
    },

    toggleFamiliar(opcao) {
      const idx = this.consulta.familiares.indexOf(opcao);
      if (idx === -1) this.consulta.familiares.push(opcao);
      else this.consulta.familiares.splice(idx, 1);
      this.touch();
    },

    adicionarHipotese() {
      const v = this.hipoteseInput.trim();
      if (!v) return;
      this.consulta.hipoteses.push(v);
      this.hipoteseInput = '';
      this.touch();
    },

    removerHipotese(i) {
      this.consulta.hipoteses.splice(i, 1);
      this.touch();
    },

    async salvar(silencioso = false) {
      if (this.saving) return;
      this.saving = true;
      try {
        const data = { ...this.consulta, pacienteId: this.pacienteId };
        delete data.id;
        delete data.createdAt;
        delete data.updatedAt;

        if (this.isNew) {
          const newId = await DB.createConsulta(data);
          if (!silencioso) UI.toast('Consulta salva', 'success');
          this.consultaId = newId;
          this.isNew = false;
          this.autoSaveStatus = '✓ Salvo';
          // Atualiza URL sem recarregar
          history.replaceState(null, '', '#/paciente/' + this.pacienteId + '/consulta/' + newId);
        } else {
          const cId = typeof this.consultaId === 'string' ? parseInt(this.consultaId, 10) : this.consultaId;
          await DB.updateConsulta(cId, data);
          if (!silencioso) UI.toast('Alterações salvas', 'success');
          this.autoSaveStatus = '✓ Salvo ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) {
        UI.toast('Erro ao salvar: ' + e.message, 'error');
      } finally {
        this.saving = false;
      }
    },

    async remover() {
      if (!UI.confirm('Excluir esta consulta? O registro fica retido por 20 anos conforme Lei 13.787/2018, mas sai da timeline ativa.')) return;
      try {
        const cId = typeof this.consultaId === 'string' ? parseInt(this.consultaId, 10) : this.consultaId;
        await DB.softDeleteConsulta(cId);
        UI.toast('Consulta excluída', 'success');
        this.voltar();
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      }
    },

    async copiarSemId() {
      try {
        // Busca a última consulta para puxar medicações em uso contínuo
        const todas = await DB.listConsultasByPaciente(this.pacienteId);
        // listConsultasByPaciente já retorna ordenado por dataHora desc — a primeira é a mais recente
        // Mas se estamos editando a mais recente, queremos a anterior à atual (se houver)
        const idAtual = typeof this.consultaId === 'string' ? parseInt(this.consultaId, 10) : this.consultaId;
        let ultima = null;
        if (todas.length > 0) {
          // Se a consulta atual está sendo editada, pula ela; senão, usa a mais recente
          ultima = todas.find(c => c.id !== idAtual) || todas[0];
        }
        const texto = ProsaGenerator.gerarProsaSemIdentificadores(
          this.consulta, this.paciente, ultima
        );
        await navigator.clipboard.writeText(texto);
        UI.toast('Texto sem identificadores copiado para área de transferência', 'success', 5000);
      } catch (e) {
        console.error(e);
        UI.toast('Falha ao copiar: ' + e.message, 'error');
      }
    },

    voltar() {
      Router.navigate('/paciente/' + this.pacienteId);
    }
  };
}

function emptyConsulta() {
  return {
    dataHora: '',
    queixaPrincipal: '',
    queixaDuracao: '',
    hpma: '',
    medicacoesUso: [],
    antecedentes: [],
    antecedentesTexto: '',
    cirurgias: [],
    familiares: [],
    familiaresTexto: '',
    tabagismo: '',
    macosAno: '',
    alcool: '',
    atividadeFisica: '',
    sono: '',
    pa: '', fc: '', fr: '', tax: '',
    satO2: '', glicemiaCapilar: '',
    peso: '', altura: '', imc: '',
    exameFisicoDescricao: '',
    examePsiquicoModo: 'breve',
    examePsiquicoSelecoes: {},
    examePsiquicoObservacoes: {},
    examePsiquicoProsa: '',
    hipoteses: [],
    conduta: '',
    retorno: '',
    sinaisAlerta: ''
  };
}

window.renderConsultaForm = renderConsultaForm;
window.consultaForm = consultaForm;
