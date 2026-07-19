import { el } from '../components/el.js';
import { wvIcon } from '../components/wv-icon.js';

const formatBytes = bytes => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B','KB','MB','GB','TB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const formatUptime = seconds => {
  if (!Number.isFinite(seconds)) return 'Unavailable';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export function createHomeView({ store, bus, coreApi, library, router }) {
  const wrapper = el('div');

  async function refreshDashboard() {
    if (coreApi.online) {
      await Promise.all([
        library.refreshAll().catch(() => null),
        coreApi.system()
          .then(status => store.set('core.system', status))
          .catch(() => null),
        coreApi.activity(8)
          .then(activity => store.set('core.activity', activity))
          .catch(() => null)
      ]);
    }
    render();
  }

  function widget({ title, icon, value, detail, className = '', action = null }) {
    const card = el(action ? 'button' : 'section',{
      className:`dashboard-widget ${className} ${action ? 'focusable widget-button' : ''}`,
      ...(action ? { type:'button', onclick:action } : {})
    },[
      el('div',{className:'widget-heading'},[
        wvIcon(icon,'widget-icon'),
        el('strong',{text:title})
      ]),
      el('div',{className:'widget-value',text:String(value)}),
      el('small',{className:'widget-detail',text:detail})
    ]);
    return card;
  }

  function render() {
    const counts = library.getCounts();
    const scan = library.getScanStatus();
    const system = store.get('core.system') || {};
    const activity = store.get('core.activity') || [];
    const memory = system.memory || {};
    const storage = system.storage || {};

    const heading = el('div',{className:'view-heading'},[
      el('div',{},[
        el('h1',{text:'Home'}),
        el('p',{text:'Live WireVault status and media information.'})
      ]),
      el('button',{
        className:'secondary-button focusable',
        type:'button',
        onclick:refreshDashboard
      },'Refresh Widgets')
    ]);

    const statusStrip = el('div',{className:'dashboard-status-strip'},[
      el('span',{
        className:coreApi.online ? 'status-dot online' : 'status-dot offline'
      }),
      el('strong',{
        text:coreApi.online ? 'WireVault Core Online' : 'Browser Preview'
      }),
      el('small',{
        text:coreApi.online
          ? 'Live SQLite library and system data connected'
          : 'Start WireVault Core for live widgets'
      })
    ]);

    const widgets = el('div',{className:'dashboard-widget-grid'},[
      widget({
        title:'System Health',
        icon:'system',
        value:coreApi.online ? 'Healthy' : 'Preview',
        detail:coreApi.online
          ? `${system.hostname || 'WireVault'} · ${formatUptime(system.uptime_seconds)} uptime`
          : 'Backend is not currently connected',
        className:'widget-wide'
      }),
      widget({
        title:'CPU Temperature',
        icon:'cpu',
        value:Number.isFinite(system.cpu_temperature_c)
          ? `${system.cpu_temperature_c}°C`
          : '—',
        detail:'Raspberry Pi thermal reading'
      }),
      widget({
        title:'Memory',
        icon:'ram',
        value:Number.isFinite(memory.percent) ? `${memory.percent}%` : '—',
        detail:Number.isFinite(memory.used_bytes)
          ? `${formatBytes(memory.used_bytes)} used`
          : 'Live with WireVault Core'
      }),
      widget({
        title:'Storage',
        icon:'storage',
        value:Number.isFinite(storage.percent) ? `${storage.percent}%` : '—',
        detail:Number.isFinite(storage.free_bytes)
          ? `${formatBytes(storage.free_bytes)} free`
          : 'Live with WireVault Core'
      }),
      widget({
        title:'Music',
        icon:'music',
        value:counts.music || 0,
        detail:'Indexed tracks',
        action:() => router.open('music')
      }),
      widget({
        title:'Pictures',
        icon:'pictures',
        value:counts.pictures || 0,
        detail:'Indexed images',
        action:() => router.open('pictures')
      }),
      widget({
        title:'Games',
        icon:'games',
        value:counts.games || 0,
        detail:'Indexed ROMs',
        action:() => router.open('games')
      }),
      widget({
        title:'Videos',
        icon:'streaming',
        value:counts.videos || 0,
        detail:'Indexed videos',
        action:() => router.open('files')
      }),
      widget({
        title:'Media Scanner',
        icon:'scanner',
        value:scan.running ? 'Scanning' : 'Idle',
        detail:scan.finished_at
          ? `Last scan ${new Date(scan.finished_at * 1000).toLocaleString()}`
          : 'No completed scan yet',
        className:scan.running ? 'widget-scanning' : ''
      }),
      widget({
        title:'Weather',
        icon:'weather',
        value:'72°F',
        detail:'Weather service will replace this placeholder'
      })
    ]);

    const activityPanel = el('section',{className:'panel dashboard-activity-panel'},[
      el('div',{className:'widget-panel-heading'},[
        el('div',{},[
          el('h2',{text:'Recent Activity'}),
          el('p',{text:'Latest library and system events from WireVault Core.'})
        ]),
        el('span',{className:'badge',text:`${activity.length} EVENTS`})
      ])
    ]);

    const activityList = el('div',{className:'dashboard-activity-list'});

    if (!activity.length) {
      activityList.append(el('div',{className:'empty-state compact-empty'},[
        el('span',{text:'◷'}),
        el('strong',{text:'No recent activity'}),
        el('small',{text:'Library scans and system actions will appear here.'})
      ]));
    } else {
      activity.forEach(item => {
        activityList.append(el('div',{className:'dashboard-activity-row'},[
          el('span',{text:item.event_type === 'library.scan' ? '📁' : '•'}),
          el('div',{},[
            el('strong',{text:item.title}),
            el('small',{text:item.detail || item.event_type})
          ]),
          el('time',{
            text:new Date(item.created_at * 1000).toLocaleTimeString([],{
              hour:'numeric',
              minute:'2-digit'
            })
          })
        ]));
      });
    }

    activityPanel.append(activityList);
    wrapper.replaceChildren(heading,statusStrip,widgets,activityPanel);
  }

  bus.on('library:refreshed',render);
  bus.on('core:online',refreshDashboard);
  bus.on('core:offline',render);
  bus.on('core:library.scan.complete',refreshDashboard);
  bus.on('state:changed',change => {
    if (
      change.path === 'core.system' ||
      change.path === 'core.activity' ||
      change.path === 'library.counts'
    ) {
      render();
    }
  });

  render();
  return wrapper;
}