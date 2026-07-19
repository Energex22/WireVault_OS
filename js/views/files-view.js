import { el } from '../components/el.js';
import { wvIcon } from '../components/wv-icon.js';

const formatTime = timestamp =>
  timestamp ? new Date(timestamp * 1000).toLocaleString() : 'Never';

export function createFilesView({ library, coreApi, toast }) {
  const wrapper = el('div');

  async function render() {
    const folders = library.getFolders();
    const counts = library.getCounts();
    const scanStatus = library.getScanStatus();

    const heading = el('div',{className:'view-heading'},[
      el('div',{},[
        el('h1',{text:'Files & Media Folders'}),
        el('p',{text:'Choose folders here. WireVault fills Music, Pictures, Games, and Videos automatically.'})
      ]),
      el('span',{
        className:`badge ${coreApi.online ? 'core-online-badge' : 'core-offline-badge'}`,
        text:coreApi.online ? 'CORE ONLINE' : 'BROWSER PREVIEW'
      })
    ]);

    const manager = el('div',{className:'library-manager-list'});

    [
      ['music','music','Music','Songs and audio files'],
      ['pictures','pictures','Pictures','Picture Portrait and slideshows'],
      ['games','games','Games / ROMs','Retro and emulator libraries'],
      ['videos','streaming','Videos','Local movies and video files']
    ].forEach(([type,icon,title,description]) => {
      const pathText = el('code',{
        className:`library-folder-path ${folders[type] ? '' : 'empty'}`,
        text:folders[type] || 'No folder selected'
      });

      const browse = el('button',{
        className:'primary-button focusable',
        type:'button',
        onclick:async() => {
          if (!coreApi.online) {
            toast('Start WireVault Core to use Browse');
            return;
          }
          browse.disabled = true;
          browse.textContent = 'Selecting…';
          try {
            const result = await coreApi.chooseFolder({
              mediaType:type,
              title:`Select WireVault ${title} Folder`,
              initial:folders[type] || ''
            });
            if (result.cancelled) {
              toast('Folder selection cancelled');
              return;
            }
            await library.refreshAll();
            toast(`${title} folder selected`);
          } catch (error) {
            toast(error.message || 'Folder selector could not open');
          } finally {
            browse.disabled = false;
            browse.textContent = 'Browse';
          }
        }
      },'Browse');

      const scan = el('button',{
        className:'secondary-button focusable',
        type:'button',
        onclick:async() => {
          try {
            await library.requestScan();
            toast('Media scan started');
          } catch (error) {
            toast(error.message || 'Scan could not start');
          }
        }
      },'Scan');

      const open = el('button',{
        className:'secondary-button focusable',
        type:'button',
        disabled:!folders[type],
        onclick:async() => {
          try {
            await coreApi.openFolder(folders[type]);
          } catch (error) {
            toast(error.message || 'Folder could not open');
          }
        }
      },'Open Folder');

      manager.append(el('article',{className:'library-manager-card'},[
        el('div',{className:'library-manager-icon'},[
          wvIcon(icon,'library-manager-svg')
        ]),
        el('div',{className:'library-manager-copy'},[
          el('strong',{text:title}),
          el('small',{text:description}),
          pathText
        ]),
        el('div',{className:'library-manager-actions'},[
          browse,scan,open
        ])
      ]));
    });

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

    const managerPanel = el('section',{className:'panel'},[
      el('h2',{text:'Library Locations'}),
      el('p',{className:'panel-description',text:'Use Browse instead of typing file paths.'}),
      manager
    ]);

    const statusPanel = el('section',{className:'panel'},[
      el('h2',{text:'Library Status'}),
      countGrid,
      el('div',{className:'scan-status-card'},[
        el('div',{},[el('small',{text:'Last scan'}),el('strong',{text:formatTime(scanStatus.finished_at)})]),
        el('div',{},[el('small',{text:'Indexed'}),el('strong',{text:String(scanStatus.indexed || 0)})]),
        el('div',{},[el('small',{text:'Removed'}),el('strong',{text:String(scanStatus.removed || 0)})]),
        el('div',{},[el('small',{text:'Scanner'}),el('strong',{className:scanStatus.running?'scan-running':'scan-idle',text:scanStatus.running?'Running':'Idle'})])
      ])
    ]);

    wrapper.replaceChildren(
      heading,
      el('div',{className:'files-layout'},[managerPanel,statusPanel])
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