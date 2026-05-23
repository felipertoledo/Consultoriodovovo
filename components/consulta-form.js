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

      <!-- ========== 9. Hipóteses diagnósticas (com CIAP-2/CID-10) ========== -->
      <div class="card mb-4">
        <h3 class="card-title">9. Hipóteses diagnósticas</h3>
        <div class="mt-3">
          <input class="input" x-model="hipoteseInput"
                 @keydown.enter.prevent="adicionarHipotese()"
                 placeholder="Texto da hipótese (Enter para adicionar)">
        </div>

        <!-- Vinculação de códigos clínicos -->
        <div style="display:flex; gap:8px; margin-top:10px; align-items:center; flex-wrap:wrap;">
          <button type="button" class="btn btn-sm"
                  :style="hipoteseCiap ? 'background:#166534;color:#fff;border-color:#166534' : ''"
                  @click="abrirPicker('ciap')">
            <span x-text="hipoteseCiap ? ('CIAP ' + hipoteseCiap.codigo + ' ✓') : '+ CIAP-2'"></span>
          </button>
          <button type="button" class="btn btn-sm"
                  :style="hipoteseCid ? 'background:#1d4ed8;color:#fff;border-color:#1d4ed8' : ''"
                  @click="abrirPicker('cid')">
            <span x-text="hipoteseCid ? ('CID ' + hipoteseCid.codigo + ' ✓') : '+ CID-10'"></span>
          </button>
          <button type="button" class="btn btn-sm"
                  x-show="hipoteseCiap || hipoteseCid"
                  @click="limparCodigosHipotese()"
                  style="opacity:0.7">limpar códigos</button>
          <small style="margin-left:auto; opacity:0.7">
            <span x-show="!hipoteseCiap && !hipoteseCid">opcional · pode adicionar só texto</span>
            <span x-show="hipoteseCiap || hipoteseCid" x-text="(hipoteseCiap ? hipoteseCiap.descricao : '') + (hipoteseCiap && hipoteseCid ? ' · ' : '') + (hipoteseCid ? hipoteseCid.descricao : '')"></span>
          </small>
        </div>

        <!-- Picker dropdown -->
        <div x-show="pickerAberto" x-cloak class="mt-3"
             style="border: 2px solid #166534; border-radius: 8px; padding: 12px; background: #f0fdf4;">
          <div style="display:flex; align-items:center; gap:8px;">
            <strong x-text="pickerTipo === 'ciap' ? '🔎 Buscar CIAP-2' : '🔎 Buscar CID-10'"></strong>
            <small style="opacity:0.7">↑↓ navegar · Enter selecionar · Esc cancelar</small>
            <button type="button" class="btn btn-sm" style="margin-left:auto" @click="fecharPicker()">×</button>
          </div>
          <input class="input mt-2" x-ref="pickerInput" x-model="pickerBusca"
                 @input="filtrarPicker()"
                 @keydown.arrow-down.prevent="pickerNavegar(1)"
                 @keydown.arrow-up.prevent="pickerNavegar(-1)"
                 @keydown.enter.prevent="pickerSelecionarAtual()"
                 @keydown.escape.prevent="fecharPicker()"
                 placeholder="Digite código (ex: K86) ou descrição (ex: hipertensão)…">
          <div x-show="pickerResultados.length > 0"
               style="max-height: 280px; overflow-y: auto; margin-top:8px; background:#fff; border: 1px solid #d1d5db; border-radius: 6px;">
            <template x-for="(r, i) in pickerResultados" :key="r.tipo + '-' + r.codigo">
              <div @click="pickerSelecionar(r)"
                   :style="(i === pickerIndice ? 'background:#dcfce7;' : '') + 'padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #e5e7eb;'">
                <strong x-text="r.codigo"
                        :style="'color:' + (r.tipo === 'ciap' ? '#166534' : '#1d4ed8')"></strong>
                <span style="margin-left:8px" x-text="r.descricao"></span>
              </div>
            </template>
          </div>
          <div x-show="pickerBusca.length > 0 && pickerResultados.length === 0"
               class="mt-2" style="opacity:0.7">
            Nenhum código encontrado. Tente outra palavra-chave.
          </div>
        </div>

        <!-- Lista de hipóteses adicionadas -->
        <div class="chips-container mt-3" x-show="consulta.hipoteses.length > 0">
          <template x-for="(h, i) in consulta.hipoteses" :key="i">
            <div class="chip chip-removable" style="flex-wrap: wrap; align-items: center;">
              <span x-text="textoHipotese(h)"></span>
              <template x-if="ciapDeHipotese(h)">
                <span style="margin-left:6px; padding: 2px 8px; border-radius: 4px; background: #dcfce7; color: #166534; font-size: 0.85em; font-weight: 600;"
                      x-text="'CIAP ' + ciapDeHipotese(h).codigo"
                      :title="ciapDeHipotese(h).descricao"></span>
              </template>
              <template x-if="cidDeHipotese(h)">
                <span style="margin-left:6px; padding: 2px 8px; border-radius: 4px; background: #dbeafe; color: #1e40af; font-size: 0.85em; font-weight: 600;"
                      x-text="'CID ' + cidDeHipotese(h).codigo"
                      :title="cidDeHipotese(h).descricao"></span>
              </template>
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
      <!-- Atalhos para gerar documentos a partir desta consulta -->
      <div class="card mb-4" x-show="!isNew" style="border-color: var(--color-primary); border-width: 1px">
        <h3 class="card-title mb-3">📄 Gerar documentos desta consulta</h3>
        <p class="text-sm muted mb-3">
          Atalhos diretos para a tela de documentos do paciente. Os dados clínicos já registrados aqui
          (medicações em uso, hipóteses, conduta) serão usados como ponto de partida.
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-2)">
          <button class="btn btn-secondary text-sm" @click="irParaDocumento('receita')" title="Receita comum">
            📋 Receita comum
          </button>
          <button class="btn btn-secondary text-sm" @click="irParaDocumento('controle')" title="Antimicrobianos, retinoides, etc">
            📑 Controle especial
          </button>
          <button class="btn btn-secondary text-sm" @click="irParaDocumento('azul')" title="Psicotrópicos / Lista B">
            📘 Azul B1/B2
          </button>
          <button class="btn btn-secondary text-sm" @click="irParaDocumento('atestado')">
            📝 Atestado
          </button>
          <button class="btn btn-secondary text-sm" @click="irParaDocumento('exames')">
            🧪 Exames
          </button>
          <button class="btn btn-secondary text-sm" @click="irParaDocumento('consulta-impressa')"
                  title="PDF completo desta consulta com espaço para assinatura física">
            🖨️ Imprimir consulta
          </button>
        </div>
      </div>

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

    // Sprint B1: estado do picker CIAP-2/CID-10
    hipoteseCiap: null,        // {codigo, descricao} ou null
    hipoteseCid: null,         // {codigo, descricao} ou null
    pickerAberto: false,
    pickerTipo: 'ciap',        // 'ciap' | 'cid'
    pickerBusca: '',
    pickerResultados: [],
    pickerIndice: 0,

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
      // Sprint B1: hipótese agora é objeto { texto, ciap?, cid? }
      const h = { texto: v };
      if (this.hipoteseCiap) h.ciap = { codigo: this.hipoteseCiap.codigo, descricao: this.hipoteseCiap.descricao };
      if (this.hipoteseCid) h.cid = { codigo: this.hipoteseCid.codigo, descricao: this.hipoteseCid.descricao };
      this.consulta.hipoteses.push(h);
      // Limpa campos
      this.hipoteseInput = '';
      this.hipoteseCiap = null;
      this.hipoteseCid = null;
      this.touch();
    },

    removerHipotese(i) {
      this.consulta.hipoteses.splice(i, 1);
      this.touch();
    },

    // === Picker CIAP-2/CID-10 ===
    abrirPicker(tipo) {
      this.pickerTipo = tipo;
      this.pickerBusca = '';
      this.pickerResultados = [];
      this.pickerIndice = 0;
      this.pickerAberto = true;
      this.$nextTick(() => {
        if (this.$refs.pickerInput) this.$refs.pickerInput.focus();
      });
    },

    fecharPicker() {
      this.pickerAberto = false;
      this.pickerBusca = '';
      this.pickerResultados = [];
    },

    filtrarPicker() {
      const CC = window.CodigosClinicos;
      if (!CC) {
        this.pickerResultados = [];
        return;
      }
      this.pickerResultados = CC.buscar(this.pickerBusca, 10, this.pickerTipo);
      this.pickerIndice = 0;
    },

    pickerNavegar(delta) {
      if (this.pickerResultados.length === 0) return;
      this.pickerIndice = Math.max(0, Math.min(this.pickerResultados.length - 1, this.pickerIndice + delta));
    },

    pickerSelecionarAtual() {
      if (this.pickerResultados.length === 0) return;
      this.pickerSelecionar(this.pickerResultados[this.pickerIndice]);
    },

    pickerSelecionar(r) {
      if (!r) return;
      if (r.tipo === 'ciap') {
        this.hipoteseCiap = { codigo: r.codigo, descricao: r.descricao };
      } else {
        this.hipoteseCid = { codigo: r.codigo, descricao: r.descricao };
      }
      this.fecharPicker();
    },

    limparCodigosHipotese() {
      this.hipoteseCiap = null;
      this.hipoteseCid = null;
    },

    // === Helpers para exibir hipóteses (compatíveis com schema antigo string) ===
    textoHipotese(h) {
      return window.CodigosClinicos ? window.CodigosClinicos.textoDe(h) : (typeof h === 'string' ? h : (h && h.texto) || '');
    },
    ciapDeHipotese(h) {
      return window.CodigosClinicos ? window.CodigosClinicos.ciapDe(h) : (h && h.ciap) || null;
    },
    cidDeHipotese(h) {
      return window.CodigosClinicos ? window.CodigosClinicos.cidDe(h) : (h && h.cid) || null;
    },

    async salvar(silencioso = false) {
      if (this.saving) return;
      this.saving = true;
      try {
        const data = { ...this.consulta, pacienteId: this.pacienteId };
        delete data.id;
        delete data.createdAt;
        delete data.updatedAt;

        let consultaIdFinal;
        let consultaNova = false;

        if (this.isNew) {
          const newId = await DB.createConsulta(data);
          consultaIdFinal = newId;
          consultaNova = true;
          if (!silencioso) UI.toast('Consulta salva', 'success');
          this.consultaId = newId;
          this.isNew = false;
          this.autoSaveStatus = '✓ Salvo';
          // Atualiza URL sem recarregar
          history.replaceState(null, '', '#/paciente/' + this.pacienteId + '/consulta/' + newId);
        } else {
          const cId = typeof this.consultaId === 'string' ? parseInt(this.consultaId, 10) : this.consultaId;
          await DB.updateConsulta(cId, data);
          consultaIdFinal = cId;
          if (!silencioso) UI.toast('Alterações salvas', 'success');
          this.autoSaveStatus = '✓ Salvo ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        // === Sprint A1: integração com agenda ===
        // 1. Se veio de um agendamento (?agendamento=N na URL), marcar como realizado
        try {
          const urlParams = new URLSearchParams(location.hash.split('?')[1] || '');
          const agOrigemId = urlParams.get('agendamento');
          if (agOrigemId && consultaNova) {
            await DB.updateAgendamento(parseInt(agOrigemId, 10), {
              status: 'realizado',
              consultaRealizadaId: consultaIdFinal
            });
          }
        } catch (e) {
          console.warn('Falha ao marcar agendamento original como realizado:', e);
        }

        // 2. Auto-criar agendamento de retorno se campo "retorno" tiver prazo parseável
        try {
          if (consultaNova && this.consulta.retorno && window.Agenda) {
            const dataRetorno = Agenda.calcularRetornoDe(this.consulta.retorno, new Date());
            if (dataRetorno) {
              await DB.createAgendamento({
                pacienteId: this.pacienteId,
                pacienteNome: this.paciente.nome,
                data: dataRetorno,
                tipo: 'retorno',
                observacao: this.consulta.retorno,
                consultaOrigemId: consultaIdFinal
              });
              if (!silencioso) UI.toast(`📅 Retorno agendado para ${Agenda.formatarData(dataRetorno)}`, 'success');
            }
          }
        } catch (e) {
          console.warn('Falha ao auto-criar agendamento de retorno:', e);
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
    },

    irParaDocumento(tipo) {
      // Se há alterações não salvas, avisa
      const temAlteracoesNaoSalvas = this.autoSaveStatus === '✏️ Não salvo';
      if (temAlteracoesNaoSalvas) {
        if (!confirm('Há alterações não salvas. Salve a consulta primeiro para que os dados estejam disponíveis no documento. Continuar mesmo assim?')) {
          return;
        }
      }
      // Vai para a tela de documentos do paciente, já com o tipo selecionado
      Router.navigate('/paciente/' + this.pacienteId + '/documentos/' + tipo);
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
