/* ============================================================
   exame-psiquico.js — Componente do exame psíquico estruturado
   Modos: Breve (10 domínios) ou Completo (18 domínios)
   ============================================================ */

function renderExamePsiquico(container, modo, selecoesIniciais, onChange) {
  // Estado é montado via Alpine.js
  container.innerHTML = `
    <div x-data="examePsiquico('${modo}')" x-init="init()">
      <div class="flex items-center justify-between mb-4" style="flex-wrap: wrap; gap: var(--space-3)">
        <div>
          <strong x-text="dominios.length + ' domínios'"></strong>
          <span class="text-sm muted" x-text="modo === 'breve' ? '(versão APS)' : '(Dalgalarrondo completo)'"></span>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary text-sm" :class="modo === 'breve' ? 'btn-primary' : ''"
                  @click="trocarModo('breve')">Breve (10)</button>
          <button class="btn btn-secondary text-sm" :class="modo === 'completo' ? 'btn-primary' : ''"
                  @click="trocarModo('completo')">Completo (18)</button>
        </div>
      </div>

      <div class="flex gap-2 mb-4" style="flex-wrap: wrap">
        <button class="btn btn-ghost text-sm" @click="expandirTodos()">Expandir todos</button>
        <button class="btn btn-ghost text-sm" @click="recolherTodos()">Recolher todos</button>
        <button class="btn btn-ghost text-sm" @click="marcarTodosNormais()">Marcar todos "sem alterações"</button>
      </div>

      <template x-for="dom in dominios" :key="dom.id">
        <div class="dominio-card">
          <div class="dominio-header" @click="toggle(dom.id)">
            <div class="flex items-center gap-2" style="flex: 1">
              <span x-text="aberto[dom.id] ? '▼' : '▶'" style="color: var(--text-muted)"></span>
              <strong x-text="dom.nome"></strong>
              <span class="tooltip-trigger"
                    @click.stop="mostrarTooltip(dom.id)"
                    @mouseover="hoverTooltip(dom.id)"
                    @mouseleave="esconderTooltip()">ⓘ</span>
            </div>
            <div class="dominio-status" x-show="!aberto[dom.id]">
              <span x-show="selecoes[dom.id]?.length > 0" class="badge badge-info"
                    x-text="resumoCurto(dom)"></span>
              <span x-show="!selecoes[dom.id]?.length" class="badge badge-success">✓ Sem alterações</span>
            </div>
          </div>

          <div class="tooltip-content" x-show="tooltipAtivo === dom.id"
               x-cloak
               x-text="dom.tooltip"></div>

          <div class="dominio-body" x-show="aberto[dom.id]" x-cloak>
            <div class="chips-container">
              <template x-for="opcao in dom.opcoes" :key="opcao">
                <button class="chip"
                        :class="(selecoes[dom.id] || []).includes(opcao) ? 'chip-selected' : ''"
                        @click="toggleOpcao(dom, opcao)"
                        x-text="opcao"></button>
              </template>
            </div>

            <div class="form-group mt-3">
              <label class="label text-sm">Observação livre <span class="hint">(opcional)</span></label>
              <textarea class="textarea text-sm" rows="2"
                        x-model="observacoes[dom.id]"
                        @input="emitirMudanca()"
                        :placeholder="'Detalhes adicionais sobre ' + dom.nome.toLowerCase()"></textarea>
            </div>
          </div>
        </div>
      </template>

      <div class="card mt-6" style="background: var(--color-primary-50); border-color: var(--color-primary-200)">
        <h4 class="mb-2">📝 Prosa gerada para o prontuário</h4>
        <p class="text-sm" x-text="prosaGerada" style="white-space: pre-wrap; font-family: var(--font-sans); line-height: var(--leading-relaxed);"></p>
        <button class="btn btn-secondary text-sm mt-3" @click="copiarProsa()">📋 Copiar prosa</button>
      </div>
    </div>

    <style>
      .dominio-card { background: var(--bg-surface); border: 1px solid var(--border-subtle);
                      border-radius: var(--radius-md); margin-bottom: var(--space-2); overflow: hidden; }
      .dominio-header { display: flex; align-items: center; padding: var(--space-3);
                        cursor: pointer; transition: background var(--transition-fast);
                        gap: var(--space-3); flex-wrap: wrap; }
      .dominio-header:hover { background: var(--bg-sunken); }
      .dominio-status { display: flex; gap: var(--space-2); align-items: center; }
      .dominio-body { padding: var(--space-3) var(--space-4) var(--space-4);
                       border-top: 1px solid var(--border-subtle); background: var(--bg-sunken); }
      .tooltip-trigger { display: inline-flex; align-items: center; justify-content: center;
                          width: 18px; height: 18px; border-radius: 50%;
                          background: var(--color-primary-100); color: var(--color-primary);
                          font-size: 11px; cursor: help; flex-shrink: 0; }
      .tooltip-content { background: var(--text-primary); color: var(--text-inverse);
                          padding: var(--space-3); border-radius: var(--radius-md);
                          font-size: var(--text-sm); line-height: var(--leading-relaxed);
                          margin: 0 var(--space-3) var(--space-3); }
      .chips-container { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3); }
      .chip { padding: var(--space-2) var(--space-3); border: 1px solid var(--border-default);
              background: var(--bg-surface); border-radius: var(--radius-full);
              font-size: var(--text-sm); cursor: pointer;
              transition: all var(--transition-fast); }
      .chip:hover { border-color: var(--color-primary); }
      .chip-selected { background: var(--color-primary); color: var(--text-on-primary);
                        border-color: var(--color-primary); }
    </style>
  `;

  // Salva o callback no elemento para uso pelo Alpine
  container._onChange = onChange;
  container._selecoesIniciais = selecoesIniciais;
}

