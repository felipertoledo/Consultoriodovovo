# Política de Privacidade — Consultório do Vovô

**Versão 1.0 · 22 de maio de 2026**

---

## 1. Quem somos

O **Consultório do Vovô** é um sistema de prontuário eletrônico de uso individual
mantido pelo médico **Felipe Ribeiro Toledo**, inscrito no CRM-SP sob o nº 216.986,
para registro dos atendimentos prestados por ele aos seus pacientes.

- **Controlador dos dados:** Felipe Ribeiro Toledo (CRM-SP 216.986)
- **Encarregado (DPO) pela LGPD:** Felipe Ribeiro Toledo (acumula a função, conforme
  Resolução ANPD nº 2/2022, art. 11, que flexibiliza o requisito para agentes de
  tratamento de pequeno porte)
- **Contato:** felipertoledo@gmail.com

## 2. O que coletamos

Apenas dados estritamente necessários ao atendimento médico:

**Dados de identificação:** nome, data de nascimento, sexo, identidade de gênero
(opcional), estado civil, profissão, escolaridade, CPF, RG, CNS, convênio.

**Dados de contato:** WhatsApp, telefone, e-mail, endereço completo.

**Dados de contato de emergência:** nome, parentesco/vínculo, telefone.

**Dados clínicos** (sensíveis, art. 5º, II, LGPD): queixa principal, história
da doença atual, antecedentes pessoais e familiares, medicações em uso, exame
físico, exame psíquico, hipóteses diagnósticas, plano terapêutico, evoluções.

## 3. Por que coletamos (base legal)

O tratamento desses dados encontra base legal no **art. 11, II, "a", da LGPD**,
que autoriza o tratamento de dados sensíveis para "tutela da saúde,
exclusivamente, em procedimento realizado por profissionais de saúde, serviços
de saúde ou autoridade sanitária".

Adicionalmente, a Lei 13.787/2018 e a Resolução CFM 1.821/2007 disciplinam
a guarda do prontuário eletrônico.

## 4. Como protegemos os dados

- **Criptografia em repouso:** todos os dados clínicos e de identificação são
  cifrados com **AES-GCM 256 bits** no próprio navegador, antes de chegarem
  ao armazenamento (IndexedDB).
- **Chave derivada da senha mestra:** a chave de criptografia é gerada a partir
  da senha do médico via **PBKDF2 com 600.000 iterações** (alinhado às
  recomendações OWASP 2023+). A senha nunca sai do navegador.
- **Criptografia em trânsito:** acesso ao sistema exclusivamente por HTTPS.
- **Controle de acesso:** senha mestra + bloqueio automático após 15 minutos
  de inatividade.
- **Trilha de auditoria:** todas as operações de criação, leitura, alteração
  e exclusão são registradas localmente com timestamp.
- **Chave de recuperação:** gerada uma única vez no setup, guardada pelo
  médico em local físico seguro.

## 5. Compartilhamento

Os dados **não são compartilhados** com terceiros. O sistema opera em modelo
**local-first** — todos os dados ficam no navegador do médico.

Eventual sincronização opcional com serviço de nuvem (Supabase) ocorre
**apenas com dados já criptografados** no próprio navegador, em modelo
zero-knowledge (o provedor não tem acesso ao conteúdo).

## 6. Tempo de guarda

Conforme o **art. 6º da Lei nº 13.787/2018**, o prazo mínimo de guarda do
prontuário é de **20 anos a contar do último registro**.

## 7. Direitos do titular (paciente)

Conforme o art. 18 da LGPD, o paciente tem direito a:

- **Confirmação** da existência de tratamento de seus dados;
- **Acesso** aos seus dados;
- **Correção** de dados incompletos, inexatos ou desatualizados;
- **Anonimização, bloqueio ou eliminação** de dados desnecessários, excessivos
  ou tratados em desconformidade com a LGPD;
- **Portabilidade** dos dados a outro fornecedor de serviço;
- **Eliminação** dos dados tratados com consentimento (ressalvada a obrigação
  legal de guarda do prontuário);
- **Informação** sobre as entidades públicas e privadas com as quais os dados
  são compartilhados (no nosso caso: nenhuma);
- **Revogação do consentimento** (não impede a continuidade do atendimento,
  pois a base legal é a tutela da saúde, não o consentimento).

Para exercer qualquer desses direitos, basta entrar em contato com o médico
pelo e-mail informado no item 1.

## 8. Limitações

O sistema é uma ferramenta de apoio individual. Operamos em **Nível de Garantia
de Segurança 1 (NGS1)** conforme a Resolução CFM 1.821/2007 — o prontuário
digital é complementar ao registro físico assinado, que continua sendo o
documento juridicamente válido para fins de prova.

## 9. Alterações desta política

Esta política pode ser atualizada. A versão vigente está sempre disponível
em `/docs/PRIVACIDADE.md` no repositório do sistema.

---

*Felipe Ribeiro Toledo — Médico — CRM-SP 216.986*
