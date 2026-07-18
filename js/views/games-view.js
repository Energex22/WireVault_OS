import { el } from '../components/el.js';

export function createGamesView({ library, router, coreApi }) {
  const wrapper = el('div');

  function render() {
    const games = library.getLibrary('games');
    const heading = el('div',{className:'view-heading'},[
      el('div',{},[
        el('h1',{text:'Games'}),
        el('p',{text:'Automatically populated from the Games / ROMs folder managed in Files.'})
      ]),
      el('span',{className:'badge',text:`${games.length} GAMES`})
    ]);

    if (!games.length) {
      wrapper.replaceChildren(
        heading,
        el('section',{className:'panel empty-library-panel'},[
          el('span',{className:'large-library-icon',text:'🎮'}),
          el('h2',{text:'No games indexed'}),
          el('p',{text:coreApi.online
            ? 'Add ROMs to the configured folder and scan from Files.'
            : 'Start WireVault Core to load the real game library.'}),
          el('button',{
            className:'primary-button focusable',
            type:'button',
            onclick:() => router.open('files')
          },'Open Files')
        ])
      );
      return;
    }

    const systems = new Map();
    games.forEach(game => {
      const system = game.system_name || 'Other';
      if (!systems.has(system)) systems.set(system, []);
      systems.get(system).push(game);
    });

    const sections = [];
    [...systems.entries()]
      .sort(([a],[b]) => a.localeCompare(b))
      .forEach(([system,items]) => {
        const grid = el('div',{className:'auto-library-grid'});
        items.forEach(game => {
          grid.append(el('button',{className:'auto-library-card focusable',type:'button'},[
            el('span',{text:'🎮'}),
            el('strong',{text:game.name}),
            el('small',{text:`${system} · ${game.extension.toUpperCase()}`})
          ]));
        });

        sections.push(el('section',{className:'panel game-system-section'},[
          el('div',{className:'system-section-heading'},[
            el('h2',{text:system}),
            el('span',{className:'badge',text:`${items.length} GAMES`})
          ]),
          grid
        ]));
      });

    wrapper.replaceChildren(heading,...sections);
  }

  library.bus.on('library:refreshed',render);
  library.bus.on('library:type-refreshed',event => {
    if (event.type === 'games') render();
  });

  render();
  return wrapper;
}