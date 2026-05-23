/* ============================================================
   prescricao-rapida.js — Receita avulsa sem precisar de consulta

   Fluxo:
   1. Selecionar paciente (cadastrado OU avulso)
   2. Escolher tipo de receituário (comum / controle especial / azul)
   3. Listar medicamentos
   4. Gerar PDF direto (com botões WhatsApp, Memed, Assinar, Imprimir, Baixar)

   Reaproveita PDFDocuments existente, então qualquer mudança no
   layout dos receituários reflete aqui sem dor.
   ============================================================ */

function renderPrescricaoRapida(container) {
  container.innerHTML = `
    <div x-data="prescricaoRapida()" x-init="load()">
      <div class="page-header">
        <div>
          <h1 class="page-title">💊 Nova prescrição</h1>
          <p class="page-subtitle">Receita rápida — sem precisar abrir consulta</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-ghost" @click="$dispatch('navigate', '/')">← Voltar</button>
        </div>
      </div>

      <!-- Indicador de passos -->
      <div class="card mb-4" style="padding: var(--space-3) var(--space-4)">
        <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; font-size: var(--text-sm)">
          <span :style="step === 1 ? 'font-weight: var(--weight-semibold); color: var(--color-primary)' : 'color: var(--text-secondary)'">
            1. Paciente
          </span>
          <span class="muted">→</span>
          <span :style="step === 2 ? 'font-weight: var(--weight-semibold); color: var(--color-primary)' : 'color: var(--text-secondary)'">
            2. Tipo de receita
          </span>
          <span class="muted">→</span>
          <span :style="step === 3 ? 'font-weight: var(--weight-semibold); color: var(--color-primary)' : 'color: var(--text-secondary)'">
            3. Medicamentos
          </span>
        </div>
      </div>

      <!-- ============ PASSO 1: Paciente ============ -->
      <div class="card" x-show="step === 1">
        <h3 class="card-title mb-4">1. Para quem é a receita?</h3>

        <div class="form-group">
          <label class="label">
            <input type="radio" name="modo-pac" value="cadastrado" x-model="modoPaciente">
            Paciente já cadastrado
          </label>
          <label class="label">
            <input type="radio" name="modo-pac" value="avulso" x-model="modoPaciente">
            Paciente avulso (não vou cadastrar agora)
          </label>
        </div>

        <!-- Cadastrado: busca -->
        <div x-show="modoPaciente === 'cadastrado'" class="mt-4">
          <div class="form-group">
            <label class="label">Buscar paciente</label>
            <input type="text" class="input" x-model="buscaPaciente"
                   placeholder="Digite parte do nome..."
                   @input.debounce.300ms="buscarPaciente()">
          </div>

          <div x-show="pacienteSelecionado" class="alert alert-success">
            <div>
              <strong>Selecionado:</strong>
              <span x-text="pacienteSelecionado?.nome"></span>
              (<span x-text="pacienteSelecionado?.idade || '—'"></span> anos)
              <button class="btn btn-ghost btn-sm" @click="pacienteSelecionado = null; buscaPaciente = ''" style="float: right">
                Trocar
              </button>
            </div>
          </div>

          <div x-show="!pacienteSelecionado && resultadosBusca.length > 0"
               style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); margin-top: var(--space-2)">
            <template x-for="p in resultadosBusca" :key="p.id">
              <div @click="selecionarPaciente(p)"
                   style="padding: var(--space-3); border-bottom: 1px solid var(--border-subtle); cursor: pointer"
                   onmouseover="this.style.background='var(--bg-sunken)'"
                   onmouseout="this.style.background=''">
                <div style="font-weight: var(--weight-semibold)" x-text="p.nome"></div>
                <div class="text-xs muted">
                  <span x-text="p.idade ? p.idade + ' anos' : ''"></span>
                  <span x-show="p.cpf"> · CPF <span x-text="p.cpf"></span></span>
                </div>
              </div>
            </template>
          </div>

          <div x-show="!pacienteSelecionado && buscaPaciente.length >= 2 && resultadosBusca.length === 0" class="muted text-sm mt-2">
            Nenhum paciente encontrado. Cadastre primeiro ou use "avulso".
          </div>
        </div>

        <!-- Avulso: dados mínimos legais -->
        <div x-show="modoPaciente === 'avulso'" class="mt-4">
          <p class="text-sm muted mb-3">
            Dados mínimos exigidos pela legislação (Lei 5.991/73, RDC 20/2011, Portaria 344/98).
            <strong>Não fica salvo no sistema</strong> — vai só na receita.
          </p>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="label">Nome completo <span class="required">*</span></label>
              <input type="text" class="input" x-model="pacienteAvulso.nome" placeholder="Nome do paciente">
            </div>
            <div class="form-group">
              <label class="label">CPF</label>
              <input type="text" class="input" x-model="pacienteAvulso.cpf" placeholder="000.000.000-00">
            </div>
          </div>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="label">Data de nascimento</label>
              <input type="date" class="input" x-model="pacienteAvulso.dataNascimento">
            </div>
            <div class="form-group">
              <label class="label">Sexo</label>
              <select class="input" x-model="pacienteAvulso.sexo">
                <option value="">—</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
                <option value="O">Outro</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="label">Endereço completo <span class="required">*</span>
              <span class="hint">(obrigatório em receitas de controle especial e azul)</span>
            </label>
            <input type="text" class="input" x-model="pacienteAvulso.endereco" placeholder="Rua, número, bairro, cidade/UF">
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <button class="btn btn-primary" @click="step = 2" :disabled="!podeAvancarPaciente()">
            Continuar →
          </button>
        </div>
      </div>

      <!-- ============ PASSO 2: Tipo ============ -->
      <div class="card" x-show="step === 2">
        <h3 class="card-title mb-4">2. Qual tipo de receituário?</h3>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3)">
          <label class="tipo-card" :class="tipoReceita === 'simples' ? 'selected' : ''" @click="tipoReceita = 'simples'">
            <input type="radio" name="tipo" value="simples" x-model="tipoReceita" style="display: none">
            <div style="font-weight: var(--weight-semibold); color: var(--color-primary)">📄 Receituário comum</div>
            <div class="text-xs muted mt-1">Antibióticos, anti-hipertensivos, antidiabéticos e demais medicamentos sem controle especial.</div>
          </label>

          <label class="tipo-card" :class="tipoReceita === 'controle' ? 'selected' : ''" @click="tipoReceita = 'controle'">
            <input type="radio" name="tipo" value="controle" x-model="tipoReceita" style="display: none">
            <div style="font-weight: var(--weight-semibold); color: var(--color-primary)">📋 Controle especial (branca)</div>
            <div class="text-xs muted mt-1">Lista C1 — antidepressivos, anticonvulsivantes, antipsicóticos não-benzodiazepínicos. Duas vias. Validade 30 dias.</div>
          </label>

          <label class="tipo-card" :class="tipoReceita === 'azul' ? 'selected' : ''" @click="tipoReceita = 'azul'">
            <input type="radio" name="tipo" value="azul" x-model="tipoReceita" style="display: none">
            <div style="font-weight: var(--weight-semibold); color: var(--color-primary)">📘 Azul B1/B2</div>
            <div class="text-xs muted mt-1">Psicotrópicos (benzodiazepínicos, anorexígenos). Validade 30 dias.</div>
            <div class="text-xs" style="color: var(--color-danger); margin-top: var(--space-1)">⚠ Notificação de Receita Azul é documento separado, fornecido pela VISA municipal.</div>
          </label>
        </div>

        <div class="flex justify-between mt-4">
          <button class="btn btn-ghost" @click="step = 1">← Trocar paciente</button>
          <button class="btn btn-primary" @click="step = 3">Continuar →</button>
        </div>
      </div>

      <!-- ============ PASSO 3: Medicamentos ============ -->
      <div class="card" x-show="step === 3">
        <div class="flex justify-between items-center mb-3" style="flex-wrap: wrap; gap: var(--space-2);">
          <h3 class="card-title" style="margin: 0;">3. Medicamentos</h3>
          <button class="btn btn-sm" @click="abrirPickerTemplate()" x-show="templatesDisponiveis.length > 0">
            📋 Carregar template
          </button>
          <button class="btn btn-sm btn-ghost" @click="$dispatch('navigate', '/templates')" x-show="templatesDisponiveis.length === 0"
                  title="Cadastrar templates para acelerar prescrições futuras">
            📋 Criar templates
          </button>
        </div>

        <!-- Dropdown de templates (Sprint A2) -->
        <div x-show="pickerTemplateAberto" x-cloak
             style="border: 2px solid #166534; border-radius: 8px; padding: 12px; background: #f0fdf4; margin-bottom: var(--space-3);">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <strong>📋 Escolha um template</strong>
            <button class="btn btn-sm" style="margin-left:auto" @click="pickerTemplateAberto = false">×</button>
          </div>
          <div style="max-height: 240px; overflow-y: auto; background:#fff; border-radius:6px;">
            <template x-for="t in templatesDisponiveis" :key="t.id">
              <div @click="carregarTemplate(t)"
                   style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #e5e7eb;"
                   :style="t.tipo !== tipoReceita ? 'opacity: 0.55' : ''">
                <div style="display:flex; align-items:center; gap:8px;">
                  <strong x-text="t.nome"></strong>
                  <span style="font-size:0.8em; padding:1px 6px; background:#f3f4f6; border-radius:4px;"
                        x-text="t.tipo === 'simples' ? 'comum' : (t.tipo === 'controle' ? 'controle' : 'azul')"></span>
                  <span x-show="t.usoCount > 0" style="font-size:0.8em; opacity:0.6;" x-text="'usado ' + t.usoCount + 'x'"></span>
                </div>
                <div style="font-size:0.85em; opacity:0.75; margin-top:3px;"
                     x-text="(t.medicacoes || []).map(m => m.nome).filter(Boolean).join(' + ')"></div>
                <div x-show="t.tipo !== tipoReceita" style="font-size:0.75em; color:#92400e; margin-top:3px;">
                  ⚠️ Trocará o tipo de receituário para <strong x-text="t.tipo === 'simples' ? 'Comum' : (t.tipo === 'controle' ? 'Controle especial' : 'Azul B1/B2')"></strong>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="form-group">
          <label class="label">Alerta clínico (alergias, comorbidades importantes)
            <span class="hint">aparece em destaque no topo da receita</span>
          </label>
          <input type="text" class="input" x-model="alertaClinico"
                 placeholder="Ex: Alérgica a sulfa | Gestante 1º trimestre | DRC G3">
        </div>

        <div style="border-top: 1px solid var(--border-subtle); padding-top: var(--space-3); margin-top: var(--space-3)">
          <template x-for="(med, i) in medicacoes" :key="i">
            <div style="padding: var(--space-3); background: var(--bg-sunken); border-radius: var(--radius-md); margin-bottom: var(--space-3)">
              <div class="flex justify-between items-center mb-2">
                <strong>Medicamento <span x-text="i + 1"></span></strong>
                <button class="btn btn-ghost btn-sm" @click="removerMedicamento(i)" x-show="medicacoes.length > 1">🗑</button>
              </div>
              <div class="form-group">
                <label class="label text-sm">Nome e dose</label>
                <input type="text" class="input" x-model="med.nome"
                       :placeholder="tipoReceita === 'azul' ? 'Ex: Clonazepam 2 mg' : 'Ex: Amoxicilina 500 mg'">
              </div>
              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="label text-sm">Posologia</label>
                  <input type="text" class="input" x-model="med.posologia"
                         placeholder="Ex: 1 cápsula via oral, 8/8h">
                </div>
                <div class="form-group">
                  <label class="label text-sm">Duração / quantidade</label>
                  <input type="text" class="input" x-model="med.duracao"
                         placeholder="Ex: por 7 dias / 21 comprimidos">
                </div>
              </div>
              <div class="form-group" x-show="tipoReceita === 'controle' || tipoReceita === 'azul'">
                <label class="label text-sm">Quantidade total (numérica)
                  <span class="hint">obrigatório para controle especial e azul — sai por extenso na receita</span>
                </label>
                <input type="number" class="input" x-model="med.quantidadeTotal"
                       placeholder="Ex: 30">
              </div>
            </div>
          </template>

          <button class="btn btn-secondary btn-block" @click="adicionarMedicamento()">
            ➕ Adicionar outro medicamento
          </button>
        </div>

        <div class="flex justify-between mt-4">
          <button class="btn btn-ghost" @click="step = 2">← Trocar tipo</button>
          <button class="btn btn-primary" @click="gerarPrescricao()" :disabled="!podeGerar()">
            👁️ Pré-visualizar PDF
          </button>
        </div>
      </div>
    </div>

    <style>
      .tipo-card {
        display: block;
        padding: var(--space-4);
        border: 2px solid var(--border-subtle);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.15s;
      }
      .tipo-card:hover { border-color: var(--color-primary); }
      .tipo-card.selected { border-color: var(--color-primary); background: var(--bg-sunken); }
    </style>
  `;
}

