import { EventBus } from './core/event-bus.js';
import { Store } from './core/store.js';
import { Router } from './core/router.js';
import { SettingsService } from './services/settings-service.js';
import { SettingsRegistry } from './services/settings-registry.js';
import { ClockService } from './services/clock-service.js';
import { LibraryService } from './services/library-service.js';
import { CoreApiService } from './services/core-api-service.js';
import { MusicPlayerService } from './services/music-player-service.js';
import { createMiniPlayer } from './components/mini-player.js';
import { createHomeView } from './views/home-view.js?v=1.4.0';
import { wvIcon } from './components/wv-icon.js?v=1.5.3';
import { createPlaceholderView } from './views/placeholder-view.js';
import { createFilesView } from './views/files-view.js';
import { createMusicView } from './views/music-view.js';
import { createPicturesView } from './views/pictures-view.js';
import { createGamesView } from './views/games-view.js';
import { createSettingsView } from './views/settings-view.js';

const bus = new EventBus();
const store = new Store({
  navigation:{route:'home'},
  settings:{
    theme:'cyber-green',
    uiSounds:true,
    weatherEnabled:true,
    temperatureUnit:'fahrenheit',
    controllerNavigation:true,
    controllerVibration:true,
    nightMode:false,
    animations:true,
    screensaverMinutes:10
  },
  library:{
    folders:{
      music:'/home/pi/Media/Music',
      pictures:'/home/pi/Media/Pictures',
      games:'/home/pi/Media/Games',
      videos:'/home/pi/Media/Videos'
    },
    items:{music:[],pictures:[],games:[]}
  },
  system:{foundationReady:false}
},bus);

let router;

const routes = {
  home:{render:()=>createHomeView({store,bus,coreApi,library,router})},
  streaming:{render:()=>createPlaceholderView({icon:'streaming',title:'Streaming',description:'This will be the first legacy section ported into the modular router.'})},
  games:{render:()=>createGamesView({library,router,coreApi})},
  music:{render:()=>createMusicView({library,router,coreApi,musicPlayer})},
  pictures:{render:()=>createPicturesView({library,router,coreApi})},
  files:{render:()=>createFilesView({library,coreApi,toast})},
  browser:{render:()=>createPlaceholderView({icon:'browser',title:'Browser',description:'Bookmarks and launcher actions will be isolated from the dashboard.'})},
  settings:{render:()=>createSettingsView({settings,registry,store,toast})},
};

router = new Router({
  routes,
  store,
  bus,
  outlet:document.getElementById('appView')
});

const settingsDefaults = {
  theme:'cyber-green',
  uiSounds:true,
  weatherEnabled:true,
  temperatureUnit:'fahrenheit',
  controllerNavigation:true,
  controllerVibration:true,
  nightMode:false,
  animations:true,
  screensaverMinutes:10,
  libraryFolders:{
    music:'/home/pi/Media/Music',
    pictures:'/home/pi/Media/Pictures',
    games:'/home/pi/Media/Games',
    videos:'/home/pi/Media/Videos'
  }
};

const settings = new SettingsService({
  store,
  bus,
  defaults:settingsDefaults
});
const registry = new SettingsRegistry();
const clock = new ClockService(bus);
const coreApi = new CoreApiService({bus});
const library = new LibraryService({store,bus,coreApi});
const musicPlayer = new MusicPlayerService({bus,store});

const dockRoutes = [
  ['home','home','Home'],
  ['streaming','streaming','Streaming'],
  ['games','games','Games'],
  ['music','music','Music'],
  ['pictures','pictures','Pictures'],
  ['files','files','Files'],
  ['settings','settings','Settings']
];

document.body.append(createMiniPlayer({player:musicPlayer,store,bus}));

const dock = document.getElementById('mainDock');
dockRoutes.forEach(([route,iconName,label])=>{
  const button=document.createElement('button');
  button.className='dock-button focusable';
  button.type='button';
  button.dataset.route=route;
  button.append(
    wvIcon(iconName,'dock-icon'),
    Object.assign(document.createElement('small'),{textContent:label})
  );
  button.addEventListener('click',()=>router.open(route));
  dock.append(button);
});

function toast(message){
  const element=document.getElementById('toast');
  element.textContent=message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>element.classList.remove('show'),1800);
}

bus.on('clock:tick',date=>{
  document.getElementById('topClock').textContent=date.toLocaleTimeString([],{
    hour:'numeric',minute:'2-digit'
  });
  document.getElementById('topDate').textContent=date.toLocaleDateString([],{
    weekday:'long',month:'long',day:'numeric'
  });
});

bus.on('route:changed',({route})=>{
  document.getElementById('currentRouteLabel').textContent=route;

  document.body.dataset.route = route;
  document.body.classList.add('route-transitioning');
  clearTimeout(window.__wireVaultRouteTransitionTimer);
  window.__wireVaultRouteTransitionTimer = setTimeout(() => {
    document.body.classList.remove('route-transitioning');
  }, 420);

  const title = document.getElementById('activeRouteTitle');
  if (title) title.textContent = route.toUpperCase();

  document.querySelectorAll('.dock-button').forEach(button => {
    const active = button.dataset.route === route;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });

  requestAnimationFrame(() => {
    document.querySelector(`.dock-button[data-route="${route}"]`)
      ?.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
  });
});

