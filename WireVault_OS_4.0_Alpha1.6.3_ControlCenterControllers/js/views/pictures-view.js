import { el } from '../components/el.js';

export function createPicturesView({ library, router, coreApi }) {
  const wrapper = el('div');

  function render() {
    const pictures = library.getLibrary('pictures');
    const heading = el('div',{className:'view-heading'},[
      el('div',{},[
        el('h1',{text:'Picture Portrait'}),
        el('p',{text:'Automatically populated from the Pictures folder managed in Files.'})
      ]),
      el('span',{className:'badge',text:`${pictures.length} PICTURES`})
    ]);

    if (!pictures.length) {
      wrapper.replaceChildren(
        heading,
        el('section',{className:'panel empty-library-panel'},[
          el('span',{className:'large-library-icon',text:'🖼️'}),
          el('h2',{text:'No pictures indexed'}),
          el('p',{text:coreApi.online
            ? 'Add pictures to the configured folder and scan from Files.'
            : 'Start WireVault Core to load the real picture library.'}),
          el('button',{
            className:'primary-button focusable',
            type:'button',
            onclick:() => router.open('files')
          },'Open Files')
        ])
      );
      return;
    }

    const gallery = el('div',{className:'picture-library-grid'});
    pictures.forEach(item => {
      gallery.append(el('button',{className:'picture-library-card focusable',type:'button'},[
        el('div',{className:'picture-placeholder',text:'🖼️'}),
        el('strong',{text:item.name}),
        el('small',{text:item.path})
      ]));
    });

    wrapper.replaceChildren(
      heading,
      el('section',{className:'panel'},[gallery])
    );
  }

  library.bus.on('library:refreshed',render);
  library.bus.on('library:type-refreshed',event => {
    if (event.type === 'pictures') render();
  });

  render();
  return wrapper;
}