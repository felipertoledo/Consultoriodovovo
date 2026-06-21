/* ============================================================
   financeiro.js (componente) — Tela de controle financeiro
   ============================================================ */

function renderFinanceiro(container) {
  container.innerHTML = `
  <div x-data="financeiroApp()" x-init="init()">
    <div class="page-header">
      <div>
        <h1 class="page-title">💰 Financeiro</h1>
        <p class="page-subtitle">Faturamento das consultas particulares — bruto, impostos e líquido por mês.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" @click="abrirImpostos()">
          <svg class="icon"><use href="#i-settings"></use></svg> Impostos
        </button>
        <button class="btn btn-primary" @click="abrirNovo()">
          <svg class="icon"><use href="#i-plus"></use></svg> Novo lançamento
        </button>
      </div>
    </div>

    <!-- Navegação de mês -->
    <div class="fin-monthnav">
      <button class="btn btn-icon btn-ghost" @click="navegarMes(-1)" title="Mês anterior">
        <svg class="icon"><use href="#i-chevron-right"></use></svg>
      </button>
      <div class="fin-monthlabel">
        <input type="month" class="fin-monthpicker" x-model="mes" @change="carregar()">
        <span x-text="rotuloMes(mes)"></span>
      </div>
      <button class="btn btn-icon btn-ghost" @click="navegarMes(1)" title="Próximo mês">
        <svg class="icon" style="transform: rotate(180deg)"><use href="#i-chevron-right"></use></svg>
      </button>
    </div>

    <!-- Cards de resumo -->
    <div class="fin-cards">
      <div class="fin-card">
        <div class="fin-card-label">Faturamento bruto</div>
        <div class="fin-card-value" x-text="moeda(resumo.bruto)"></div>
        <div class="fin-card-foot"><span x-text="resumo.quantidade"></span> atendimento(s) · ticket médio <span x-text="moeda(resumo.ticketMedio)"></span></div>
      </div>
      <div class="fin-card">
        <div class="fin-card-label">Impostos / deduções</div>
        <div class="fin-card-value fin-neg" x-text="'- ' + moeda(resumo.impostos.totalValor)"></div>
        <div class="fin-card-foot">
          <template x-if="resumo.impostos.detalhes.length === 0">
            <span class="muted">Nenhum imposto configurado</span>
          </template>
          <template x-if="resumo.impostos.detalhes.length > 0">
            <span x-text="resumo.impostos.detalhes.map(d => d.nome + ' ' + d.percentual + '%').join(' · ')"></span>
          </template>
        </div>
      </div>
      <div class="fin-card fin-card-liquido">
        <div class="fin-card-label">Faturamento líquido (estimado)</div>
        <div class="fin-card-value" x-text="moeda(resumo.liquido)"></div>
        <div class="fin-card-foot">após <span x-text="resumo.impostos.totalPercentual"></span>% de deduções</div>
      </div>
    </div>

    <!-- Gráfico de evolução -->
    <div class="card mt-4">
      <div class="flex items-center justify-between mb-3" style="flex-wrap:wrap; gap:8px">
        <h3 class="card-title">Evolução do faturamento</h3>
        <div class="fin-legend">
          <span class="fin-legend-item"><span class="fin-swatch fin-swatch-bruto"></span> Bruto</span>
          <span class="fin-legend-item"><span class="fin-swatch fin-swatch-liq"></span> Líquido</span>
        </div>
      </div>
      <div class="fin-chart" x-html="graficoSvg()"></div>
    </div>

    <!-- Lista de lançamentos -->
    <div class="card mt-4">
      <h3 class="card-title mb-3">Lançamentos de <span x-text="rotuloMes(mes)"></span></h3>

      <div x-show="carregando" class="text-sm muted">Carregando…</div>

      <div x-show="!carregando && lancamentos.length === 0" class="fin-empty">
        <p class="muted">Nenhum lançamento neste mês.</p>
        <button class="btn btn-sm btn-primary mt-2" @click="abrirNovo()">
          <svg class="icon"><use href="#i-plus"></use></svg> Registrar primeira cobrança
        </button>
      </div>

      <div x-show="!carregando && lancamentos.length > 0" class="fin-list">
        <template x-for="l in lancamentos" :key="l.id">
          <div class="fin-row">
            <div class="fin-row-date">
              <div class="fin-row-day" x-text="diaDe(l.data)"></div>
              <div class="fin-row-mon" x-text="mesCurtoDe(l.data)"></div>
            </div>
            <div class="fin-row-main">
              <div class="fin-row-title" x-text="l.pacienteNome || l.descricao || 'Lançamento'"></div>
              <div class="fin-row-sub">
                <span x-show="l.pacienteNome && l.descricao" x-text="l.descricao"></span>
                <span class="fin-tag" x-show="l.formaPagamento" x-text="l.formaPagamento"></span>
                <span class="muted" x-show="l.observacao" x-text="'· ' + l.observacao"></span>
              </div>
            </div>
            <div class="fin-row-val" x-text="moeda(l.valor)"></div>
            <div class="fin-row-acoes">
              <button class="btn btn-icon btn-ghost btn-sm" @click="abrirEditar(l)" title="Editar">
                <svg class="icon"><use href="#i-edit"></use></svg>
              </button>
              <button class="btn btn-icon btn-ghost btn-sm" @click="excluir(l)" title="Excluir">
                <svg class="icon"><use href="#i-trash"></use></svg>
              </button>
            </div>
          </div>
        </template>
        <div class="fin-total-row">
          <span>Total do mês (bruto)</span>
          <strong x-text="moeda(resumo.bruto)"></strong>
        </div>
      </div>
    </div>

    <!-- ===== Modal: novo/editar lançamento ===== -->
    <template x-teleport="body">
      <div x-show="modalAberto" x-cloak class="modal-overlay" @click.self="fecharModal()">
        <div class="modal-sheet" style="max-width: 480px" @click.stop>
          <div class="modal-head">
            <h3 x-text="editandoId ? 'Editar lançamento' : 'Novo lançamento'"></h3>
            <button class="btn btn-sm btn-icon btn-ghost" @click="fecharModal()">
              <svg class="icon"><use href="#i-x"></use></svg>
            </button>
          </div>

          <div>
            <label class="label text-sm">Paciente</label>
            <input class="input" type="text" x-model="form.pacienteBusca" @input="buscarPaciente()"
                   placeholder="Digite o nome do paciente…">
            <div x-show="pacientesEncontrados.length > 0" class="picker-list">
              <template x-for="p in pacientesEncontrados" :key="p.id">
                <div class="picker-item" @click="selecionarPaciente(p)">
                  <strong x-text="p.nome"></strong>
                </div>
              </template>
            </div>
            <div x-show="form.pacienteId" class="fin-chosen mt-2">
              <svg class="icon" style="width:14px;height:14px"><use href="#i-users"></use></svg>
              <span x-text="form.pacienteNome"></span>
              <button class="btn btn-icon btn-ghost btn-sm" style="margin-left:auto" @click="limparPaciente()" title="Remover">
                <svg class="icon"><use href="#i-x"></use></svg>
              </button>
            </div>
            <p class="text-xs muted mt-1" x-show="!form.pacienteId">Opcional — deixe em branco para receitas avulsas (plantão, procedimento).</p>
          </div>

          <div class="mt-3" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px">
            <div>
              <label class="label text-sm">Valor cobrado</label>
              <input class="input" type="text" inputmode="decimal" x-model="form.valor" placeholder="0,00">
            </div>
            <div>
              <label class="label text-sm">Data</label>
              <input class="input" type="date" x-model="form.data">
            </div>
          </div>

          <div class="mt-3">
            <label class="label text-sm">Descrição</label>
            <input class="input" type="text" x-model="form.descricao" placeholder="Ex.: Consulta, Retorno, Procedimento…">
          </div>

          <div class="mt-3">
            <label class="label text-sm">Forma de pagamento</label>
            <select class="input" x-model="form.formaPagamento">
              <option value="">—</option>
              <option>Dinheiro</option>
              <option>PIX</option>
              <option>Cartão de débito</option>
              <option>Cartão de crédito</option>
              <option>Transferência</option>
              <option>Cheque</option>
              <option>Convênio</option>
              <option>Outro</option>
            </select>
          </div>

          <div class="mt-3">
            <label class="label text-sm">Observação</label>
            <textarea class="textarea" rows="2" x-model="form.observacao" placeholder="Opcional"></textarea>
          </div>

          <div class="mt-4 flex gap-2" style="justify-content: flex-end">
            <button class="btn btn-secondary" @click="fecharModal()" :disabled="salvando">Cancelar</button>
            <button class="btn btn-primary" @click="salvar()" :disabled="salvando">
              <span x-show="!salvando" x-text="editandoId ? 'Salvar' : 'Adicionar'"></span>
              <span x-show="salvando">Salvando…</span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== Modal: configurar impostos ===== -->
    <template x-teleport="body">
      <div x-show="impostosAberto" x-cloak class="modal-overlay" @click.self="fecharImpostos()">
        <div class="modal-sheet" style="max-width: 520px" @click.stop>
          <div class="modal-head">
            <h3>Impostos e deduções</h3>
            <button class="btn btn-sm btn-icon btn-ghost" @click="fecharImpostos()">
              <svg class="icon"><use href="#i-x"></use></svg>
            </button>
          </div>

          <p class="text-sm muted mb-3">
            Cadastre cada imposto ou taxa com seu percentual. O líquido é estimado descontando a soma deles do bruto.
            Confirme as alíquotas com sua contabilidade — isto não é apuração fiscal.
          </p>

          <div class="fin-imp-list">
            <template x-for="(imp, i) in impostosEdit" :key="i">
              <div class="fin-imp-row">
                <input class="input" type="text" x-model="imp.nome" placeholder="Ex.: ISS, IRPF, INSS, Simples…">
                <div class="fin-imp-pct">
                  <input class="input" type="number" step="0.01" min="0" max="100" x-model.number="imp.percentual" placeholder="0">
                  <span>%</span>
                </div>
                <button class="btn btn-icon btn-ghost btn-sm" @click="removerImposto(i)" title="Remover">
                  <svg class="icon"><use href="#i-trash"></use></svg>
                </button>
              </div>
            </template>
          </div>

          <button class="btn btn-sm btn-secondary mt-2" @click="adicionarImposto()">
            <svg class="icon"><use href="#i-plus"></use></svg> Adicionar imposto
          </button>

          <div class="fin-imp-total mt-3">
            Total de deduções: <strong x-text="totalPctEdit() + '%'"></strong>
          </div>

          <div class="mt-4 flex gap-2" style="justify-content: flex-end">
            <button class="btn btn-secondary" @click="fecharImpostos()">Cancelar</button>
            <button class="btn btn-primary" @click="salvarImpostos()">Salvar impostos</button>
          </div>
        </div>
      </div>
    </template>

    ${financeiroEstilos()}
  </div>
  `;
}

