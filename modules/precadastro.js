/* ============================================================
   modules/precadastro.js
   Codificação/decodificação da ficha de pré-cadastro do paciente.

   FLUXO
   -----
   1. O paciente abre a página pública pre-cadastro.html e preenche.
   2. A página gera um código  "CDV1:<base64(JSON)>".
   3. O paciente envia o código ao consultório (WhatsApp / copiar).
   4. No app, o médico cola o código e os campos são lançados na
      ficha de novo paciente — depois é só revisar e salvar.

   ZERO-KNOWLEDGE: o código viaja direto paciente → médico; nada
   passa por servidor. Este módulo só traduz código <-> objeto e
   monta o link público da ficha.

   IMPORTANTE: PREFIXO e CAMPOS espelham pre-cadastro.html.
   Se mudar a lista de campos lá, atualizar aqui também.
   ============================================================ */
(function (root) {
  'use strict';

  var PREFIXO = 'CDV1:';

  // Mesma lista (e ordem) de pre-cadastro.html
  var CAMPOS = [
    'nome', 'dataNascimento', 'sexo', 'identidadeGenero', 'estadoCivil',
    'profissao', 'escolaridade', 'tipoVaga', 'rendaPessoal', 'rendaFamiliar',
    'fonteRenda', 'cpf', 'rg', 'cns', 'convenio', 'whatsapp', 'telefone',
    'email', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade',
    'uf', 'cep', 'emergenciaNome', 'emergenciaParentesco',
    'emergenciaTelefone', 'observacoes'
  ];

  var MAX = 2000; // limite por campo (anti-abuso / payload enxuto)

  // ---- base64 <-> UTF-8 (compatível browser + Node) ----
  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64ToUtf8(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // ---- Filtra um objeto: só campos conhecidos, como string aparada ----
  // Protege contra prototype pollution e chaves desconhecidas (códigos
  // possivelmente forjados): só copia chaves OWN que estejam em CAMPOS.
  function limpar(obj) {
    var out = {};
    if (!obj || typeof obj !== 'object') return out;
    for (var i = 0; i < CAMPOS.length; i++) {
      var k = CAMPOS[i];
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var v = obj[k];
      if (v == null) continue;
      v = String(v).slice(0, MAX).trim();
      if (v) out[k] = v;
    }
    return out;
  }

  // ---- objeto -> código CDV1: ----
  function encode(obj) {
    return PREFIXO + utf8ToB64(JSON.stringify(limpar(obj)));
  }

  // ---- Detecção rápida: a string contém um código CDV1:? ----
  function pareceCodigo(str) {
    if (str == null) return false;
    return /CDV1:[A-Za-z0-9+/]/.test(String(str));
  }

  // ---- código (mesmo embutido em texto) -> objeto ----
  // Aceita "Oi doutor, segue: CDV1:xxxx valeu" e extrai só o código.
  // Lança Error quando NÃO há um código decodificável (string sem
  // prefixo, vazia, nula ou base64/JSON corrompido). O chamador deve
  // tratar com try/catch. Quando há código mas nenhum campo válido
  // sobra após a sanitização, retorna {} (não lança).
  function decode(str) {
    if (str == null) throw new Error('Nenhum código informado');
    var s = String(str);
    var m = s.match(/CDV1:([A-Za-z0-9+/]+={0,2})/);
    if (!m) throw new Error('Código não encontrado — ele deve começar com CDV1:');
    var json;
    try { json = b64ToUtf8(m[1]); }
    catch (e) { throw new Error('Código corrompido (não foi possível ler)'); }
    var obj;
    try { obj = JSON.parse(json); }
    catch (e) { throw new Error('Código corrompido (conteúdo ilegível)'); }
    return limpar(obj);
  }

  // ---- Link público da ficha de pré-cadastro ----
  // Usa a mesma origem/pasta do app, trocando o arquivo final por
  // pre-cadastro.html. Funciona em qualquer host (GitHub Pages, local).
  // baseHref opcional (testes / host fixo).
  function linkFicha(baseHref) {
    var href = baseHref;
    if (!href && typeof location !== 'undefined') href = location.href;
    if (!href) return 'pre-cadastro.html';
    href = href.split('#')[0].split('?')[0];      // remove query/hash
    return href.replace(/[^/]*$/, 'pre-cadastro.html'); // troca último segmento
  }

  // ---- Mensagem amigável + link, pronta para WhatsApp ----
  function mensagemFicha(baseHref) {
    var link = linkFicha(baseHref);
    return 'Olá! Antes da sua consulta, preencha sua ficha rápida neste link:\n'
      + link
      + '\n\nLeva poucos minutos e é seguro: seus dados não ficam em nenhum site, '
      + 'vão direto para o consultório.';
  }

  var API = {
    PREFIXO: PREFIXO,
    CAMPOS: CAMPOS,
    limpar: limpar,
    encode: encode,
    decode: decode,
    pareceCodigo: pareceCodigo,
    linkFicha: linkFicha,
    mensagemFicha: mensagemFicha
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PreCadastro = API;

})(typeof globalThis !== 'undefined' ? globalThis : this);
