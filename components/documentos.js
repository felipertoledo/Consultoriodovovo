/* ============================================================
   documentos.js — Tela de geração de documentos PDF
   Acessada a partir da consulta ou do perfil do paciente
   ============================================================ */

function renderDocumentos(container, pacienteId, tipo) {
  container.innerHTML = `
    <div x-data="documentosScreen(${parseInt(pacienteId, 10)}, '${tipo || 'menu'}')" x-init="load()">
      <div class="ficha-head">
        <button class="btn btn-ghost btn-icon" @click="voltar()" title="Voltar">
          <svg class="icon" style="transform: rotate(180deg)"><use href="#i-arrow-right"></use></svg>
        </button>
        <div class="ficha-id">
          <div class="ficha-nome" x-text="titulo"></div>
          <div class="ficha-sub">
            <strong x-text="paciente.nome"></strong>
            <span x-show="paciente.dataNascimento" x-text="calcAge(paciente.dataNascimento) + ' anos'"></span>
          </div>
        </div>
      </div>

      <!-- Menu de seleção de tipo -->
      <div x-show="tipo === 'menu'" class="folha">
        <h3 class="sec-title mb-4">Selecione o tipo de documento</h3>

        <div class="minimap-title" style="padding-left: 0; margin-top: var(--space-2)">Prescrições</div>
        <div class="doc-tiles mb-5">
          <button class="doc-tile" @click="abrirTipo('receita')">
            <svg class="icon"><use href="#i-rx"></use></svg>
            <span class="dt-nome">Receituário simples</span>
            <span class="dt-sub">Medicações comuns sem controle especial</span>
          </button>
          <button class="doc-tile" @click="abrirTipo('controle')">
            <svg class="icon"><use href="#i-clipboard"></use></svg>
            <span class="dt-nome">Controle especial</span>
            <span class="dt-sub">Branco em 2 vias — antimicrobianos, retinoides (Lista C1)</span>
          </button>
          <button class="doc-tile" @click="abrirTipo('azul')">
            <svg class="icon"><use href="#i-pill"></use></svg>
            <span class="dt-nome">Azul B1/B2</span>
            <span class="dt-sub">Psicotrópicos — benzodiazepínicos, hipnóticos (Lista B)</span>
          </button>
        </div>

        <div class="minimap-title" style="padding-left: 0">Atestados e solicitações</div>
        <div class="doc-tiles mb-5">
          <button class="doc-tile" @click="abrirTipo('atestado')">
            <svg class="icon"><use href="#i-file"></use></svg>
            <span class="dt-nome">Atestado médico</span>
            <span class="dt-sub">Comparecimento ou afastamento</span>
          </button>
          <button class="doc-tile" @click="abrirTipo('exames')">
            <svg class="icon"><use href="#i-flask"></use></svg>
            <span class="dt-nome">Solicitação de exames</span>
            <span class="dt-sub">Laboratório, imagem e procedimentos</span>
          </button>
        </div>

        <div class="minimap-title" style="padding-left: 0">Documentos clínicos e legais</div>
        <div class="doc-tiles">
          <button class="doc-tile" @click="abrirTipo('relatorio')">
            <svg class="icon"><use href="#i-file"></use></svg>
            <span class="dt-nome">Relatório clínico</span>
            <span class="dt-sub">Para outros profissionais, parecer, encaminhamento</span>
          </button>
          <button class="doc-tile" @click="abrirTipo('prontuario')">
            <svg class="icon"><use href="#i-clipboard"></use></svg>
            <span class="dt-nome">Cópia do prontuário</span>
            <span class="dt-sub">Cópia integral para o paciente (LGPD art. 18, IV)</span>
          </button>
          <button class="doc-tile" @click="abrirTipo('consulta-impressa')">
            <svg class="icon"><use href="#i-print"></use></svg>
            <span class="dt-nome">Consulta para impressão</span>
            <span class="dt-sub">PDF completo de uma consulta com espaço para assinar à mão e arquivar</span>
          </button>
        </div>
      </div>

      <!-- ============== FORMULÁRIO: RECEITUÁRIO ============== -->
      <div x-show="tipo === 'receita'">
        <div class="card mb-4">
          <h3 class="card-title mb-3">Alerta clínico para o rodapé do documento</h3>
          <p class="text-sm muted mb-3">
            Alergias conhecidas e antecedentes graves. Aparece destacado em amarelo no PDF para
            facilitar resposta em emergências.
          </p>
          <textarea class="textarea auto-grow" rows="2" x-model="dados.alertaClinico"
                    @input="autoGrow($event.target)"
                    :placeholder="alertaSugerido"></textarea>
          <div class="flex gap-2 mt-2">
            <button class="btn btn-ghost text-sm" @click="usarAlertaSugerido()" x-show="alertaSugerido">
              Usar alertas do prontuário
            </button>
          </div>
        </div>

        <div class="card mb-4">
          <div class="flex justify-between items-center mb-3" style="flex-wrap: wrap; gap: var(--space-2)">
            <h3 class="card-title">Medicações</h3>
            <button class="btn btn-secondary text-sm" @click="adicionarMedicacao()">+ Adicionar medicação</button>
          </div>

          <template x-for="(m, i) in dados.medicacoes" :key="i">
            <div class="card mt-3" style="background: var(--bg-sunken); padding: var(--space-4)">
              <div class="flex justify-between items-center mb-2">
                <strong x-text="'Medicação ' + (i + 1)"></strong>
                <button class="btn btn-ghost text-sm" @click="removerMedicacao(i)" style="color: var(--color-danger)">
                  Remover
                </button>
              </div>

              <div class="form-group" style="position: relative">
                <label class="label text-sm">Nome e dose</label>
                <input class="input" x-model="m.nome"
                       @input="atualizarSugestoes(i)"
                       @keydown.escape="fecharSugestoes(i)"
                       placeholder="Ex: Losartana 50mg">
                <div x-show="sugestoesPorIndex[i] && sugestoesPorIndex[i].length > 0"
                     class="autocomplete-list" x-cloak>
                  <template x-for="(s, idx) in sugestoesPorIndex[i]" :key="idx">
                    <div class="autocomplete-item" @click="escolherSugestao(i, s)" x-text="s"></div>
                  </template>
                </div>
              </div>

              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="label text-sm">Posologia (como tomar)</label>
                  <input class="input" x-model="m.posologia"
                         placeholder="Ex: 1 comprimido pela manhã, por 30 dias">
                </div>
                <div class="form-group">
                  <label class="label text-sm">Quantidade (para a farmácia)</label>
                  <input class="input" x-model="m.quantidade"
                         placeholder="Ex: 30 comprimidos">
                </div>
              </div>
            </div>
          </template>

          <div x-show="dados.medicacoes.length === 0" class="empty-state">
            <p>Nenhuma medicação adicionada.</p>
            <button class="btn btn-primary mt-3" @click="adicionarMedicacao()">+ Adicionar a primeira</button>
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Orientações ao paciente <span class="hint" style="font-weight: normal; color: var(--text-muted)">(aparece antes da assinatura)</span></h3>
          <textarea class="textarea auto-grow" rows="3" x-model="dados.orientacoes"
                    @input="autoGrow($event.target)"
                    placeholder="Ex: Tomar a medicação com bastante água. Retornar em 30 dias com exames de controle. Procurar a unidade se sentir tontura, fraqueza ou dor de cabeça forte."></textarea>
        </div>

        <div class="flex gap-2 justify-between" style="flex-wrap: wrap">
          <button class="btn btn-ghost" @click="tipo = 'menu'">Outro tipo</button>
          <div class="flex gap-2" style="flex-wrap: wrap">
            <a class="btn btn-secondary" href="https://memed.com.br/login" target="_blank" rel="noopener"
               title="Abrir Memed em nova aba (sem integração)">
              🔗 Abrir Memed
            </a>
            <button class="btn btn-primary" @click="gerarReceita()"
                    :disabled="dados.medicacoes.length === 0">
              👁️ Pré-visualizar PDF
            </button>
          </div>
        </div>
      </div>

      <!-- ============== FORMULÁRIO: ATESTADO ============== -->
      <div x-show="tipo === 'atestado'">
        <div class="card mb-4">
          <h3 class="card-title mb-3">Tipo de atestado</h3>
          <div class="form-row cols-2">
            <button class="btn" :class="dados.tipo === 'comparecimento' ? 'btn-primary' : 'btn-secondary'"
                    @click="dados.tipo = 'comparecimento'">
              ✓ Comparecimento
            </button>
            <button class="btn" :class="dados.tipo === 'afastamento' ? 'btn-primary' : 'btn-secondary'"
                    @click="dados.tipo = 'afastamento'">
              🛏️ Afastamento
            </button>
          </div>
        </div>

        <div class="card mb-4" x-show="dados.tipo === 'comparecimento'">
          <h3 class="card-title mb-3">Detalhes do comparecimento</h3>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="label">Data do comparecimento</label>
              <input type="date" class="input" x-model="dados.dataConsulta">
            </div>
            <div class="form-group">
              <label class="label">Horário</label>
              <input class="input" x-model="dados.horario" placeholder="Ex: 09:30">
            </div>
          </div>
        </div>

        <div class="card mb-4" x-show="dados.tipo === 'afastamento'">
          <h3 class="card-title mb-3">Detalhes do afastamento</h3>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="label">Dias de afastamento</label>
              <input type="number" min="1" max="30" class="input" x-model.number="dados.dias">
            </div>
            <div class="form-group">
              <label class="label">A partir de</label>
              <input type="date" class="input" x-model="dados.dataInicio">
            </div>
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">CID-10 (opcional)</h3>
          <p class="text-sm muted mb-3">
            <strong>Atenção:</strong> só inclua o CID com consentimento expresso do paciente.
            O paciente tem direito de receber atestado sem CID (Resolução CFM 1.658/2002).
          </p>
          <div class="form-group">
            <label class="flex items-center gap-2" style="cursor: pointer">
              <input type="checkbox" x-model="dados.incluirCID">
              <span>Incluir CID no atestado (paciente consentiu)</span>
            </label>
          </div>
          <div class="form-group" x-show="dados.incluirCID">
            <label class="label">Código CID-10</label>
            <input class="input" x-model="dados.cid" placeholder="Ex: J00 (resfriado comum)">
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Observação adicional (opcional)</h3>
          <textarea class="textarea auto-grow" rows="2" x-model="dados.observacao"
                    @input="autoGrow($event.target)"
                    placeholder="Ex: Deve evitar esforço físico. Necessita acompanhante."></textarea>
        </div>

        <div class="flex gap-2 justify-between" style="flex-wrap: wrap">
          <button class="btn btn-ghost" @click="tipo = 'menu'">Outro tipo</button>
          <button class="btn btn-primary" @click="gerarAtestado()">
            👁️ Pré-visualizar PDF
          </button>
        </div>
      </div>

      <!-- ============== FORMULÁRIO: EXAMES ============== -->
      <div x-show="tipo === 'exames'">
        <div class="card mb-4">
          <h3 class="card-title mb-3">Alerta clínico (alergias, antecedentes graves)</h3>
          <textarea class="textarea auto-grow" rows="2" x-model="dados.alertaClinico"
                    @input="autoGrow($event.target)"
                    :placeholder="alertaSugerido"></textarea>
          <button class="btn btn-ghost text-sm mt-2" @click="usarAlertaSugerido()" x-show="alertaSugerido">
            Usar alertas do prontuário
          </button>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Hipótese diagnóstica / Justificativa</h3>
          <input class="input" x-model="dados.hipotese"
                 placeholder="Ex: investigação de cefaleia recorrente, controle de HAS, rastreamento">
        </div>

        <template x-for="cat in categoriasExames" :key="cat.key">
          <div class="card mb-4">
            <div class="flex justify-between items-center mb-3" style="flex-wrap: wrap; gap: var(--space-2)">
              <h3 class="card-title" x-text="cat.titulo"></h3>
            </div>

            <!-- Chips sugeridos -->
            <div class="text-xs muted mb-2">Sugestões frequentes (clique para adicionar):</div>
            <div class="chips-container mb-3">
              <template x-for="sug in cat.sugestoes" :key="sug">
                <button class="chip" @click="adicionarExame(cat.key, sug)" x-text="sug"></button>
              </template>
            </div>

            <!-- Campo texto livre -->
            <div class="form-group">
              <input class="input" x-model="inputsExame[cat.key]"
                     @keydown.enter.prevent="adicionarExameTexto(cat.key)"
                     placeholder="Digite e pressione Enter para adicionar">
            </div>

            <!-- Lista de exames adicionados -->
            <div class="chips-container" x-show="dados.exames[cat.key].length > 0">
              <template x-for="(ex, i) in dados.exames[cat.key]" :key="i">
                <div class="chip chip-removable">
                  <span x-text="ex"></span>
                  <button @click="removerExame(cat.key, i)" style="margin-left: 6px; opacity: 0.6">×</button>
                </div>
              </template>
            </div>
          </div>
        </template>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Orientações ao paciente (opcional)</h3>
          <textarea class="textarea auto-grow" rows="2" x-model="dados.orientacoes"
                    @input="autoGrow($event.target)"
                    placeholder="Ex: Jejum de 12h para exames de sangue. Trazer resultados na próxima consulta."></textarea>
        </div>

        <div class="flex gap-2 justify-between" style="flex-wrap: wrap">
          <button class="btn btn-ghost" @click="tipo = 'menu'">Outro tipo</button>
          <button class="btn btn-primary" @click="gerarExames()"
                  :disabled="totalExames === 0">
            👁️ Pré-visualizar PDF
          </button>
        </div>
      </div>

      <!-- ============== FORMULÁRIO: RECEITUÁRIO CONTROLE ESPECIAL ============== -->
      <div x-show="tipo === 'controle'">
        <div class="alert alert-warning">
          <div>
            <strong>Receituário de controle especial (branco em 2 vias).</strong>
            Aplica-se a antimicrobianos, retinoides, anticonvulsivantes específicos e demais
            substâncias da Lista C1 da Portaria 344/98. O PDF gera as duas vias na mesma página
            (com linha de recorte) para entrega e farmácia.
          </div>
        </div>

        <div class="card mb-4">
          <div class="flex justify-between items-center mb-3" style="flex-wrap: wrap; gap: var(--space-2)">
            <h3 class="card-title">Medicações</h3>
            <button class="btn btn-secondary text-sm" @click="adicionarMedicacao()">+ Adicionar</button>
          </div>
          <template x-for="(m, i) in dados.medicacoes" :key="i">
            <div class="card mt-3" style="background: var(--bg-sunken); padding: var(--space-4)">
              <div class="flex justify-between items-center mb-2">
                <strong x-text="'Medicação ' + (i + 1)"></strong>
                <button class="btn btn-ghost text-sm" @click="removerMedicacao(i)" style="color: var(--color-danger)">Remover</button>
              </div>
              <div class="form-group" style="position: relative">
                <label class="label text-sm">Nome e dose</label>
                <input class="input" x-model="m.nome"
                       @input="atualizarSugestoes(i)" @keydown.escape="fecharSugestoes(i)"
                       placeholder="Ex: Amoxicilina 500mg">
                <div x-show="sugestoesPorIndex[i] && sugestoesPorIndex[i].length > 0" class="autocomplete-list" x-cloak>
                  <template x-for="(s, idx) in sugestoesPorIndex[i]" :key="idx">
                    <div class="autocomplete-item" @click="escolherSugestao(i, s)" x-text="s"></div>
                  </template>
                </div>
              </div>
              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="label text-sm">Posologia</label>
                  <input class="input" x-model="m.posologia" placeholder="Ex: 1 cápsula a cada 8h por 7 dias">
                </div>
                <div class="form-group">
                  <label class="label text-sm">Quantidade</label>
                  <input class="input" x-model="m.quantidade" placeholder="Ex: 21 cápsulas">
                </div>
              </div>
            </div>
          </template>
          <div x-show="dados.medicacoes.length === 0" class="empty-state">
            <p>Nenhuma medicação adicionada.</p>
            <button class="btn btn-primary mt-3" @click="adicionarMedicacao()">+ Adicionar a primeira</button>
          </div>
        </div>

        <div class="flex gap-2 justify-between" style="flex-wrap: wrap">
          <button class="btn btn-ghost" @click="tipo = 'menu'">Outro tipo</button>
          <div class="flex gap-2" style="flex-wrap: wrap">
            <a class="btn btn-secondary" href="https://memed.com.br/login" target="_blank" rel="noopener"
               title="Abrir Memed em nova aba (sem integração)">
              🔗 Abrir Memed
            </a>
            <button class="btn btn-primary" @click="gerarControle()" :disabled="dados.medicacoes.length === 0">
              👁️ Pré-visualizar PDF
            </button>
          </div>
        </div>
      </div>

      <!-- ============== FORMULÁRIO: RECEITUÁRIO AZUL B1/B2 ============== -->
      <div x-show="tipo === 'azul'">
        <div class="alert alert-info">
          <div>
            <strong>Receituário azul — Notificação de Receita Lista B.</strong>
            Para benzodiazepínicos, hipnóticos e outras substâncias psicotrópicas da Lista B
            da Portaria 344/98. O documento sai com fundo azul claro e campo para identificação
            do comprador na farmácia.
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Alerta clínico</h3>
          <textarea class="textarea auto-grow" rows="2" x-model="dados.alertaClinico"
                    @input="autoGrow($event.target)"
                    :placeholder="alertaSugerido"></textarea>
          <button class="btn btn-ghost text-sm mt-2" @click="usarAlertaSugerido()" x-show="alertaSugerido">
            Usar alertas do prontuário
          </button>
        </div>

        <div class="card mb-4">
          <div class="flex justify-between items-center mb-3" style="flex-wrap: wrap; gap: var(--space-2)">
            <h3 class="card-title">Medicações</h3>
            <button class="btn btn-secondary text-sm" @click="adicionarMedicacao()">+ Adicionar</button>
          </div>
          <template x-for="(m, i) in dados.medicacoes" :key="i">
            <div class="card mt-3" style="background: var(--bg-sunken); padding: var(--space-4)">
              <div class="flex justify-between items-center mb-2">
                <strong x-text="'Medicação ' + (i + 1)"></strong>
                <button class="btn btn-ghost text-sm" @click="removerMedicacao(i)" style="color: var(--color-danger)">Remover</button>
              </div>
              <div class="form-group" style="position: relative">
                <label class="label text-sm">Nome e dose</label>
                <input class="input" x-model="m.nome"
                       @input="atualizarSugestoes(i)" @keydown.escape="fecharSugestoes(i)"
                       placeholder="Ex: Clonazepam 2mg">
                <div x-show="sugestoesPorIndex[i] && sugestoesPorIndex[i].length > 0" class="autocomplete-list" x-cloak>
                  <template x-for="(s, idx) in sugestoesPorIndex[i]" :key="idx">
                    <div class="autocomplete-item" @click="escolherSugestao(i, s)" x-text="s"></div>
                  </template>
                </div>
              </div>
              <div class="form-row cols-2">
                <div class="form-group">
                  <label class="label text-sm">Posologia</label>
                  <input class="input" x-model="m.posologia" placeholder="Ex: 1 comprimido ao deitar, por 30 dias">
                </div>
                <div class="form-group">
                  <label class="label text-sm">Quantidade</label>
                  <input class="input" x-model="m.quantidade" placeholder="Ex: 30 comprimidos">
                </div>
              </div>
            </div>
          </template>
          <div x-show="dados.medicacoes.length === 0" class="empty-state">
            <p>Nenhuma medicação adicionada.</p>
            <button class="btn btn-primary mt-3" @click="adicionarMedicacao()">+ Adicionar a primeira</button>
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Orientações ao paciente</h3>
          <textarea class="textarea auto-grow" rows="2" x-model="dados.orientacoes"
                    @input="autoGrow($event.target)"
                    placeholder="Ex: Evitar associação com álcool. Não dirigir após o uso. Retornar em 30 dias."></textarea>
        </div>

        <div class="flex gap-2 justify-between" style="flex-wrap: wrap">
          <button class="btn btn-ghost" @click="tipo = 'menu'">Outro tipo</button>
          <div class="flex gap-2" style="flex-wrap: wrap">
            <a class="btn btn-secondary" href="https://memed.com.br/login" target="_blank" rel="noopener"
               title="Abrir Memed em nova aba (sem integração)">
              🔗 Abrir Memed
            </a>
            <button class="btn btn-primary" @click="gerarAzul()" :disabled="dados.medicacoes.length === 0">
              👁️ Pré-visualizar PDF
            </button>
          </div>
        </div>
      </div>

      <!-- ============== FORMULÁRIO: RELATÓRIO CLÍNICO ============== -->
      <div x-show="tipo === 'relatorio'">
        <div class="card mb-4">
          <h3 class="card-title mb-3">Destinatário</h3>
          <input class="input" x-model="relatorio.destinatario"
                 placeholder='Ex: "Cardiologista da rede", "Dr. João Silva", "A quem possa interessar"'>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Alerta clínico</h3>
          <textarea class="textarea auto-grow" rows="2" x-model="dados.alertaClinico"
                    @input="autoGrow($event.target)" :placeholder="alertaSugerido"></textarea>
          <button class="btn btn-ghost text-sm mt-2" @click="usarAlertaSugerido()" x-show="alertaSugerido">
            Usar alertas do prontuário
          </button>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Antecedentes relevantes</h3>
          <textarea class="textarea auto-grow" rows="3" x-model="relatorio.antecedentes"
                    @input="autoGrow($event.target)"
                    placeholder="Ex: HAS há 15 anos em uso de losartana. DM2 há 10 anos. IAM em 2019."></textarea>
          <button class="btn btn-ghost text-sm mt-2" @click="preencherDeUltimaConsulta()" x-show="ultimaConsultaCarregada">
            Preencher a partir da última consulta
          </button>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Medicações em uso</h3>
          <textarea class="textarea auto-grow" rows="3" x-model="relatorio.medicacoesUso"
                    @input="autoGrow($event.target)"
                    placeholder="Liste as medicações em uso contínuo com dose e posologia"></textarea>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Quadro clínico atual</h3>
          <textarea class="textarea auto-grow" rows="4" x-model="relatorio.quadroAtual"
                    @input="autoGrow($event.target)"
                    placeholder="Descreva o motivo do contato e a evolução do quadro"></textarea>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Achados do exame</h3>
          <textarea class="textarea auto-grow" rows="3" x-model="relatorio.exame"
                    @input="autoGrow($event.target)"
                    placeholder="Sinais vitais, exame físico relevante, exame psíquico se aplicável"></textarea>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Hipóteses diagnósticas</h3>
          <textarea class="textarea auto-grow" rows="2" x-model="relatorio.hipoteses"
                    @input="autoGrow($event.target)"
                    placeholder="Ex: 1. Cefaleia tensional crônica. 2. HAS de difícil controle."></textarea>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Conduta realizada</h3>
          <textarea class="textarea auto-grow" rows="3" x-model="relatorio.conduta"
                    @input="autoGrow($event.target)"
                    placeholder="O que foi feito, exames solicitados, prescrições"></textarea>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Solicitação / motivo do encaminhamento</h3>
          <textarea class="textarea auto-grow" rows="2" x-model="relatorio.solicitacao"
                    @input="autoGrow($event.target)"
                    placeholder="Ex: avaliação cardiológica para investigação de palpitações"></textarea>
        </div>

        <div class="flex gap-2 justify-between" style="flex-wrap: wrap">
          <button class="btn btn-ghost" @click="tipo = 'menu'">Outro tipo</button>
          <button class="btn btn-primary" @click="gerarRelatorio()">👁️ Pré-visualizar PDF</button>
        </div>
      </div>

      <!-- ============== FORMULÁRIO: CÓPIA DO PRONTUÁRIO ============== -->
      <div x-show="tipo === 'prontuario'">
        <div class="alert alert-info">
          <div>
            <strong>Cópia integral do prontuário.</strong>
            Gera um documento completo com todas as consultas registradas para entrega ao paciente,
            conforme direito previsto na LGPD (Art. 18, II e IV) e Lei 13.787/2018.
          </div>
        </div>

        <div class="card mb-4">
          <h3 class="card-title mb-3">Resumo do prontuário</h3>
          <p class="text-sm mb-2">
            <strong>Paciente:</strong> <span x-text="paciente.nome"></span>
          </p>
          <p class="text-sm mb-2">
            <strong>Total de consultas registradas:</strong> <span x-text="totalConsultasPaciente"></span>
          </p>
          <p class="text-sm muted mt-3">
            O PDF inclui todos os dados clínicos das consultas: queixa, HPMA, antecedentes,
            exame físico, exame psíquico, hipóteses, conduta e retorno. Cabeçalho com identificação
            completa do paciente e declaração de cópia fiel.
          </p>
        </div>

        <div class="flex gap-2 justify-between" style="flex-wrap: wrap">
          <button class="btn btn-ghost" @click="tipo = 'menu'">Outro tipo</button>
          <button class="btn btn-primary" @click="gerarProntuario()">👁️ Pré-visualizar PDF</button>
        </div>
      </div>

      <!-- ============== FORMULÁRIO: CONSULTA PARA IMPRESSÃO ============== -->
      <div x-show="tipo === 'consulta-impressa'">
        <div class="card mb-4">
          <h3 class="card-title mb-2">Consulta para impressão e arquivo físico</h3>
          <p class="text-sm muted mb-4">
            Gera um PDF completo com TODOS os dados de uma consulta específica, formatado
            para imprimir, assinar à mão e arquivar fisicamente. Útil quando o serviço exige
            cópia em papel no prontuário físico.
          </p>

          <div class="form-group">
            <label class="label">Selecione a consulta</label>
            <select class="select" x-model="consultaImpressaoId">
              <option value="">— Escolha uma consulta —</option>
              <template x-for="c in todasConsultas" :key="c.id">
                <option :value="c.id" x-text="formatarOpcaoConsulta(c)"></option>
              </template>
            </select>
            <div class="field-help" x-show="todasConsultas.length === 0">
              Este paciente ainda não tem consultas registradas.
            </div>
          </div>
        </div>

        <div class="flex gap-2 justify-between" style="flex-wrap: wrap">
          <button class="btn btn-ghost" @click="tipo = 'menu'">Outro tipo</button>
          <button class="btn btn-primary" @click="gerarConsultaImpressao()"
                  :disabled="!consultaImpressaoId">
            👁️ Pré-visualizar PDF
          </button>
        </div>
      </div>
    </div>
  `;
}

