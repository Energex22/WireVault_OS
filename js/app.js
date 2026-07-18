import { EventBus } from './core/event-bus.js';
import { Store } from './core/store.js';
import { Router } from './core/router.js';
import { SettingsService } from './services/settings-service.js';
import { SettingsRegistry } from './services/settings-registry.js';
import { ClockService } from './services/clock-service.js';
import { LibraryService } from './services/library-service.js';
import { CoreApiService } from './services/core-api-service.js';
import { createHomeView } from './views/home-view.js';
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
  streaming:{render:()=>createPlaceholderView({icon:'📺',title:'Streaming',description:'This will be the first legacy section ported into the modular router.'})},
  games:{render:()=>createGamesView({library,router,coreApi})},
  music:{render:()=>createMusicView({library,router,coreApi})},
  pictures:{render:()=>createPicturesView({library,router,coreApi})},
  files:{render:()=>createFilesView({library,coreApi,toast})},
  browser:{render:()=>createPlaceholderView({icon:'🌐',title:'Browser',description:'Bookmarks and launcher actions will be isolated from the dashboard.'})},
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

const dockRoutes = [
  ['home','⌂','Home'],['streaming','📺','Streaming'],['games','🎮','Games'],
  ['music','🎵','Music'],['pictures','🖼️','Pictures'],['files','📁','Files'],
  ['settings','⚙️','Settings']
];

const dock = document.getElementById('mainDock');
dockRoutes.forEach(([route,icon,label])=>{
  const button=document.createElement('button');
  button.className='dock-button focusable';
  button.type='button';
  button.dataset.route=route;
  button.innerHTML=`<span>${icon}</span><small>${label}</small>`;
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
});

bus.on('settings:saved',()=>toast('Settings saved'));
bus.on('settings:reset',()=>toast('Settings reset'));
bus.on('settings:restored',()=>toast('Backup restored'));
bus.on('settings:factory-reset',()=>toast('Factory reset complete'));
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

window.WireVault = {bus,store,router,settings,registry,clock,library,coreApi,toast};