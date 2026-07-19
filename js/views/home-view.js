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
  const wrapper = el('div',{
    'data-wirevault-home-version':'0.9.6.2'
  });

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


function systemHealthCard({ system, memory, storage }) {
  const load = system.load_average || {};
  const online = coreApi.online;

  const metric = (label, value, detail = '') =>
    el('div',{className:'system-health-metric'},[
      el('small',{text:label}),
      el('strong',{text:value}),
      detail ? el('span',{text:detail}) : null
    ].filter(Boolean));

  const card = el('button',{
    className:'dashboard-widget system-health-card focusable',
    type:'button',
    onclick:() => document.getElementById('controlCenterButton')?.click()
  },[
    el('div',{className:'system-health-header'},[
      el('div',{className:'widget-heading'},[
        wvIcon('system','widget-icon'),
        el('div',{},[
          el('strong',{text:'Raspberry Pi System'}),
          el('small',{
            text:online
              ? `${system.hostname || 'WireVault'} · ${formatUptime(system.uptime_seconds)} uptime`
              : 'WireVault Core is not connected'
          })
        ])
      ]),
      el('span',{
        className:`system-health-state ${online ? 'online' : 'offline'}`,
        text:online ? 'HEALTHY' : 'PREVIEW'
      })
    ]),
    el('div',{className:'system-health-grid'},[
      metric(
        'Temperature',
        Number.isFinite(system.cpu_temperature_c)
          ? `${system.cpu_temperature_c}°C`
          : '—',
        'CPU'
      ),
      metric(
        'CPU Load',
        Number.isFinite(load.one) ? String(load.one) : '—',
        '1 minute'
      ),
      metric(
        'Memory',
        Number.isFinite(memory.percent) ? `${memory.percent}%` : '—',
        Number.isFinite(memory.used_bytes)
          ? `${formatBytes(memory.used_bytes)} used`
          : ''
      ),
      metric(
        'Storage',
        Number.isFinite(storage.percent) ? `${storage.percent}%` : '—',
        Number.isFinite(storage.free_bytes)
          ? `${formatBytes(storage.free_bytes)} free`
          : ''
      ),
      metric(
        'Architecture',
        system.machine || '—',
        system.python ? `Python ${system.python}` : ''
      ),
      metric(
        'Core',
        online ? 'Online' : 'Offline',
        online ? 'APIs connected' : 'Start Core'
      )
    ]),
    el('small',{
      className:'system-health-open',
      text:'Open Control Center for full system details'
    })
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
      systemHealthCard({ system, memory, storage }),
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