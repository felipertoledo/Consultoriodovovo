/* ============================================================
   service-worker.js — Cache versionado, offline-first

   ESTRATÉGIAS:
   • Assets estáticos (html/css/js/lib/img): Cache-First
     → carrega instantâneo do cache; network só na primeira vez ou miss
   • version.json: Network-First com fallback ao cache
     → permite detectar atualizações sem ficar travado offline
   • Tudo o resto (api/IndexedDB): passa direto (não interceptado)

   VERSIONAMENTO:
   Cada deploy nova versão muda CACHE_NAME → cache antigo é
   purgado no activate. Browser detecta novo SW e dispara
   `updatefound`; o index.html mostra banner pro usuário.
   ============================================================ */

const CACHE_VERSION = 'v0.21.2';
const CACHE_NAME = `cdv-cache-${CACHE_VERSION}`;

// Lista exaustiva de arquivos a pré-cachear no install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',

  // Estilos
  './assets/css/tokens.css',
  './assets/css/app.css',

  // Bibliotecas vendored
  './assets/lib/dexie.min.js',
  './assets/lib/alpine.min.js',
  './assets/lib/jspdf.umd.min.js',
  './assets/lib/pdf-lib.min.js',
  './assets/lib/forge.min.js',
  './assets/lib/zgapdfsigner.min.js',

  // Ícones PWA
  './assets/img/favicon.svg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/icon-maskable-512.png',
  './assets/img/apple-touch-icon.png',

  // Módulos core
  './modules/crypto.js',
  './modules/ui.js',
  './modules/db.js',
  './modules/auth.js',
  './modules/router.js',
  './modules/clinical-data.js',
  './assets/data/ciap2.js',
  './assets/data/cid10-aps.js',
  './modules/codigos-clinicos.js',
  './modules/prosa-generator.js',
  './modules/share.js',
  './modules/signer.js',
  './modules/pdf-builder.js',
  './modules/pdf-documents.js',
  './modules/pdf-documents-extra.js',
  './modules/backup.js',
  './modules/agenda.js',
  './modules/imagem.js',
  './modules/exames-lab.js',
  './modules/supabase-client.js',
  './modules/sync.js',
  './modules/hiperdia.js',
  './modules/sparkline.js',
  './modules/tema.js',

  // Componentes de tela
  './components/setup-wizard.js',
  './components/login.js',
  './components/dashboard.js',
  './components/pacientes-lista.js',
  './components/paciente-form.js',
  './components/exame-psiquico.js',
  './components/consulta-form.js',
  './components/documentos.js',
  './components/config.js',
  './components/prescricao-rapida.js',
  './components/agenda.js',
  './components/templates-prescricao.js',
  './components/sync.js',
  './components/hiperdia.js',
  './components/consultas-recentes.js'
];

// -----------------------------------------------------------
// INSTALL — baixa todos os assets para o cache + skipWaiting agressivo
// -----------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // addAll é atômico — se uma falhar, o cache não fica meia-boca
      try {
        await cache.addAll(PRECACHE_ASSETS);
        console.log(`[SW] ${CACHE_VERSION} instalado, ${PRECACHE_ASSETS.length} assets em cache`);
      } catch (e) {
        console.error('[SW] Falha no precache:', e);
        throw e;
      }
      // skipWaiting automático: novo SW ativa logo, sem esperar o usuário clicar
      // (banner ainda aparece, mas mesmo se usuário ignorar, a próxima recarga já tem update)
      await self.skipWaiting();
    })()
  );
});

// -----------------------------------------------------------
// ACTIVATE — remove caches de versões anteriores
// -----------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const oldCaches = names.filter(n => n.startsWith('cdv-cache-') && n !== CACHE_NAME);
      await Promise.all(oldCaches.map(n => {
        console.log(`[SW] Removendo cache antigo: ${n}`);
        return caches.delete(n);
      }));
      // Toma controle de abas abertas IMEDIATAMENTE depois do skipWaiting
      await self.clients.claim();
      console.log(`[SW] ${CACHE_VERSION} ativo`);
    })()
  );
});

// -----------------------------------------------------------
// MESSAGE — recebe comandos do app (skipWaiting, etc)
// -----------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

// -----------------------------------------------------------
// FETCH — interceptação de requests
// -----------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só interceptamos GET; outros métodos passam direto
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Não interceptamos requests cross-origin (CDNs externos remanescentes,
  // analytics, etc) — só requests do mesmo origin
  if (url.origin !== self.location.origin) return;

  // Estratégia 1: version.json → Network-First
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Estratégia 2: tudo o resto do mesmo origin → Cache-First
  event.respondWith(cacheFirst(req));
});

// -----------------------------------------------------------
// Helpers de estratégia
// -----------------------------------------------------------
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;

  // Cache miss: vai na rede
  try {
    const resp = await fetch(req);
    if (resp.ok) {
      // Armazena para próxima vez
      cache.put(req, resp.clone()).catch(() => {});
    }
    return resp;
  } catch (e) {
    // Sem rede e sem cache: retorna response vazia
    return new Response('Recurso indisponível offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const resp = await fetch(req);
    if (resp.ok) {
      cache.put(req, resp.clone()).catch(() => {});
    }
    return resp;
  } catch (e) {
    // Sem rede: tenta cache
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response('{"version":"?","buildDate":"?","offline":true}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
