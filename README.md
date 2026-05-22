# Consultório do Vovô

> Prontuário eletrônico de uso individual, com criptografia client-side e arquitetura local-first.

**Felipe Ribeiro Toledo — Médico — CRM-SP 216.986**

[![Deploy Status](https://github.com/felipertoledo/consultorio-do-vovo/actions/workflows/deploy.yml/badge.svg)](https://github.com/felipertoledo/consultorio-do-vovo/actions)

---

## ✨ O que é

Sistema de prontuário eletrônico para uso individual do Dr. Felipe em atendimentos online,
hospedado no GitHub Pages e operando 100% no navegador.

**Princípios:**

- 🔐 **Privacidade por design.** Todos os dados são cifrados com AES-GCM 256 no próprio navegador, antes de qualquer armazenamento.
- 📴 **Local-first.** Funciona offline. Os dados ficam no IndexedDB do navegador.
- 🆓 **Hospedagem gratuita.** GitHub Pages para o frontend, sem backend obrigatório.
- 🛠️ **Em construção contínua.** Iteração rápida, sem build step, sem framework pesado.

## 🚀 Funcionalidades (v0.1.0)

- ✅ Setup inicial com senha mestra + chave de recuperação
- ✅ Login com senha ou chave de recuperação
- ✅ Cadastro completo de pacientes (24 campos)
- ✅ Listagem com busca em tempo real
- ✅ Edição de pacientes
- ✅ Soft-delete (mantém 20 anos por exigência legal)
- ✅ Trilha de auditoria local
- ✅ Bloqueio automático após 15 min sem uso
- ✅ Troca de senha (re-cifragem do envelope)
- ✅ Reset total para troca de equipamento

## 🗺️ Roadmap

| Sprint | Entrega | Status |
|--------|---------|--------|
| 0 — Fundações | GitHub Pages + deploy automático + docs LGPD | ✅ |
| 1 — Local-first MVP | Cadastro de pacientes + criptografia | ✅ |
| 2 — Prontuário | 18 domínios de exame psíquico + anamnese | 🔜 |
| 3 — PDFs | Receita, atestado, impressão sem dados pessoais | 🔜 |
| 4 — Sync Supabase | Backup criptografado em nuvem opcional | 🔜 |
| 5 — Robustez | Service Worker + auto-backup + export `.json.enc` | 🔜 |
| 6+ | TOTP 2FA, integração Memed, Bird ID (ICP-Brasil → NGS2) | 🔜 |

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────┐
│  Navegador do médico                        │
│  ┌─────────────────────────────────────┐   │
│  │  UI (HTML + Alpine.js + Tailwind)   │   │
│  └────────────┬────────────────────────┘   │
│               │                             │
│  ┌────────────┴────────────────────────┐   │
│  │  modules/                            │   │
│  │  • crypto.js  (PBKDF2 + AES-GCM)    │   │
│  │  • db.js      (Dexie wrapper)       │   │
│  │  • auth.js    (senha + idle lock)   │   │
│  │  • router.js  (hash routing)        │   │
│  └────────────┬────────────────────────┘   │
│               │                             │
│  ┌────────────┴────────────────────────┐   │
│  │  IndexedDB (Dexie)                  │   │
│  │  ┌────────────────────────────┐    │   │
│  │  │ Payloads cifrados AES-GCM  │    │   │
│  │  └────────────────────────────┘    │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
            │ (Sprint 4)
            ▼
┌─────────────────────────────────────────────┐
│  Supabase (espelho criptografado)           │
│  Backend nunca vê dados em claro            │
└─────────────────────────────────────────────┘
```

## 🔐 Segurança

| Camada | Implementação |
|--------|---------------|
| Derivação de chave | PBKDF2-SHA256 com 600.000 iterações (OWASP 2023+) |
| Criptografia simétrica | AES-GCM 256 bits |
| Envelope encryption | DEK aleatória embrulhada com KEK derivada da senha + KEK derivada da chave de recuperação |
| Chave de recuperação | 160 bits de entropia em Crockford Base32 |
| Transporte | HTTPS (GitHub Pages) |
| Idle lock | 15 minutos |
| Trilha de auditoria | Append-only log local |

## 📋 Conformidade

- ✅ **LGPD** (Lei 13.709/2018) — base legal art. 11, II, "a"
- ✅ **Lei 13.787/2018** — guarda de 20 anos
- ✅ **Resolução CFM 1.821/2007** — operação em NGS1 + papel
- ⏳ **NGS2** (ICP-Brasil) — planejado para versão futura

Documentos:

- [Política de Privacidade](docs/PRIVACIDADE.md)
- [Termo de Consentimento](docs/TERMO_CONSENTIMENTO.md)
- [Relatório de Impacto (RIPD)](docs/RIPD.md)

## 🧑‍💻 Desenvolvimento

Não tem build step. Edite e dê push.

```bash
git clone https://github.com/felipertoledo/consultorio-do-vovo.git
cd consultorio-do-vovo

# Servir localmente (para testar)
python3 -m http.server 8000
# ou
npx serve .

# Acesse http://localhost:8000
```

**Stack:**

- **Alpine.js 3.x** — reatividade (sem build)
- **Dexie.js 4.x** — wrapper IndexedDB
- **Web Crypto API nativa** — PBKDF2 + AES-GCM
- **CSS custom** com design tokens
- **GitHub Actions** — deploy automático

## ⚠️ Avisos

- Este é um sistema **de uso individual** do Dr. Felipe. Não é um produto multi-usuário.
- A senha mestra **não pode ser recuperada** — apenas via chave de recuperação Crockford.
- Faça **backup periódico** (export do IndexedDB) em pendrive físico separado.
- O documento físico assinado continua sendo o prontuário juridicamente válido.

## 📄 Licença

Código sob licença MIT. Conteúdo clínico e documentos sob CC BY-SA 4.0.

---

*Felipe Ribeiro Toledo — Médico — CRM-SP 216.986*
*UBS Estiva Gerbi / Bairro Ludi*
