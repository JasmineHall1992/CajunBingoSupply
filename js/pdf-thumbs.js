// Shared PDF.js thumbnail rendering — draws page 1 of a PDF flyer onto a
// canvas, scaled to fit entirely within it (the canvas equivalent of
// object-fit: contain for an <img>), letterboxed on whichever axis has
// leftover space. Used anywhere a flyer preview needs to look like a real
// image instead of an embedded PDF viewer (which shows its own native
// scrollbar/controls when the page is taller than the preview box).
//
// Requires pdfjs-dist's pdf.min.js to be loaded first, and this script to
// be included from a page under /pages/ (the worker path below is relative
// to that).

pdfjsLib.GlobalWorkerOptions.workerSrc = '../js/vendor/pdf.worker.min.js';

async function renderPdfThumb(url, canvas, targetW, targetH, onError) {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000));
    const render = (async () => {
      const pdf = await pdfjsLib.getDocument(url).promise;
      const page = await pdf.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(targetW / baseViewport.width, targetH / baseViewport.height);
      const viewport = page.getViewport({ scale });
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.translate((targetW - viewport.width) / 2, (targetH - viewport.height) / 2);
      await page.render({ canvasContext: ctx, viewport }).promise;
    })();
    await Promise.race([render, timeout]);
  } catch (err) {
    if (onError) onError(canvas);
  }
}

// Renders every canvas matching `selector` (each needs a data-pdf-url
// attribute) at its own actual displayed size, times devicePixelRatio for
// sharpness on retina screens.
function renderPdfCardThumbs(selector, onError) {
  document.querySelectorAll(selector).forEach(canvas => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = w;
    canvas.height = h;
    renderPdfThumb(canvas.dataset.pdfUrl, canvas, w, h, onError);
  });
}