function financeiroEstilos() {
  return `
  <style>
    .fin-monthnav { display:flex; align-items:center; justify-content:center; gap:12px; margin: 4px 0 18px; }
    .fin-monthlabel { position:relative; font-family:var(--font-display); font-size:1.15rem; font-weight:var(--weight-semibold); min-width: 200px; text-align:center; }
    .fin-monthpicker { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; }
    .fin-cards { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
    .fin-card { background: var(--bg-surface); border:1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); }
    .fin-card-liquido { border-color: var(--color-primary-300); background: var(--color-primary-50); }
    [data-theme="dark"] .fin-card-liquido { background: rgba(62,223,151,0.08); border-color: rgba(62,223,151,0.30); }
    .fin-card-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 6px; }
    .fin-card-value { font-family: var(--font-mono); font-size: 1.7rem; font-weight: var(--weight-bold); line-height: 1.1; }
    .fin-card-liquido .fin-card-value { color: var(--color-primary-700); }
    [data-theme="dark"] .fin-card-liquido .fin-card-value { color: #4ADE80; }
    .fin-neg { color: var(--color-accent-600, #B26A43); }
    .fin-card-foot { font-size: var(--text-xs); color: var(--text-muted); margin-top: 6px; }

    .fin-legend { display:flex; gap:14px; font-size: var(--text-xs); color: var(--text-muted); }
    .fin-legend-item { display:inline-flex; align-items:center; gap:5px; }
    .fin-swatch { width:11px; height:11px; border-radius:3px; display:inline-block; }
    .fin-swatch-bruto { background: var(--color-primary-500); }
    .fin-swatch-liq { background: var(--color-primary-200); }
    [data-theme="dark"] .fin-swatch-liq { background: rgba(62,223,151,0.35); }
    .fin-chart { width:100%; overflow-x:auto; }
    .fin-chart svg { display:block; width:100%; height:auto; }
    .fin-bar-bruto { fill: var(--color-primary-500); }
    .fin-bar-liq { fill: var(--color-primary-200); }
    [data-theme="dark"] .fin-bar-liq { fill: rgba(62,223,151,0.40); }
    .fin-bar-label { fill: var(--text-muted); font-size: 10px; font-family: var(--font-sans); }
    .fin-bar-value { fill: var(--text-secondary); font-size: 9px; font-family: var(--font-mono); }
    .fin-grid-line { stroke: var(--border-subtle); stroke-width: 1; }

    .fin-list { display:flex; flex-direction:column; }
    .fin-row { display:flex; align-items:center; gap: var(--space-3); padding: 10px 0; border-bottom: 1px solid var(--border-subtle); }
    .fin-row:last-of-type { border-bottom: none; }
    .fin-row-date { text-align:center; min-width: 42px; }
    .fin-row-day { font-family: var(--font-mono); font-weight: var(--weight-bold); font-size: 1.1rem; line-height:1; }
    .fin-row-mon { font-size: 10px; text-transform: uppercase; color: var(--text-muted); }
    .fin-row-main { flex:1; min-width:0; }
    .fin-row-title { font-weight: var(--weight-semibold); }
    .fin-row-sub { font-size: var(--text-xs); color: var(--text-muted); display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:2px; }
    .fin-tag { background: var(--bg-sunken); border-radius: var(--radius-full); padding: 1px 8px; font-size: 10px; }
    .fin-row-val { font-family: var(--font-mono); font-weight: var(--weight-bold); white-space:nowrap; }
    .fin-row-acoes { display:flex; gap:2px; }
    .fin-total-row { display:flex; justify-content:space-between; align-items:center; padding-top: 12px; margin-top: 6px; border-top: 2px solid var(--border-default); font-family: var(--font-mono); }
    .fin-empty { text-align:center; padding: var(--space-6) 0; }

    .fin-chosen { display:flex; align-items:center; gap:8px; background: var(--color-primary-50); border:1px solid var(--color-primary-200); border-radius: var(--radius-md); padding: 6px 10px; font-size: var(--text-sm); }
    [data-theme="dark"] .fin-chosen { background: rgba(62,223,151,0.10); border-color: rgba(62,223,151,0.30); }

    .fin-imp-list { display:flex; flex-direction:column; gap:8px; }
    .fin-imp-row { display:grid; grid-template-columns: 1fr 110px auto; gap:8px; align-items:center; }
    .fin-imp-pct { display:flex; align-items:center; gap:6px; }
    .fin-imp-pct .input { text-align:right; }
    .fin-imp-total { font-size: var(--text-sm); color: var(--text-secondary); text-align:right; }
  </style>
  `;
}

