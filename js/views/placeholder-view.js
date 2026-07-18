import { el } from '../components/el.js';

export function createPlaceholderView({ icon, title, description, status = 'PORT NEXT' }) {
  return el('section',{className:'panel route-placeholder'},[
    el('div',{},[
      el('div',{className:'route-icon',text:icon}),
      el('h1',{text:title}),
      el('p',{text:description}),
      el('span',{className:'badge',text:status})
    ])
  ]);
}