bus.on('settings:saved',()=>toast('Settings saved'));
bus.on('settings:reset',()=>toast('Settings reset'));
bus.on('settings:restored',()=>toast('Backup restored'));
bus.on('settings:factory-reset',()=>toast('Factory reset complete'));
bus.on('music:error',event=>toast(event.message||'Music playback error'));
bus.on('library:folders-changed',()=>{
  settings.save();
  toast('Media folder locations updated');
});
bus.on('library:scan-requested',folders=>{
  toast('Browser preview cannot scan paths automatically; use Import Media Files');
  console.info('Pi backend scan request',folders);
});
bus.on('library:scan-complete',summary=>{
  toast(`Indexed ${summary.music} music, ${summary.pictures} pictures, ${summary.games} games`);
});

const control=document.getElementById('controlCenter');
document.getElementById('controlCenterButton').addEventListener('click',()=>{
  control.classList.add('open');
  control.setAttribute('aria-hidden','false');
});
document.getElementById('closeControlCenter').addEventListener('click',()=>{
  control.classList.remove('open');
  control.setAttribute('aria-hidden','true');
});

document.querySelectorAll('[data-toggle]').forEach(button=>{
  button.addEventListener('click',()=>{
    button.classList.toggle('active');
    button.querySelector('small').textContent=button.classList.contains('active')?'On':'Off';
    if(button.dataset.toggle==='night') document.body.classList.toggle('night-mode');
    if(button.dataset.toggle==='sounds'){
      store.set('settings.uiSounds',button.classList.contains('active'));
      settings.save();
    }
  });
});

window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&control.classList.contains('open')){
    control.classList.remove('open');
    control.setAttribute('aria-hidden','true');
  }
  if(event.key==='Home') router.open('home');
});

settings.load();
clock.start();

coreApi.health().then(async result=>{
  if(result){
    coreApi.connectEvents();
    await library.refreshAll().catch(error=>{
      console.error('Initial library refresh failed',error);
    });
    coreApi.system().then(status=>store.set('core.system',status)).catch(()=>{});
  }
});
router.open('home');
store.set('system.foundationReady',true);

document.getElementById('foundationStatus').textContent='Foundation Ready';
document.getElementById('foundationDetail').textContent='Waiting for WireVault Core';

bus.on('core:online',()=>{
  document.getElementById('foundationStatus').textContent='Core Online';
  document.getElementById('foundationDetail').textContent='SQLite, scanner, APIs, and live events connected';
  toast('WireVault Core connected');
});
bus.on('core:offline',()=>{
  document.getElementById('foundationStatus').textContent='Browser Preview';
  document.getElementById('foundationDetail').textContent='Run start_core scripts for live backend data';
});
bus.on('core:library.scan.complete',async event=>{
  store.set('core.libraryCounts',event.payload.counts);
  await library.refreshAll().catch(()=>{});
  toast('Media scan complete');
});


function formatSystemBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B','KB','MB','GB','TB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatSystemUptime(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function updateControlSystemCard() {
  const system = store.get('core.system') || {};
  const memory = system.memory || {};
  const storage = system.storage || {};
  const load = system.load_average || {};
  const online = coreApi.online;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  setText('controlSystemState', online ? 'Healthy' : 'Preview');
  setText('controlSystemHostname', system.hostname || 'WireVault');
  setText(
    'controlSystemTemperature',
    Number.isFinite(system.cpu_temperature_c)
      ? `${system.cpu_temperature_c}°C`
      : '—'
  );
  setText(
    'controlSystemLoad',
    Number.isFinite(load.one) ? String(load.one) : '—'
  );
  setText(
    'controlSystemMemory',
    Number.isFinite(memory.percent)
      ? `${memory.percent}% · ${formatSystemBytes(memory.used_bytes)}`
      : '—'
  );
  setText(
    'controlSystemStorage',
    Number.isFinite(storage.percent)
      ? `${storage.percent}% · ${formatSystemBytes(storage.free_bytes)} free`
      : '—'
  );
  setText('controlSystemUptime', formatSystemUptime(system.uptime_seconds));
  setText(
    'controlSystemPlatform',
    system.platform ||
      (online
        ? 'WireVault Core connected'
        : 'Start WireVault Core for live Raspberry Pi details')
  );

  document
    .querySelector('.control-system-card')
    ?.classList.toggle('system-offline', !online);
}

bus.on('state:changed', change => {
  if (change.path === 'core.system') updateControlSystemCard();
});
bus.on('core:online', updateControlSystemCard);
bus.on('core:offline', updateControlSystemCard);
updateControlSystemCard();

window.WireVault = {bus,store,router,settings,registry,clock,library,coreApi,musicPlayer,toast};
/* Alpha 0.4 animated console dock */
(function wireVaultAnimatedDock() {
  const dock = document.getElementById('mainDock');
  const left = document.getElementById('dockScrollLeft');
  const right = document.getElementById('dockScrollRight');

  function dockButtons() {
    return [...dock.querySelectorAll('.dock-button')];
  }

  function currentIndex() {
    const buttons = dockButtons();
    const route = window.WireVault?.store?.get('navigation.route') || 'home';
    return Math.max(0, buttons.findIndex(button => button.dataset.route === route));
  }

  function openRelative(offset) {
    const buttons = dockButtons();
    if (!buttons.length) return;

    const index = (currentIndex() + offset + buttons.length) % buttons.length;
    buttons[index].click();
    buttons[index].focus({ preventScroll:true });
  }

  left?.addEventListener('click', () => openRelative(-1));
  right?.addEventListener('click', () => openRelative(1));

  /*
    Keyboard equivalents for future controller shoulder buttons:
    Q / PageUp = previous section
    E / PageDown = next section
  */
  window.addEventListener('keydown', event => {
    if (event.target.matches('input,textarea,select')) return;

    if (event.key === 'PageUp' || event.key.toLowerCase() === 'q') {
      event.preventDefault();
      openRelative(-1);
    }

    if (event.key === 'PageDown' || event.key.toLowerCase() === 'e') {
      event.preventDefault();
      openRelative(1);
    }
  });

  dock?.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault();
      dock.scrollBy({ left:event.deltaY, behavior:'smooth' });
    }
  }, { passive:false });

  window.WireVaultAnimatedDock = {
    previous:() => openRelative(-1),
    next:() => openRelative(1)
  };
})();

