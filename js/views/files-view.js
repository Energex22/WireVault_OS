import { el } from '../components/el.js';

const formatBytes = bytes => {
  if (!bytes) return '0 B';
  const units = ['B','KB','MB','GB','TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const formatTime = timestamp => {
  if (!timestamp) return 'Never';
  return new Date(timestamp * 1000).toLocaleString();
};

export function createFilesView({ library, coreApi, toast }) {
  const wrapper = el('div');
  const heading = el('div',{className:'view-heading'},[
    el('div',{},[
      el('h1',{text:'Files & Media Folders'}),
      el('p',{text:'This is the only place that manages media folders and indexing.'})
    ]),
    el('span',{
      className:`badge ${coreApi.online ? 'core-online-badge' : 'core-offline-badge'}`,
      text:coreApi.online ? 'CORE ONLINE' : 'BROWSER PREVIEW'
    })
  ]);

  const foldersPanel = el('section',{className:'panel'});
  const statusPanel = el('section',{className:'panel'});
  const recentPanel = el('section',{className:'panel'});

  async function render() {
    wrapper.replaceChildren(heading, el('div',{className:'files-layout'},[
      foldersPanel,
      statusPanel
    ]), recentPanel);

    const folders = library.getFolders();
    const pathInputs = {};
    const rows = [
      ['music','Music folder'],
      ['pictures','Pictures folder'],
      ['games','Games / ROMs folder'],
      ['videos','Videos folder']
    ];

    const folderList = el('div',{className:'media-folder-list'});
    rows.forEach(([key,label]) => {
      const input = el('input',{
        className:'media-path-input',
        type:'text',
        value:folders[key] || ''
      });
      pathInputs[key] = input;
      folderList.append(el('label',{className:'media-folder-row'},[
        el('span',{text:label}),
        input
      ]));
    });

    const saveButton = el('button',{
      className:'primary-button focusable',
      type:'button',
      onclick:async() => {
        try {
          const next = Object.fromEntries(
            Object.entries(pathInputs).map(([key,input]) => [key,input.value.trim()])
          );
          await library.configureFolders(next);
          toast('Media folders saved');
        } catch (error) {
          toast(error.message || 'Media folders could not be saved');
        }
      }
    },'Save Media Folders');

    const scanButton = el('button',{
      className:'secondary-button focusable',
      type:'button',
      onclick:async() => {
        try {
          await library.requestScan();
          toast('Media scan started');
        } catch (error) {
          toast(error.message || 'Scan could not be started');
        }
      }
    },'Scan Now');

    const refreshButton = el('button',{
      className:'secondary-button focusable',
      type:'button',
      onclick:async() => {
        try {
          await library.refreshAll();
          render();
          toast('Library refreshed');
        } catch (error) {
          toast(error.message || 'Library could not be refreshed');
        }
      }
    },'Refresh Library');

    foldersPanel.replaceChildren(
      el('h2',{text:'Media Folder Locations'}),
      el('p',{className:'panel-description',text:'The Python Core scans these folders automatically and updates Music, Pictures, Games, and Videos.'}),
      folderList,
      el('div',{className:'button-row'},[saveButton,scanButton,refreshButton])
    );

    const counts = library.getCounts();
    const scanStatus = library.getScanStatus();

    const countGrid = el('div',{className:'library-count-grid'});
    [
      ['music','🎵','Music'],
      ['pictures','🖼️','Pictures'],
      ['games','🎮','Games'],
      ['videos','🎬','Videos']
    ].forEach(([type,icon,label]) => {
      countGrid.append(el('div',{className:'library-count-card'},[
        el('span',{text:icon}),
        el('div',{},[
          el('small',{text:label}),
          el('strong',{text:String(counts[type] || 0)})
        ])
      ]));
    });

    statusPanel.replaceChildren(
      el('h2',{text:'Library Status'}),
      countGrid,
      el('div',{className:'scan-status-card'},[
        el('div',{},[
          el('small',{text:'Last scan'}),
          el('strong',{text:formatTime(scanStatus.finished_at)})
        ]),
        el('div',{},[
          el('small',{text:'Indexed during last scan'}),
          el('strong',{text:String(scanStatus.indexed || 0)})
        ]),
        el('div',{},[
          el('small',{text:'Removed during last scan'}),
          el('strong',{text:String(scanStatus.removed || 0)})
        ]),
        el('div',{},[
          el('small',{text:'Scanner'}),
          el('strong',{
            className:scanStatus.running ? 'scan-running' : 'scan-idle',
            text:scanStatus.running ? 'Running' : 'Idle'
          })
        ])
      ])
    );

    const recent = [
      ...library.getLibrary('music').map(item => ({...item,type:'music'})),
      ...library.getLibrary('pictures').map(item => ({...item,type:'pictures'})),
      ...library.getLibrary('games').map(item => ({...item,type:'games'})),
      ...library.getLibrary('videos').map(item => ({...item,type:'videos'}))
    ].sort((a,b) => (b.indexed_at || 0) - (a.indexed_at || 0)).slice(0,20);

    const recentList = el('div',{className:'file-import-list'});
    if (!recent.length) {
      recentList.append(el('div',{className:'empty-state'},[
        el('span',{text:'📂'}),
        el('strong',{text:'No indexed media'}),
        el('small',{text:coreApi.online
          ? 'Add files to the configured folders, then scan.'
          : 'Start WireVault Core to use automatic folder scanning.'})
      ]));
    } else {
      recent.forEach(item => {
        const icon = {
          music:'🎵',
          pictures:'🖼️',
          games:'🎮',
          videos:'🎬'
        }[item.type] || '📄';

        recentList.append(el('div',{className:'file-import-row'},[
          el('span',{text:icon}),
          el('div',{},[
            el('strong',{text:item.name}),
            el('small',{text:`${item.type} · ${item.extension.toUpperCase()} · ${formatBytes(item.size_bytes)}`})
          ]),
          el('small',{text:item.system_name || 'Indexed'})
        ]));
      });
    }

    recentPanel.replaceChildren(
      el('h2',{text:'Recently Indexed'}),
      recentList
    );
  }

  library.bus.on('library:refreshed',render);
  library.bus.on('core:library.scan.complete',async() => {
    await library.refreshAll();
    render();
  });

  render();
  return wrapper;
}