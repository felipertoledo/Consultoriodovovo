/* ================================================================
   components/templates-prescricao.js — Sprint A2

   Rota: /templates
   Gerencia templates de prescrição reutilizáveis.

   Estrutura interna do template:
   { id, nome, tipo (simples|controle|azul), medicacoes [{nome, posologia, duracao, quantidadeTotal}], orientacoes, alertaClinico, usoCount, createdAt }
   ================================================================ */

function componenteTemplates() {
  return {
    templates: [],
    carregando: false,

    // Modal de criar/editar
    modalAberto: false,
    editandoId: null,
    formT: { nome: '', tipo: 'simples', medicacoes: [{ nome: '', posologia: '', duracao: '', quantidadeTotal: '' }], orientacoes: '', alertaClinico: '' },

    async init() {
      await this.carregar();
    },

    async carregar() {
      this.carregando = true;
      try {
        this.templates = await DB.listTemplates();
      } catch (e) {
        UI.toast('Erro ao carregar templates: ' + e.message, 'error');
      } finally {
        this.carregando = false;
      }
    },

    abrirNovo() {
      this.editandoId = null;
      this.formT = {
        nome: '',
        tipo: 'simples',
        medicacoes: [{ nome: '', posologia: '', duracao: '', quantidadeTotal: '' }],
        orientacoes: '',
        alertaClinico: ''
      };
      this.modalAberto = true;
    },

    abrirEditar(t) {
      this.editandoId = t.id;
      this.formT = {
        nome: t.nome || '',
        tipo: t.tipo || 'simples',
        medicacoes: (Array.isArray(t.medicacoes) && t.medicacoes.length > 0)
          ? JSON.parse(JSON.stringify(t.medicacoes))  // clone profundo
          : [{ nome: '', posologia: '', duracao: '', quantidadeTotal: '' }],
        orientacoes: t.orientacoes || '',
        alertaClinico: t.alertaClinico || ''
      };
      this.modalAberto = true;
    },

    async duplicar(t) {
      try {
        await DB.createTemplate({
          nome: (t.nome || 'Template') + ' (cópia)',
          tipo: t.tipo,
          medicacoes: JSON.parse(JSON.stringify(t.medicacoes || [])),
          orientacoes: t.orientacoes || '',
          alertaClinico: t.alertaClinico || ''
        });
        UI.toast('Template duplicado', 'success');
        await this.carregar();
      } catch (e) {
        UI.toast('Erro ao duplicar: ' + e.message, 'error');
      }
    },

    async remover(t) {
      if (!confirm(`Remover o template "${t.nome}"? Esta ação não pode ser desfeita.`)) return;
      try {
        await DB.softDeleteTemplate(t.id);
        UI.toast('Template removido', 'success');
        await this.carregar();
      } catch (e) {
        UI.toast('Erro ao remover: ' + e.message, 'error');
      }
    },

    fecharModal() {
      this.modalAberto = false;
    },

    adicionarMed() {
      this.formT.medicacoes.push({ nome: '', posologia: '', duracao: '', quantidadeTotal: '' });
    },

    removerMed(i) {
      if (this.formT.medicacoes.length <= 1) {
        this.formT.medicacoes[0] = { nome: '', posologia: '', duracao: '', quantidadeTotal: '' };
        return;
      }
      this.formT.medicacoes.splice(i, 1);
    },

    async salvarModal() {
      if (!this.formT.nome.trim()) {
        UI.toast('Dê um nome ao template', 'error');
        return;
      }
      const medsValidas = this.formT.medicacoes.filter(m => m.nome && m.nome.trim());
      if (medsValidas.length === 0) {
        UI.toast('Adicione pelo menos um medicamento', 'error');
        return;
      }
      try {
        if (this.editandoId) {
          await DB.updateTemplate(this.editandoId, {
            nome: this.formT.nome.trim(),
            tipo: this.formT.tipo,
            medicacoes: medsValidas,
            orientacoes: this.formT.orientacoes.trim(),
            alertaClinico: this.formT.alertaClinico.trim()
          });
          UI.toast('Template atualizado', 'success');
        } else {
          await DB.createTemplate({
            nome: this.formT.nome.trim(),
            tipo: this.formT.tipo,
            medicacoes: medsValidas,
            orientacoes: this.formT.orientacoes.trim(),
            alertaClinico: this.formT.alertaClinico.trim()
          });
          UI.toast('Template criado', 'success');
        }
        this.fecharModal();
        await this.carregar();
      } catch (e) {
        UI.toast('Erro ao salvar: ' + e.message, 'error');
      }
    },

    rotuloTipo(tipo) {
      if (tipo === 'simples') return '📄 Comum';
      if (tipo === 'controle') return '📋 Controle especial';
      if (tipo === 'azul') return '📘 Azul B1/B2';
      return tipo;
    },

    // Seed inicial: cria templates padrão úteis para MFC se a base estiver vazia
    async semearPadrao() {
      if (!confirm('Criar 5 templates iniciais úteis para MFC (HAS, DM2, hipotireoidismo, dislipidemia, depressão)?')) return;
      const padroes = [
        {
          nome: 'HAS controlada — Losartana 50 + HCTZ 25',
          tipo: 'simples',
          medicacoes: [
            { nome: 'Losartana 50 mg', posologia: '1 comp via oral, pela manhã', duracao: 'uso contínuo / 60 dias', quantidadeTotal: '60' },
            { nome: 'Hidroclorotiazida 25 mg', posologia: '1 comp via oral, pela manhã', duracao: 'uso contínuo / 60 dias', quantidadeTotal: '60' }
          ],
          orientacoes: 'Aferir PA em casa pelo menos 1x/semana e anotar. Dieta hipossódica. Atividade física 150 min/semana.',
          alertaClinico: ''
        },
        {
          nome: 'DM2 controlado — Metformina',
          tipo: 'simples',
          medicacoes: [
            { nome: 'Metformina 850 mg', posologia: '1 comp via oral, 2x ao dia (almoço e jantar)', duracao: 'uso contínuo / 60 dias', quantidadeTotal: '120' }
          ],
          orientacoes: 'Verificar glicemia capilar conforme orientação. Dieta com baixo índice glicêmico. Atividade física regular.',
          alertaClinico: ''
        },
        {
          nome: 'Hipotireoidismo — Levotiroxina',
          tipo: 'simples',
          medicacoes: [
            { nome: 'Levotiroxina 50 mcg', posologia: '1 comp via oral, em jejum, 30 min antes do café', duracao: 'uso contínuo / 90 dias', quantidadeTotal: '90' }
          ],
          orientacoes: 'Tomar SEM alimentos, café ou leite. Aguardar 30 min para café da manhã. TSH em 6-8 semanas.',
          alertaClinico: ''
        },
        {
          nome: 'Dislipidemia — Sinvastatina',
          tipo: 'simples',
          medicacoes: [
            { nome: 'Sinvastatina 20 mg', posologia: '1 comp via oral, à noite', duracao: 'uso contínuo / 60 dias', quantidadeTotal: '60' }
          ],
          orientacoes: 'Tomar à noite (síntese hepática de colesterol é maior nesse período). Procurar atendimento se dor muscular intensa.',
          alertaClinico: ''
        },
        {
          nome: 'Depressão leve/moderada — Sertralina',
          tipo: 'controle',
          medicacoes: [
            { nome: 'Sertralina 50 mg', posologia: '1 comp via oral, pela manhã', duracao: 'uso contínuo / 30 dias', quantidadeTotal: '30' }
          ],
          orientacoes: 'Efeito clínico em 2-4 semanas. Pode causar náusea no início (geralmente passa). Não interromper abruptamente. Retorno em 30 dias para reavaliação.',
          alertaClinico: ''
        }
      ];
      let ok = 0;
      for (const p of padroes) {
        try {
          await DB.createTemplate(p);
          ok++;
        } catch (e) {
          console.warn('Falha ao criar template padrão:', p.nome, e);
        }
      }
      UI.toast(`${ok} templates criados`, 'success');
      await this.carregar();
    }
  };
}

