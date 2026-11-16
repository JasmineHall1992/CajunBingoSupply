// Shared PDF.js thumbnail rendering — draws page 1 of a PDF flyer onto a
// canvas, scaled to fit entirely within it (the canvas equivalent of
// object-fit: contain for an <img>) so the whole flyer is always visible,
// letterboxed on whichever axis has leftover space. Used anywhere a flyer
// preview needs to look like a real image instead of an embedded PDF
// viewer (which shows its own native scrollbar/controls when the page is
// taller than the preview box).
//
// Requires pdfjs-dist's pdf.min.js to be loaded first, and this script to
// be included from a page under /pages/ (the worker path below is relative
// to that).

pdfjsLib.GlobalWorkerOptions.workerSrc = '../js/vendor/pdf.worker.min.js';

async function renderPdfThumb(url, canvas, targetW, targetH, onError) {
  const attempt = () => {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
    const render = (async () => {
      const pdf = await pdfjsLib.getDocument(url).promise;
      const page = await pdf.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(targetW / baseViewport.width, targetH / baseViewport.height);
      const viewport = page.getViewport({ scale });

      // Render onto its own offscreen canvas sized exactly to the scaled
      // page first, then composite that onto the target canvas with an
      // explicit drawImage position. PDF.js's render() doesn't reliably
      // respect a transform already set on the target context, which
      // previously made this centering land asymmetrically when applied
      // directly on the target — compositing through an offscreen canvas
      // avoids that entirely.
      const off = document.createElement('canvas');
      off.width = Math.max(1, Math.round(viewport.width));
      off.height = Math.max(1, Math.round(viewport.height));
      await page.render({ canvasContext: off.getContext('2d'), viewport }).promise;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(off, (targetW - off.width) / 2, (targetH - off.height) / 2);
    })();
    return Promise.race([render, timeout]);
  };

  try {
    await attempt();
  } catch (err) {
    // A slow connection or a momentary hiccup fetching/rendering the PDF is
    // the most common cause of a thumbnail not showing up — retry once
    // automatically rather than making the visitor reload the whole page.
    console.warn('PDF thumb failed, retrying:', url, err);
    try {
      await attempt();
    } catch (err2) {
      console.error('PDF thumb failed on retry too, giving up:', url, err2);
      if (onError) onError(canvas);
    }
  }
}

// Renders every canvas matching `selector` (each needs a data-pdf-url
// attribute) at its own actual displayed size, times devicePixelRatio for
// sharpness on retina screens.
//
// Rendering is throttled to a handful at a time instead of firing every
// thumbnail on the page at once — a catalog page can easily have a dozen+
// PDFs, and starting that many PDF.js documents (each with its own worker)
// simultaneously is what was causing some to silently fail even with a
// generous timeout, especially on a slower computer or connection.
function renderPdfCardThumbs(selector, onError) {
  const canvases = Array.from(document.querySelectorAll(selector));
  const CONCURRENCY = 3;
  let next = 0;

  function startNext() {
    if (next >= canvases.length) return;
    const canvas = canvases[next++];
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = w;
    canvas.height = h;
    renderPdfThumb(canvas.dataset.pdfUrl, canvas, w, h, onError).then(startNext);
  }

  for (let i = 0; i < CONCURRENCY; i++) startNext();
}
