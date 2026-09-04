// Collects the element edges a guide can snap to.
(() => {
  const ns = (window.__RFB = window.__RFB || {});
  if (ns.collectEdges) return;

  const MAX_ELEMENTS = 5000;

  // `axis` is the guide's axis: 'v' snaps to left/right/centre-x, 'h' to
  // top/bottom/centre-y. Returned values are document coordinates.
  ns.collectEdges = (axis, exclude) => {
    const out = new Set([0]);
    const sx = window.scrollX;
    const sy = window.scrollY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const all = document.body ? document.body.getElementsByTagName('*') : [];
    const count = Math.min(all.length, MAX_ELEMENTS);

    for (let i = 0; i < count; i++) {
      const node = all[i];
      if (node === exclude || node.tagName === 'RFB-OVERLAY') continue;

      const r = node.getBoundingClientRect();
      if (r.width < 1 && r.height < 1) continue;
      // Only what is actually on screen; off-screen edges are noise.
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;

      if (axis === 'v') {
        out.add(Math.round(r.left + sx));
        out.add(Math.round(r.right + sx));
        out.add(Math.round(r.left + r.width / 2 + sx));
      } else {
        out.add(Math.round(r.top + sy));
        out.add(Math.round(r.bottom + sy));
        out.add(Math.round(r.top + r.height / 2 + sy));
      }
    }

    return Array.from(out);
  };

  ns.nearestEdge = (targets, pos, threshold) => {
    let best = null;
    let bestDist = threshold;
    for (let i = 0; i < targets.length; i++) {
      const d = Math.abs(targets[i] - pos);
      if (d <= bestDist) {
        bestDist = d;
        best = targets[i];
      }
    }
    return best;
  };
})();
