// The overlay itself: ruler bars, guides, measurement.
// Everything lives in a shadow root so page CSS cannot reach it.
(() => {
  const ns = (window.__RFB = window.__RFB || {});
  if (ns.RulerOverlay) return;

  const RULER = 22;   // px thickness of each ruler bar
  const SNAP = 6;     // px snap threshold
  const MOVE_SLOP = 2; // px before a mousedown counts as a drag
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const el = (tag, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  };

  const svgEl = (tag, cls) => {
    const n = document.createElementNS(SVG_NS, tag);
    if (cls) n.setAttribute('class', cls);
    return n;
  };

  let seq = 0;
  const uid = () => `g${Date.now().toString(36)}${(seq++).toString(36)}`;

  const describe = (node) => {
    if (!node) return '';
    let out = node.tagName.toLowerCase();
    if (node.id) out += `#${node.id}`;
    else if (typeof node.className === 'string' && node.className.trim()) {
      out += `.${node.className.trim().split(/\s+/)[0]}`;
    }
    return out;
  };

  class RulerOverlay {
    constructor(onClose) {
      this.onClose = onClose || (() => {});
      this.guides = [];
      this.guideEls = new Map();
      this.guidesVisible = true;
      this.locked = false;
      this.drag = null;
      this.measureMode = false;
      this.measure = null;   // { from:{x,y}, to:{x,y} } in document coords
      this.hover = null;     // { rect (viewport), label }
      this.cursor = { x: -1, y: -1 };
      this._raf = 0;
      this._saveTimer = 0;
      this.displayMode = 'overlay';
      this._autoHideTimer = 0;
      this._rulerVisible = false;
      this._origMarginTop = '';
      this._origMarginLeft = '';
      this._origPaddingTop = '';
      this._origPaddingLeft = '';

      this._build();
      this._bind();
      this.resize();

      ns.store.load().then((saved) => {
        if (!this.host) return; // destroyed while loading
        this.guides = saved.filter((g) => g && (g.axis === 'h' || g.axis === 'v'));
        this._syncGuideEls();
        this._updateHud();
        this.scheduleDraw();
      });

      ns.store.loadMode().then((mode) => {
        if (!this.host) return;
        this._applyMode(mode);
      });
    }

    /* ---------------------------------------------------------------- DOM */

    _build() {
      this.host = el('rfb-overlay');
      const s = this.host.style;
      s.setProperty('position', 'fixed', 'important');
      s.setProperty('inset', '0', 'important');
      s.setProperty('z-index', '2147483647', 'important');
      s.setProperty('pointer-events', 'none', 'important');
      s.setProperty('display', 'block', 'important');
      s.setProperty('margin', '0', 'important');
      s.setProperty('padding', '0', 'important');

      this.root = this.host.attachShadow({ mode: 'open' });

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('src/overlay.css');
      this.root.append(link);

      this.wrap = el('div', 'rfb');
      this.catch = el('div', 'rfb-catch');
      this.guideLayer = el('div', 'rfb-guides');
      this.measureLayer = this._buildMeasureLayer();
      this.topCanvas = el('canvas', 'rfb-ruler rfb-ruler--top');
      this.leftCanvas = el('canvas', 'rfb-ruler rfb-ruler--left');
      this.corner = el('div', 'rfb-corner');
      this.hud = this._buildHud();

      this.wrap.append(
        this.catch,
        this.guideLayer,
        this.measureLayer,
        this.topCanvas,
        this.leftCanvas,
        this.corner,
        this.hud
      );
      this.root.append(this.wrap);
      document.documentElement.append(this.host);
    }

    _buildMeasureLayer() {
      const layer = el('div', 'rfb-measure');

      this.hoverBox = el('div', 'rfb-hoverbox');
      this.hoverLabel = el('div', 'rfb-hoverlabel');

      this.msvg = svgEl('svg', 'rfb-msvg');
      this.mLine = svgEl('line', 'rfb-mline');
      this.mDashX = svgEl('line', 'rfb-mdash');
      this.mDashY = svgEl('line', 'rfb-mdash');
      this.msvg.append(this.mDashX, this.mDashY, this.mLine);
      this.mLabel = el('div', 'rfb-mlabel');

      layer.append(this.hoverBox, this.hoverLabel, this.msvg, this.mLabel);
      return layer;
    }

    _buildHud() {
      const hud = el('div', 'rfb-hud');

      const dot = el('span', 'rfb-hud__dot');
      this.hudCount = el('span', 'rfb-hud__count');
      const hint = el('span', 'rfb-hud__hint');
      hint.textContent = 'Alt = measure · Shift = no snap';

      const credit = el('a', 'rfb-hud__credit');
      credit.href = 'https://raisulsohan.com';
      credit.target = '_blank';
      credit.rel = 'noopener';
      credit.textContent = 'Made by Raisul Sohan';
      credit.addEventListener('mousedown', (e) => e.stopPropagation());

      const mkBtn = (label, title, fn) => {
        const b = el('button', 'rfb-btn');
        b.type = 'button';
        b.textContent = label;
        b.title = title;
        b.addEventListener('mousedown', (e) => e.stopPropagation());
        b.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          fn();
        });
        return b;
      };

      this.lockBtn = mkBtn('Lock', 'Lock guides (Ctrl+Alt+;)', () => this.toggleLock());
      this.hideBtn = mkBtn('Hide', 'Hide guides (Ctrl+;)', () => this.toggleGuides());
      const clearBtn = mkBtn('Clear', 'Delete all guides on this site', () => this.clearGuides());
      const closeBtn = mkBtn('✕', 'Turn off the ruler (Alt+R)', () => this.onClose());
      closeBtn.classList.add('rfb-btn--close');

      this.modeBtn = mkBtn('Over', 'Switch display mode: Overlay / Push / Auto-hide', () => this.cycleMode());
      this.modeBtn.classList.add('rfb-btn--mode');

      hud.append(dot, this.hudCount, hint, credit, this.modeBtn, this.lockBtn, this.hideBtn, clearBtn, closeBtn);
      return hud;
    }

    /* ----------------------------------------------------------- listeners */

    _bind() {
      this._onScroll = () => this.scheduleDraw();
      this._onResize = () => this.resize();
      this._onCursor = (e) => {
        this.cursor.x = e.clientX;
        this.cursor.y = e.clientY;
        if (this.displayMode === 'autohide') this._checkAutoHide();
        this.scheduleDraw();
      };
      this._onKeyDown = (e) => this._handleKeyDown(e);
      this._onKeyUp = (e) => {
        if (e.key === 'Alt' || !e.altKey) this._setMeasureMode(false);
      };
      this._onBlur = () => this._setMeasureMode(false);
      this._onDragMove = (e) => this._dragMove(e);
      this._onDragEnd = (e) => this._dragEnd(e);

      window.addEventListener('scroll', this._onScroll, { passive: true });
      window.addEventListener('resize', this._onResize);
      window.addEventListener('mousemove', this._onCursor, true);
      window.addEventListener('keydown', this._onKeyDown, true);
      window.addEventListener('keyup', this._onKeyUp, true);
      window.addEventListener('blur', this._onBlur);

      this.topCanvas.addEventListener('mousedown', (e) => this._startNewGuide(e, 'h'));
      this.leftCanvas.addEventListener('mousedown', (e) => this._startNewGuide(e, 'v'));

      this.catch.addEventListener('mousemove', (e) => this._measureHover(e));
      this.catch.addEventListener('mousedown', (e) => this._measureStart(e));
      this.catch.addEventListener('mouseleave', () => {
        this.hover = null;
        this.scheduleDraw();
      });
    }

    _handleKeyDown(e) {
      if (e.altKey) this._setMeasureMode(true);

      if (e.key === 'Escape' && (this.measure || this.hover)) {
        this.measure = null;
        this.hover = null;
        this.scheduleDraw();
        return;
      }

      if (e.key === ';' && e.ctrlKey) {
        e.preventDefault();
        if (e.altKey) this.toggleLock();
        else this.toggleGuides();
      }
    }

    /* --------------------------------------------------------- guide drags */

    _docPos(axis, e) {
      return axis === 'h' ? e.clientY + window.scrollY : e.clientX + window.scrollX;
    }

    _startNewGuide(e, axis) {
      if (this.locked || e.button !== 0) return;
      e.preventDefault();

      if (!this.guidesVisible) this.toggleGuides();

      const guide = { id: uid(), axis, pos: Math.round(this._docPos(axis, e)) };
      this.guides.push(guide);
      this._syncGuideEls();
      this._beginDrag(guide, e, true);
    }

    _beginDrag(guide, e, isNew) {
      this.drag = {
        guide,
        isNew,
        moved: false,
        leftRuler: false,
        willDelete: false,
        snapped: null,
        startX: e.clientX,
        startY: e.clientY,
        targets: ns.collectEdges(guide.axis, this.host)
      };
      this.wrap.classList.add('rfb--dragging');
      window.addEventListener('mousemove', this._onDragMove, true);
      window.addEventListener('mouseup', this._onDragEnd, true);
      this.scheduleDraw();
    }

    _dragMove(e) {
      const d = this.drag;
      if (!d) return;
      e.preventDefault();

      if (Math.abs(e.clientX - d.startX) > MOVE_SLOP || Math.abs(e.clientY - d.startY) > MOVE_SLOP) {
        d.moved = true;
      }

      let pos = this._docPos(d.guide.axis, e);
      d.snapped = null;
      if (!e.shiftKey) {
        const hit = ns.nearestEdge(d.targets, pos, SNAP);
        if (hit !== null) {
          pos = hit;
          d.snapped = hit;
        }
      }
      d.guide.pos = Math.round(pos);

      // Dragging a guide back onto its ruler throws it away, like Photoshop.
      const screenPos = d.guide.axis === 'h' ? e.clientY : e.clientX;
      if (screenPos >= RULER) d.leftRuler = true;
      d.willDelete = d.leftRuler && screenPos < RULER;

      this.scheduleDraw();
    }

    _dragEnd() {
      const d = this.drag;
      this.drag = null;
      window.removeEventListener('mousemove', this._onDragMove, true);
      window.removeEventListener('mouseup', this._onDragEnd, true);
      this.wrap.classList.remove('rfb--dragging');
      if (!d) return;

      // A plain click on the ruler (no drag) should not leave a guide behind.
      if (d.willDelete || (d.isNew && !d.moved)) {
        this.remove(d.guide);
        return;
      }

      this._syncGuideEls();
      this._updateHud();
      this._persist();
      this.scheduleDraw();
    }

    remove(guide) {
      this.guides = this.guides.filter((g) => g !== guide);
      this._syncGuideEls();
      this._updateHud();
      this._persist();
      this.scheduleDraw();
    }

    clearGuides() {
      this.guides = [];
      this._syncGuideEls();
      this._updateHud();
      this._persist();
      this.scheduleDraw();
    }

    toggleGuides() {
      this.guidesVisible = !this.guidesVisible;
      this.guideLayer.classList.toggle('is-hidden', !this.guidesVisible);
      this.hideBtn.textContent = this.guidesVisible ? 'Hide' : 'Show';
      this.hideBtn.classList.toggle('is-on', !this.guidesVisible);
    }

    toggleLock() {
      this.locked = !this.locked;
      this.guideLayer.classList.toggle('is-locked', this.locked);
      this.lockBtn.classList.toggle('is-on', this.locked);
    }

    /* -------------------------------------------------------- display mode */

    static MODE_LABELS = { overlay: 'Over', push: 'Push', autohide: 'Auto' };
    static MODE_CYCLE = ['overlay', 'push', 'autohide'];

    cycleMode() {
      const cycle = RulerOverlay.MODE_CYCLE;
      const idx = cycle.indexOf(this.displayMode);
      const next = cycle[(idx + 1) % cycle.length];
      this._applyMode(next);
      ns.store.saveMode(next);
    }

    _applyMode(mode) {
      // ---- tear down previous mode ----
      if (this.displayMode === 'push') this._removePush();
      if (this.displayMode === 'autohide') {
        clearTimeout(this._autoHideTimer);
        this.wrap.classList.remove('rfb--autohide', 'rfb--ruler-visible');
        this._rulerVisible = false;
      }

      // ---- apply new mode ----
      this.displayMode = mode;
      this._updateModeBtn();

      if (mode === 'push') {
        this._applyPush();
      } else if (mode === 'autohide') {
        this.wrap.classList.add('rfb--autohide');
        // Initially hidden; check current cursor position right away
        this._checkAutoHide();
      }
      // 'overlay' needs no extra setup — it is the default behavior

      this.scheduleDraw();
    }

    _updateModeBtn() {
      if (!this.modeBtn) return;
      this.modeBtn.textContent = RulerOverlay.MODE_LABELS[this.displayMode] || 'Over';
      this.modeBtn.classList.toggle('is-on', this.displayMode !== 'overlay');
    }

    _applyPush() {
      const de = document.documentElement;
      const body = document.body;

      // Save original values so we can restore on mode-switch or destroy
      this._origMarginTop = de.style.marginTop || '';
      this._origMarginLeft = de.style.marginLeft || '';
      this._origPaddingTop = body ? (body.style.paddingTop || '') : '';
      this._origPaddingLeft = body ? (body.style.paddingLeft || '') : '';

      de.style.setProperty('margin-top', `${RULER}px`, 'important');
      de.style.setProperty('margin-left', `${RULER}px`, 'important');
    }

    _removePush() {
      const de = document.documentElement;

      if (this._origMarginTop) {
        de.style.marginTop = this._origMarginTop;
      } else {
        de.style.removeProperty('margin-top');
      }

      if (this._origMarginLeft) {
        de.style.marginLeft = this._origMarginLeft;
      } else {
        de.style.removeProperty('margin-left');
      }

      this._origMarginTop = '';
      this._origMarginLeft = '';
    }

    _checkAutoHide() {
      const EDGE = 30; // px trigger zone near viewport edge
      const HIDE_DELAY = 300; // ms before hiding after cursor leaves zone

      const nearEdge = this.cursor.x >= 0 &&
                       (this.cursor.x < EDGE || this.cursor.y < EDGE);
      const dragging = !!this.drag;

      if (nearEdge || dragging) {
        // Show rulers immediately
        clearTimeout(this._autoHideTimer);
        this._autoHideTimer = 0;
        if (!this._rulerVisible) {
          this._rulerVisible = true;
          this.wrap.classList.add('rfb--ruler-visible');
        }
      } else {
        // Hide rulers after a short delay
        if (this._rulerVisible && !this._autoHideTimer) {
          this._autoHideTimer = setTimeout(() => {
            this._rulerVisible = false;
            this.wrap.classList.remove('rfb--ruler-visible');
            this._autoHideTimer = 0;
          }, HIDE_DELAY);
        }
      }
    }

    _persist() {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => ns.store.save(this.guides), 200);
    }

    /* ------------------------------------------------------- measure mode */

    _setMeasureMode(on) {
      if (this.measureMode === on) return;
      this.measureMode = on;
      this.wrap.classList.toggle('rfb--measure', on);
      if (!on) {
        this.hover = null;
        if (this.measure && !this.measure.done) this.measure = null;
      }
      this.scheduleDraw();
    }

    _elementAt(x, y) {
      const stack = document.elementsFromPoint(x, y);
      for (const node of stack) {
        if (node !== this.host && node !== document.documentElement) return node;
      }
      return null;
    }

    _measureHover(e) {
      if (!this.measureMode) return;

      if (this.measure && !this.measure.done) {
        this.measure.to = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY };
      } else {
        const node = this._elementAt(e.clientX, e.clientY);
        this.hover = node ? { rect: node.getBoundingClientRect(), label: describe(node) } : null;
      }
      this.scheduleDraw();
    }

    _measureStart(e) {
      if (!this.measureMode || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const p = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY };
      this.measure = { from: p, to: p, done: false };
      this.hover = null;

      const finish = () => {
        if (this.measure) this.measure.done = true;
        window.removeEventListener('mouseup', finish, true);
      };
      window.addEventListener('mouseup', finish, true);
      this.scheduleDraw();
    }

    /* ------------------------------------------------------------ painting */

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;

      const size = (canvas, cw, ch) => {
        canvas.width = Math.max(1, Math.round(cw * dpr));
        canvas.height = Math.max(1, Math.round(ch * dpr));
        canvas.style.width = `${cw}px`;
        canvas.style.height = `${ch}px`;
      };

      size(this.topCanvas, w, RULER);
      size(this.leftCanvas, RULER, h);
      this.msvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      this.msvg.setAttribute('width', w);
      this.msvg.setAttribute('height', h);
      this.scheduleDraw();
    }

    scheduleDraw() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = 0;
        if (!this.host) return;
        this._drawRulers();
        this._positionGuides();
        this._renderMeasure();
      });
    }

    _drawRulers() {
      const dpr = window.devicePixelRatio || 1;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sx = window.scrollX;
      const sy = window.scrollY;

      const style = getComputedStyle(this.wrap);
      const bg = style.getPropertyValue('--rfb-bar').trim() || 'rgba(20,22,28,.86)';
      const tick = style.getPropertyValue('--rfb-tick').trim() || 'rgba(232,244,255,.6)';
      const text = style.getPropertyValue('--rfb-text').trim() || 'rgba(232,244,255,.9)';
      const accent = style.getPropertyValue('--rfb-accent').trim() || '#00d1ff';

      const tickLength = (doc) => (doc % 100 === 0 ? 10 : doc % 50 === 0 ? 7 : 4);

      // ---- top ruler (horizontal document coordinates)
      const top = this.topCanvas.getContext('2d');
      top.setTransform(dpr, 0, 0, dpr, 0, 0);
      top.clearRect(0, 0, vw, RULER);
      top.fillStyle = bg;
      top.fillRect(0, 0, vw, RULER);
      top.font = '9px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
      top.textBaseline = 'top';

      for (let doc = Math.floor(sx / 10) * 10; doc <= sx + vw; doc += 10) {
        const x = Math.round(doc - sx) + 0.5;
        const len = tickLength(doc);
        top.fillStyle = tick;
        top.fillRect(x, RULER - len, 1, len);
        if (doc % 100 === 0) {
          top.fillStyle = text;
          top.fillText(String(doc), x + 3, 2);
        }
      }
      top.fillStyle = tick;
      top.fillRect(0, RULER - 1, vw, 1);
      if (this.cursor.x >= 0) {
        top.fillStyle = accent;
        top.fillRect(Math.round(this.cursor.x) + 0.5, 0, 1, RULER);
      }

      // ---- left ruler (vertical document coordinates)
      const left = this.leftCanvas.getContext('2d');
      left.setTransform(dpr, 0, 0, dpr, 0, 0);
      left.clearRect(0, 0, RULER, vh);
      left.fillStyle = bg;
      left.fillRect(0, 0, RULER, vh);
      left.font = '9px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
      left.textBaseline = 'top';

      for (let doc = Math.floor(sy / 10) * 10; doc <= sy + vh; doc += 10) {
        const y = Math.round(doc - sy) + 0.5;
        const len = tickLength(doc);
        left.fillStyle = tick;
        left.fillRect(RULER - len, y, len, 1);
        if (doc % 100 === 0) {
          left.fillStyle = text;
          left.save();
          left.translate(2, y - 3);
          left.rotate(-Math.PI / 2);
          left.fillText(String(doc), -String(doc).length * 5 - 3, 0);
          left.restore();
        }
      }
      left.fillStyle = tick;
      left.fillRect(RULER - 1, 0, 1, vh);
      if (this.cursor.y >= 0) {
        left.fillStyle = accent;
        left.fillRect(0, Math.round(this.cursor.y) + 0.5, RULER, 1);
      }
    }

    _syncGuideEls() {
      this.guideLayer.textContent = '';
      this.guideEls.clear();

      for (const g of this.guides) {
        const node = el('div', `rfb-guide rfb-guide--${g.axis}`);
        const line = el('div', 'rfb-guide__line');
        const label = el('div', 'rfb-guide__label');
        node.append(line, label);

        node.addEventListener('mousedown', (e) => {
          if (this.locked || e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          this._beginDrag(g, e, false);
        });
        node.addEventListener('dblclick', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!this.locked) this.remove(g);
        });

        this.guideEls.set(g.id, { node, label });
        this.guideLayer.append(node);
      }
      this._updateHud();
    }

    _positionGuides() {
      const sx = window.scrollX;
      const sy = window.scrollY;

      for (const g of this.guides) {
        const rec = this.guideEls.get(g.id);
        if (!rec) continue;

        const offset = g.axis === 'h' ? g.pos - sy : g.pos - sx;
        rec.node.style.transform =
          g.axis === 'h' ? `translateY(${offset}px)` : `translateX(${offset}px)`;
        rec.label.textContent = String(g.pos);

        const dragging = this.drag && this.drag.guide === g;
        rec.node.classList.toggle('is-active', !!dragging);
        rec.node.classList.toggle('is-snapped', !!(dragging && this.drag.snapped !== null));
        rec.node.classList.toggle('is-deleting', !!(dragging && this.drag.willDelete));
      }
    }

    _renderMeasure() {
      // hovered element outline
      if (this.measureMode && this.hover) {
        const r = this.hover.rect;
        this.hoverBox.style.display = 'block';
        this.hoverBox.style.transform = `translate(${Math.round(r.left)}px, ${Math.round(r.top)}px)`;
        this.hoverBox.style.width = `${Math.round(r.width)}px`;
        this.hoverBox.style.height = `${Math.round(r.height)}px`;

        this.hoverLabel.style.display = 'block';
        this.hoverLabel.textContent = `${this.hover.label}  ${Math.round(r.width)} × ${Math.round(r.height)}`;
        const ly = r.top > 22 ? r.top - 20 : r.bottom + 4;
        this.hoverLabel.style.transform = `translate(${Math.round(Math.max(0, r.left))}px, ${Math.round(ly)}px)`;
      } else {
        this.hoverBox.style.display = 'none';
        this.hoverLabel.style.display = 'none';
      }

      // measurement line
      const m = this.measure;
      if (!m) {
        this.msvg.style.display = 'none';
        this.mLabel.style.display = 'none';
        return;
      }

      const sx = window.scrollX;
      const sy = window.scrollY;
      const x1 = m.from.x - sx;
      const y1 = m.from.y - sy;
      const x2 = m.to.x - sx;
      const y2 = m.to.y - sy;

      this.msvg.style.display = 'block';
      this.mLine.setAttribute('x1', x1);
      this.mLine.setAttribute('y1', y1);
      this.mLine.setAttribute('x2', x2);
      this.mLine.setAttribute('y2', y2);

      this.mDashX.setAttribute('x1', x1);
      this.mDashX.setAttribute('y1', y1);
      this.mDashX.setAttribute('x2', x2);
      this.mDashX.setAttribute('y2', y1);

      this.mDashY.setAttribute('x1', x2);
      this.mDashY.setAttribute('y1', y1);
      this.mDashY.setAttribute('x2', x2);
      this.mDashY.setAttribute('y2', y2);

      const dx = Math.abs(Math.round(m.to.x - m.from.x));
      const dy = Math.abs(Math.round(m.to.y - m.from.y));
      const dist = Math.round(Math.hypot(dx, dy));

      this.mLabel.style.display = 'block';
      this.mLabel.textContent = `${dx} × ${dy}  ·  ${dist}px`;
      this.mLabel.style.transform = `translate(${Math.round((x1 + x2) / 2 + 10)}px, ${Math.round((y1 + y2) / 2 + 10)}px)`;
    }

    _updateHud() {
      const n = this.guides.length;
      this.hudCount.textContent = n === 1 ? '1 guide' : `${n} guides`;
    }

    /* ---------------------------------------------------------- teardown */

    destroy() {
      window.removeEventListener('scroll', this._onScroll);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('mousemove', this._onCursor, true);
      window.removeEventListener('keydown', this._onKeyDown, true);
      window.removeEventListener('keyup', this._onKeyUp, true);
      window.removeEventListener('blur', this._onBlur);
      window.removeEventListener('mousemove', this._onDragMove, true);
      window.removeEventListener('mouseup', this._onDragEnd, true);

      if (this._raf) cancelAnimationFrame(this._raf);
      clearTimeout(this._saveTimer);
      clearTimeout(this._autoHideTimer);
      ns.store.save(this.guides);

      // Restore page layout if push mode was active
      if (this.displayMode === 'push') this._removePush();

      this.host.remove();
      this.host = null;
    }
  }

  ns.RulerOverlay = RulerOverlay;
})();
