// Shared PDF.js thumbnail rendering — draws page 1 of a PDF flyer onto a
// canvas, scaled/cropped to fill it completely (the canvas equivalent of
// object-fit: cover for an <img>) — no gaps, with the overflow clipped
// evenly off both edges on whichever axis runs long. Used anywhere a
// flyer preview needs to look like a real image instead of an embedded
// PDF viewer (which shows its own native scrollbar/controls when the
// page is taller than the preview box).
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
      const scale = Math.max(targetW / baseViewport.width, targetH / baseViewport.height);
      const viewport = page.getViewport({ scale });

      // Render onto its own offscreen canvas sized exactly to the scaled
      // page first, then composite that onto the target canvas with an
      // explicit drawImage position (overflow past the target's edges is
      // clipped automatically). PDF.js's render() doesn't reliably respect
      // a transform already set on the target context, which previously
      // made a center-fit offset land asymmetrically.
      const off = document.createElement('canvas');
      off.width = Math.max(1, Math.round(viewport.width));
      off.height = Math.max(1, Math.round(viewport.height));
      await page.render({ canvasContext: off.getContext('2d'), viewport }).promise;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(off, (targetW - off.width) / 2, (targetH - off.height) / 2);
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
