# Testes — Consultório do Vovô

Suíte de testes automatizados que roda em **Node.js**, fora do navegador, validando
o comportamento real dos módulos e componentes do app. Não depende de servidor,
build, nem do Supabase — usa `fake-indexeddb` para simular o banco e mocks para
`fetch`, `localStorage` e `matchMedia`.

## Como rodar

```bash
# 1. Instalar as dependências de desenvolvimento (só uma vez)
npm install

# 2. Rodar a suíte inteira
npm test
# ou diretamente:
node tests/run.js

# Rodar só alguns arquivos (filtro por nome):
node tests/run.js crypto db
node tests/run.js sync
```

O runner roda cada arquivo `tests/test_*.js` como um subprocesso isolado (para que o
estado global de um teste — banco em memória, mocks — não vaze para outro), conta os
testes e sai com código ≠ 0 se algo falhar (útil para CI).

## O que é coberto

| Arquivo | Foco | Testes |
|---|---|---|
| `test_crypto.js` | Cofre, desbloqueio (senha/recuperação), cifragem de objetos e bytes, troca de senha, hash cego | 17 |
| `test_db.js` | CRUD de pacientes/consultas/agendamentos/templates/anexos, busca por hash, feed global, audit | 28 |
| `test_codigos_clinicos.js` | Normalização de hipóteses (string↔objeto), busca CIAP/CID, badges | 15 |
| `test_exames_lab.js` | TFG CKD-EPI 2021, estágios DRC (G1–G5), estrutura de categorias, templates | 22 |
| `test_agenda.js` | Parser PT-BR de prazos, cálculo de datas futuras, utilitários | 19 |
| `test_hiperdia.js` | Parser de PA, classificação de risco, semáforo, priorização | 38 |
| `test_tema.js` | Modos light/dark/auto, toggle cíclico, persistência, reação ao sistema | 12 |
| `test_sync.js` | Empacotamento, ext_id, last-write-wins, deleção remota, DEK incompatível | 11 |
| `test_supabase_client.js` | Cliente REST: vault_id, urlValida, upload/download, contagem (mock fetch) | 16 |
| `test_socio_persistencia.js` | Campos socioeconômicos sobrevivem ao ciclo cifrar→salvar→ler + retrocompat | 5 |
| `test_consultas_recentes.js` | Feed cross-paciente, ordenação, cache de nomes, filtros | 14 |
| `test_refresh_visual.js` | Condições crônicas por CIAP, helpers da lista, renderização | 14 |
| `test_componentes_render.js` | Smoke tests: cada `renderX()` injeta HTML sem lançar (jsdom) | 18 |
| `test_sw_consistency.js` | Todo script existe no disco e no precache; CACHE_VERSION ↔ version.json; rotas | 9 |

**Total: 238 testes.**

## Estrutura

- `helpers.js` — infraestrutura compartilhada: `section/test/run`, asserts
  (`assert`, `assertEq`, `assertDeep`, `assertThrows`, `assertRejects`,
  `assertIncludes`), e setup de ambiente (`setupWindow`, `setupDOM`, `setupVault`,
  `evalApp`, `loadDexie`).
- `run.js` — descobre e executa todos os `test_*.js`, agrega resultados.
- `test_*.js` — um arquivo por área.

## Notas técnicas

- Módulos que rodam no navegador via `window.X = X` ganharam um rodapé
  `if (typeof module !== 'undefined' && module.exports) module.exports = window.X;`.
  Isso **não afeta o GitHub Pages** (ambiente estático, sem CommonJS) — só permite
  carregar o módulo com `require()` nos testes.
- Os testes de banco/sync usam `fake-indexeddb`; os de rede usam um `fetch` mockado;
  os de tema usam mocks de `localStorage` e `matchMedia`.
- `test_sw_consistency.js` é um guarda de release: se você adicionar um componente e
  esquecer de cabear no HTML ou no precache do service worker, ele falha. Também
  garante que `CACHE_VERSION` e `version.json` estão sincronizados.

## Ao adicionar uma feature nova

1. Escreva/atualize o teste correspondente em `tests/`.
2. Rode `npm test` — deve ficar tudo verde.
3. Se criou um componente novo, confirme que `test_sw_consistency` continua passando
   (ou seja, que você cabeou o script no HTML e no service worker).
4. Ao subir de versão, atualize `version.json` **e** `CACHE_VERSION` no
   `service-worker.js` para o mesmo número.
