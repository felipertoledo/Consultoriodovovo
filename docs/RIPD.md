# Relatório de Impacto à Proteção de Dados Pessoais (RIPD)

**Sistema:** Consultório do Vovô
**Controlador:** Felipe Ribeiro Toledo — CRM-SP 216.986
**Versão do documento:** 1.0
**Data:** 22 de maio de 2026
**Próxima revisão:** maio de 2027

---

## 1. Descrição do tratamento

### 1.1 Finalidade
Registro eletrônico de consultas médicas prestadas pelo Dr. Felipe Ribeiro Toledo
em sua prática individual de Medicina de Família e Comunidade, incluindo
atendimentos online.

### 1.2 Base legal
Art. 11, II, "a" da Lei 13.709/2018 (tutela da saúde por profissional de saúde).
Complementarmente, Lei 13.787/2018 e Resolução CFM 1.821/2007.

### 1.3 Categorias de dados
- **Pessoais comuns:** nome, data de nascimento, sexo, estado civil, profissão,
  escolaridade, endereço, telefones, e-mail, contato de emergência.
- **Pessoais sensíveis (art. 5º, II, LGPD):** dados de saúde física, dados de
  saúde mental, dados biométricos (eventualmente — imagens de exames).
- **Documentos:** CPF, RG, CNS.

### 1.4 Titulares
Pacientes do médico controlador, em número estimado entre 50 e 500.

### 1.5 Tempo de retenção
Mínimo de **20 anos** após o último registro (Lei 13.787/2018, art. 6º).

---

## 2. Necessidade e proporcionalidade

| Item | Avaliação |
|------|-----------|
| Os dados coletados são estritamente necessários? | **Sim.** Apenas dados necessários ao atendimento. |
| Há minimização de dados? | **Sim.** Campos opcionais marcados como tal; nada coletado "por padrão". |
| Há base legal adequada? | **Sim.** Tutela da saúde, art. 11, II, "a". |
| O titular foi informado? | **Sim.** Termo de consentimento na primeira consulta. |

---

## 3. Riscos identificados e medidas de mitigação

### 3.1 Risco: vazamento de dados clínicos sensíveis

**Probabilidade:** Baixa
**Impacto:** Alto (pode causar dano moral, discriminação, exposição íntima)

**Medidas de mitigação:**
- Criptografia client-side **AES-GCM 256** de todos os dados antes do
  armazenamento.
- Chave derivada via **PBKDF2 SHA-256 com 600.000 iterações** a partir da
  senha mestra do médico (recomendação OWASP 2023+).
- A chave nunca sai do navegador.
- Mesmo um backup eventual em nuvem só armazena conteúdo já criptografado
  (modelo zero-knowledge).

### 3.2 Risco: acesso não autorizado ao dispositivo do médico

**Probabilidade:** Baixa-média
**Impacto:** Alto

**Medidas de mitigação:**
- Senha mestra mínima de 12 caracteres.
- Bloqueio automático após 15 minutos de inatividade.
- Senha do médico não é armazenada em nenhum lugar (nem hash) — apenas
  derivada para descriptografar o cofre.

### 3.3 Risco: perda permanente de dados (senha esquecida)

**Probabilidade:** Média (humana)
**Impacto:** Crítico

**Medidas de mitigação:**
- **Chave de recuperação** Crockford Base32 de 160 bits gerada no setup
  inicial, criptografada via mecanismo independente (envelope encryption).
- Instrução clara ao médico para anotar em local físico seguro.
- Possibilidade de baixar/imprimir a chave no momento da geração.

### 3.4 Risco: corrupção do IndexedDB (perda de dados)

**Probabilidade:** Baixa
**Impacto:** Médio-alto

**Medidas de mitigação (planejadas em próximas sprints):**
- Backup local automático em formato `.json.enc`.
- Sincronização opcional com Supabase como espelho remoto.
- Versionamento de schema com migrations explícitas.

### 3.5 Risco: ataque XSS via dependências CDN

**Probabilidade:** Baixa
**Impacto:** Alto

**Medidas de mitigação:**
- Uso de bibliotecas amplamente auditadas (Dexie.js, Alpine.js) com versões
  fixadas.
- Subresource Integrity (SRI) a ser implementada na próxima versão.
- Conteúdo controlado pelo próprio médico no GitHub Pages.

### 3.6 Risco: validade jurídica (ausência de NGS2)

**Probabilidade:** Alta de existir
**Impacto:** Médio

**Medidas de mitigação:**
- Operação deliberada em NGS1 + manutenção do prontuário **impresso e
  assinado** após cada consulta.
- Documento físico assinado é o documento juridicamente válido.
- Sistema digital opera como ferramenta de apoio e organização.

---

## 4. Resumo e conclusão

O sistema Consultório do Vovô implementa medidas técnicas e organizacionais
**compatíveis com o risco** envolvido no tratamento de dados sensíveis de
saúde em uma prática médica individual de baixo volume.

A combinação de **criptografia client-side**, **modelo local-first**,
**chave de recuperação independente** e **manutenção complementar do
prontuário físico** oferece um nível de proteção aceitável e defensável
do ponto de vista da LGPD e da regulamentação do CFM.

Limitações conhecidas e assumidas:
- Não há certificação SBIS/CFM NGS2.
- Não há assinatura digital ICP-Brasil (planejada para versão futura via
  integração Bird ID).
- Há dependência da disciplina do médico em manter a chave de recuperação
  e o prontuário físico atualizados.

---

*Felipe Ribeiro Toledo — Médico — CRM-SP 216.986*
*Encarregado pelo Tratamento de Dados Pessoais (LGPD)*