function renderTemplates(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">📋 Templates de prescrição</h1>
        <p class="page-subtitle">Receitas reutilizáveis para crônicos estáveis</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost" onclick="Router.navigate('/')">← Voltar</button>
      </div>
    </div>

    <div x-data="componenteTemplates()" x-init="init()">
      <div class="card mb-4" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button class="btn btn-primary" @click="abrirNovo()">+ Novo template</button>
        <button class="btn" @click="semearPadrao()" x-show="templates.length === 0"
                title="Criar 5 templates iniciais úteis em MFC">
          🌱 Carregar templates padrão (HAS, DM2, hipotireoidismo, dislipidemia, depressão)
        </button>
        <span style="margin-left:auto; opacity:0.6; font-size:0.9em;"
              x-text="templates.length + (templates.length === 1 ? ' template' : ' templates') + (templates.length === 0 ? ' — nenhum salvo ainda' : '')"></span>
      </div>

      <div x-show="carregando" class="card" style="text-align:center; opacity:0.6;">Carregando…</div>
      <div x-show="!carregando && templates.length === 0" class="card" style="text-align:center; opacity:0.6; padding:24px;">
        <p>Nenhum template ainda.</p>
        <p style="font-size:0.9em; margin-top:8px;">Templates aceleram renovações de receita para pacientes crônicos estáveis.<br>
        Crie do zero ou use "Carregar templates padrão" para começar.</p>
      </div>

      <template x-for="t in templates" :key="t.id">
        <div class="card mb-3" style="border-left: 4px solid #166534;">
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <strong style="font-size:1.1em" x-text="t.nome"></strong>
                <span style="font-size:0.85em; padding:2px 8px; background:#f3f4f6; border-radius:4px;" x-text="rotuloTipo(t.tipo)"></span>
                <span x-show="t.usoCount > 0" style="font-size:0.85em; opacity:0.7;" x-text="'usado ' + t.usoCount + 'x'"></span>
              </div>
              <div style="font-size:0.9em; margin-top:6px; opacity:0.85;">
                <template x-for="(m, i) in t.medicacoes" :key="i">
                  <div x-text="'• ' + (m.nome || '') + (m.posologia ? ' — ' + m.posologia : '')"></div>
                </template>
              </div>
              <div x-show="t.orientacoes" style="font-size:0.85em; margin-top:6px; opacity:0.75; font-style:italic;" x-text="t.orientacoes"></div>
            </div>
            <div style="display:flex; gap:4px; flex-wrap:wrap;">
              <button class="btn btn-sm" @click="abrirEditar(t)" title="Editar">✏</button>
              <button class="btn btn-sm" @click="duplicar(t)" title="Duplicar">📑</button>
              <button class="btn btn-sm" @click="remover(t)" title="Remover">🗑</button>
            </div>
          </div>
        </div>
      </template>

      <!-- Modal -->
      <div x-show="modalAberto" x-cloak
           style="position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px;"
           @click.self="fecharModal()">
        <div class="card" style="max-width:700px; width:100%; max-height:90vh; overflow-y:auto;" @click.stop>
          <h3 class="card-title" x-text="editandoId ? 'Editar template' : 'Novo template'"></h3>

          <div class="mt-3">
            <label class="text-sm" style="font-weight:600">Nome do template</label>
            <input class="input" type="text" x-model="formT.nome" placeholder="Ex: HAS controlada — Losartana + HCTZ">
          </div>

          <div class="mt-3">
            <label class="text-sm" style="font-weight:600">Tipo de receituário</label>
            <select class="input" x-model="formT.tipo">
              <option value="simples">📄 Comum</option>
              <option value="controle">📋 Controle especial (branca)</option>
              <option value="azul">📘 Azul B1/B2</option>
            </select>
          </div>

          <div class="mt-3">
            <label class="text-sm" style="font-weight:600">Alerta clínico (opcional)</label>
            <input class="input" type="text" x-model="formT.alertaClinico" placeholder="Ex: confirmar função renal antes">
          </div>

          <div class="mt-4">
            <div style="display:flex; align-items:center; gap:8px;">
              <strong>Medicações</strong>
              <button class="btn btn-sm" @click="adicionarMed()" style="margin-left:auto">+ Adicionar med.</button>
            </div>
            <template x-for="(m, i) in formT.medicacoes" :key="i">
              <div style="padding:10px; background:#f9fafb; border-radius:6px; margin-top:8px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                  <span style="font-size:0.85em; font-weight:600;" x-text="'Med ' + (i + 1)"></span>
                  <button class="btn btn-sm" @click="removerMed(i)" style="margin-left:auto; opacity:0.7">×</button>
                </div>
                <input class="input" type="text" x-model="m.nome" placeholder="Nome + dose (ex: Losartana 50 mg)" style="margin-bottom:4px;">
                <input class="input" type="text" x-model="m.posologia" placeholder="Posologia (ex: 1 comp via oral, pela manhã)" style="margin-bottom:4px;">
                <input class="input" type="text" x-model="m.duracao" placeholder="Duração/quantidade (ex: 60 dias)" style="margin-bottom:4px;">
                <input class="input" type="text" x-model="m.quantidadeTotal" placeholder="Quantidade total numérica (necessária para controle/azul)" x-show="formT.tipo === 'controle' || formT.tipo === 'azul'">
              </div>
            </template>
          </div>

          <div class="mt-3">
            <label class="text-sm" style="font-weight:600">Orientações ao paciente</label>
            <textarea class="textarea" rows="3" x-model="formT.orientacoes" placeholder="Orientações específicas deste tratamento"></textarea>
          </div>

          <div class="mt-4" style="display:flex; gap:8px; justify-content:flex-end;">
            <button class="btn" @click="fecharModal()">Cancelar</button>
            <button class="btn btn-primary" @click="salvarModal()" x-text="editandoId ? 'Salvar alterações' : 'Criar template'"></button>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.componenteTemplates = componenteTemplates;
window.renderTemplates = renderTemplates;
