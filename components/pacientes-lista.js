/* ============================================================
   pacientes-lista.js — Listagem e busca de pacientes
   ============================================================ */

function renderPacientesLista(container) {
  container.innerHTML = `
    <div x-data="pacientesLista()" x-init="load()">
      <div class="page-header">
        <div>
          <h1 class="page-title">Pacientes</h1>
          <p class="page-subtitle">
            <span x-text="filtered.length"></span> de <span x-text="all.length"></span> pacientes
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" @click="$dispatch('navigate', '/paciente/novo')">
            + Novo paciente
          </button>
        </div>
      </div>

      <div class="search-box">
        <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" class="input" placeholder="Buscar por nome…"
               x-model="search" @input="filter()">
      </div>

      <div x-show="loading" class="empty-state">
        <div class="spinner" style="margin: 0 auto"></div>
        <p class="mt-4">Decifrando registros…</p>
      </div>

      <div x-show="!loading && filtered.length === 0 && all.length === 0" class="empty-state">
        <h3>Nenhum paciente cadastrado ainda</h3>
        <p>Comece adicionando o primeiro paciente.</p>
        <button class="btn btn-primary mt-4" @click="$dispatch('navigate', '/paciente/novo')">
          + Cadastrar primeiro paciente
        </button>
      </div>

      <div x-show="!loading && filtered.length === 0 && all.length > 0" class="empty-state">
        <h3>Nenhum paciente encontrado</h3>
        <p>Tente outro termo de busca.</p>
      </div>

      <div class="patient-list" x-show="!loading && filtered.length > 0">
        <template x-for="p in filtered" :key="p.id">
          <div class="patient-card" @click="open(p.id)">
            <div class="patient-avatar"
                 :style="'background: ' + avatarColor(p.nome)"
                 x-text="initials(p.nome)"></div>
            <div class="patient-info">
              <div class="patient-name" x-text="p.nome"></div>
              <div class="patient-meta">
                <span x-show="p.dataNascimento" x-text="age(p.dataNascimento) + ' anos'"></span>
                <span x-show="p.dataNascimento && p.sexo"> · </span>
                <span x-show="p.sexo" x-text="p.sexo"></span>
                <span x-show="p.whatsapp"> · </span>
                <span x-show="p.whatsapp" x-text="p.whatsapp"></span>
              </div>
            </div>
            <div class="text-xs muted text-right" style="flex-shrink: 0">
              <div>Atualizado</div>
              <div x-text="formatDate(p.updatedAt)"></div>
            </div>
          </div>
        </template>
      </div>
    </div>
  `;
}

function pacientesLista() {
  return {
    all: [],
    filtered: [],
    search: '',
    loading: true,

    async load() {
      this.loading = true;
      try {
        this.all = await DB.listPacientes();
        this.filtered = [...this.all];
      } catch (e) {
        UI.toast('Erro ao carregar: ' + e.message, 'error');
      } finally {
        this.loading = false;
      }
    },

    filter() {
      const q = (this.search || '').toLowerCase().trim();
      if (!q) {
        this.filtered = [...this.all];
        return;
      }
      this.filtered = this.all.filter(p =>
        (p.nome || '').toLowerCase().includes(q)
      );
    },

    open(id) {
      Router.navigate('/paciente/' + id);
    },

    age(d) { return UI.calculateAge(d); },
    initials(n) { return UI.getInitials(n); },
    avatarColor(n) { return UI.avatarColorFromName(n); },
    formatDate(d) {
      if (!d) return '—';
      const date = new Date(d);
      return date.toLocaleDateString('pt-BR');
    }
  };
}

window.renderPacientesLista = renderPacientesLista;
window.pacientesLista = pacientesLista;
