(function spacingDebugger(Drupal) {
  const ENABLED_STORAGE_KEY = 'spacingDebugger.enabled';
  const SETTINGS_STORAGE_KEY = 'spacingDebugger.settings';
  const ROOT_CLASS = 'spacing-debugger-root';
  const OVERLAY_CLASS = 'spacing-debugger-overlay';
  const CONTROLS_CLASS = 'spacing-debugger-controls';
  const PIECE_CLASS = 'spacing-debugger-piece';
  const MAX_ELEMENTS = 1500;
  const MIN_SIZE = 0.5;
  const LAYERS = [
    { id: 'margin', label: 'Margin' },
    { id: 'padding', label: 'Padding' },
    { id: 'border', label: 'Border' },
    { id: 'content', label: 'Content' },
    { id: 'gap', label: 'Gap' },
  ];

  let initialized = false;
  let enabled = false;
  let root = null;
  let overlay = null;
  let controls = null;
  let observer = null;
  let frame = null;
  let hoveredElement = null;
  let settings = getDefaultSettings();

  Drupal.behaviors.spacingDebugger = {
    attach() {
      if (initialized) {
        return;
      }

      initialized = true;
      enabled = readStoredEnabled();
      settings = readStoredSettings();
      root = createRoot();
      overlay = root.querySelector(`.${OVERLAY_CLASS}`);
      controls = root.querySelector(`.${CONTROLS_CLASS}`);
      root.hidden = !enabled;

      document.addEventListener('keydown', onKeydown);
      document.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('scroll', scheduleRender, { passive: true });
      window.addEventListener('resize', scheduleRender, { passive: true });

      observer = new MutationObserver((mutations) => {
        if (!enabled || mutations.every((mutation) => root.contains(mutation.target))) {
          return;
        }
        scheduleRender();
      });
      observer.observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true,
      });

      if (enabled) {
        scheduleRender();
      }
    },
  };

  function onKeydown(event) {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.key.toLowerCase() !== 'c') {
      return;
    }

    event.preventDefault();
    if (event.shiftKey) {
      setHoverOnly(!settings.hoverOnly);
      return;
    }

    setEnabled(!enabled);
  }

  function onPointerMove(event) {
    if (!settings.hoverOnly || controls.contains(event.target)) {
      return;
    }

    const nextElement = event.target instanceof Element ? event.target : null;
    if (hoveredElement === nextElement) {
      return;
    }

    hoveredElement = nextElement;
    scheduleRender();
  }

  function setEnabled(value) {
    enabled = value;
    root.hidden = !enabled;
    writeStoredEnabled(enabled);

    if (enabled) {
      scheduleRender();
      return;
    }

    clearOverlay();
  }

  function setHoverOnly(value) {
    settings.hoverOnly = value;
    syncControls();
    writeStoredSettings(settings);
    scheduleRender();
  }

  function scheduleRender() {
    if (!enabled || frame !== null) {
      return;
    }

    frame = window.requestAnimationFrame(() => {
      frame = null;
      render();
    });
  }

  function render() {
    if (!enabled) {
      return;
    }

    const fragment = document.createDocumentFragment();
    const elements = settings.hoverOnly ? collectHoveredElement() : collectVisibleElements();

    elements.forEach((element) => {
      renderBoxModel(element, fragment);
      renderGaps(element, fragment);
    });

    overlay.replaceChildren(fragment);
  }

  function collectHoveredElement() {
    if (!hoveredElement || root.contains(hoveredElement) || isIgnoredElement(hoveredElement) || !isDrawableElement(hoveredElement)) {
      return [];
    }

    return [hoveredElement];
  }

  function collectVisibleElements() {
    const elements = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (!(node instanceof Element) || node === root || root.contains(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (isIgnoredElement(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          return isDrawableElement(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        },
      },
    );

    while (walker.nextNode() && elements.length < MAX_ELEMENTS) {
      elements.push(walker.currentNode);
    }

    return elements;
  }

  function isIgnoredElement(element) {
    if (['HTML', 'HEAD', 'BODY', 'SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'NOSCRIPT', 'TEMPLATE'].includes(element.tagName)) {
      return true;
    }

    const style = window.getComputedStyle(element);
    return style.display === 'none';
  }

  function isDrawableElement(element) {
    const style = window.getComputedStyle(element);
    if (style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width >= MIN_SIZE && rect.height >= MIN_SIZE && rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
  }

  function renderBoxModel(element, fragment) {
    const style = window.getComputedStyle(element);
    const rect = normalizeRect(element.getBoundingClientRect());
    const widths = getBoxWidths(style);

    const marginBox = expandRect(rect, widths.margin);
    const paddingBox = shrinkRect(rect, widths.border);
    const contentBox = shrinkRect(paddingBox, widths.padding);

    if (settings.layers.margin) {
      addEdgePieces(fragment, 'margin', marginBox, rect);
    }
    if (settings.layers.border) {
      addEdgePieces(fragment, 'border', rect, paddingBox);
    }
    if (settings.layers.padding) {
      addEdgePieces(fragment, 'padding', paddingBox, contentBox);
    }
    if (settings.layers.content) {
      addPiece(fragment, 'content', contentBox);
    }
  }

  function renderGaps(element, fragment) {
    if (!settings.layers.gap) {
      return;
    }

    const style = window.getComputedStyle(element);
    if (!['flex', 'inline-flex', 'grid', 'inline-grid'].includes(style.display)) {
      return;
    }

    const rowGap = parseCssPixels(style.rowGap);
    const columnGap = parseCssPixels(style.columnGap);
    if (rowGap <= 0 && columnGap <= 0) {
      return;
    }

    const childRects = Array.from(element.children)
      .filter((child) => !isIgnoredElement(child) && isDrawableElement(child) && window.getComputedStyle(child).position !== 'absolute')
      .map((child) => normalizeRect(child.getBoundingClientRect()));

    childRects.forEach((first, firstIndex) => {
      childRects.slice(firstIndex + 1).forEach((second) => {
        const horizontalGap = second.left - first.right;
        const verticalOverlap = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
        if (columnGap > 0 && isExpectedGap(horizontalGap, columnGap) && verticalOverlap > MIN_SIZE) {
          addPiece(fragment, 'gap', {
            left: first.right,
            top: Math.max(first.top, second.top),
            width: horizontalGap,
            height: verticalOverlap,
            right: second.left,
            bottom: Math.min(first.bottom, second.bottom),
          });
        }

        const verticalGap = second.top - first.bottom;
        const horizontalOverlap = Math.min(first.right, second.right) - Math.max(first.left, second.left);
        if (rowGap > 0 && isExpectedGap(verticalGap, rowGap) && horizontalOverlap > MIN_SIZE) {
          addPiece(fragment, 'gap', {
            left: Math.max(first.left, second.left),
            top: first.bottom,
            width: horizontalOverlap,
            height: verticalGap,
            right: Math.min(first.right, second.right),
            bottom: second.top,
          });
        }
      });
    });
  }

  function addEdgePieces(fragment, type, outer, inner) {
    addPiece(fragment, type, {
      left: outer.left,
      top: outer.top,
      width: outer.width,
      height: Math.max(0, inner.top - outer.top),
    });
    addPiece(fragment, type, {
      left: outer.left,
      top: inner.bottom,
      width: outer.width,
      height: Math.max(0, outer.bottom - inner.bottom),
    });
    addPiece(fragment, type, {
      left: outer.left,
      top: inner.top,
      width: Math.max(0, inner.left - outer.left),
      height: inner.height,
    });
    addPiece(fragment, type, {
      left: inner.right,
      top: inner.top,
      width: Math.max(0, outer.right - inner.right),
      height: inner.height,
    });
  }

  function addPiece(fragment, type, rect) {
    if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) {
      return;
    }

    const piece = document.createElement('div');
    piece.className = `${PIECE_CLASS} ${PIECE_CLASS}--${type}`;
    piece.style.left = `${round(rect.left)}px`;
    piece.style.top = `${round(rect.top)}px`;
    piece.style.width = `${round(rect.width)}px`;
    piece.style.height = `${round(rect.height)}px`;
    fragment.append(piece);
  }

  function getBoxWidths(style) {
    return {
      margin: {
        top: parseCssPixels(style.marginTop),
        right: parseCssPixels(style.marginRight),
        bottom: parseCssPixels(style.marginBottom),
        left: parseCssPixels(style.marginLeft),
      },
      border: {
        top: parseCssPixels(style.borderTopWidth),
        right: parseCssPixels(style.borderRightWidth),
        bottom: parseCssPixels(style.borderBottomWidth),
        left: parseCssPixels(style.borderLeftWidth),
      },
      padding: {
        top: parseCssPixels(style.paddingTop),
        right: parseCssPixels(style.paddingRight),
        bottom: parseCssPixels(style.paddingBottom),
        left: parseCssPixels(style.paddingLeft),
      },
    };
  }

  function expandRect(rect, widths) {
    return {
      left: rect.left - widths.left,
      top: rect.top - widths.top,
      right: rect.right + widths.right,
      bottom: rect.bottom + widths.bottom,
      width: rect.width + widths.left + widths.right,
      height: rect.height + widths.top + widths.bottom,
    };
  }

  function shrinkRect(rect, widths) {
    const left = rect.left + widths.left;
    const top = rect.top + widths.top;
    const right = rect.right - widths.right;
    const bottom = rect.bottom - widths.bottom;

    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }

  function normalizeRect(rect) {
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }

  function isExpectedGap(actual, expected) {
    return actual > MIN_SIZE && Math.abs(actual - expected) <= 1;
  }

  function parseCssPixels(value) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : 0;
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function createRoot() {
    const element = document.createElement('div');
    element.className = ROOT_CLASS;
    element.append(createOverlay());
    element.append(createControls());
    document.body.append(element);
    return element;
  }

  function createOverlay() {
    const element = document.createElement('div');
    element.className = OVERLAY_CLASS;
    return element;
  }

  function createControls() {
    const panel = document.createElement('section');
    panel.className = CONTROLS_CLASS;
    panel.setAttribute('aria-label', 'Spacing Debugger controls');

    const header = document.createElement('div');
    header.className = `${CONTROLS_CLASS}__header`;

    const title = document.createElement('strong');
    title.textContent = 'Spacing Debugger';
    header.append(title);

    const offButton = document.createElement('button');
    offButton.className = `${CONTROLS_CLASS}__button`;
    offButton.type = 'button';
    offButton.textContent = 'Off';
    offButton.addEventListener('click', () => setEnabled(false));
    header.append(offButton);
    panel.append(header);

    const layers = document.createElement('div');
    layers.className = `${CONTROLS_CLASS}__layers`;
    LAYERS.forEach((layer) => {
      layers.append(createLayerToggle(layer));
    });
    panel.append(layers);

    const mode = document.createElement('label');
    mode.className = `${CONTROLS_CLASS}__mode`;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = settings.hoverOnly;
    input.dataset.spacingHoverOnly = 'true';
    input.addEventListener('change', () => setHoverOnly(input.checked));
    mode.append(input);
    mode.append(' Hover only');
    panel.append(mode);

    return panel;
  }

  function createLayerToggle(layer) {
    const label = document.createElement('label');
    label.className = `${CONTROLS_CLASS}__layer`;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = settings.layers[layer.id];
    input.dataset.spacingLayer = layer.id;
    input.addEventListener('change', () => {
      settings.layers[layer.id] = input.checked;
      writeStoredSettings(settings);
      scheduleRender();
    });
    label.append(input);

    const swatch = document.createElement('span');
    swatch.className = `${CONTROLS_CLASS}__swatch ${CONTROLS_CLASS}__swatch--${layer.id}`;
    label.append(swatch);

    label.append(layer.label);
    return label;
  }

  function syncControls() {
    controls.querySelectorAll('[data-spacing-layer]').forEach((input) => {
      input.checked = settings.layers[input.dataset.spacingLayer];
    });

    const hoverOnly = controls.querySelector('[data-spacing-hover-only]');
    hoverOnly.checked = settings.hoverOnly;
  }

  function clearOverlay() {
    overlay.replaceChildren();
  }

  function getDefaultSettings() {
    return {
      hoverOnly: false,
      layers: {
        margin: true,
        padding: true,
        border: true,
        content: true,
        gap: true,
      },
    };
  }

  function readStoredEnabled() {
    try {
      return window.localStorage.getItem(ENABLED_STORAGE_KEY) === 'true';
    }
    catch (error) {
      return false;
    }
  }

  function writeStoredEnabled(value) {
    try {
      window.localStorage.setItem(ENABLED_STORAGE_KEY, value ? 'true' : 'false');
    }
    catch (error) {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
  }

  function readStoredSettings() {
    const defaults = getDefaultSettings();

    try {
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY));
      if (!stored || typeof stored !== 'object') {
        return defaults;
      }

      return {
        hoverOnly: typeof stored.hoverOnly === 'boolean' ? stored.hoverOnly : defaults.hoverOnly,
        layers: {
          margin: stored.layers?.margin !== false,
          padding: stored.layers?.padding !== false,
          border: stored.layers?.border !== false,
          content: stored.layers?.content !== false,
          gap: stored.layers?.gap !== false,
        },
      };
    }
    catch (error) {
      return defaults;
    }
  }

  function writeStoredSettings(value) {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value));
    }
    catch (error) {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
  }
})(Drupal);