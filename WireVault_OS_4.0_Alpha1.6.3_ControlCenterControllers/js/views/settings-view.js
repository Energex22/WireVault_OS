import { el } from '../components/el.js';

const pages = [
  ['system','⚙️','System'],
  ['appearance','🎨','Appearance'],
  ['audio','🔊','Audio'],
  ['controllers','🎮','Controllers'],
  ['network','📶','Network'],
  ['library','📁','Library'],
  ['backup','🛡️','Backup & Reset']
];

function controlRow({ title, description, control }) {
  return el('div',{className:'setting-row'},[
    el('div',{},[
      el('strong',{text:title}),
      el('small',{text:description})
    ]),
    control
  ]);
}

export function createSettingsView({ settings, registry, store, toast }) {
  let activePage = 'system';

  const searchInput = el('input',{
    type:'search',
    className:'settings-search-input',
    placeholder:'Search settings, such as Wi-Fi'
  });

  const searchResults = el('div',{className:'settings-search-results'});
  const nav = el('div',{className:'settings-nav-list'});
  const content = el('div',{className:'settings-page-content'});

  function updateControl(id, value) {
    if (id === 'libraryFolders') return;
    store.set(`settings.${id}`, value);
    settings.save();
  }

  function renderSystem() {
    const weather = el('input',{type:'checkbox'});
    weather.checked = store.get('settings.weatherEnabled');
    weather.addEventListener('change',() => updateControl('weatherEnabled',weather.checked));

    const units = el('select',{className:'setting-select'});
    units.append(
      el('option',{value:'fahrenheit',text:'Fahrenheit'}),
      el('option',{value:'celsius',text:'Celsius'})
    );
    units.value = store.get('settings.temperatureUnit');
    units.addEventListener('change',() => updateControl('temperatureUnit',units.value));

    const saver = el('input',{
      type:'number',
      className:'setting-number',
      min:'1',
      max:'120',
      value:String(store.get('settings.screensaverMinutes'))
    });
    saver.addEventListener('change',() => updateControl('screensaverMinutes',Number(saver.value)));

    return [
      controlRow({
        title:'Weather',
        description:'Show current weather on the dashboard.',
        control:weather
      }),
      controlRow({
        title:'Temperature Unit',
        description:'Choose Fahrenheit or Celsius.',
        control:units
      }),
      controlRow({
        title:'Screensaver Delay',
        description:'Minutes before the screensaver starts.',
        control:saver
      })
    ];
  }

  function renderAppearance() {
    const theme = el('select',{className:'setting-select'});
    theme.append(
      el('option',{value:'cyber-green',text:'Cyber Green'}),
      el('option',{value:'blue-ice',text:'Blue Ice'}),
      el('option',{value:'purple-neon',text:'Purple Neon'})
    );
    theme.value = store.get('settings.theme');
    theme.addEventListener('change',() => updateControl('theme',theme.value));

    const night = el('input',{type:'checkbox'});
    night.checked = store.get('settings.nightMode');
    night.addEventListener('change',() => updateControl('nightMode',night.checked));

    const animations = el('input',{type:'checkbox'});
    animations.checked = store.get('settings.animations');
    animations.addEventListener('change',() => updateControl('animations',animations.checked));

    return [
      controlRow({
        title:'Theme',
        description:'Choose the WireVault appearance preset.',
        control:theme
      }),
      controlRow({
        title:'Night Mode',
        description:'Dim the interface for nighttime viewing.',
        control:night
      }),
      controlRow({
        title:'Animations',
        description:'Enable interface movement and transitions.',
        control:animations
      })
    ];
  }

  function renderAudio() {
    const sounds = el('input',{type:'checkbox'});
    sounds.checked = store.get('settings.uiSounds');
    sounds.addEventListener('change',() => updateControl('uiSounds',sounds.checked));

    return [
      controlRow({
        title:'Interface Sounds',
        description:'Enable navigation and launch sounds.',
        control:sounds
      })
    ];
  }

  function renderControllers() {
    const navigation = el('input',{type:'checkbox'});
    navigation.checked = store.get('settings.controllerNavigation');
    navigation.addEventListener('change',() => updateControl('controllerNavigation',navigation.checked));

    const vibration = el('input',{type:'checkbox'});
    vibration.checked = store.get('settings.controllerVibration');
    vibration.addEventListener('change',() => updateControl('controllerVibration',vibration.checked));

    return [
      controlRow({
        title:'Controller Navigation',
        description:'Use a controller to navigate WireVault.',
        control:navigation
      }),
      controlRow({
        title:'Controller Vibration',
        description:'Allow supported controllers to vibrate.',
        control:vibration
      })
    ];
  }

  function renderNetwork() {
    return [
      el('div',{className:'network-placeholder'},[
        el('span',{text:'📶'}),
        el('div',{},[
          el('strong',{text:'Wi-Fi'}),
          el('small',{text:'Wireless scanning and connection will be supplied by the Raspberry Pi backend.'})
        ]),
        el('span',{className:'badge',text:'BACKEND'})
      ]),
      el('div',{className:'network-placeholder'},[
        el('span',{text:'ᛒ'}),
        el('div',{},[
          el('strong',{text:'Bluetooth'}),
          el('small',{text:'Pair controllers and audio devices through the Raspberry Pi backend.'})
        ]),
        el('span',{className:'badge',text:'BACKEND'})
      ])
    ];
  }

  function renderLibrary() {
    const folders = store.get('library.folders');
    return [
      el('div',{className:'settings-folder-summary'},[
        el('strong',{text:'Media Folders'}),
        ...Object.entries(folders).map(([name,path]) =>
          el('div',{},[
            el('span',{text:name}),
            el('code',{text:path})
          ])
        ),
        el('small',{text:'Folder locations are managed in Files.'})
      ])
    ];
  }

  function renderBackup() {
    const exportButton = el('button',{
      className:'primary-button focusable',
      type:'button',
      onclick:() => {
        const backup = settings.exportBackup();
        const blob = new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'WireVault_Backup.json';
        anchor.click();
        URL.revokeObjectURL(url);
        toast('Backup exported');
      }
    },'Export Backup');

    const importInput = el('input',{
      className:'hidden',
      type:'file',
      accept:'application/json'
    });

    const importButton = el('button',{
      className:'secondary-button focusable',
      type:'button',
      onclick:() => importInput.click()
    },'Import Backup');

    importInput.addEventListener('change',async() => {
      const file = importInput.files?.[0];
      if (!file) return;

      try {
        const backup = JSON.parse(await file.text());
        settings.importBackup(backup);
        toast('Backup restored');
        renderPage(activePage);
      } catch (error) {
        toast(error.message || 'Backup could not be imported');
      }
      importInput.value = '';
    });

    const factoryButton = el('button',{
      className:'danger-button focusable',
      type:'button',
      onclick:() => {
        const confirmed = window.confirm(
          'Factory Reset WireVault OS?\n\nThis restores all settings and media-folder paths to their defaults. Indexed media files are not deleted.'
        );
        if (!confirmed) return;

        settings.factoryReset();
        toast('Factory reset complete');
        renderPage('system');
      }
    },'Factory Reset');

    return [
      el('div',{className:'backup-card'},[
        el('span',{text:'💾'}),
        el('div',{},[
          el('strong',{text:'Backup & Restore'}),
          el('small',{text:'Save or restore settings, media-folder paths, controller preferences, and appearance.'})
        ]),
        el('div',{className:'button-row'},[exportButton,importButton,importInput])
      ]),
      el('div',{className:'backup-card factory-card'},[
        el('span',{text:'⚠️'}),
        el('div',{},[
          el('strong',{text:'Factory Reset'}),
          el('small',{text:'Restore every setting to the original WireVault defaults. Media files are not deleted.'})
        ]),
        factoryButton
      ])
    ];
  }

  function renderPage(pageId) {
    activePage = pageId;
    nav.querySelectorAll('[data-settings-page]').forEach(button => {
      button.classList.toggle('active',button.dataset.settingsPage === pageId);
    });

    const renderer = {
      system:renderSystem,
      appearance:renderAppearance,
      audio:renderAudio,
      controllers:renderControllers,
      network:renderNetwork,
      library:renderLibrary,
      backup:renderBackup
    }[pageId];

    content.replaceChildren(...renderer());
  }

  pages.forEach(([id,icon,label]) => {
    nav.append(el('button',{
      className:'settings-nav-button focusable',
      type:'button',
      'data-settings-page':id,
      onclick:() => {
        searchInput.value = '';
        searchResults.replaceChildren();
        renderPage(id);
      }
    },[
      el('span',{text:icon}),
      el('strong',{text:label})
    ]));
  });

  function renderSearch() {
    const matches = registry.search(searchInput.value);
    searchResults.replaceChildren();

    if (!searchInput.value.trim()) return;

    if (!matches.length) {
      searchResults.append(el('div',{className:'settings-search-empty',text:'No settings found.'}));
      return;
    }

    matches.forEach(match => {
      searchResults.append(el('button',{
        className:'settings-result-card focusable',
        type:'button',
        onclick:() => {
          renderPage(match.page);
          searchInput.value = '';
          searchResults.replaceChildren();
          toast(`Opened ${match.title}`);
        }
      },[
        el('div',{},[
          el('strong',{text:match.title}),
          el('small',{text:match.description})
        ]),
        el('span',{text:match.page.toUpperCase()})
      ]));
    });
  }

  searchInput.addEventListener('input',renderSearch);

  const heading = el('div',{className:'view-heading'},[
    el('div',{},[
      el('h1',{text:'Settings'}),
      el('p',{text:'Searchable configuration, backup, restore, and factory reset.'})
    ]),
    el('span',{className:'badge',text:'REGISTRY POWERED'})
  ]);

  renderPage('system');

  return el('div',{},[
    heading,
    el('section',{className:'panel settings-search-panel'},[
      el('span',{text:'⌕'}),
      searchInput
    ]),
    searchResults,
    el('div',{className:'settings-layout'},[
      el('aside',{className:'settings-nav-panel'},[nav]),
      el('section',{className:'panel settings-content-panel'},[content])
    ])
  ]);
}