function documentosScreen(pacienteId, tipoInicial) {
  return {
    pacienteId: pacienteId,
    paciente: { nome: '', dataNascimento: '' },
    tipo: tipoInicial || 'menu',
    sugestoesPorIndex: {},
    inputsExame: { sangue: '', urina: '', imagem: '', outros: '' },
    alertaSugerido: '',
    ultimaConsultaCarregada: null,
    totalConsultasPaciente: 0,
    todasConsultas: [],
    consultaImpressaoId: '',

    dados: {
      // Receita / Controle / Azul
      alertaClinico: '',
      medicacoes: [],
      orientacoes: '',
      // Atestado
      tipo: 'comparecimento',
      dataConsulta: new Date().toISOString().slice(0, 10),
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      dias: 1,
      dataInicio: new Date().toISOString().slice(0, 10),
      incluirCID: false,
      cid: '',
      observacao: '',
      // Exames
      hipotese: '',
      exames: { sangue: [], urina: [], imagem: [], outros: [] }
    },

    // Estado próprio do relatório clínico
    relatorio: {
      destinatario: '',
      antecedentes: '',
      medicacoesUso: '',
      quadroAtual: '',
      exame: '',
      hipoteses: '',
      conduta: '',
      solicitacao: ''
    },

    categoriasExames: [
      {
        key: 'sangue', titulo: 'Sangue',
        sugestoes: ['Hemograma completo', 'Glicemia de jejum', 'HbA1c', 'Colesterol total e frações',
                    'Triglicérides', 'Ureia', 'Creatinina', 'TSH', 'T4 livre',
                    'TGO/AST', 'TGP/ALT', 'Sódio', 'Potássio', 'Ácido úrico',
                    'PCR', 'VHS', 'Ferritina', 'B12', 'Vitamina D']
      },
      {
        key: 'urina', titulo: 'Urina e fezes',
        sugestoes: ['Urina tipo I (EAS)', 'Urocultura com antibiograma',
                    'Microalbuminúria', 'Parasitológico de fezes (3 amostras)',
                    'Sangue oculto nas fezes']
      },
      {
        key: 'imagem', titulo: 'Imagem',
        sugestoes: ['Raio-X de tórax PA e perfil', 'Eletrocardiograma',
                    'Ultrassonografia abdominal total', 'Ultrassonografia pélvica',
                    'Ultrassonografia de tireoide', 'Mamografia',
                    'Densitometria óssea']
      },
      {
        key: 'outros', titulo: 'Outros / procedimentos',
        sugestoes: ['Citologia oncótica (papanicolau)', 'Audiometria',
                    'Espirometria', 'MAPA 24h', 'Holter 24h',
                    'Teste ergométrico']
      }
    ],

    get titulo() {
      const titulos = {
        menu: 'Gerar documento',
        receita: 'Receituário',
        controle: 'Receituário de controle especial',
        azul: 'Receituário azul (Lista B)',
        atestado: 'Atestado médico',
        exames: 'Solicitação de exames',
        relatorio: 'Relatório clínico',
        prontuario: 'Cópia integral do prontuário'
      };
      return titulos[this.tipo] || 'Documento';
    },

    get totalExames() {
      return ['sangue', 'urina', 'imagem', 'outros']
        .reduce((sum, k) => sum + this.dados.exames[k].length, 0);
    },

    async load() {
      try {
        this.paciente = await DB.getPaciente(this.pacienteId);
        if (!this.paciente) {
          UI.toast('Paciente não encontrado', 'error');
          Router.navigate('/pacientes');
          return;
        }
        // Verifica se PDF lib está carregada
        if (!window.jspdf && !window.jsPDF) {
          UI.toast('Biblioteca PDF ainda carregando — aguarde alguns segundos', 'info', 5000);
        }
        // Tenta construir o alerta sugerido a partir da última consulta
        await this.construirAlertaSugerido();
      } catch (e) {
        UI.toast('Erro ao carregar: ' + e.message, 'error');
      }
    },

    async construirAlertaSugerido() {
      try {
        const consultas = await DB.listConsultasByPaciente(this.pacienteId);
        this.todasConsultas = consultas;
        this.totalConsultasPaciente = consultas.length;
        if (consultas.length === 0) return;
        // Pega a consulta mais recente
        const ultima = consultas[0];
        this.ultimaConsultaCarregada = ultima;
        const alertas = [];
        // Antecedentes graves
        const graves = (ultima.antecedentes || []).filter(a =>
          /alergia|HAS|DM|asma|epilepsia|AVC|IAM|ICC|neoplasia|HIV|hepatite/i.test(a)
        );
        if (graves.length > 0) {
          alertas.push('Antecedentes: ' + graves.join(', '));
        }
        // Medicações em uso
        if (ultima.medicacoesUso && ultima.medicacoesUso.length > 0) {
          alertas.push('Em uso: ' + ultima.medicacoesUso.join('; '));
        }
        this.alertaSugerido = alertas.join('. ');
      } catch (e) {
        console.error('Erro ao buscar consultas para alerta:', e);
      }
    },

    preencherDeUltimaConsulta() {
      if (!this.ultimaConsultaCarregada) return;
      const c = this.ultimaConsultaCarregada;
      const antecedentes = [];
      if (c.antecedentes && c.antecedentes.length > 0) antecedentes.push(c.antecedentes.join(', '));
      if (c.antecedentesTexto) antecedentes.push(c.antecedentesTexto);
      if (antecedentes.length > 0 && !this.relatorio.antecedentes) {
        this.relatorio.antecedentes = antecedentes.join('. ');
      }
      if (c.medicacoesUso && c.medicacoesUso.length > 0 && !this.relatorio.medicacoesUso) {
        this.relatorio.medicacoesUso = c.medicacoesUso.join('; ');
      }
      if (c.queixaPrincipal && !this.relatorio.quadroAtual) {
        let qa = c.queixaPrincipal;
        if (c.queixaDuracao) qa += ` (${c.queixaDuracao})`;
        if (c.hpma) qa += '. ' + c.hpma;
        this.relatorio.quadroAtual = qa;
      }
      if ((c.hipoteses && c.hipoteses.length > 0) && !this.relatorio.hipoteses) {
        // Sprint B1: usa CodigosClinicos para formatar hipóteses (mistas: strings legadas + objetos novos)
        const CC = window.CodigosClinicos;
        this.relatorio.hipoteses = c.hipoteses.map(h => {
          if (CC) return CC.formatarCompleto(h);
          return typeof h === 'string' ? h : (h && h.texto) || '';
        }).filter(Boolean).join('; ');
      }
      if (c.conduta && !this.relatorio.conduta) {
        this.relatorio.conduta = c.conduta;
      }
      // Exame (sinais vitais + descrição + exame psíquico)
      if (!this.relatorio.exame) {
        const exame = [];
        const sv = [];
        if (c.pa) sv.push('PA ' + c.pa);
        if (c.fc) sv.push('FC ' + c.fc + ' bpm');
        if (c.fr) sv.push('FR ' + c.fr + ' irpm');
        if (c.tax) sv.push('Tax ' + c.tax + '°C');
        if (c.imc) sv.push('IMC ' + c.imc);
        if (sv.length > 0) exame.push(sv.join(', '));
        if (c.exameFisicoDescricao) exame.push(c.exameFisicoDescricao);
        if (c.examePsiquicoProsa) exame.push('Exame psíquico: ' + c.examePsiquicoProsa);
        if (exame.length > 0) this.relatorio.exame = exame.join('. ');
      }
      UI.toast('Campos preenchidos a partir da última consulta', 'success');
    },

    usarAlertaSugerido() {
      this.dados.alertaClinico = this.alertaSugerido;
    },

    calcAge(d) { return UI.calculateAge(d); },
    autoGrow(el) { UI.autoGrowTextarea(el); },

    abrirTipo(t) {
      this.tipo = t;
    },

    voltar() {
      Router.navigate('/paciente/' + this.pacienteId);
    },

    // ---- Receita ----
    adicionarMedicacao() {
      this.dados.medicacoes.push({ nome: '', posologia: '', quantidade: '' });
    },

    removerMedicacao(i) {
      this.dados.medicacoes.splice(i, 1);
      delete this.sugestoesPorIndex[i];
    },

    atualizarSugestoes(i) {
      const med = this.dados.medicacoes[i];
      if (!med) return;
      this.sugestoesPorIndex[i] = ClinicalData.searchMedicamentos(med.nome);
    },

    escolherSugestao(i, sug) {
      this.dados.medicacoes[i].nome = sug;
      this.sugestoesPorIndex[i] = [];
    },

    fecharSugestoes(i) {
      this.sugestoesPorIndex[i] = [];
    },

    gerarReceita() {
      if (!window.jspdf && !window.jsPDF) {
        UI.toast('Biblioteca PDF ainda não carregou. Aguarde e tente novamente.', 'error');
        return;
      }
      // Filtra medicações vazias
      const medsValidas = this.dados.medicacoes.filter(m => m.nome && m.nome.trim());
      if (medsValidas.length === 0) {
        UI.toast('Adicione pelo menos uma medicação com nome', 'error');
        return;
      }
      try {
        const { doc, codigo } = PDFDocuments.receituarioSimples(
          { ...this.paciente, id: this.pacienteId },
          {
            alertaClinico: this.dados.alertaClinico,
            medicacoes: medsValidas,
            orientacoes: this.dados.orientacoes
          }
        );
        const nomeArquivo = `Receita_${(this.paciente.nome || 'paciente').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}`;
        DB.audit('GENERATE_PDF', 'documento', null, { tipo: 'receita', codigo, pacienteId: this.pacienteId });
        PDFBuilder.previewModal(doc, nomeArquivo, 'Receituário', { ...this.paciente, id: this.pacienteId });
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao gerar PDF: ' + e.message, 'error');
      }
    },

    // ---- Atestado ----
    gerarAtestado() {
      if (!window.jspdf && !window.jsPDF) {
        UI.toast('Biblioteca PDF ainda não carregou.', 'error');
        return;
      }
      try {
        const { doc, codigo } = PDFDocuments.atestado(
          { ...this.paciente, id: this.pacienteId },
          {
            tipo: this.dados.tipo,
            dataConsulta: this.dados.dataConsulta,
            horario: this.dados.horario,
            dias: this.dados.dias,
            dataInicio: this.dados.dataInicio,
            incluirCID: this.dados.incluirCID,
            cid: this.dados.cid,
            observacao: this.dados.observacao
          }
        );
        const nomeArquivo = `Atestado_${(this.paciente.nome || 'paciente').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}`;
        DB.audit('GENERATE_PDF', 'documento', null, { tipo: 'atestado', codigo, pacienteId: this.pacienteId });
        PDFBuilder.previewModal(doc, nomeArquivo, 'Atestado médico', { ...this.paciente, id: this.pacienteId });
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao gerar PDF: ' + e.message, 'error');
      }
    },

    // ---- Exames ----
    adicionarExame(catKey, exame) {
      if (!this.dados.exames[catKey].includes(exame)) {
        this.dados.exames[catKey].push(exame);
      }
    },

    adicionarExameTexto(catKey) {
      const v = (this.inputsExame[catKey] || '').trim();
      if (!v) return;
      if (!this.dados.exames[catKey].includes(v)) {
        this.dados.exames[catKey].push(v);
      }
      this.inputsExame[catKey] = '';
    },

    removerExame(catKey, i) {
      this.dados.exames[catKey].splice(i, 1);
    },

    gerarExames() {
      if (!window.jspdf && !window.jsPDF) {
        UI.toast('Biblioteca PDF ainda não carregou.', 'error');
        return;
      }
      if (this.totalExames === 0) {
        UI.toast('Adicione pelo menos um exame', 'error');
        return;
      }
      try {
        const { doc, codigo } = PDFDocuments.solicitacaoExames(
          { ...this.paciente, id: this.pacienteId },
          {
            alertaClinico: this.dados.alertaClinico,
            hipotese: this.dados.hipotese,
            exames: this.dados.exames,
            orientacoes: this.dados.orientacoes
          }
        );
        const nomeArquivo = `Exames_${(this.paciente.nome || 'paciente').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}`;
        DB.audit('GENERATE_PDF', 'documento', null, { tipo: 'exames', codigo, pacienteId: this.pacienteId });
        PDFBuilder.previewModal(doc, nomeArquivo, 'Solicitação de exames', { ...this.paciente, id: this.pacienteId });
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao gerar PDF: ' + e.message, 'error');
      }
    },

    // ---- Controle especial ----
    gerarControle() {
      if (!window.jspdf && !window.jsPDF) {
        UI.toast('Biblioteca PDF ainda não carregou.', 'error');
        return;
      }
      const medsValidas = this.dados.medicacoes.filter(m => m.nome && m.nome.trim());
      if (medsValidas.length === 0) {
        UI.toast('Adicione pelo menos uma medicação com nome', 'error');
        return;
      }
      try {
        const { doc, codigo } = PDFDocumentsExtra.receituarioControleEspecial(
          { ...this.paciente, id: this.pacienteId },
          { medicacoes: medsValidas }
        );
        const nomeArquivo = `Receita_Controle_${(this.paciente.nome || 'paciente').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}`;
        DB.audit('GENERATE_PDF', 'documento', null, { tipo: 'controle', codigo, pacienteId: this.pacienteId });
        PDFBuilder.previewModal(doc, nomeArquivo, 'Receituário de controle especial', { ...this.paciente, id: this.pacienteId });
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao gerar PDF: ' + e.message, 'error');
      }
    },

    // ---- Azul B1/B2 ----
    gerarAzul() {
      if (!window.jspdf && !window.jsPDF) {
        UI.toast('Biblioteca PDF ainda não carregou.', 'error');
        return;
      }
      const medsValidas = this.dados.medicacoes.filter(m => m.nome && m.nome.trim());
      if (medsValidas.length === 0) {
        UI.toast('Adicione pelo menos uma medicação com nome', 'error');
        return;
      }
      try {
        const { doc, codigo } = PDFDocumentsExtra.receituarioAzul(
          { ...this.paciente, id: this.pacienteId },
          {
            alertaClinico: this.dados.alertaClinico,
            medicacoes: medsValidas,
            orientacoes: this.dados.orientacoes
          }
        );
        const nomeArquivo = `Receita_Azul_${(this.paciente.nome || 'paciente').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}`;
        DB.audit('GENERATE_PDF', 'documento', null, { tipo: 'azul', codigo, pacienteId: this.pacienteId });
        PDFBuilder.previewModal(doc, nomeArquivo, 'Receituário azul B1/B2', { ...this.paciente, id: this.pacienteId });
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao gerar PDF: ' + e.message, 'error');
      }
    },

    // ---- Relatório clínico ----
    gerarRelatorio() {
      if (!window.jspdf && !window.jsPDF) {
        UI.toast('Biblioteca PDF ainda não carregou.', 'error');
        return;
      }
      try {
        const { doc, codigo } = PDFDocumentsExtra.relatorioClinico(
          { ...this.paciente, id: this.pacienteId },
          {
            destinatario: this.relatorio.destinatario,
            alertaClinico: this.dados.alertaClinico,
            antecedentes: this.relatorio.antecedentes,
            medicacoesUso: this.relatorio.medicacoesUso,
            quadroAtual: this.relatorio.quadroAtual,
            exame: this.relatorio.exame,
            hipoteses: this.relatorio.hipoteses,
            conduta: this.relatorio.conduta,
            solicitacao: this.relatorio.solicitacao
          }
        );
        const nomeArquivo = `Relatorio_${(this.paciente.nome || 'paciente').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}`;
        DB.audit('GENERATE_PDF', 'documento', null, { tipo: 'relatorio', codigo, pacienteId: this.pacienteId });
        PDFBuilder.previewModal(doc, nomeArquivo, 'Relatório clínico', { ...this.paciente, id: this.pacienteId });
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao gerar PDF: ' + e.message, 'error');
      }
    },

    // ---- Cópia do prontuário ----
    async gerarProntuario() {
      if (!window.jspdf && !window.jsPDF) {
        UI.toast('Biblioteca PDF ainda não carregou.', 'error');
        return;
      }
      try {
        const { doc, codigo } = await PDFDocumentsExtra.copiaProntuario(
          { ...this.paciente, id: this.pacienteId },
          this.todasConsultas
        );
        const nomeArquivo = `Prontuario_${(this.paciente.nome || 'paciente').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}`;
        DB.audit('GENERATE_PDF', 'documento', null, { tipo: 'prontuario', codigo, pacienteId: this.pacienteId });
        PDFBuilder.previewModal(doc, nomeArquivo, 'Cópia integral do prontuário', { ...this.paciente, id: this.pacienteId });
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao gerar PDF: ' + e.message, 'error');
      }
    },

    // ---- Consulta para impressão (arquivo físico) ----
    formatarOpcaoConsulta(c) {
      if (!c || !c.dataHora) return 'Consulta sem data';
      const data = new Date(c.dataHora).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      const queixa = c.queixaPrincipal ? ` — ${c.queixaPrincipal}` : '';
      // Limita para não estourar o select
      const queixaCurta = queixa.length > 50 ? queixa.slice(0, 47) + '...' : queixa;
      return data + queixaCurta;
    },

    async gerarConsultaImpressao() {
      if (!this.consultaImpressaoId) {
        UI.toast('Selecione uma consulta primeiro.', 'info');
        return;
      }
      if (!window.jspdf && !window.jsPDF) {
        UI.toast('Biblioteca PDF ainda não carregou.', 'error');
        return;
      }
      try {
        // Busca a consulta completa pelo ID
        const consulta = await DB.getConsulta(parseInt(this.consultaImpressaoId, 10));
        if (!consulta) {
          UI.toast('Consulta não encontrada.', 'error');
          return;
        }
        const { doc, codigo } = await PDFDocumentsExtra.consultaImpressao(
          { ...this.paciente, id: this.pacienteId },
          consulta
        );
        const dataFmt = new Date(consulta.dataHora).toISOString().slice(0,10);
        const nomeArquivo = `Consulta_${(this.paciente.nome || 'paciente').replace(/\s+/g, '_')}_${dataFmt}`;
        DB.audit('GENERATE_PDF', 'documento', null, {
          tipo: 'consulta-impressa', codigo, pacienteId: this.pacienteId, consultaId: consulta.id
        });
        PDFBuilder.previewModal(doc, nomeArquivo, 'Consulta para impressão', { ...this.paciente, id: this.pacienteId });
      } catch (e) {
        console.error(e);
        UI.toast('Erro ao gerar PDF: ' + e.message, 'error');
      }
    }
  };
}

window.renderDocumentos = renderDocumentos;
window.documentosScreen = documentosScreen;
