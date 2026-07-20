const drawer = document.getElementById('vaultSearch');
const backdrop = document.getElementById('vaultSearchBackdrop');
const input = document.getElementById('vaultSearchInput');
const results = document.getElementById('vaultSearchResults');
const sectionTitle = document.getElementById('vaultSearchSectionTitle');
const summary = document.getElementById('vaultSearchSummary');

let isOpen = false;
let selectedIndex = 0;
let visibleItems = [];
let gamepadStartPressedAt = 0;
let gamepadOpened = false;

const routes = [
  ['home', 'Home', 'Dashboard and current status', '⌂'],
  ['streaming', 'Streaming', 'Video services and local video', '▶'],
  ['games', 'Games', 'Indexed ROMs and game library', '🎮'],
  ['music', 'Music', 'Songs and persistent playback', '♪'],
  ['pictures', 'Pictures', 'Images and slideshows', '▧'],
  ['files', 'Files', 'Folders, scans, and media locations', '📁'],
  ['browser', 'Browser', 'Bookmarks and web launcher', '◎'],
  ['settings', 'Settings', 'WireVault preferences', '⚙']
];

const settings = [
  ['Wi-Fi Settings', 'Network and wireless settings', 'wifi network wireless'],
  ['Bluetooth Settings', 'Controllers, headphones, and devices', 'bluetooth devices'],
  ['Controller Settings', 'Controller testing and navigation', 'controller gamepad input'],
  ['Audio Settings', 'Volume and interface sounds', 'audio sound volume'],
  ['Display Settings', 'Screen, animations, and appearance', 'display screen appearance'],
  ['Library Settings', 'Media folders and scanning', 'library media folders scan'],
  ['Notification Settings', 'Alerts and notification behavior', 'notifications alerts']
];

const recentKey = 'wirevault.vaultSearch.recent';

function wireVault() {
  return window.WireVault || {};
}

