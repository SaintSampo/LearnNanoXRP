// Runs only when served from localhost (via dev-server.js).
// Images use data-src so the browser never requests a file that might not exist.
// This script sets img.src only after confirming the file is present.
(function () {
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;

  const EXTS = ['png', 'jpg', 'jpeg', 'webp'];

  // ── Dev-only styles ───────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .photo-slot { position: relative; cursor: copy; }
    .photo-slot > img { pointer-events: none; }
    .photo-slot.drag-over {
      outline: 3px dashed #4a90d9;
      outline-offset: 4px;
      border-radius: 8px;
      background: rgba(74,144,217,0.07);
    }
    .photo-slot.drag-over::after {
      content: "Drop image here";
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      font-weight: 600;
      color: #4a90d9;
      background: rgba(255,255,255,0.8);
      border-radius: 8px;
      pointer-events: none;
    }
    .photo-slot.drag-success { outline: 3px solid #4caf50; outline-offset: 4px; }
  `;
  document.head.appendChild(style);

  // ── Single directory-listing request — zero 404s ──────────────────────────
  async function listImages(dirUrlPath) {
    const relDir = dirUrlPath.replace(/^\//, '');
    try {
      const r = await fetch('/list-images?dir=' + encodeURIComponent(relDir));
      if (!r.ok) return new Set();
      return new Set(await r.json());
    } catch { return new Set(); }
  }

  // ── Drag-and-drop: POSTs file bytes to dev-server.js for disk write ───────
  function addDragDrop(img) {
    const slot = img.closest('.photo-slot');
    if (!slot) return;

    slot.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      slot.classList.add('drag-over');
    });

    slot.addEventListener('dragleave', e => {
      if (!slot.contains(e.relatedTarget)) slot.classList.remove('drag-over');
    });

    slot.addEventListener('drop', async e => {
      e.preventDefault();
      slot.classList.remove('drag-over');

      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;

      const ext = file.name.split('.').pop().toLowerCase();
      if (!EXTS.includes(ext)) return;

      // Always derive the target filename from the original placeholder name (data-src)
      const origSrc  = img.getAttribute('data-src') || '';
      const baseName = origSrc.replace(/^.*\//, '').replace(/\.[^.]+$/, ''); // e.g. "01-completed-robot"
      const dir      = img.dataset.imagesDir || ''; // set during DOMContentLoaded
      const uploadPath = (dir + baseName + '.' + ext).replace(/^\//, '');

      if (!/^lessons\/[^/]+\/images\//.test(uploadPath)) return;

      try {
        const res = await fetch('/upload-image?path=' + encodeURIComponent(uploadPath), {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: await file.arrayBuffer(),
        });
        if (res.ok) {
          img.src = '/' + uploadPath + '?t=' + Date.now();
          slot.classList.add('drag-success');
          setTimeout(() => slot.classList.remove('drag-success'), 2000);
        }
      } catch (err) {
        console.error('Image upload failed:', err);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const imgs = Array.from(document.querySelectorAll('img[data-src]'))
      .filter(img => (img.getAttribute('data-src') || '').match(/^(\.\.\/)*images\/[^/]+\.[^/]+$/));

    if (imgs.length === 0) return;

    // All lesson images share one directory — derive it from the first img
    const pageDir   = new URL('./', document.baseURI).pathname;
    const firstSrc  = imgs[0].getAttribute('data-src'); // e.g. "images/01-foo.svg"
    const relImgDir = firstSrc.replace(/\/[^/]+$/, '/'); // "images/"
    const imagesDir = pageDir + relImgDir;               // "/lessons/lesson1-assembly/images/"

    // One request: get the complete list of files in this lesson's images/ folder
    const available = await listImages(imagesDir);

    imgs.forEach(img => {
      img.dataset.imagesDir = imagesDir; // stored for drag-drop handler

      const origSrc  = img.getAttribute('data-src');
      const fileName = origSrc.replace(/^.*\//, '');                 // "01-foo.svg"
      const baseName = fileName.replace(/\.[^.]+$/, '');             // "01-foo"

      const realFile = EXTS.map(ext => baseName + '.' + ext).find(f => available.has(f));
      if (realFile) {
        img.src = imagesDir + realFile;          // real photo found → use it
      } else if (available.has(fileName)) {
        img.src = imagesDir + fileName;          // only SVG placeholder exists → load it
      }
      // else: file deleted and not yet replaced → img.src stays empty, no request, no 404

      addDragDrop(img);
    });
  });
})();