function prescricaoRapida() {
  return {
    step: 1,
    modoPaciente: 'cadastrado',
    buscaPaciente: '',
    resultadosBusca: [],
    pacienteSelecionado: null,
    pacienteAvulso: {
      nome: '',
      cpf: '',
      dataNascimento: '',
      sexo: '',
      endereco: ''
    },
    tipoReceita: 'simples',
    alertaClinico: '',
    medicacoes: [{ nome: '', posologia: '', duracao: '', quantidadeTotal: '' }],

    // Sprint A2: integração com templates
    templatesDisponiveis: [],
    pickerTemplateAberto: false,

    async load() {
      // Pré-carrega lista para busca instantânea
      try {
        const pacs = await DB.listPacientes();
        this._todosPacientes = pacs;
      } catch (e) {
        console.error('Erro ao carregar pacientes:', e);
        this._todosPacientes = [];
      }

      // Sprint A2: carregar templates disponíveis
      try {
        if (DB.listTemplates) {
          this.templatesDisponiveis = await DB.listTemplates();
        }
      } catch (e) {
        console.warn('Erro ao carregar templates:', e);
        this.templatesDisponiveis = [];
      }
    },

    // Sprint A2: ações do picker de templates
    abrirPickerTemplate() {
      this.pickerTemplateAberto = true;
    },

    async carregarTemplate(t) {
      try {
        // Trocar tipo de receita se necessário
        if (t.tipo && t.tipo !== this.tipoReceita) {
          this.tipoReceita = t.tipo;
        }
        // Preencher medicações (clone para não modificar template)
        if (Array.isArray(t.medicacoes) && t.medicacoes.length > 0) {
          this.medicacoes = JSON.parse(JSON.stringify(t.medicacoes));
        }
        // Alerta clínico (só sobrescreve se template tiver)
        if (t.alertaClinico) {
          this.alertaClinico = t.alertaClinico;
        }
        // Incrementa uso do template
        if (DB.incrementarUsoTemplate) {
          await DB.incrementarUsoTemplate(t.id);
        }
        this.pickerTemplateAberto = false;
        UI.toast(`Template "${t.nome}" carregado`, 'success');
      } catch (e) {
        UI.toast('Erro ao carregar template: ' + e.message, 'error');
      }
    },

    buscarPaciente() {
      const q = this.buscaPaciente.trim().toLowerCase();
      if (q.length < 2) {
        this.resultadosBusca = [];
        return;
      }
      this.resultadosBusca = (this._todosPacientes || [])
        .filter(p => (p.nome || '').toLowerCase().includes(q))
        .slice(0, 20);
    },

    selecionarPaciente(p) {
      this.pacienteSelecionado = p;
      this.buscaPaciente = '';
      this.resultadosBusca = [];
    },

    podeAvancarPaciente() {
      if (this.modoPaciente === 'cadastrado') {
        return !!this.pacienteSelecionado;
      }
      // Avulso: nome obrigatório (endereço também para controle/azul, mas valido lá)
      return !!this.pacienteAvulso.nome.trim();
    },

    adicionarMedicamento() {
      this.medicacoes.push({ nome: '', posologia: '', duracao: '', quantidadeTotal: '' });
    },

    removerMedicamento(i) {
      this.medicacoes.splice(i, 1);
    },

    podeGerar() {
      // Pelo menos 1 medicamento com nome preenchido
      return this.medicacoes.some(m => m.nome && m.nome.trim());
    },

    obterPacienteParaPDF() {
      if (this.modoPaciente === 'cadastrado' && this.pacienteSelecionado) {
        return { ...this.pacienteSelecionado };
      }
      // Avulso: monta objeto compatível com o que o pdf-documents espera.
      // O usuário digita um endereço em UMA linha. Como os PDFs de controle/azul
      // leem campos separados (logradouro/numero/bairro/cidade/uf), colocamos
      // também a string completa em `logradouro` para que o PDF a renderize.
      const idade = this.calcularIdade(this.pacienteAvulso.dataNascimento);
      const enderecoLivre = (this.pacienteAvulso.endereco || '').trim();
      return {
        id: null,
        nome: this.pacienteAvulso.nome.trim(),
        cpf: this.pacienteAvulso.cpf,
        dataNascimento: this.pacienteAvulso.dataNascimento,
        idade: idade,
        sexo: this.pacienteAvulso.sexo,
        endereco: enderecoLivre,
        logradouro: enderecoLivre  // fallback para PDFs que leem campos separados
      };
    },

    /* Helper: verifica se o paciente tem qualquer endereço utilizável.
       Aceita tanto o esquema novo (campos separados, salvos por paciente-form)
       quanto o legado (campo `endereco` único, usado por paciente avulso). */
    temEnderecoValido(p) {
      if (!p) return false;
      // Campo único (paciente avulso ou cadastros antigos)
      if (p.endereco && p.endereco.trim()) return true;
      // Campos separados (paciente cadastrado pelo paciente-form)
      const log = (p.logradouro || '').trim();
      const cid = (p.cidade || '').trim();
      if (log && cid) return true;
      // Aceita também só logradouro preenchido (cobre cadastros parciais)
      if (log) return true;
      return false;
    },

    calcularIdade(dataNasc) {
      if (!dataNasc) return null;
      const nasc = new Date(dataNasc);
      if (isNaN(nasc.getTime())) return null;
      const hoje = new Date();
      let idade = hoje.getFullYear() - nasc.getFullYear();
      const m = hoje.getMonth() - nasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
      return idade;
    },

    gerarPrescricao() {
      if (!this.podeGerar()) {
        UI.toast('Preencha pelo menos um medicamento', 'error');
        return;
      }

      const paciente = this.obterPacienteParaPDF();

      // Valida endereço para controle/azul (aceita campos separados OU string única)
      if ((this.tipoReceita === 'controle' || this.tipoReceita === 'azul')
          && !this.temEnderecoValido(paciente)) {
        UI.toast('Endereço do paciente é obrigatório para receituários de controle especial e azul.', 'error', 7000);
        return;
      }

      // Valida quantidade total nos itens
      if (this.tipoReceita === 'controle' || this.tipoReceita === 'azul') {
        const semQtd = this.medicacoes.filter(m => m.nome && m.nome.trim() && !m.quantidadeTotal);
        if (semQtd.length > 0) {
          UI.toast('Preencha "Quantidade total" em todos os medicamentos (obrigatório para controle/azul).', 'error', 7000);
          return;
        }
      }

      const medsValidas = this.medicacoes.filter(m => m.nome && m.nome.trim());
      const dados = {
        medicacoes: medsValidas,
        alertaClinico: this.alertaClinico || ''
      };

      try {
        let resultado, nomeArquivo, titulo;
        if (this.tipoReceita === 'simples') {
          resultado = PDFDocuments.receituarioSimples(paciente, dados);
          nomeArquivo = `receita_${this.slug(paciente.nome)}_${this.dataAgora()}.pdf`;
          titulo = 'Receituário';
        } else if (this.tipoReceita === 'controle') {
          resultado = PDFDocumentsExtra.receituarioControleEspecial(paciente, dados);
          nomeArquivo = `receita_controle_${this.slug(paciente.nome)}_${this.dataAgora()}.pdf`;
          titulo = 'Receituário de controle especial';
        } else if (this.tipoReceita === 'azul') {
          resultado = PDFDocumentsExtra.receituarioAzul(paciente, dados);
          nomeArquivo = `receita_azul_${this.slug(paciente.nome)}_${this.dataAgora()}.pdf`;
          titulo = 'Receituário azul B1/B2';
        }

        // As funções podem retornar { doc, codigo } ou só doc (compatibilidade)
        const doc = (resultado && resultado.doc) ? resultado.doc : resultado;
        const codigo = (resultado && resultado.codigo) ? resultado.codigo : null;

        // Auditoria
        if (paciente.id) {
          DB.audit('CREATE_PRESCRICAO_RAPIDA', 'documento', paciente.id, {
            tipo: titulo, medicamentos: medsValidas.length, codigo
          }).catch(() => {});
        } else {
          DB.audit('CREATE_PRESCRICAO_RAPIDA', 'documento', null, {
            tipo: titulo, medicamentos: medsValidas.length, avulso: true, codigo
          }).catch(() => {});
        }

        PDFBuilder.previewModal(doc, nomeArquivo, titulo, paciente);
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao gerar PDF: ' + e.message, 'error');
      }
    },

    slug(s) {
      return (s || 'paciente')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);
    },

    dataAgora() {
      const d = new Date();
      return d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
    }
  };
}

window.renderPrescricaoRapida = renderPrescricaoRapida;
window.prescricaoRapida = prescricaoRapida;
