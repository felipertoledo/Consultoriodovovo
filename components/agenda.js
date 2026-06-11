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
  <div class="ficha-head">
    <div class="ficha-id">
      <div class="ficha-nome">Agenda</div>
      <div class="ficha-sub">Próximas consultas, retornos e faltosos do território</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-primary" @click="abrirNovoAgendamento()">
        <svg class="icon"><use href="#i-plus"></use></svg>
        Novo agendamento
      </button>
    </div>
  </div>

  <!-- Abas com contagem (métricas e navegação unificadas) -->
  <div class="flex items-center gap-3 mb-4" style="flex-wrap: wrap">
    <div class="seg" role="tablist" aria-label="Período">
      <button :class="aba === 'hoje' ? 'on' : ''" @click="trocarAba('hoje')">
        Hoje <span class="text-mono" x-text="'· ' + metricas.hoje"></span>
      </button>
      <button :class="aba === 'semana' ? 'on' : ''" @click="trocarAba('semana')">
        7 dias <span class="text-mono" x-text="'· ' + metricas.semana"></span>
      </button>
      <button :class="aba === 'mes' ? 'on' : ''" @click="trocarAba('mes')">
        30 dias <span class="text-mono" x-text="'· ' + metricas.mes"></span>
      </button>
    </div>
    <button class="btn btn-sm" :class="aba === 'faltosos' ? 'btn-danger' : 'btn-ghost'"
            @click="trocarAba('faltosos')" style="border-radius: var(--radius-full)">
      <svg class="icon"><use href="#i-alert"></use></svg>
      Faltosos <span class="text-mono" x-text="metricas.faltosos"></span>
    </button>
  </div>

  <!-- Lista (ledger) -->
  <div class="folha">
    <div x-show="carregando" aria-hidden="true">
      <div class="skel" style="height: 56px; margin-bottom: 8px"></div>
      <div class="skel" style="height: 56px"></div>
    </div>
    <div x-show="!carregando && agendamentos.length === 0" class="empty-state" style="padding: var(--space-6) 0">
      <h3 x-show="aba === 'faltosos'">Nenhum faltoso</h3>
      <h3 x-show="aba !== 'faltosos'">Nenhum agendamento neste período</h3>
      <p x-show="aba !== 'faltosos'" class="text-sm muted mt-1">Crie um agendamento para vê-lo aparecer no trilho do dia.</p>
    </div>

    <div class="ledger" x-show="!carregando && agendamentos.length > 0">
      <template x-for="ag in agendamentos" :key="ag.id">
        <div class="ledger-item" :class="classePorData(ag.data)">
          <div class="ledger-date">
            <div style="font-weight: var(--weight-bold); color: var(--text-primary); font-size: var(--text-base)"
                 x-text="ag.data.slice(8,10) + '/' + ag.data.slice(5,7)"></div>
            <div x-text="diaSemana(ag.data)"></div>
            <div style="color: var(--color-primary-700); font-weight: var(--weight-semibold)" x-text="ag.hora || ''"></div>
          </div>
          <div class="ledger-body">
            <div style="font-weight: var(--weight-bold); cursor: pointer"
                 @click="irParaPaciente(ag)" x-text="(ag.pacienteNome || '(sem nome)')"></div>
            <div class="text-sm mt-1">
              <span class="snap-pill" x-text="ag.tipo"></span>
              <span x-show="ag.observacao" class="muted" style="margin-left: 8px" x-text="'· ' + ag.observacao"></span>
            </div>
            <div class="text-xs muted mt-1" x-text="distanciaHoje(ag.data)"></div>
          </div>
          <div class="flex gap-1" style="flex-wrap: wrap; align-self: center">
            <button class="btn btn-sm btn-primary" @click="atender(ag)"
                    x-show="aba !== 'faltosos' || ag.status === 'marcado'">Atender</button>
            <button class="btn btn-sm btn-ghost btn-icon" @click="abrirEditarAgendamento(ag)" title="Editar">
              <svg class="icon"><use href="#i-edit"></use></svg>
            </button>
            <button class="btn btn-sm btn-ghost" @click="marcarFalta(ag)"
                    x-show="aba === 'hoje' || aba === 'faltosos'" title="Marcar como faltou">Faltou</button>
            <button class="btn btn-sm btn-ghost btn-icon" @click="cancelar(ag)" title="Cancelar">
              <svg class="icon"><use href="#i-x"></use></svg>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Modal de novo/editar agendamento -->
  <div x-show="modalAberto" x-cloak class="modal-overlay" @click.self="fecharModal()">
    <div class="modal-sheet" style="max-width: 520px" @click.stop>
      <div class="modal-head">
        <h3 x-text="modalEditandoId ? 'Editar agendamento' : 'Novo agendamento'"></h3>
        <button class="btn btn-sm btn-icon btn-ghost" @click="fecharModal()">
          <svg class="icon"><use href="#i-x"></use></svg>
        </button>
      </div>

      <div>
        <label class="label text-sm">Paciente</label>
        <input class="input" type="text" x-model="formAg.pacienteBusca" @input="buscarPaciente()"
               placeholder="Digite o nome do paciente…" :disabled="!!modalEditandoId || modoNovoPaciente">
        <div x-show="pacientesEncontrados.length > 0 && !modoNovoPaciente" class="picker-list">
          <template x-for="p in pacientesEncontrados" :key="p.id">
            <div class="picker-item" @click="selecionarPaciente(p)">
              <strong x-text="p.nome"></strong>
              <small class="muted" x-show="p.dataNascimento" x-text="p.dataNascimento || ''"></small>
            </div>
          </template>
        </div>

        <!-- Não achou? Cadastrar novo paciente inline -->
        <div x-show="buscou && pacientesEncontrados.length === 0 && !pacienteSelecionado && !modoNovoPaciente && formAg.pacienteBusca.trim().length >= 2"
             class="lab-warn mt-2" style="flex-direction: column; align-items: flex-start; gap: 8px">
          <span>Nenhum paciente encontrado com esse nome.</span>
          <button type="button" class="btn btn-sm btn-primary" @click="iniciarCadastroNovo()">
            <svg class="icon"><use href="#i-plus"></use></svg>
            Cadastrar <strong x-text="'&quot;' + formAg.pacienteBusca.trim() + '&quot;'"></strong> como novo paciente
          </button>
        </div>

        <!-- Cadastro mínimo de paciente novo -->
        <div x-show="modoNovoPaciente" x-cloak class="picker-pop mt-3">
          <div class="flex items-center gap-2 mb-2">
            <svg class="icon" style="width: 14px; height: 14px; color: var(--color-primary-700)"><use href="#i-user-plus"></use></svg>
            <strong>Cadastro mínimo de paciente novo</strong>
            <button type="button" class="btn btn-sm btn-icon btn-ghost" style="margin-left:auto" @click="cancelarCadastroNovo()">
              <svg class="icon"><use href="#i-x"></use></svg>
            </button>
          </div>
          <p class="text-xs muted mb-3">
            Só o essencial para agendar. Complete o cadastro (endereço, CNS, antecedentes) na hora da consulta.
          </p>
          <div>
            <label class="label text-sm">Nome completo</label>
            <input class="input" type="text" x-model="novoPaciente.nome">
          </div>
          <div class="mt-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div>
              <label class="label text-sm">Data de nascimento</label>
              <input class="input" type="date" x-model="novoPaciente.dataNascimento">
            </div>
            <div>
              <label class="label text-sm">Sexo</label>
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
          <label class="label text-sm">Data</label>
          <input class="input" type="date" x-model="formAg.data">
        </div>
        <div>
          <label class="label text-sm">Hora</label>
          <input class="input" type="time" x-model="formAg.hora">
        </div>
      </div>

      <div class="mt-3">
        <label class="label text-sm">Tipo</label>
        <select class="input" x-model="formAg.tipo">
          <option value="consulta">Consulta</option>
          <option value="retorno">Retorno</option>
          <option value="grupo">Grupo</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      <div class="mt-3">
        <label class="label text-sm">Observação</label>
        <textarea class="textarea" rows="2" x-model="formAg.observacao" placeholder="Motivo / contexto (opcional)"></textarea>
      </div>

      <div class="mt-4 flex gap-2 justify-between" style="justify-content: flex-end">
        <button class="btn btn-secondary" @click="fecharModal()" :disabled="salvandoModal">Cancelar</button>
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
  container.innerHTML = renderAgendaTemplate();
}
window.renderAgenda = renderAgenda;
