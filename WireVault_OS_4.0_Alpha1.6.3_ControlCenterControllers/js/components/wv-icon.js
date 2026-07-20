const iconCache = new Map();

function themeSvg(source) {
  return source
    .replace(/#78ff16/gi, 'currentColor')
    .replace(/#b7ff85/gi, 'currentColor')
    .replace(/#d6ffba/gi, 'currentColor');
}

export function wvIcon(name, className = '') {
  const wrapper = document.createElement('span');
  wrapper.className = `wv-icon wv-icon-inline ${className}`.trim();
  wrapper.setAttribute('aria-hidden','true');
  wrapper.dataset.icon = name;

  const fallback = document.createElement('span');
  fallback.className = 'wv-icon-fallback';
  fallback.textContent = '◆';
  wrapper.append(fallback);

  const path = `assets/icons/${name}.svg`;

  async function load() {
    try {
      let markup = iconCache.get(path);
      if (!markup) {
        const response = await fetch(path, { cache:'force-cache' });
        if (!response.ok) throw new Error(`Icon ${name} could not load`);
        markup = themeSvg(await response.text());
        iconCache.set(path, markup);
      }

      wrapper.innerHTML = markup;
      const svg = wrapper.querySelector('svg');
      if (svg) {
        svg.setAttribute('focusable','false');
        svg.setAttribute('aria-hidden','true');
      }
    } catch {
      // Keep the small fallback symbol if an icon file is unavailable.
    }
  }

  load();
  return wrapper;
}