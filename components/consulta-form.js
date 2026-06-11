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
         x-init="load(); $nextTick(() => window.ScrollSpy && ScrollSpy.ligar($root))">

      <div class="ficha-head">
        <button class="btn btn-ghost btn-icon" @click="voltar()" title="Voltar ao paciente">
          <svg class="icon" style="transform: rotate(180deg)"><use href="#i-arrow-right"></use></svg>
        </button>
        <div class="ficha-id">
          <div class="ficha-nome">
            <span x-show="isNew">Nova consulta</span>
            <span x-show="!isNew">Consulta de <span x-text="formatDate(consulta.dataHora)"></span></span>
          </div>
          <div class="ficha-sub">
            <strong x-text="paciente.nome"></strong>
            <span x-show="paciente.dataNascimento" x-text="calcAge(paciente.dataNascimento) + ' anos'"></span>
            <span x-show="paciente.sexo" x-text="paciente.sexo"></span>
            <span x-show="paciente.tipoVaga" class="vaga-badge-mini"
                  :class="'vaga-badge-' + paciente.tipoVaga"
                  x-text="rotuloVagaConsulta(paciente.tipoVaga)"></span>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" @click="copiarSemId()" :disabled="isNew"
                  title="Copia a consulta inteira sem nenhum identificador do paciente">
            <svg class="icon"><use href="#i-shield"></use></svg>
            Copiar sem identificadores
          </button>
          <button class="btn btn-primary" @click="salvar()" :disabled="saving">
            <span x-show="!saving" x-text="isNew ? 'Salvar consulta' : 'Salvar alterações'"></span>
            <span x-show="saving">Salvando…</span>
          </button>
        </div>
      </div>

      <div class="workbench has-map">
        <div>
          <div class="folha">

            <!-- 01 · Queixa principal -->
            <section class="sec" data-spy="s1">
              <span class="sec-num">01</span>
              <div class="sec-head"><h3 class="sec-title">Queixa principal</h3></div>
              <div class="form-row cols-2">
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
            </section>

            <!-- 02 · HPMA -->
            <section class="sec" data-spy="s2">
              <span class="sec-num">02</span>
              <div class="sec-head">
                <h3 class="sec-title">História da Doença Atual</h3>
                <span class="sec-meta">HPMA</span>
              </div>
              <textarea class="textarea auto-grow" rows="4" x-model="consulta.hpma"
                        @input="touch(); autoGrow($event.target)"
                        placeholder="Narrativa cronológica: quando começou, como evoluiu, fatores de melhora/piora, sintomas associados, repercussões..."></textarea>
            </section>

            <!-- 03 · Medicação em uso -->
            <section class="sec" data-spy="s3">
              <span class="sec-num">03</span>
              <div class="sec-head">
                <h3 class="sec-title">Medicação em uso contínuo</h3>
                <span class="sec-meta" x-show="consulta.medicacoesUso.length > 0"
                      x-text="consulta.medicacoesUso.length + ' item(ns)'"></span>
              </div>
              <div style="position: relative">
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
              <p class="text-xs muted mt-2">Posologia pode ser digitada livremente. Ex: "Losartana 50mg 1x manhã"</p>
            </section>

            <!-- 04 · Antecedentes pessoais -->
            <section class="sec" data-spy="s4">
              <span class="sec-num">04</span>
              <div class="sec-head">
                <h3 class="sec-title">Antecedentes pessoais</h3>
                <span class="sec-meta">clique para marcar · texto livre abaixo</span>
              </div>
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
              <div class="form-group mt-3" style="margin-bottom: 0">
                <label class="label text-sm">Outros antecedentes (texto livre)</label>
                <textarea class="textarea auto-grow" rows="2" x-model="consulta.antecedentesTexto"
                          @input="touch(); autoGrow($event.target)"
                          placeholder="Outros antecedentes não listados acima"></textarea>
              </div>
            </section>

            <!-- 05 · Antecedentes familiares -->
            <section class="sec" data-spy="s5">
              <span class="sec-num">05</span>
              <div class="sec-head"><h3 class="sec-title">Antecedentes familiares</h3></div>
              <div class="chips-container">
                <template x-for="opcao in familiaresComuns" :key="opcao">
                  <button class="chip"
                          :class="consulta.familiares.includes(opcao) ? 'chip-selected' : ''"
                          @click="toggleFamiliar(opcao)"
                          x-text="opcao"></button>
                </template>
              </div>
              <div class="form-group mt-3" style="margin-bottom: 0">
                <label class="label text-sm">Detalhamento (texto livre)</label>
                <textarea class="textarea auto-grow" rows="2" x-model="consulta.familiaresTexto"
                          @input="touch(); autoGrow($event.target)"
                          placeholder="Ex: mãe com IAM aos 52 anos, irmão com diabetes tipo 1..."></textarea>
              </div>
            </section>

            <!-- 06 · Hábitos -->
            <section class="sec" data-spy="s6">
              <span class="sec-num">06</span>
              <div class="sec-head"><h3 class="sec-title">Hábitos de vida</h3></div>
              <div class="form-row cols-2">
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
            </section>

            <!-- 07 · Exame físico (fita de vitais) -->
            <section class="sec" data-spy="s7">
              <span class="sec-num">07</span>
              <div class="sec-head">
                <h3 class="sec-title">Exame físico</h3>
                <span class="sec-meta"><svg class="icon" style="width:12px;height:12px;vertical-align:-2px"><use href="#i-vitals"></use></svg> sinais vitais</span>
              </div>

              <div class="vitals-strip">
                <div class="vital">
                  <span class="vital-label">PA</span>
                  <input x-model="consulta.pa" @input="touch()" placeholder="130x80">
                  <span class="vital-unit">mmHg</span>
                </div>
                <div class="vital">
                  <span class="vital-label">FC</span>
                  <input x-model="consulta.fc" @input="touch()" placeholder="72">
                  <span class="vital-unit">bpm</span>
                </div>
                <div class="vital">
                  <span class="vital-label">FR</span>
                  <input x-model="consulta.fr" @input="touch()" placeholder="16">
                  <span class="vital-unit">irpm</span>
                </div>
                <div class="vital">
                  <span class="vital-label">Tax</span>
                  <input x-model="consulta.tax" @input="touch()" placeholder="36.5">
                  <span class="vital-unit">°C</span>
                </div>
                <div class="vital">
                  <span class="vital-label">SatO2</span>
                  <input x-model="consulta.satO2" @input="touch()" placeholder="98">
                  <span class="vital-unit">%</span>
                </div>
                <div class="vital">
                  <span class="vital-label">Glicemia</span>
                  <input x-model="consulta.glicemiaCapilar" @input="touch()" placeholder="110">
                  <span class="vital-unit">mg/dL</span>
                </div>
                <div class="vital">
                  <span class="vital-label">Peso</span>
                  <input type="number" step="0.1" x-model="consulta.peso"
                         @input="touch(); calcularIMC()" placeholder="72.5">
                  <span class="vital-unit">kg</span>
                </div>
                <div class="vital">
                  <span class="vital-label">Altura</span>
                  <input type="number" step="0.01" x-model="consulta.altura"
                         @input="touch(); calcularIMC()" placeholder="1.68">
                  <span class="vital-unit">m</span>
                </div>
                <div class="vital calc">
                  <span class="vital-label">IMC</span>
                  <input x-model="consulta.imc" readonly tabindex="-1">
                  <span class="vital-unit">kg/m² · calculado</span>
                </div>
              </div>

              <div class="form-group mt-4" style="margin-bottom: 0">
                <label class="label">Descrição do exame físico por sistemas</label>
                <textarea class="textarea auto-grow" rows="4" x-model="consulta.exameFisicoDescricao"
                          @input="touch(); autoGrow($event.target)"
                          placeholder="Geral, ACV, AR, AGI, neurológico..."></textarea>
              </div>
            </section>

            <!-- 08 · Exame psíquico -->
            <section class="sec" data-spy="s8">
              <span class="sec-num">08</span>
              <div class="sec-head">
                <h3 class="sec-title">Exame psíquico estruturado</h3>
                <span class="sec-meta"><svg class="icon" style="width:12px;height:12px;vertical-align:-2px"><use href="#i-brain"></use></svg> Dalgalarrondo</span>
              </div>
              <div id="exame-psiquico-mount"></div>
            </section>

            <!-- 09 · Hipóteses diagnósticas -->
            <section class="sec" data-spy="s9">
              <span class="sec-num">09</span>
              <div class="sec-head">
                <h3 class="sec-title">Hipóteses diagnósticas</h3>
                <span class="sec-meta">CIAP-2 · CID-10 opcionais</span>
              </div>
              <input class="input" x-model="hipoteseInput"
                     @keydown.enter.prevent="adicionarHipotese()"
                     placeholder="Texto da hipótese (Enter para adicionar)">

              <!-- Vinculação de códigos clínicos -->
              <div class="flex items-center gap-2 mt-3" style="flex-wrap: wrap">
                <button type="button" class="btn btn-sm"
                        :class="hipoteseCiap ? 'code-on-ciap' : ''"
                        @click="abrirPicker('ciap')">
                  <span x-text="hipoteseCiap ? ('CIAP ' + hipoteseCiap.codigo + ' ✓') : '+ CIAP-2'"></span>
                </button>
                <button type="button" class="btn btn-sm"
                        :class="hipoteseCid ? 'code-on-cid' : ''"
                        @click="abrirPicker('cid')">
                  <span x-text="hipoteseCid ? ('CID ' + hipoteseCid.codigo + ' ✓') : '+ CID-10'"></span>
                </button>
                <button type="button" class="btn btn-sm btn-ghost"
                        x-show="hipoteseCiap || hipoteseCid"
                        @click="limparCodigosHipotese()">limpar códigos</button>
                <small class="muted" style="margin-left:auto">
                  <span x-show="!hipoteseCiap && !hipoteseCid">opcional · pode adicionar só texto</span>
                  <span x-show="hipoteseCiap || hipoteseCid" x-text="(hipoteseCiap ? hipoteseCiap.descricao : '') + (hipoteseCiap && hipoteseCid ? ' · ' : '') + (hipoteseCid ? hipoteseCid.descricao : '')"></span>
                </small>
              </div>

              <!-- Picker dropdown -->
              <div x-show="pickerAberto" x-cloak class="picker-pop mt-3">
                <div class="flex items-center gap-2">
                  <svg class="icon" style="width:15px;height:15px"><use href="#i-search"></use></svg>
                  <strong x-text="pickerTipo === 'ciap' ? 'Buscar CIAP-2' : 'Buscar CID-10'"></strong>
                  <small class="muted">↑↓ navegar · Enter selecionar · Esc cancelar</small>
                  <button type="button" class="btn btn-sm btn-icon btn-ghost" style="margin-left:auto" @click="fecharPicker()">
                    <svg class="icon"><use href="#i-x"></use></svg>
                  </button>
                </div>
                <input class="input mt-2" x-ref="pickerInput" x-model="pickerBusca"
                       @input="filtrarPicker()"
                       @keydown.arrow-down.prevent="pickerNavegar(1)"
                       @keydown.arrow-up.prevent="pickerNavegar(-1)"
                       @keydown.enter.prevent="pickerSelecionarAtual()"
                       @keydown.escape.prevent="fecharPicker()"
                       placeholder="Digite código (ex: K86) ou descrição (ex: hipertensão)…">
                <div x-show="pickerResultados.length > 0" class="picker-list">
                  <template x-for="(r, i) in pickerResultados" :key="r.tipo + '-' + r.codigo">
                    <div class="picker-item" :class="i === pickerIndice ? 'active' : ''" @click="pickerSelecionar(r)">
                      <strong class="pk-code" :class="r.tipo === 'ciap' ? 'ciap' : 'cid'" x-text="r.codigo"></strong>
                      <span x-text="r.descricao"></span>
                    </div>
                  </template>
                </div>
                <div x-show="pickerBusca.length > 0 && pickerResultados.length === 0" class="mt-2 muted text-sm">
                  Nenhum código encontrado. Tente outra palavra-chave.
                </div>
              </div>

              <!-- Lista de hipóteses adicionadas -->
              <div class="chips-container mt-3" x-show="consulta.hipoteses.length > 0">
                <template x-for="(h, i) in consulta.hipoteses" :key="i">
                  <div class="chip chip-removable" style="flex-wrap: wrap; align-items: center;">
                    <span x-text="textoHipotese(h)"></span>
                    <template x-if="ciapDeHipotese(h)">
                      <span class="code-pill ciap"
                            x-text="'CIAP ' + ciapDeHipotese(h).codigo"
                            :title="ciapDeHipotese(h).descricao"></span>
                    </template>
                    <template x-if="cidDeHipotese(h)">
                      <span class="code-pill cid"
                            x-text="'CID ' + cidDeHipotese(h).codigo"
                            :title="cidDeHipotese(h).descricao"></span>
                    </template>
                    <button @click="removerHipotese(i)" style="margin-left: 6px; opacity: 0.6">×</button>
                  </div>
                </template>
              </div>
            </section>

            <!-- 10 · Conduta -->
            <section class="sec" data-spy="s10">
              <span class="sec-num">10</span>
              <div class="sec-head"><h3 class="sec-title">Conduta e plano terapêutico</h3></div>
              <textarea class="textarea auto-grow" rows="5" x-model="consulta.conduta"
                        @input="touch(); autoGrow($event.target)"
                        placeholder="Prescrição, orientações, solicitação de exames, referenciamento, PTS..."></textarea>
            </section>

            <!-- 11 · Retorno -->
            <section class="sec" data-spy="s11">
              <span class="sec-num">11</span>
              <div class="sec-head"><h3 class="sec-title">Retorno e sinais de alerta</h3></div>
              <div class="form-group">
                <label class="label">Quando voltar</label>
                <input class="input" x-model="consulta.retorno" @input="touch()"
                       placeholder="Ex: em 30 dias com exames, em 3 meses se estável, em 7 dias para reavaliação">
              </div>
              <div class="form-group" style="margin-bottom: 0">
                <label class="label">Sinais de alerta orientados ao paciente</label>
                <textarea class="textarea auto-grow" rows="2" x-model="consulta.sinaisAlerta"
                          @input="touch(); autoGrow($event.target)"
                          placeholder="O que faria o paciente voltar antes do retorno marcado"></textarea>
              </div>
            </section>

            <!-- 12 · Exames laboratoriais -->
            <section class="sec" data-spy="s12" x-show="!isNew">
              <span class="sec-num">12</span>
              <div class="sec-head">
                <h3 class="sec-title">Exames laboratoriais</h3>
                <span class="sec-meta" x-show="examesPreenchidosCount() > 0"
                      x-text="examesPreenchidosCount() + ' ' + (examesPreenchidosCount() === 1 ? 'campo preenchido' : 'campos preenchidos')"></span>
                <div class="sec-meta-right">
                  <button class="btn btn-sm btn-ghost" @click="examesAberto = !examesAberto">
                    <span x-text="examesAberto ? 'Recolher' : 'Abrir / preencher'"></span>
                    <svg class="icon" :style="examesAberto ? 'transform: rotate(180deg)' : ''"><use href="#i-chevron-down"></use></svg>
                  </button>
                </div>
              </div>
              <p class="text-sm muted" x-show="!examesAberto && examesPreenchidosCount() === 0">
                Resultados laboratoriais para colar na consulta. Saem no PDF do resumo. TFG é calculada automaticamente. Templates rápidos para rotina, psiquiátrico, monitoramento de psicofármacos e pré-natal.
              </p>

              <div x-show="examesAberto" x-cloak>
                <!-- Topo: data + templates -->
                <div style="display:grid; grid-template-columns: minmax(160px, 1fr) 2fr; gap: var(--space-3); align-items: flex-start;">
                  <div>
                    <label class="label text-sm" style="font-weight:600">Data da coleta</label>
                    <input type="date" class="input" x-model="consulta.exames.dataColeta" @change="touch()">
                  </div>
                  <div>
                    <label class="label text-sm" style="font-weight:600">Templates rápidos
                      <span class="hint">marca os exames considerados; valores você preenche</span>
                    </label>
                    <div class="flex gap-2" style="flex-wrap:wrap">
                      <template x-for="tpl in examesTemplates" :key="tpl.id">
                        <button type="button" class="btn btn-sm" @click="aplicarTemplateExames(tpl.id)" :title="tpl.descricao" x-text="tpl.nome"></button>
                      </template>
                      <button type="button" class="btn btn-sm btn-ghost" @click="limparTemplateExames()" x-show="(consulta.exames._ativos || []).length > 0">× Limpar destaque</button>
                    </div>
                    <p class="text-xs muted mt-1" x-show="(consulta.exames._ativos || []).length > 0">
                      <span x-text="(consulta.exames._ativos || []).length"></span> campo(s) em destaque — preencha pelo resultado do paciente
                    </p>
                  </div>
                </div>

                <!-- Subseções por categoria -->
                <template x-for="cat in examesCategorias" :key="cat.id">
                  <div class="lab-cat">
                    <div class="lab-cat-head" @click="toggleCategoria(cat.id)">
                      <svg class="icon" style="width:14px;height:14px;color:var(--color-primary-700)"><use href="#i-flask"></use></svg>
                      <strong x-text="cat.titulo"></strong>
                      <svg class="icon" style="width:13px;height:13px;margin-left:auto;color:var(--text-muted)"
                           :style="categoriaExpandida(cat) ? 'transform: rotate(180deg)' : ''">
                        <use href="#i-chevron-down"></use>
                      </svg>
                    </div>

                    <div class="lab-cat-body" x-show="categoriaExpandida(cat)" x-cloak>
                      <p x-show="cat.descricao" class="text-xs muted" x-text="cat.descricao"></p>
                      <div x-show="cat.avisoP4" class="lab-warn">
                        <svg class="icon"><use href="#i-alert"></use></svg>
                        <span x-text="cat.avisoP4 || ''"></span>
                      </div>

                      <div class="lab-grid mt-2">
                        <template x-for="campo in cat.campos" :key="campo.id">
                          <div class="lab-field" :class="campoAtivo(cat.id, campo.id) ? 'is-active' : ''">
                            <label class="label text-xs" style="display:flex; gap:4px; align-items:baseline; flex-wrap:wrap;">
                              <strong x-text="campo.nome"></strong>
                              <span x-show="campo.unidade" class="muted" x-text="'(' + campo.unidade + ')'"></span>
                            </label>
                            <!-- Select (para sorologias) -->
                            <select x-show="campo.tipo === 'select'" class="input"
                                    :value="consulta.exames[cat.id][campo.id]"
                                    @change="consulta.exames[cat.id][campo.id] = $event.target.value; touch()">
                              <template x-for="op in (campo.opcoes || [])">
                                <option :value="op" x-text="op || '—'"></option>
                              </template>
                            </select>
                            <!-- Texto (para VDRL, cilindros, proteinúria qualitativa) -->
                            <input x-show="campo.tipo === 'texto'" type="text" class="input"
                                   x-model="consulta.exames[cat.id][campo.id]"
                                   @input="touch()"
                                   :placeholder="campo.ref || ''">
                            <!-- Numérico (default) -->
                            <input x-show="!campo.tipo || (campo.tipo !== 'select' && campo.tipo !== 'texto')"
                                   type="number" step="any" class="input"
                                   x-model="consulta.exames[cat.id][campo.id]"
                                   @input="touch(); if (campo.calcTfg) atualizarTFG()"
                                   :placeholder="campo.ref ? 'Ref: ' + campo.ref : ''">
                            <!-- Exibição auxiliar: faixa de referência abaixo -->
                            <small x-show="campo.ref && campo.tipo !== 'texto'" class="muted" style="display:block; font-size:0.7em;" x-text="'Ref: ' + campo.ref"></small>
                            <!-- TFG ao lado da creatinina -->
                            <div x-show="campo.calcTfg && consulta.exames[cat.id][campo.id]" class="tfg-box">
                              <strong class="text-xs" x-text="tfgCalculada ? 'TFG: ' + tfgCalculada + ' mL/min/1,73m²' : 'TFG: (preencha sexo/idade do paciente)'"></strong>
                              <div x-show="tfgEstagio" class="text-xs" :style="'color: ' + (tfgEstagio ? tfgEstagio.cor : '')">
                                <strong x-text="tfgEstagio ? 'Estágio ' + tfgEstagio.estagio : ''"></strong>
                                <span x-text="tfgEstagio ? ' — ' + tfgEstagio.desc : ''"></span>
                              </div>
                            </div>
                          </div>
                        </template>
                      </div>

                      <!-- Texto livre da categoria (hemograma, urina1) -->
                      <div x-show="cat.textoLivre" class="mt-2">
                        <label class="label text-xs" style="font-weight:600">Observações
                          <span class="hint">campo de texto livre</span>
                        </label>
                        <textarea class="textarea auto-grow" rows="1"
                                  x-model="consulta.exames[cat.id][cat.textoLivre ? cat.textoLivre.id : 'outros']"
                                  @input="touch(); UI.autoGrowTextarea($event.target)"
                                  :placeholder="cat.textoLivre ? cat.textoLivre.placeholder : ''"></textarea>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Outros exames texto livre geral -->
                <div class="mt-4">
                  <label class="label" style="font-weight:600">Outros exames laboratoriais (texto livre)
                    <span class="hint">para tudo que não couber nos campos acima</span>
                  </label>
                  <textarea class="textarea auto-grow" rows="2"
                            x-model="consulta.exames.outros_livre"
                            @input="touch(); UI.autoGrowTextarea($event.target)"
                            placeholder="Cole resultados ou descreva exames complementares (sumário de urina alterado, gasometria, hormônios sexuais, etc.)"></textarea>
                </div>
              </div>
            </section>

            <!-- 13 · Imagens anexadas -->
            <section class="sec" data-spy="s13" x-show="!isNew">
              <span class="sec-num">13</span>
              <div class="sec-head">
                <h3 class="sec-title">Imagens anexadas</h3>
                <span class="sec-meta" x-show="anexos.length > 0"
                      x-text="anexos.length + (anexos.length === 1 ? ' imagem' : ' imagens')"></span>
                <div class="sec-meta-right">
                  <button class="btn btn-sm btn-secondary" @click="abrirSeletorAnexo()" :disabled="processandoAnexo">
                    <svg class="icon"><use href="#i-paperclip"></use></svg>
                    <span x-show="!processandoAnexo">Anexar imagem</span>
                    <span x-show="processandoAnexo" x-text="'Processando… ' + (progressoAnexo || '')"></span>
                  </button>
                </div>
              </div>
              <p class="text-sm muted">
                Lesão dermato, ECG, exame impresso, resultado de USG. Imagens entram criptografadas no cofre. No PDF "Cópia de prontuário" aparecem em seção própria com espaço para achados.
              </p>

              <input type="file" accept="image/*" capture="environment" x-ref="inputAnexo" @change="handleArquivoAnexo($event)" style="display:none">

              <div x-show="anexos.length === 0 && !processandoAnexo" class="text-center muted text-sm" style="padding: 20px 0; opacity: 0.7">
                Nenhuma imagem ainda. Clique em "Anexar imagem" para adicionar.
              </div>

              <!-- Galeria de thumbs -->
              <div x-show="anexos.length > 0" class="thumb-grid">
                <template x-for="(a, idx) in anexos" :key="a.id">
                  <div class="thumb" @click="abrirEditorAnexo(a)">
                    <div class="thumb-img">
                      <img :src="a._thumbUrl" :alt="a.titulo || ('Anexo ' + a.ordem)">
                    </div>
                    <div class="thumb-meta">
                      <div class="tm-title">
                        <span x-text="iconePorTipoAnexo(a.tipo)"></span>
                        <span x-text="a.titulo || ('Imagem ' + a.ordem)"></span>
                      </div>
                      <div class="tm-sub" x-text="a.achados ? '✓ com achados' : '— sem achados'"></div>
                    </div>
                  </div>
                </template>
              </div>
            </section>

            <!-- Documentos desta consulta -->
            <section class="sec" data-spy="s14" x-show="!isNew">
              <span class="sec-num"><svg class="icon" style="width:22px;height:22px"><use href="#i-print"></use></svg></span>
              <div class="sec-head">
                <h3 class="sec-title">Gerar documentos desta consulta</h3>
              </div>
              <p class="text-sm muted mb-3">
                Atalhos diretos para a tela de documentos do paciente. Os dados clínicos já registrados aqui
                (medicações em uso, hipóteses, conduta) serão usados como ponto de partida.
              </p>
              <div class="doc-tiles">
                <button class="doc-tile" @click="irParaDocumento('receita')" title="Receita comum">
                  <svg class="icon"><use href="#i-rx"></use></svg>
                  <span class="dt-nome">Receita comum</span>
                </button>
                <button class="doc-tile" @click="irParaDocumento('controle')" title="Antimicrobianos, retinoides, etc">
                  <svg class="icon"><use href="#i-clipboard"></use></svg>
                  <span class="dt-nome">Controle especial</span>
                </button>
                <button class="doc-tile" @click="irParaDocumento('azul')" title="Psicotrópicos / Lista B">
                  <svg class="icon"><use href="#i-pill"></use></svg>
                  <span class="dt-nome">Azul B1/B2</span>
                </button>
                <button class="doc-tile" @click="irParaDocumento('atestado')">
                  <svg class="icon"><use href="#i-file"></use></svg>
                  <span class="dt-nome">Atestado</span>
                </button>
                <button class="doc-tile" @click="irParaDocumento('exames')">
                  <svg class="icon"><use href="#i-flask"></use></svg>
                  <span class="dt-nome">Exames</span>
                </button>
                <button class="doc-tile" @click="irParaDocumento('consulta-impressa')"
                        title="PDF completo desta consulta com espaço para assinatura física">
                  <svg class="icon"><use href="#i-print"></use></svg>
                  <span class="dt-nome">Imprimir consulta</span>
                </button>
              </div>
            </section>
          </div>

          <!-- Barra de ações fixa -->
          <div class="actionbar">
            <svg class="icon" style="width:13px;height:13px;color:var(--text-muted)"><use href="#i-lock"></use></svg>
            <span class="ab-status" x-text="autoSaveStatus || 'criptografado localmente'"></span>
            <div class="ab-spacer"></div>
            <button class="btn btn-ghost" style="color: var(--color-danger)" @click="remover()" x-show="!isNew">
              <svg class="icon"><use href="#i-trash"></use></svg>
              Excluir
            </button>
            <button class="btn btn-secondary" @click="voltar()">Cancelar</button>
            <button class="btn btn-primary" @click="salvar()" :disabled="saving">
              <span x-show="!saving" x-text="isNew ? 'Salvar consulta' : 'Salvar alterações'"></span>
              <span x-show="saving">Salvando…</span>
            </button>
          </div>
        </div>

        <!-- Minimapa -->
        <nav class="minimap" aria-label="Seções da consulta">
          <div class="minimap-title">Consulta</div>
          <button class="minimap-item" data-spy-for="s1" @click="ScrollSpy.irPara('s1')">
            <span class="mm-dot" :class="consulta.queixaPrincipal ? 'done' : ''"></span> Queixa
          </button>
          <button class="minimap-item" data-spy-for="s2" @click="ScrollSpy.irPara('s2')">
            <span class="mm-dot" :class="consulta.hpma ? 'done' : ''"></span> HPMA
          </button>
          <button class="minimap-item" data-spy-for="s3" @click="ScrollSpy.irPara('s3')">
            <span class="mm-dot" :class="consulta.medicacoesUso.length ? 'done' : ''"></span> Medicações
          </button>
          <button class="minimap-item" data-spy-for="s4" @click="ScrollSpy.irPara('s4')">
            <span class="mm-dot" :class="(consulta.antecedentes.length || consulta.cirurgias.length || consulta.antecedentesTexto) ? 'done' : ''"></span> Antecedentes
          </button>
          <button class="minimap-item" data-spy-for="s5" @click="ScrollSpy.irPara('s5')">
            <span class="mm-dot" :class="(consulta.familiares.length || consulta.familiaresTexto) ? 'done' : ''"></span> Familiares
          </button>
          <button class="minimap-item" data-spy-for="s6" @click="ScrollSpy.irPara('s6')">
            <span class="mm-dot" :class="(consulta.tabagismo || consulta.alcool || consulta.atividadeFisica || consulta.sono) ? 'done' : ''"></span> Hábitos
          </button>
          <button class="minimap-item" data-spy-for="s7" @click="ScrollSpy.irPara('s7')">
            <span class="mm-dot" :class="(consulta.pa || consulta.fc || consulta.peso || consulta.exameFisicoDescricao) ? 'done' : ''"></span> Exame físico
          </button>
          <button class="minimap-item" data-spy-for="s8" @click="ScrollSpy.irPara('s8')">
            <span class="mm-dot" :class="consulta.examePsiquicoProsa ? 'done' : ''"></span> Psíquico
          </button>
          <button class="minimap-item" data-spy-for="s9" @click="ScrollSpy.irPara('s9')">
            <span class="mm-dot" :class="consulta.hipoteses.length ? 'done' : ''"></span> Hipóteses
          </button>
          <button class="minimap-item" data-spy-for="s10" @click="ScrollSpy.irPara('s10')">
            <span class="mm-dot" :class="consulta.conduta ? 'done' : ''"></span> Conduta
          </button>
          <button class="minimap-item" data-spy-for="s11" @click="ScrollSpy.irPara('s11')">
            <span class="mm-dot" :class="consulta.retorno ? 'done' : ''"></span> Retorno
          </button>
          <button class="minimap-item" data-spy-for="s12" @click="ScrollSpy.irPara('s12')" x-show="!isNew">
            <span class="mm-dot" :class="examesPreenchidosCount() > 0 ? 'done' : ''"></span> Laboratório
          </button>
          <button class="minimap-item" data-spy-for="s13" @click="ScrollSpy.irPara('s13')" x-show="!isNew">
            <span class="mm-dot" :class="anexos.length ? 'done' : ''"></span> Imagens
          </button>
          <button class="minimap-item" data-spy-for="s14" @click="ScrollSpy.irPara('s14')" x-show="!isNew">
            <span class="mm-dot"></span> Documentos
          </button>
        </nav>
      </div>

      <!-- Modal de edição de anexo -->
      <div x-show="anexoEditando" x-cloak class="modal-overlay" @click.self="fecharEditorAnexo()">
        <div class="modal-sheet" @click.stop x-show="anexoEditando">
          <div class="modal-head">
            <h3>Editar imagem anexada</h3>
            <button class="btn btn-sm btn-icon btn-ghost" @click="fecharEditorAnexo()">
              <svg class="icon"><use href="#i-x"></use></svg>
            </button>
          </div>

          <div x-show="anexoEditando" class="modal-stage">
            <img :src="anexoEditandoUrl">
          </div>

          <div class="mt-3" style="display:grid; grid-template-columns: 2fr 1fr; gap:10px;">
            <div>
              <label class="label text-sm">Título</label>
              <input class="input" type="text" x-model="anexoEditandoMeta.titulo" placeholder="Ex: Lesão dorso, ECG basal, USG abdome">
            </div>
            <div>
              <label class="label text-sm">Tipo</label>
              <select class="input" x-model="anexoEditandoMeta.tipo">
                <option value="foto">Foto clínica</option>
                <option value="ecg">ECG</option>
                <option value="laudo">Laudo / exame</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          <div class="mt-3">
            <label class="label text-sm">Achados / descrição clínica</label>
            <textarea class="textarea auto-grow" rows="3" x-model="anexoEditandoMeta.achados"
                      placeholder="O que essa imagem mostra clinicamente? Aparece logo abaixo da imagem no PDF de cópia de prontuário."></textarea>
            <small class="muted">Se ficar em branco, o PDF imprime linhas para anotação manual após impressão.</small>
          </div>

          <div class="mt-3">
            <label class="label text-sm">Observações adicionais (opcional)</label>
            <textarea class="textarea auto-grow" rows="2" x-model="anexoEditandoMeta.observacoes"
                      placeholder="Notas privadas, contexto, hipóteses diferenciais"></textarea>
          </div>

          <div class="mt-4 flex justify-between" style="gap:8px; flex-wrap:wrap;">
            <button class="btn btn-ghost" style="color: var(--color-danger)" @click="removerAnexo()">
              <svg class="icon"><use href="#i-trash"></use></svg>
              Remover imagem
            </button>
            <div class="flex gap-2">
              <button class="btn btn-secondary" @click="fecharEditorAnexo()">Cancelar</button>
              <button class="btn btn-primary" @click="salvarAnexoMeta()">Salvar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function consultaForm(pacienteId, consultaId) {
  return {
    pacienteId: parseInt(pacienteId, 10),
    consultaId: consultaId,
    isNew: !consultaId,
    paciente: { nome: '', dataNascimento: '', sexo: '', tipoVaga: '' },
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

    // Sprint B2: anexos de imagem
    anexos: [],                  // [{ id, tipo, ordem, titulo, achados, observacoes, _thumbUrl }]
    processandoAnexo: false,
    progressoAnexo: '',
    anexoEditando: null,         // { id, ... } (a do anexo aberto no modal)
    anexoEditandoUrl: null,      // ObjectURL temporária da imagem grande
    anexoEditandoMeta: { titulo: '', achados: '', observacoes: '', tipo: 'foto' },
    _anexoThumbsUrls: [],        // ObjectURLs criadas, para liberar ao destruir

    // Sprint LAB: exames laboratoriais
    examesAberto: false,
    examesCategorias: (typeof ExamesLab !== 'undefined' ? ExamesLab.CATEGORIAS : []),
    examesTemplates: (typeof ExamesLab !== 'undefined' ? ExamesLab.TEMPLATES : []),
    categoriasExpandidas: {},    // { 'hemograma': true, ... }
    tfgCalculada: null,
    tfgEstagio: null,

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

        // Sprint B2: carregar anexos se consulta já existe
        if (!this.isNew && this.consultaId) {
          await this.recarregarAnexos();
        }

        // Sprint LAB: garantir estrutura de exames + calcular TFG inicial
        this._garantirEstruturaExames();
        this.atualizarTFG();
      } catch (e) {
        UI.toast('Erro ao carregar: ' + e.message, 'error');
      }
    },

    // === Sprint B2: anexos de imagem ===
    iconePorTipoAnexo(tipo) {
      if (tipo === 'ecg') return '📈';
      if (tipo === 'laudo') return '📄';
      if (tipo === 'outro') return '📋';
      return '📷';
    },

    _liberarThumbsAnexos() {
      // Libera ObjectURLs anteriormente criadas para evitar vazamento
      (this._anexoThumbsUrls || []).forEach(url => {
        try { URL.revokeObjectURL(url); } catch (_) {}
      });
      this._anexoThumbsUrls = [];
    },

    async recarregarAnexos() {
      try {
        const cId = typeof this.consultaId === 'string' ? parseInt(this.consultaId, 10) : this.consultaId;
        if (!cId) { this.anexos = []; return; }
        const lista = await DB.listAnexosByConsulta(cId);

        // Libera URLs anteriores
        this._liberarThumbsAnexos();

        // Cria ObjectURL para cada thumb
        this.anexos = lista.map(a => {
          let thumbUrl = null;
          if (a.thumbBytes) {
            const blob = new Blob([a.thumbBytes], { type: a.mimeType || 'image/jpeg' });
            thumbUrl = URL.createObjectURL(blob);
            this._anexoThumbsUrls.push(thumbUrl);
          }
          return { ...a, _thumbUrl: thumbUrl };
        });
      } catch (e) {
        console.warn('Erro ao carregar anexos:', e);
        UI.toast('Erro ao carregar anexos: ' + e.message, 'error');
      }
    },

    abrirSeletorAnexo() {
      if (this.isNew || !this.consultaId) {
        UI.toast('Salve a consulta antes de anexar imagens', 'error');
        return;
      }
      // dispara input file
      if (this.$refs.inputAnexo) {
        this.$refs.inputAnexo.value = '';  // reset para permitir mesmo arquivo de novo
        this.$refs.inputAnexo.click();
      }
    },

    async handleArquivoAnexo(evento) {
      const file = evento.target.files && evento.target.files[0];
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) {
        UI.toast('Selecione um arquivo de imagem', 'error');
        return;
      }
      this.processandoAnexo = true;
      this.progressoAnexo = 'lendo arquivo…';
      try {
        // 1. Comprimir
        this.progressoAnexo = 'comprimindo…';
        const processado = await ImagemUtil.processarArquivo(file);

        // 2. Cifrar e salvar
        this.progressoAnexo = 'cifrando e salvando…';
        const cId = typeof this.consultaId === 'string' ? parseInt(this.consultaId, 10) : this.consultaId;
        const id = await DB.createAnexo({
          consultaId: cId,
          pacienteId: this.pacienteId,
          tipo: 'foto',
          titulo: file.name.replace(/\.[^.]+$/, '').slice(0, 60),  // nome do arquivo sem extensão
          achados: '',
          observacoes: '',
          mimeType: processado.mimeType,
          tamanhoOriginal: processado.tamanhoOriginal,
          tamanhoComprimido: processado.tamanhoComprimido,
          largura: (processado.dimensoes && processado.dimensoes.largura) || 0,
          altura: (processado.dimensoes && processado.dimensoes.altura) || 0,
          bytes: processado.bytes,
          thumb: processado.thumb
        });

        UI.toast('Imagem anexada. Clique nela para descrever os achados.', 'success');
        await this.recarregarAnexos();

        // Abre direto o editor da imagem recém-adicionada (encoraja preencher os achados)
        const recem = this.anexos.find(a => a.id === id);
        if (recem) await this.abrirEditorAnexo(recem);
      } catch (e) {
        UI.toast('Erro ao processar imagem: ' + e.message, 'error');
      } finally {
        this.processandoAnexo = false;
        this.progressoAnexo = '';
      }
    },

    async abrirEditorAnexo(anexoLista) {
      try {
        const completo = await DB.getAnexoCompleto(anexoLista.id);
        if (!completo) {
          UI.toast('Anexo não encontrado', 'error');
          return;
        }
        // Libera URL anterior se houver
        if (this.anexoEditandoUrl) {
          try { URL.revokeObjectURL(this.anexoEditandoUrl); } catch (_) {}
        }
        // Cria ObjectURL para a imagem grande
        const blob = new Blob([completo.bytes], { type: completo.mimeType || 'image/jpeg' });
        this.anexoEditandoUrl = URL.createObjectURL(blob);
        this.anexoEditando = { id: completo.id };
        this.anexoEditandoMeta = {
          titulo: completo.titulo || '',
          achados: completo.achados || '',
          observacoes: completo.observacoes || '',
          tipo: completo.tipo || 'foto'
        };
        this.$nextTick(() => {
          document.querySelectorAll('.textarea.auto-grow').forEach(el => UI.autoGrowTextarea(el));
        });
      } catch (e) {
        UI.toast('Erro ao abrir imagem: ' + e.message, 'error');
      }
    },

    fecharEditorAnexo() {
      if (this.anexoEditandoUrl) {
        try { URL.revokeObjectURL(this.anexoEditandoUrl); } catch (_) {}
      }
      this.anexoEditandoUrl = null;
      this.anexoEditando = null;
    },

    async salvarAnexoMeta() {
      if (!this.anexoEditando) return;
      try {
        await DB.updateAnexoMeta(this.anexoEditando.id, {
          titulo: this.anexoEditandoMeta.titulo.trim(),
          achados: this.anexoEditandoMeta.achados.trim(),
          observacoes: this.anexoEditandoMeta.observacoes.trim(),
          tipo: this.anexoEditandoMeta.tipo
        });
        UI.toast('Imagem atualizada', 'success');
        this.fecharEditorAnexo();
        await this.recarregarAnexos();
      } catch (e) {
        UI.toast('Erro ao salvar: ' + e.message, 'error');
      }
    },

    async removerAnexo() {
      if (!this.anexoEditando) return;
      if (!confirm('Remover esta imagem? A ação preserva o registro auditável mas tira da visualização.')) return;
      try {
        await DB.softDeleteAnexo(this.anexoEditando.id);
        UI.toast('Imagem removida', 'success');
        this.fecharEditorAnexo();
        await this.recarregarAnexos();
      } catch (e) {
        UI.toast('Erro ao remover: ' + e.message, 'error');
      }
    },

    // === Sprint LAB: exames laboratoriais ===
    _garantirEstruturaExames() {
      if (!this.consulta.exames || typeof this.consulta.exames !== 'object') {
        this.consulta.exames = ExamesLab.estruturaVazia();
      }
      // Garante todos os campos esperados (consultas antigas podem ter estrutura parcial)
      const base = ExamesLab.estruturaVazia();
      for (const k of Object.keys(base)) {
        if (this.consulta.exames[k] === undefined || this.consulta.exames[k] === null) {
          this.consulta.exames[k] = base[k];
        } else if (typeof base[k] === 'object' && !Array.isArray(base[k])) {
          // mescla campos novos em subseções existentes
          for (const subk of Object.keys(base[k])) {
            if (this.consulta.exames[k][subk] === undefined) {
              this.consulta.exames[k][subk] = base[k][subk];
            }
          }
        }
      }
      if (!Array.isArray(this.consulta.exames._ativos)) {
        this.consulta.exames._ativos = [];
      }
    },

    examesPreenchidosCount() {
      if (!this.consulta.exames || typeof ExamesLab === 'undefined') return 0;
      const n = ExamesLab.listarPreenchidos(this.consulta.exames).length;
      const livre = (this.consulta.exames.outros_livre || '').trim() ? 1 : 0;
      return n + livre;
    },

    toggleCategoria(catId) {
      this.categoriasExpandidas[catId] = !this.categoriasExpandidas[catId];
    },

    categoriaExpandida(cat) {
      // Expandida se tem algum campo preenchido OU se foi ativada por template OU se está com toggle manual
      if (this.categoriasExpandidas[cat.id] !== undefined) return this.categoriasExpandidas[cat.id];
      if (!this.consulta.exames || !this.consulta.exames[cat.id]) return false;
      const grupo = this.consulta.exames[cat.id];
      // Se algum campo tem valor, expandir
      for (const c of cat.campos) {
        const v = grupo[c.id];
        if (v !== '' && v !== null && v !== undefined) return true;
      }
      if (cat.textoLivre && grupo[cat.textoLivre.id]) return true;
      // Se algum campo está no template ativo, expandir
      const ativos = (this.consulta.exames._ativos || []);
      if (ativos.some(a => a.startsWith(cat.id + '.'))) return true;
      return false;
    },

    campoAtivo(catId, campoId) {
      if (!this.consulta.exames || !this.consulta.exames._ativos) return false;
      return this.consulta.exames._ativos.includes(catId + '.' + campoId);
    },

    aplicarTemplateExames(templateId) {
      this._garantirEstruturaExames();
      ExamesLab.aplicarTemplate(this.consulta.exames, templateId);
      // Expande automaticamente as categorias com campos no template
      const ativos = this.consulta.exames._ativos || [];
      for (const a of ativos) {
        const cat = a.split('.')[0];
        this.categoriasExpandidas[cat] = true;
      }
      this.touch();
      const tpl = this.examesTemplates.find(t => t.id === templateId);
      UI.toast(`Template "${tpl ? tpl.nome : templateId}" aplicado — ${ativos.length} campos em destaque`, 'success');
    },

    limparTemplateExames() {
      if (this.consulta.exames) {
        this.consulta.exames._ativos = [];
        this.touch();
      }
    },

    atualizarTFG() {
      if (typeof ExamesLab === 'undefined') return;
      const cr = this.consulta.exames && this.consulta.exames.renal && this.consulta.exames.renal.creatinina;
      if (!cr) {
        this.tfgCalculada = null;
        this.tfgEstagio = null;
        return;
      }
      const idade = ExamesLab.idadeEmAnos(this.paciente && this.paciente.dataNascimento);
      const sexo = this.paciente && this.paciente.sexo;
      const tfg = ExamesLab.calcularTFG(cr, idade, sexo);
      this.tfgCalculada = tfg;
      this.tfgEstagio = tfg !== null ? ExamesLab.classificarTFG(tfg) : null;
    },

    touch() {
      this.autoSaveStatus = 'não salvo';
      if (this.touchedTimer) clearTimeout(this.touchedTimer);
      this.touchedTimer = setTimeout(() => {
        if (!this.isNew && !this.saving) this.salvar(true);  // auto-save silencioso
      }, 2000);
    },

    autoGrow(el) { UI.autoGrowTextarea(el); },
    calcAge(d) { return UI.calculateAge(d); },

    rotuloVagaConsulta(v) {
      return (window.ROTULOS_SOCIO && ROTULOS_SOCIO.tipoVaga[v]) || v;
    },
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
              if (!silencioso) UI.toast(`Retorno agendado para ${Agenda.formatarData(dataRetorno)}`, 'success');
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
      const temAlteracoesNaoSalvas = this.autoSaveStatus === 'não salvo';
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
    // Sprint LAB: exames laboratoriais inseridos no contexto da consulta
    exames: null,  // preenchido lazy via ExamesLab.estruturaVazia() quando o card é aberto
    conduta: '',
    retorno: '',
    sinaisAlerta: ''
  };
}

window.renderConsultaForm = renderConsultaForm;
window.consultaForm = consultaForm;