function examePsiquico(modoInicial) {
  return {
    modo: modoInicial || 'breve',
    dominios: [],
    selecoes: {},
    observacoes: {},
    aberto: {},
    tooltipAtivo: null,
    prosaGerada: '',

    init() {
      this.dominios = this.modo === 'completo'
        ? ClinicalData.EXAME_PSIQUICO_COMPLETO
        : ClinicalData.EXAME_PSIQUICO_BREVE;

      // Carrega seleções iniciais se houver
      const initial = this.$root._selecoesIniciais || {};
      this.selecoes = initial.selecoes || {};
      this.observacoes = initial.observacoes || {};
      this.modo = initial.modo || this.modo;

      this.atualizarProsa();
    },

    trocarModo(novoModo) {
      this.modo = novoModo;
      this.dominios = novoModo === 'completo'
        ? ClinicalData.EXAME_PSIQUICO_COMPLETO
        : ClinicalData.EXAME_PSIQUICO_BREVE;
      // Mantém seleções compatíveis (mesmo id de domínio)
      this.atualizarProsa();
      this.emitirMudanca();
    },

    toggle(id) {
      this.aberto[id] = !this.aberto[id];
    },

    expandirTodos() {
      this.dominios.forEach(d => this.aberto[d.id] = true);
    },

    recolherTodos() {
      this.dominios.forEach(d => this.aberto[d.id] = false);
    },

    marcarTodosNormais() {
      this.dominios.forEach(d => {
        this.selecoes[d.id] = [];
        this.observacoes[d.id] = '';
      });
      this.atualizarProsa();
      this.emitirMudanca();
    },

    toggleOpcao(dom, opcao) {
      if (!this.selecoes[dom.id]) this.selecoes[dom.id] = [];
      const arr = this.selecoes[dom.id];
      const idx = arr.indexOf(opcao);

      if (dom.tipo === 'single') {
        // Single select: limpa e coloca o novo
        this.selecoes[dom.id] = idx === -1 ? [opcao] : [];
      } else {
        // Multi/severity
        if (idx === -1) arr.push(opcao);
        else arr.splice(idx, 1);
      }
      this.atualizarProsa();
      this.emitirMudanca();
    },

    resumoCurto(dom) {
      const sels = this.selecoes[dom.id] || [];
      if (sels.length === 0) return '';
      if (sels.length === 1) return sels[0];
      return sels[0] + ' +' + (sels.length - 1);
    },

    mostrarTooltip(id) {
      this.tooltipAtivo = this.tooltipAtivo === id ? null : id;
    },

    hoverTooltip(id) {
      this.tooltipAtivo = id;
    },

    esconderTooltip() {
      // Mantém aberto se foi clique (não fechar no hover out)
    },

    atualizarProsa() {
      this.prosaGerada = ProsaGenerator.gerarProsaExamePsiquico(
        this.dominios, this.selecoes, this.observacoes
      );
    },

    copiarProsa() {
      navigator.clipboard.writeText(this.prosaGerada).then(
        () => UI.toast('Prosa copiada', 'success'),
        () => UI.toast('Falha ao copiar', 'error')
      );
    },

    emitirMudanca() {
      this.atualizarProsa();
      if (this.$root._onChange) {
        this.$root._onChange({
          modo: this.modo,
          selecoes: { ...this.selecoes },
          observacoes: { ...this.observacoes },
          prosa: this.prosaGerada
        });
      }
    }
  };
}

window.renderExamePsiquico = renderExamePsiquico;
window.examePsiquico = examePsiquico;
