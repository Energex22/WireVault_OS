import { el } from '../components/el.js';

export function createMusicView({ library, router, coreApi, musicPlayer }) {
  const wrapper = el('div');

  function render() {
    const tracks = library.getLibrary('music');
    const heading = el('div',{className:'view-heading'},[
      el('div',{},[
        el('h1',{text:'Music'}),
        el('p',{text:'Automatically populated from the Music folder managed in Files.'})
      ]),
      el('span',{className:'badge',text:`${tracks.length} TRACKS`})
    ]);

    if (!tracks.length) {
      wrapper.replaceChildren(
        heading,
        el('section',{className:'panel empty-library-panel'},[
          el('span',{className:'large-library-icon',text:'🎵'}),
          el('h2',{text:'No music indexed'}),
          el('p',{text:coreApi.online
            ? 'Add music to the configured folder and scan from Files.'
            : 'Start WireVault Core to load the real music library.'}),
          el('button',{
            className:'primary-button focusable',
            type:'button',
            onclick:() => router.open('files')
          },'Open Files')
        ])
      );
      return;
    }

    const list = el('div',{className:'auto-library-grid'});
    tracks.forEach(track => {
      list.append(el('button',{className:'auto-library-card focusable music-track-card',type:'button',onclick:()=>musicPlayer.playTrack(track,tracks)},[
        el('span',{className:'music-track-play',text:'▶'}),
        el('strong',{text:track.name}),
        el('small',{text:`${track.extension.toUpperCase()} · Play track`})
      ]));
    });

    wrapper.replaceChildren(
      heading,
      el('section',{className:'panel'},[list])
    );
  }

  library.bus.on('library:refreshed',render);
  library.bus.on('library:type-refreshed',event => {
    if (event.type === 'music') render();
  });

  render();
  return wrapper;
}