/* Alpha 0.6 Notification Center */
(function wireVaultNotificationCenter() {
  const panel = document.getElementById('notificationCenter');
  const button = document.getElementById('notificationCenterButton');
  const closeButton = document.getElementById('closeNotificationCenter');
  const list = document.getElementById('notificationList');
  const badge = document.getElementById('notificationBadge');
  const summary = document.getElementById('notificationSummary');
  const clearView = document.getElementById('clearNotificationView');

  let notifications = [];
  let seenIds = new Set();

  function iconFor(level) {
    return {
      success: '✓',
      warning: '!',
      error: '×',
      info: 'i'
    }[level] || 'i';
  }

  function relativeTime(timestamp) {
    const time = Number(timestamp || Date.now() / 1000) * 1000;
    const diff = Date.now() - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  function unreadCount() {
    return notifications.filter(item => !seenIds.has(item.id)).length;
  }

  function updateBadge() {
    const count = unreadCount();
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count === 0);
    summary.textContent = notifications.length
      ? `${count} unread · ${notifications.length} total`
      : 'No notifications';
  }

  function render() {
    list.replaceChildren();

    if (!notifications.length) {
      list.append(Object.assign(document.createElement('div'), {
        className: 'notification-empty',
        innerHTML: '<span>◉</span><strong>All quiet</strong><small>System events will appear here.</small>'
      }));
      updateBadge();
      return;
    }

    notifications.forEach(item => {
      const card = document.createElement('article');
      card.className = `notification-card notification-${item.level || 'info'}`;
      if (!seenIds.has(item.id)) card.classList.add('unread');

      const icon = document.createElement('div');
      icon.className = 'notification-level-icon';
      icon.textContent = iconFor(item.level);

      const copy = document.createElement('div');
      copy.className = 'notification-copy';

      const title = document.createElement('strong');
      title.textContent = item.title || 'Notification';

      const detail = document.createElement('small');
      detail.textContent = item.detail || item.level || 'WireVault event';

      const time = document.createElement('time');
      time.textContent = relativeTime(item.created_at);

      copy.append(title, detail);
      card.append(icon, copy, time);
      list.append(card);
    });

    updateBadge();
  }

  async function loadNotifications() {
    if (!window.WireVault?.coreApi?.online) {
      render();
      return;
    }

    try {
      notifications = await window.WireVault.coreApi.notifications(50);
      render();
    } catch (error) {
      console.error('Notification load failed', error);
    }
  }

  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.getElementById('controlCenter')?.classList.remove('open');

    notifications.forEach(item => {
      if (item.id != null) seenIds.add(item.id);
    });
    updateBadge();
  }

  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  button?.addEventListener('click', openPanel);
  closeButton?.addEventListener('click', closePanel);

  clearView?.addEventListener('click', () => {
    notifications = [];
    seenIds.clear();
    render();
    window.WireVault?.toast?.('Notification view cleared');
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.classList.contains('open')) {
      event.preventDefault();
      closePanel();
    }
  });

  window.WireVault?.bus?.on('core:online', loadNotifications);

  window.WireVault?.bus?.on('core:notification.created', event => {
    const payload = event.payload || {};
    notifications = [
      {
        id: `live-${Date.now()}`,
        level: payload.level || 'info',
        title: payload.title || 'Notification',
        detail: payload.detail || '',
        created_at: payload.created_at || Date.now() / 1000
      },
      ...notifications
    ];
    render();
    window.WireVault?.toast?.(payload.title || 'New notification');
  });


  render();

  window.WireVaultNotificationCenter = {
    open: openPanel,
    close: closePanel,
    refresh: loadNotifications
  };
})();
