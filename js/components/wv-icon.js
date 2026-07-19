export function wvIcon(name, className = '') {
  const image = document.createElement('img');
  image.className = `wv-icon ${className}`.trim();
  image.src = `assets/icons/${name}.svg`;
  image.alt = '';
  image.setAttribute('aria-hidden','true');
  image.draggable = false;
  return image;
}