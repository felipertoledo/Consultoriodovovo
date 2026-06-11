/* ============================================================
   exame-psiquico.js — Exame psíquico estruturado
   Prancheta v3: grade de domínios. Borda esquerda verde =
   sem alterações; âmbar = alterado. Prosa em papel-carbono
   (tinta escura nos DOIS temas — é o trecho "impresso").
   Modos: Breve (10 domínios) ou Completo (18 — Dalgalarrondo)
   ============================================================ */

function renderExamePsiquico(container, modo, selecoesIniciais, onChange) {
  // Estado é montado via Alpine.js
  container.innerHTML = `
    <div x-data="examePsiquico('${modo}')" x-init="init()">
      <div class="psy-toolbar">
        <div class="seg" role="tablist" aria-label="Modo do exame">
          <button :class="modo === 'breve' ? 'on' : ''" @click="trocarModo('breve')">Breve · 10</button>
          <button :class="modo === 'completo' ? 'on' : ''" @click="trocarModo('completo')">Completo · 18</button>
        </div>
        <span class="text-xs muted" x-text="modo === 'breve' ? 'versão APS' : 'Dalgalarrondo completo'"></span>
        <div class="sec-meta-right">
          <button class="btn btn-ghost btn-sm" @click="expandirTodos()">Expandir</button>
          <button class="btn btn-ghost btn-sm" @click="recolherTodos()">Recolher</button>
          <button class="btn btn-secondary btn-sm" @click="marcarTodosNormais()">
            <svg class="icon"><use href="#i-check"></use></svg>
            Tudo sem alterações
          </button>
        </div>
      </div>

      <div class="psy-grid">
        <template x-for="dom in dominios" :key="dom.id">
          <div class="psy-dom" :class="(selecoes[dom.id] || []).length > 0 ? 'is-alt' : ''">
            <div class="psy-dom-head" @click="toggle(dom.id)">
              <span class="pd-nome" x-text="dom.nome"></span>
              <button class="psy-help" type="button"
                      @click.stop="mostrarTooltip(dom.id)"
                      @mouseover="hoverTooltip(dom.id)"
                      @mouseleave="esconderTooltip()"
                      :aria-label="'O que avaliar em ' + dom.nome">
                <svg class="icon"><use href="#i-help"></use></svg>
              </button>
              <span class="pd-state alt" x-show="(selecoes[dom.id] || []).length > 0"
                    x-text="resumoCurto(dom)"></span>
              <span class="pd-state ok" x-show="!(selecoes[dom.id] || []).length">sem alterações</span>
              <svg class="icon" style="width: 13px; height: 13px; color: var(--text-muted); transition: transform 140ms"
                   :style="aberto[dom.id] ? 'transform: rotate(90deg)' : ''">
                <use href="#i-chevron-right"></use>
              </svg>
            </div>

            <div class="psy-tip" x-show="tooltipAtivo === dom.id" x-cloak x-text="dom.tooltip"></div>

            <div class="psy-body" x-show="aberto[dom.id]" x-cloak>
              <div class="psy-chips">
                <template x-for="opcao in dom.opcoes" :key="opcao">
                  <button class="psy-chip"
                          :class="(selecoes[dom.id] || []).includes(opcao) ? 'on' : ''"
                          @click="toggleOpcao(dom, opcao)"
                          x-text="opcao"></button>
                </template>
              </div>

              <div class="form-group" style="margin-bottom: 0">
                <label class="label text-sm">Observação livre <span class="hint">(opcional)</span></label>
                <textarea class="textarea text-sm" rows="2"
                          x-model="observacoes[dom.id]"
                          @input="emitirMudanca()"
                          :placeholder="'Detalhes adicionais sobre ' + dom.nome.toLowerCase()"></textarea>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="prosa-card">
        <div class="prosa-title">
          <svg class="icon"><use href="#i-file"></use></svg>
          Prosa gerada para o prontuário
        </div>
        <p class="prosa-texto" x-text="prosaGerada"></p>
        <button class="btn btn-sm mt-3" @click="copiarProsa()">
          <svg class="icon"><use href="#i-copy"></use></svg>
          Copiar prosa
        </button>
      </div>
    </div>
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
