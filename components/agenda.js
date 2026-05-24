/* ================================================================
   components/agenda.js — Sprint A1: tela de Agenda
   Rota: /agenda

   Visualizações:
   - Hoje  · Próximos 7 dias  · Próximos 30 dias
   - Faltosos (marcados com data < hoje)

   Ações por agendamento:
   - Atender agora (cria nova consulta vinculada)
   - Marcar como faltou
   - Cancelar
   - Editar (data/hora/observação)
   - Remover
   ================================================================ */

function componenteAgenda() {
  return {
    aba: 'hoje',  // 'hoje' | 'semana' | 'mes' | 'faltosos'
    agendamentos: [],
    carregando: false,
    metricas: { hoje: 0, semana: 0, mes: 0, faltosos: 0 },

    // Modal de novo/editar
    modalAberto: false,
    modalEditandoId: null,
    formAg: { pacienteId: null, pacienteBusca: '', data: '', hora: '', tipo: 'consulta', observacao: '' },
    pacientesEncontrados: [],
    pacienteSelecionado: null,
    // Cadastro mínimo de paciente novo (primeira consulta sem cadastro prévio)
    modoNovoPaciente: false,
    novoPaciente: { nome: '', dataNascimento: '', sexo: '' },
    salvandoModal: false,
    buscou: false,  // se já houve uma busca (pra distinguir "ainda não digitou" de "digitou e não achou")

    async init() {
      await this.carregarAba();
      await this.carregarMetricas();
    },

    async carregarMetricas() {
      const hoje = Agenda.hojeIso();
      const fimSemana = new Date();
      fimSemana.setDate(fimSemana.getDate() + 7);
      const fimMes = new Date();
      fimMes.setDate(fimMes.getDate() + 30);

      try {
        const ags = await DB.listAgendamentos({
          dataInicio: hoje,
          dataFim: fimMes.toISOString().slice(0, 10),
          status: 'marcado'
        });
        const faltosos = await DB.listFaltosos(30);

        this.metricas.hoje = ags.filter(a => a.data === hoje).length;
        this.metricas.semana = ags.filter(a => a.data <= fimSemana.toISOString().slice(0, 10)).length;
        this.metricas.mes = ags.length;
        this.metricas.faltosos = faltosos.length;
      } catch (e) {
        console.warn('Erro métricas:', e);
      }
    },

    async carregarAba() {
      this.carregando = true;
      try {
        let ags = [];
        const hoje = Agenda.hojeIso();
        if (this.aba === 'hoje') {
          ags = await DB.listAgendamentos({ dataInicio: hoje, dataFim: hoje, status: 'marcado' });
        } else if (this.aba === 'semana') {
          const fim = new Date();
          fim.setDate(fim.getDate() + 7);
          ags = await DB.listAgendamentos({
            dataInicio: hoje,
            dataFim: fim.toISOString().slice(0, 10),
            status: 'marcado'
          });
        } else if (this.aba === 'mes') {
          const fim = new Date();
          fim.setDate(fim.getDate() + 30);
          ags = await DB.listAgendamentos({
            dataInicio: hoje,
            dataFim: fim.toISOString().slice(0, 10),
            status: 'marcado'
          });
        } else if (this.aba === 'faltosos') {
          ags = await DB.listFaltosos(30);
        }
        this.agendamentos = ags;
      } catch (e) {
        UI.toast('Erro ao carregar agenda: ' + e.message, 'error');
      } finally {
        this.carregando = false;
      }
    },

    async trocarAba(novaAba) {
      this.aba = novaAba;
      await this.carregarAba();
    },

    // ========== Ações por agendamento ==========
    atender(ag) {
      // Navega para nova consulta do paciente. A consulta marca o agendamento como realizado ao salvar.
      Router.navigate(`/paciente/${ag.pacienteId}/consulta/nova?agendamento=${ag.id}`);
    },

    async marcarFalta(ag) {
      if (!confirm(`Marcar como faltou: ${ag.pacienteNome || 'paciente'} em ${Agenda.formatarData(ag.data)}?`)) return;
      try {
        await DB.updateAgendamento(ag.id, { status: 'faltou' });
        UI.toast('Marcado como faltou', 'success');
        await this.carregarAba();
        await this.carregarMetricas();
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      }
    },

    async cancelar(ag) {
      if (!confirm(`Cancelar agendamento de ${ag.pacienteNome || 'paciente'} em ${Agenda.formatarData(ag.data)}?`)) return;
      try {
        await DB.updateAgendamento(ag.id, { status: 'cancelado' });
        UI.toast('Agendamento cancelado', 'success');
        await this.carregarAba();
        await this.carregarMetricas();
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      }
    },

    async remover(ag) {
      if (!confirm(`Remover definitivamente este agendamento? Esta ação não pode ser desfeita.`)) return;
      try {
        await DB.softDeleteAgendamento(ag.id);
        UI.toast('Agendamento removido', 'success');
        await this.carregarAba();
        await this.carregarMetricas();
      } catch (e) {
        UI.toast('Erro: ' + e.message, 'error');
      }
    },

    irParaPaciente(ag) {
      Router.navigate(`/paciente/${ag.pacienteId}`);
    },

    // ========== Modal: novo agendamento ==========
    abrirNovoAgendamento() {
      this.modalEditandoId = null;
      this.formAg = {
        pacienteId: null,
        pacienteBusca: '',
        data: Agenda.hojeIso(),
        hora: '',
        tipo: 'consulta',
        observacao: ''
      };
      this.pacientesEncontrados = [];
      this.pacienteSelecionado = null;
      this.modoNovoPaciente = false;
      this.novoPaciente = { nome: '', dataNascimento: '', sexo: '' };
      this.buscou = false;
      this.modalAberto = true;
    },

    abrirEditarAgendamento(ag) {
      this.modalEditandoId = ag.id;
      this.formAg = {
        pacienteId: ag.pacienteId,
        pacienteBusca: ag.pacienteNome || '',
        data: ag.data,
        hora: ag.hora || '',
        tipo: ag.tipo || 'consulta',
        observacao: ag.observacao || ''
      };
      this.pacienteSelecionado = { id: ag.pacienteId, nome: ag.pacienteNome };
      this.modoNovoPaciente = false;
      this.novoPaciente = { nome: '', dataNascimento: '', sexo: '' };
      this.buscou = false;
      this.modalAberto = true;
    },

    fecharModal() {
      this.modalAberto = false;
    },

    async buscarPaciente() {
      const q = (this.formAg.pacienteBusca || '').trim();
      // Se mudou o texto após selecionar, desfaz seleção
      if (this.pacienteSelecionado && q !== this.pacienteSelecionado.nome) {
        this.pacienteSelecionado = null;
        this.formAg.pacienteId = null;
      }
      // Se entrou em modo novo paciente mas o nome mudou, sai do modo
      if (this.modoNovoPaciente) {
        this.modoNovoPaciente = false;
      }
      if (q.length < 2) {
        this.pacientesEncontrados = [];
        this.buscou = false;
        return;
      }
      try {
        const r = await DB.listPacientes({ search: q, limit: 8 });
        this.pacientesEncontrados = r;
        this.buscou = true;
      } catch (e) {
        console.warn('Erro busca paciente:', e);
      }
    },

    iniciarCadastroNovo() {
      // Pré-preenche o nome com o que foi digitado
      this.novoPaciente = {
        nome: (this.formAg.pacienteBusca || '').trim(),
        dataNascimento: '',
        sexo: ''
      };
      this.modoNovoPaciente = true;
      this.pacientesEncontrados = [];
    },

    cancelarCadastroNovo() {
      this.modoNovoPaciente = false;
      this.novoPaciente = { nome: '', dataNascimento: '', sexo: '' };
    },

    selecionarPaciente(p) {
      this.pacienteSelecionado = { id: p.id, nome: p.nome };
      this.formAg.pacienteId = p.id;
      this.formAg.pacienteBusca = p.nome;
      this.pacientesEncontrados = [];
    },

    async salvarModal() {
      if (this.salvandoModal) return;
      this.salvandoModal = true;
      try {
        // === Caso: cadastro mínimo de paciente novo ===
        if (this.modoNovoPaciente) {
          const np = this.novoPaciente;
          if (!np.nome || !np.nome.trim()) {
            UI.toast('Informe o nome do paciente', 'error');
            return;
          }
          if (!np.dataNascimento) {
            UI.toast('Informe a data de nascimento (necessária para cálculo de idade)', 'error');
            return;
          }
          if (!np.sexo) {
            UI.toast('Informe o sexo', 'error');
            return;
          }
          // Validar data não-absurda
          const hoje = new Date();
          const nasc = new Date(np.dataNascimento + 'T12:00:00');
          if (isNaN(nasc.getTime()) || nasc > hoje) {
            UI.toast('Data de nascimento inválida', 'error');
            return;
          }
          const anosIdade = (hoje - nasc) / (1000 * 60 * 60 * 24 * 365.25);
          if (anosIdade > 130) {
            UI.toast('Data de nascimento muito antiga — verifique', 'error');
            return;
          }
          // Cria paciente mínimo
          const novoId = await DB.createPaciente({
            nome: np.nome.trim(),
            dataNascimento: np.dataNascimento,
            sexo: np.sexo
          });
          this.formAg.pacienteId = novoId;
          this.pacienteSelecionado = { id: novoId, nome: np.nome.trim() };
          UI.toast(`Paciente ${np.nome.trim()} cadastrado (mínimo)`, 'success');
        }

        // Validações comuns
        if (!this.formAg.pacienteId) {
          UI.toast('Selecione um paciente ou cadastre um novo', 'error');
          return;
        }
        if (!this.formAg.data) {
          UI.toast('Informe a data', 'error');
          return;
        }

        if (this.modalEditandoId) {
          await DB.updateAgendamento(this.modalEditandoId, {
            data: this.formAg.data,
            hora: this.formAg.hora,
            tipo: this.formAg.tipo,
            observacao: this.formAg.observacao
          });
          UI.toast('Agendamento atualizado', 'success');
        } else {
          await DB.createAgendamento({
            pacienteId: this.formAg.pacienteId,
            pacienteNome: this.pacienteSelecionado.nome,
            data: this.formAg.data,
            hora: this.formAg.hora,
            tipo: this.formAg.tipo,
            observacao: this.formAg.observacao
          });
          UI.toast('Agendamento criado', 'success');
        }
        this.fecharModal();
        await this.carregarAba();
        await this.carregarMetricas();
      } catch (e) {
        UI.toast('Erro ao salvar: ' + e.message, 'error');
      } finally {
        this.salvandoModal = false;
      }
    },

    // ========== Helpers de display ==========
    formatarData(iso) { return Agenda.formatarData(iso); },
    diaSemana(iso) { return Agenda.diaSemana(iso, true); },
    distanciaHoje(iso) { return Agenda.distanciaHoje(iso); },

    /** Classe CSS para destaque visual */
    classePorData(iso) {
      const hoje = Agenda.hojeIso();
      if (iso === hoje) return 'agenda-item-hoje';
      if (iso < hoje) return 'agenda-item-passado';
      return 'agenda-item-futuro';
    },

    iconePorTipo(tipo) {
      if (tipo === 'retorno') return '🔄';
      if (tipo === 'grupo') return '👥';
      if (tipo === 'consulta') return '🩺';
      return '📋';
    },

    renderAgenda(mount) {
      // template inline — montado pelo router
    }
  };
}