function financeiroApp() {
  return {
    mes: '',
    lancamentos: [],
    impostos: [],
    resumo: { bruto: 0, impostos: { detalhes: [], totalValor: 0, totalPercentual: 0 }, liquido: 0, quantidade: 0, porForma: {}, ticketMedio: 0 },
    todosLancamentos: [],     // para o gráfico (vários meses)
    carregando: true,

    // modal lançamento
    modalAberto: false,
    editandoId: null,
    salvando: false,
    form: { pacienteId: null, pacienteNome: '', pacienteBusca: '', valor: '', data: '', descricao: '', formaPagamento: '', observacao: '' },
    pacientesEncontrados: [],

    // modal impostos
    impostosAberto: false,
    impostosEdit: [],

    async init() {
      this.mes = Financeiro.mesAtual();
      this.impostos = await DB.getImpostos();
      await this.carregar();
      await this.carregarGrafico();
    },

    async carregar() {
      this.carregando = true;
      try {
        this.impostos = await DB.getImpostos();
        this.lancamentos = await DB.listLancamentos({ mes: this.mes });
        this.resumo = Financeiro.resumo(this.lancamentos, this.impostos);
      } catch (e) {
        UI.toast('Erro ao carregar: ' + e.message, 'error');
      } finally {
        this.carregando = false;
      }
    },

    async carregarGrafico() {
      try {
        this.todosLancamentos = await DB.listLancamentos({});
      } catch (e) { this.todosLancamentos = []; }
    },

    navegarMes(delta) {
      this.mes = Financeiro.deslocarMes(this.mes, delta);
      this.carregar();
    },

    // ---- formatadores ----
    moeda(v) { return Financeiro.formatarMoeda(v); },
    rotuloMes(m) { return Financeiro.rotuloMes(m); },
    diaDe(d) { return d ? d.slice(8, 10) : '--'; },
    mesCurtoDe(d) {
      if (!d) return '';
      const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
      return meses[parseInt(d.slice(5,7),10)-1] || '';
    },

    // ---- gráfico SVG (últimos 12 meses) ----
    graficoSvg() {
      const dados = Financeiro.evolucaoMensal(this.todosLancamentos, 12, this.impostos, this.mes);
      const W = 720, H = 220, padL = 8, padR = 8, padTop = 18, padBot = 28;
      const innerW = W - padL - padR, innerH = H - padTop - padBot;
      const max = Math.max(1, ...dados.map(d => d.bruto));
      const n = dados.length;
      const slot = innerW / n;
      const barW = Math.min(34, slot * 0.5);
      let bars = '';
      dados.forEach((d, i) => {
        const cx = padL + slot * i + slot / 2;
        const hB = (d.bruto / max) * innerH;
        const hL = (d.liquido / max) * innerH;
        const yB = padTop + innerH - hB;
        const yL = padTop + innerH - hL;
        const ativo = d.mes === this.mes;
        // barra bruto (atrás, mais larga) e líquido (na frente)
        bars += '<rect class="fin-bar-bruto" x="' + (cx - barW/2) + '" y="' + yB + '" width="' + barW + '" height="' + Math.max(0,hB) + '" rx="3" opacity="' + (ativo?1:0.55) + '"/>';
        bars += '<rect class="fin-bar-liq" x="' + (cx - barW/2 + barW*0.22) + '" y="' + yL + '" width="' + (barW*0.56) + '" height="' + Math.max(0,hL) + '" rx="2"/>';
        // valor no topo (só se houver e couber)
        if (d.bruto > 0) {
          const lbl = d.bruto >= 1000 ? (Math.round(d.bruto/100)/10).toFixed(1).replace('.',',') + 'k' : Math.round(d.bruto);
          bars += '<text class="fin-bar-value" x="' + cx + '" y="' + (yB - 4) + '" text-anchor="middle">' + lbl + '</text>';
        }
        // rótulo do mês
        bars += '<text class="fin-bar-label" x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle"' + (ativo?' font-weight="700"':'') + '>' + d.rotulo + '</text>';
      });
      const baseY = padTop + innerH;
      return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Gráfico de faturamento mensal">' +
             '<line class="fin-grid-line" x1="' + padL + '" y1="' + baseY + '" x2="' + (W-padR) + '" y2="' + baseY + '"/>' +
             bars + '</svg>';
    },

    // ---- modal lançamento ----
    abrirNovo() {
      this.editandoId = null;
      this.form = { pacienteId: null, pacienteNome: '', pacienteBusca: '', valor: '', data: this.hojeOuMes(), descricao: '', formaPagamento: '', observacao: '' };
      this.pacientesEncontrados = [];
      this.modalAberto = true;
    },
    abrirEditar(l) {
      this.editandoId = l.id;
      this.form = {
        pacienteId: l.pacienteId || null,
        pacienteNome: l.pacienteNome || '',
        pacienteBusca: l.pacienteNome || '',
        valor: Financeiro.formatarNumero(l.valor),
        data: l.data,
        descricao: l.descricao || '',
        formaPagamento: l.formaPagamento || '',
        observacao: l.observacao || ''
      };
      this.pacientesEncontrados = [];
      this.modalAberto = true;
    },
    fecharModal() { this.modalAberto = false; },
    hojeOuMes() {
      // se o mês visível é o atual, usa hoje; senão, dia 1 do mês visível
      const hoje = new Date().toISOString().slice(0,10);
      return hoje.slice(0,7) === this.mes ? hoje : this.mes + '-01';
    },

    async buscarPaciente() {
      const q = (this.form.pacienteBusca || '').trim();
      if (this.form.pacienteId && q !== this.form.pacienteNome) {
        this.form.pacienteId = null;
        this.form.pacienteNome = '';
      }
      if (q.length < 2) { this.pacientesEncontrados = []; return; }
      try {
        const achados = await DB.listPacientes({ search: q });
        this.pacientesEncontrados = achados.slice(0, 8);
      } catch (e) { this.pacientesEncontrados = []; }
    },
    selecionarPaciente(p) {
      this.form.pacienteId = p.id;
      this.form.pacienteNome = p.nome;
      this.form.pacienteBusca = p.nome;
      this.pacientesEncontrados = [];
      if (!this.form.descricao) this.form.descricao = 'Consulta';
    },
    limparPaciente() {
      this.form.pacienteId = null;
      this.form.pacienteNome = '';
      this.form.pacienteBusca = '';
    },

    async salvar() {
      const valor = Financeiro.parseMoeda(this.form.valor);
      if (!valor || valor <= 0) { UI.toast('Informe um valor maior que zero', 'error'); return; }
      if (!this.form.data) { UI.toast('Informe a data', 'error'); return; }
      this.salvando = true;
      try {
        const dados = {
          pacienteId: this.form.pacienteId,
          pacienteNome: this.form.pacienteNome,
          valor,
          data: this.form.data,
          descricao: this.form.descricao,
          formaPagamento: this.form.formaPagamento,
          observacao: this.form.observacao
        };
        if (this.editandoId) {
          await DB.updateLancamento(this.editandoId, dados);
          UI.toast('Lançamento atualizado', 'success');
        } else {
          await DB.createLancamento(dados);
          UI.toast('Lançamento registrado', 'success');
        }
        this.modalAberto = false;
        await this.carregar();
        await this.carregarGrafico();
      } catch (e) {
        UI.toast('Erro ao salvar: ' + e.message, 'error');
      } finally {
        this.salvando = false;
      }
    },

    async excluir(l) {
      const nome = l.pacienteNome || l.descricao || 'este lançamento';
      if (!confirm('Excluir ' + nome + ' (' + Financeiro.formatarMoeda(l.valor) + ')?')) return;
      try {
        await DB.softDeleteLancamento(l.id);
        UI.toast('Lançamento excluído', 'success');
        await this.carregar();
        await this.carregarGrafico();
      } catch (e) {
        UI.toast('Erro ao excluir: ' + e.message, 'error');
      }
    },

    // ---- modal impostos ----
    abrirImpostos() {
      this.impostosEdit = (this.impostos || []).map(i => ({ nome: i.nome, percentual: i.percentual }));
      if (this.impostosEdit.length === 0) this.impostosEdit.push({ nome: '', percentual: 0 });
      this.impostosAberto = true;
    },
    fecharImpostos() { this.impostosAberto = false; },
    adicionarImposto() { this.impostosEdit.push({ nome: '', percentual: 0 }); },
    removerImposto(i) { this.impostosEdit.splice(i, 1); },
    totalPctEdit() {
      return Math.round((this.impostosEdit.reduce((s, i) => s + (Number(i.percentual) || 0), 0)) * 100) / 100;
    },
    async salvarImpostos() {
      try {
        this.impostos = await DB.setImpostos(this.impostosEdit);
        this.impostosAberto = false;
        this.resumo = Financeiro.resumo(this.lancamentos, this.impostos);
        UI.toast('Impostos salvos', 'success');
      } catch (e) {
        UI.toast('Erro ao salvar impostos: ' + e.message, 'error');
      }
    }
  };
}

window.renderFinanceiro = renderFinanceiro;
window.financeiroApp = financeiroApp;
