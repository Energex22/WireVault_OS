import { el } from '../components/el.js';
import { wvIcon } from '../components/wv-icon.js';

export function createPlaceholderView({ icon, title, description, status = 'PORT NEXT' }) {
  return el('section',{className:'panel route-placeholder'},[
    el('div',{},[
      wvIcon(icon,'route-hero-icon'),
      el('h1',{text:title}),
      el('p',{text:description}),
      el('span',{className:'badge',text:status})
    ])
  ]);
}