/* ================================================================
   modules/imagem.js — Sprint B2: compressão de imagens
   - Lê arquivo de imagem (File ou Blob)
   - Redimensiona via Canvas (preservando proporção)
   - Comprime em JPEG ou WebP
   - Gera Uint8Array para passar ao crypto
   ================================================================ */
(function () {
  'use strict';

  const PADRAO_MAX_LADO = 1920;     // px da imagem completa
  const PADRAO_QUALIDADE = 0.85;     // JPEG quality
  const PADRAO_THUMB_LADO = 240;     // px do thumb
  const PADRAO_THUMB_QUALIDADE = 0.7;

  /**
   * Lê um File como dataURL.
   */
  function lerArquivoComoDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Carrega uma dataURL em um <img> e devolve quando carregar.
   */
  function carregarImagem(dataURL) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Falha ao decodificar imagem'));
      img.src = dataURL;
    });
  }

  /**
   * Redimensiona uma imagem em <canvas>. Preserva proporção.
   * Se a imagem já é menor que maxLado, mantém tamanho original.
   */
  function desenharRedimensionado(img, maxLado) {
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w <= 0 || h <= 0) throw new Error('Imagem com dimensões inválidas');

    const maior = Math.max(w, h);
    if (maior > maxLado) {
      const fator = maxLado / maior;
      w = Math.round(w * fator);
      h = Math.round(h * fator);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, width: w, height: h };
  }

  /**
   * Converte um canvas em Blob com tipo e qualidade especificados.
   */
  function canvasParaBlob(canvas, mimeType, qualidade) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error('Falha ao gerar blob'));
          else resolve(blob);
        },
        mimeType || 'image/jpeg',
        qualidade != null ? qualidade : PADRAO_QUALIDADE
      );
    });
  }

  /**
   * Converte um Blob em Uint8Array.
   */
  async function blobParaBytes(blob) {
    const ab = await blob.arrayBuffer();
    return new Uint8Array(ab);
  }

  /**
   * Pipeline completo: lê arquivo → carrega → redimensiona → comprime → bytes.
   * Devolve { bytes (Uint8Array), thumb (Uint8Array), mimeType, dimensoes, tamanhoOriginal, tamanhoComprimido }
   */
  async function processarArquivo(file, opcoes) {
    opcoes = opcoes || {};
    const maxLado = opcoes.maxLado || PADRAO_MAX_LADO;
    const qualidade = opcoes.qualidade || PADRAO_QUALIDADE;
    const thumbLado = opcoes.thumbLado || PADRAO_THUMB_LADO;
    const thumbQualidade = opcoes.thumbQualidade || PADRAO_THUMB_QUALIDADE;

    const tamanhoOriginal = file.size;
    if (tamanhoOriginal > 30 * 1024 * 1024) {
      throw new Error('Imagem maior que 30 MB — reduza antes de anexar');
    }

    const dataURL = await lerArquivoComoDataURL(file);
    const img = await carregarImagem(dataURL);

    // Imagem comprimida principal
    const grande = desenharRedimensionado(img, maxLado);
    // Sempre JPEG por compatibilidade ampla com jspdf.addImage
    const blobGrande = await canvasParaBlob(grande.canvas, 'image/jpeg', qualidade);
    const bytesGrande = await blobParaBytes(blobGrande);

    // Thumb
    const thumb = desenharRedimensionado(img, thumbLado);
    const blobThumb = await canvasParaBlob(thumb.canvas, 'image/jpeg', thumbQualidade);
    const bytesThumb = await blobParaBytes(blobThumb);

    return {
      bytes: bytesGrande,
      thumb: bytesThumb,
      mimeType: 'image/jpeg',
      dimensoes: { largura: grande.width, altura: grande.height },
      tamanhoOriginal,
      tamanhoComprimido: bytesGrande.byteLength,
      thumbDimensoes: { largura: thumb.width, altura: thumb.height }
    };
  }

  /**
   * Helper: converte Uint8Array em dataURL para uso em <img src>.
   * Usado para mostrar thumbs e imagens já cifradas e decifradas.
   */
  function bytesParaDataURL(bytes, mimeType) {
    const mime = mimeType || 'image/jpeg';
    // Usa Blob → URL.createObjectURL (lib ria memória; melhor que dataURL gigante)
    // Mas para PDFs precisamos de dataURL. Vamos retornar dataURL aqui.
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    // Converter em base64 chunked para evitar stack overflow
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    }
    return `data:${mime};base64,${btoa(bin)}`;
  }

  /**
   * Helper: cria URL temporária para exibição (melhor para galeria com muitos thumbs).
   * Devolve um objeto com `url` e `dispose()` para liberar.
   */
  function bytesParaObjectURL(bytes, mimeType) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const blob = new Blob([u8], { type: mimeType || 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    return {
      url,
      dispose: () => URL.revokeObjectURL(url)
    };
  }

  const api = {
    processarArquivo,
    bytesParaDataURL,
    bytesParaObjectURL,
    // Para testes
    desenharRedimensionado,
    PADRAO_MAX_LADO,
    PADRAO_THUMB_LADO
  };

  if (typeof window !== 'undefined') window.ImagemUtil = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