function recentRoutes() {
  try {
    const stored = JSON.parse(localStorage.getItem(recentKey) || '[]');
    return Array.isArray(stored) ? stored.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecent(item) {
  if (!item?.recentId) return;
  const existing = recentRoutes().filter(id => id !== item.recentId);
  existing.unshift(item.recentId);
  localStorage.setItem(recentKey, JSON.stringify(existing.slice(0, 6)));
}

function mediaItems() {
  const library = wireVault().library;
  if (!library) return [];

  const definitions = [
    ['music', 'Music', '♪'],
    ['games', 'Game', '🎮'],
    ['pictures', 'Picture', '▧'],
    ['videos', 'Video', '▶']
  ];

  return definitions.flatMap(([type, label, icon]) =>
    (library.getLibrary(type) || []).map(item => ({
      id: `media:${type}:${item.id ?? item.path ?? item.name}`,
      recentId: `route:${type === 'videos' ? 'files' : type}`,
      title: item.name || item.title || 'Untitled',
      detail: item.artist || item.album || item.system_name ||
        item.extension?.toUpperCase() || `Indexed ${label.toLowerCase()}`,
      type: label,
      icon,
      search: [
        item.name,
        item.title,
        item.artist,
        item.album,
        item.system_name,
        item.extension,
        label
      ].filter(Boolean).join(' ').toLowerCase(),
      action() {
        if (type === 'music' && wireVault().musicPlayer) {
          wireVault().musicPlayer.playTrack(
            item,
            library.getLibrary('music')
          );
          return;
        }
        wireVault().router?.open(type === 'videos' ? 'files' : type);
      }
    }))
  );
}

function routeItems() {
  return routes.map(([route, title, detail, icon]) => ({
    id: `route:${route}`,
    recentId: `route:${route}`,
    title,
    detail,
    type: 'Page',
    icon,
    search: `${title} ${detail} ${route}`.toLowerCase(),
    action() {
      wireVault().router?.open(route);
    }
  }));
}

function settingItems() {
  return settings.map(([title, detail, keywords]) => ({
    id: `setting:${title}`,
    recentId: 'route:settings',
    title,
    detail,
    type: 'Setting',
    icon: '⚙',
    search: `${title} ${detail} ${keywords}`.toLowerCase(),
    action() {
      wireVault().router?.open('settings');
    }
  }));
}

function actionItems() {
  return [{
    id: 'action:scan',
    title: 'Scan Media Library',
    detail: 'Run one manual scan of configured folders',
    type: 'Action',
    icon: '↻',
    search: 'scan media library rescan folders update',
    async action() {
      const library = wireVault().library;
      if (!library) return;
      await library.requestScan();
      wireVault().toast?.('Media scan started');
    }
  }];
}

function allItems() {
  return [
    ...routeItems(),
    ...settingItems(),
    ...actionItems(),
    ...mediaItems()
  ];
}

function quickItems() {
  const routesById = new Map(routeItems().map(item => [item.id, item]));
  const recent = recentRoutes()
    .map(id => routesById.get(id))
    .filter(Boolean);

  const defaults = routeItems().filter(item =>
    ['route:music','route:games','route:files','route:settings'].includes(item.id)
  );

  const merged = [...recent, ...defaults];
  return merged.filter(
    (item, index) => merged.findIndex(other => other.id === item.id) === index
  ).slice(0, 6);
}

function score(item, query) {
  const text = item.search || `${item.title} ${item.detail}`.toLowerCase();
  const title = item.title.toLowerCase();

  if (title === query) return 1000;
  if (title.startsWith(query)) return 700;
  if (title.includes(query)) return 450;

  const words = query.split(/\s+/).filter(Boolean);
  if (words.every(word => text.includes(word))) return 250;
  return 0;
}

function groupLabel(type) {
  return {
    Page: 'Pages',
    Setting: 'Settings',
    Action: 'Actions',
    Music: 'Music',
    Game: 'Games',
    Picture: 'Pictures',
    Video: 'Videos'
  }[type] || type;
}

function resultButton(item, index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vault-search-result';
  button.dataset.resultIndex = String(index);
  button.setAttribute('role', 'option');

  const icon = document.createElement('span');
  icon.className = 'vault-search-result-icon';
  icon.textContent = item.icon;

  const copy = document.createElement('span');
  copy.className = 'vault-search-result-copy';

  const title = document.createElement('strong');
  title.textContent = item.title;

  const detail = document.createElement('small');
  detail.textContent = item.detail;

  copy.append(title, detail);

  const type = document.createElement('span');
  type.className = 'vault-search-result-type';
  type.textContent = item.type;

  button.append(icon, copy, type);
  button.addEventListener('click', () => activate(item));
  button.addEventListener('mouseenter', () => {
    selectedIndex = index;
    updateSelection(false);
  });

  return button;
}

function render() {
  const query = input.value.trim().toLowerCase();
  results.replaceChildren();
  selectedIndex = 0;

  if (!query) {
    visibleItems = quickItems();
    sectionTitle.textContent = 'Quick Access';
    summary.textContent = 'Recent and commonly used destinations';

    const label = document.createElement('div');
    label.className = 'vault-search-group-label';
    label.textContent = recentRoutes().length ? 'Recent & Pinned' : 'Suggested';
    results.append(label);

    visibleItems.forEach((item, index) =>
      results.append(resultButton(item, index))
    );
    updateSelection(false);
    return;
  }

  visibleItems = allItems()
    .map(item => ({ item, score: score(item, query) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 14)
    .map(entry => entry.item);

  sectionTitle.textContent = 'Search Results';
  summary.textContent = visibleItems.length
    ? `${visibleItems.length} result${visibleItems.length === 1 ? '' : 's'}`
    : 'No matching pages or media';

  if (!visibleItems.length) {
    const empty = document.createElement('div');
    empty.className = 'vault-search-empty';
    empty.innerHTML =
      '<span>⌕</span><strong>No results</strong><small>Try a page, setting, song, game, picture, or video name.</small>';
    results.append(empty);
    return;
  }

  let previousType = null;
  visibleItems.forEach((item, index) => {
    if (item.type !== previousType) {
      const label = document.createElement('div');
      label.className = 'vault-search-group-label';
      label.textContent = groupLabel(item.type);
      results.append(label);
      previousType = item.type;
    }
    results.append(resultButton(item, index));
  });

  updateSelection(false);
}

function updateSelection(scroll = true) {
  const buttons = [...results.querySelectorAll('.vault-search-result')];
  if (!buttons.length) return;

  selectedIndex = (selectedIndex + buttons.length) % buttons.length;

  buttons.forEach((button, index) => {
    const selected = index === selectedIndex;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-selected', String(selected));
    if (selected && scroll) {
      button.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
}

async function activate(item = visibleItems[selectedIndex]) {
  if (!item) return;
  saveRecent(item);
  closeSearch();

  try {
    await item.action();
  } catch (error) {
    wireVault().toast?.(error.message || 'Vault Search action failed');
  }
}

function openSearch() {
  if (isOpen) return;
  isOpen = true;
  drawer.classList.add('open');
  backdrop.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('vault-search-open');

  input.value = '';
  render();
  requestAnimationFrame(() => input.focus());
}

function closeSearch() {
  if (!isOpen) return;
  isOpen = false;
  drawer.classList.remove('open');
  backdrop.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('vault-search-open');
  input.blur();
}

function toggleSearch() {
  isOpen ? closeSearch() : openSearch();
}

input.addEventListener('input', render);
backdrop.addEventListener('click', closeSearch);

window.addEventListener('keydown', event => {
  if (event.ctrlKey && event.code === 'Space') {
    event.preventDefault();
    toggleSearch();
    return;
  }

  if (!isOpen) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeSearch();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    selectedIndex += 1;
    updateSelection();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    selectedIndex -= 1;
    updateSelection();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    activate();
  }
});

function pollGamepads() {
  const pads = navigator.getGamepads?.() || [];
  const pad = [...pads].find(Boolean);
  const startPressed = Boolean(pad?.buttons?.[9]?.pressed);

  if (startPressed && !gamepadStartPressedAt) {
    gamepadStartPressedAt = performance.now();
    gamepadOpened = false;
  }

  if (
    startPressed &&
    !gamepadOpened &&
    performance.now() - gamepadStartPressedAt > 650
  ) {
    gamepadOpened = true;
    toggleSearch();
  }

  if (!startPressed) {
    gamepadStartPressedAt = 0;
    gamepadOpened = false;
  }

  requestAnimationFrame(pollGamepads);
}

requestAnimationFrame(pollGamepads);

window.VaultSearch = {
  open: openSearch,
  close: closeSearch,
  toggle: toggleSearch,
  rebuild: render
};