// Template HTML (gerado quando rota /agenda for ativada)
function renderAgendaTemplate() {
  return `
<div x-data="componenteAgenda()" x-init="init()">
  <div class="card mb-4">
    <h2 class="card-title">📅 Agenda</h2>

    <!-- Cards de métrica -->
    <div class="metricas-row" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 12px;">
      <div class="metrica-card" style="padding:12px; background:#dcfce7; border-radius:8px; text-align:center;">
        <div style="font-size:2em; font-weight:bold; color:#166534" x-text="metricas.hoje"></div>
        <div style="font-size:0.85em; color:#166534">hoje</div>
      </div>
      <div class="metrica-card" style="padding:12px; background:#fef3c7; border-radius:8px; text-align:center;">
        <div style="font-size:2em; font-weight:bold; color:#92400e" x-text="metricas.semana"></div>
        <div style="font-size:0.85em; color:#92400e">próximos 7 dias</div>
      </div>
      <div class="metrica-card" style="padding:12px; background:#dbeafe; border-radius:8px; text-align:center;">
        <div style="font-size:2em; font-weight:bold; color:#1e40af" x-text="metricas.mes"></div>
        <div style="font-size:0.85em; color:#1e40af">próximos 30 dias</div>
      </div>
      <div class="metrica-card" style="padding:12px; background:#fee2e2; border-radius:8px; text-align:center; cursor:pointer"
           @click="trocarAba('faltosos')">
        <div style="font-size:2em; font-weight:bold; color:#991b1b" x-text="metricas.faltosos"></div>
        <div style="font-size:0.85em; color:#991b1b">faltosos</div>
      </div>
    </div>

    <!-- Abas -->
    <div class="tabs" style="display:flex; gap:6px; margin-top: 16px; border-bottom: 1px solid #e5e7eb;">
      <button class="btn btn-sm" :style="aba === 'hoje' ? 'background:#166534;color:#fff' : ''" @click="trocarAba('hoje')">Hoje</button>
      <button class="btn btn-sm" :style="aba === 'semana' ? 'background:#166534;color:#fff' : ''" @click="trocarAba('semana')">7 dias</button>
      <button class="btn btn-sm" :style="aba === 'mes' ? 'background:#166534;color:#fff' : ''" @click="trocarAba('mes')">30 dias</button>
      <button class="btn btn-sm" :style="aba === 'faltosos' ? 'background:#991b1b;color:#fff' : ''" @click="trocarAba('faltosos')">⚠️ Faltosos</button>
      <button class="btn btn-primary btn-sm" style="margin-left:auto" @click="abrirNovoAgendamento()">+ Novo agendamento</button>
    </div>

    <!-- Lista -->
    <div class="agenda-lista mt-3">
      <div x-show="carregando" style="text-align:center; opacity:0.6; padding: 20px;">Carregando…</div>
      <div x-show="!carregando && agendamentos.length === 0" style="text-align:center; opacity:0.6; padding: 20px;">
        <span x-show="aba === 'faltosos'">Nenhum faltoso. 🎉</span>
        <span x-show="aba !== 'faltosos'">Nenhum agendamento neste período.</span>
      </div>
      <template x-for="ag in agendamentos" :key="ag.id">
        <div class="agenda-item card mb-2" :class="classePorData(ag.data)"
             style="padding: 12px; border-left: 4px solid #166534;">
          <div style="display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap;">
            <div style="flex:0 0 90px; text-align:center;">
              <div style="font-size:1.5em; font-weight:bold; color:#166534" x-text="ag.data.slice(8,10) + '/' + ag.data.slice(5,7)"></div>
              <div style="font-size:0.85em; opacity:0.7" x-text="diaSemana(ag.data)"></div>
              <div style="font-size:0.85em" x-text="ag.hora || ''"></div>
            </div>
            <div style="flex:1; min-width:200px;">
              <div style="font-weight:bold; cursor:pointer; color:#166534" @click="irParaPaciente(ag)" x-text="(ag.pacienteNome || '(sem nome)')"></div>
              <div style="font-size:0.9em; margin-top:4px;">
                <span x-text="iconePorTipo(ag.tipo) + ' ' + ag.tipo"></span>
                <span x-show="ag.observacao" style="opacity:0.8; margin-left:8px;" x-text="'· ' + ag.observacao"></span>
              </div>
              <div style="font-size:0.8em; opacity:0.6; margin-top:2px;" x-text="distanciaHoje(ag.data)"></div>
            </div>
            <div style="display:flex; gap:4px; flex-wrap:wrap;">
              <button class="btn btn-sm btn-primary" @click="atender(ag)" x-show="aba !== 'faltosos' || ag.status === 'marcado'">▶ Atender</button>
              <button class="btn btn-sm" @click="abrirEditarAgendamento(ag)">✏</button>
              <button class="btn btn-sm" @click="marcarFalta(ag)" x-show="aba === 'hoje' || aba === 'faltosos'" title="Marcar como faltou">⊘</button>
              <button class="btn btn-sm" @click="cancelar(ag)" title="Cancelar">×</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Modal de novo/editar agendamento -->
  <div x-show="modalAberto" x-cloak
       style="position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px;"
       @click.self="fecharModal()">
    <div class="card" style="max-width:500px; width:100%; max-height:90vh; overflow-y:auto;" @click.stop>
      <h3 class="card-title" x-text="modalEditandoId ? 'Editar agendamento' : 'Novo agendamento'"></h3>

      <div class="mt-3">
        <label class="text-sm" style="font-weight:600">Paciente</label>
        <input class="input" type="text" x-model="formAg.pacienteBusca" @input="buscarPaciente()"
               placeholder="Digite o nome do paciente…" :disabled="!!modalEditandoId || modoNovoPaciente">
        <div x-show="pacientesEncontrados.length > 0 && !modoNovoPaciente"
             style="background:#fff; border:1px solid #d1d5db; border-radius:6px; margin-top:4px; max-height:200px; overflow-y:auto;">
          <template x-for="p in pacientesEncontrados" :key="p.id">
            <div @click="selecionarPaciente(p)" style="padding:8px 12px; cursor:pointer; border-bottom: 1px solid #f3f4f6;">
              <strong x-text="p.nome"></strong>
              <small x-show="p.dataNascimento" x-text="' · ' + (p.dataNascimento || '')"></small>
            </div>
          </template>
        </div>

        <!-- Não achou? Cadastrar novo paciente inline -->
        <div x-show="buscou && pacientesEncontrados.length === 0 && !pacienteSelecionado && !modoNovoPaciente && formAg.pacienteBusca.trim().length >= 2"
             style="margin-top: 8px; padding: 10px; background: #fef3c7; border-radius: 6px; border-left: 3px solid #d97706;">
          <div style="font-size:0.9em; color:#92400e; margin-bottom:6px;">
            Nenhum paciente encontrado com esse nome.
          </div>
          <button type="button" class="btn btn-sm btn-primary" @click="iniciarCadastroNovo()">
            + Cadastrar <strong x-text="'&quot;' + formAg.pacienteBusca.trim() + '&quot;'"></strong> como novo paciente
          </button>
        </div>

        <!-- Cadastro mínimo de paciente novo -->
        <div x-show="modoNovoPaciente" x-cloak
             style="margin-top: 10px; padding: 12px; background: #f0fdf4; border-radius: 8px; border: 2px solid #166534;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <strong style="color:#166534">📝 Cadastro mínimo de paciente novo</strong>
            <button type="button" class="btn btn-sm" style="margin-left:auto" @click="cancelarCadastroNovo()">×</button>
          </div>
          <div style="font-size:0.85em; opacity:0.75; margin-bottom:10px;">
            Só o essencial para agendar. Complete o cadastro (endereço, CNS, antecedentes) na hora da consulta.
          </div>
          <div class="mt-2">
            <label class="text-sm" style="font-weight:600">Nome completo</label>
            <input class="input" type="text" x-model="novoPaciente.nome">
          </div>
          <div class="mt-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div>
              <label class="text-sm" style="font-weight:600">Data de nascimento</label>
              <input class="input" type="date" x-model="novoPaciente.dataNascimento">
            </div>
            <div>
              <label class="text-sm" style="font-weight:600">Sexo</label>
              <select class="input" x-model="novoPaciente.sexo">
                <option value="">—</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
                <option value="outro">Outro / não informado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-3" style="display:grid; grid-template-columns: 2fr 1fr; gap: 10px;">
        <div>
          <label class="text-sm" style="font-weight:600">Data</label>
          <input class="input" type="date" x-model="formAg.data">
        </div>
        <div>
          <label class="text-sm" style="font-weight:600">Hora</label>
          <input class="input" type="time" x-model="formAg.hora">
        </div>
      </div>

      <div class="mt-3">
        <label class="text-sm" style="font-weight:600">Tipo</label>
        <select class="input" x-model="formAg.tipo">
          <option value="consulta">🩺 Consulta</option>
          <option value="retorno">🔄 Retorno</option>
          <option value="grupo">👥 Grupo</option>
          <option value="outro">📋 Outro</option>
        </select>
      </div>

      <div class="mt-3">
        <label class="text-sm" style="font-weight:600">Observação</label>
        <textarea class="textarea" rows="2" x-model="formAg.observacao" placeholder="Motivo / contexto (opcional)"></textarea>
      </div>

      <div class="mt-4" style="display:flex; gap:8px; justify-content:flex-end;">
        <button class="btn" @click="fecharModal()" :disabled="salvandoModal">Cancelar</button>
        <button class="btn btn-primary" @click="salvarModal()" :disabled="salvandoModal">
          <span x-show="!salvandoModal" x-text="modalEditandoId ? 'Salvar alterações' : (modoNovoPaciente ? 'Cadastrar paciente e criar agendamento' : 'Criar agendamento')"></span>
          <span x-show="salvandoModal">Salvando…</span>
        </button>
      </div>
    </div>
  </div>
</div>
`;
}

window.componenteAgenda = componenteAgenda;
window.renderAgendaTemplate = renderAgendaTemplate;

/**
 * Renderiza a tela de agenda dentro de um container (usado pelo router).
 */
function renderAgenda(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">📅 Agenda</h1>
        <p class="page-subtitle">Próximas consultas e faltosos</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost" onclick="Router.navigate('/')">← Voltar</button>
      </div>
    </div>
    ${renderAgendaTemplate()}
  `;
}
window.renderAgenda = renderAgenda;
