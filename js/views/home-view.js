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
    'data-wirevault-home-version':'1.4.0'
  });

const layoutKey = 'wirevault.home.layout.v1';
const defaultOrder = [
  'system','music','pictures','games','videos','scanner','weather'
];
let editMode = false;

function loadLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(layoutKey()) || '{}');
    return {
      order:Array.isArray(saved.order) ? saved.order : [...defaultOrder],
      hidden:Array.isArray(saved.hidden) ? saved.hidden : [],
      wide:Array.isArray(saved.wide) ? saved.wide : ['system']
    };
  } catch {
    return { order:[...defaultOrder], hidden:[], wide:['system'] };
  }
}

function saveLayout(layout) {
  localStorage.setItem(layoutKey(), JSON.stringify(layout));
}

function normalizeLayout(layout) {
  defaultOrder.forEach(id => {
    if (!layout.order.includes(id)) layout.order.push(id);
  });
  layout.order = layout.order.filter(id => defaultOrder.includes(id));
  layout.hidden = layout.hidden.filter(id => defaultOrder.includes(id));
  layout.wide = layout.wide.filter(id => defaultOrder.includes(id));
  return layout;
}


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

function widget({
  id,
  title,
  icon,
  value,
  detail,
  className = '',
  action = null
}) {
  return el('section',{
    className:`dashboard-widget ${className} ${action ? 'focusable widget-button' : ''}`,
    'data-widget-id':id,
    ...(action ? {
      role:'button',
      tabindex:'0',
      onclick:() => {
        if (!editMode) action();
      },
      onkeydown:event => {
        if (!editMode && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          action();
        }
      }
    } : {})
  },[
    el('div',{className:'widget-heading'},[
      wvIcon(icon,'widget-icon'),
      el('strong',{text:title})
    ]),
    el('div',{className:'widget-value',text:String(value)}),
    el('small',{className:'widget-detail',text:detail})
  ]);
}

function systemHealthCard({ system, memory, storage }) {
  const load = system.load_average || {};
  const online = coreApi.online;

  const row = (label, value, meter = null, note = '') => {
    const children = [
      el('small',{text:label}),
      el('strong',{text:value})
    ];

    if (Number.isFinite(meter)) {
      const fill = el('span',{className:'system-status-meter-fill'});
      fill.style.width = `${Math.max(0, Math.min(100, meter))}%`;
      children.push(el('span',{className:'system-status-meter'},[fill]));
    }

    if (note) {
      children.push(el('span',{className:'system-status-note',text:note}));
    }

    return el('div',{className:'system-status-row'},children);
  };

  return el('section',{
    className:'dashboard-widget system-status-card focusable',
    'data-widget-id':'system',
    role:'button',
    tabindex:'0',
    onclick:() => {
      if (!editMode) document.getElementById('controlCenterButton')?.click();
    },
    onkeydown:event => {
      if (!editMode && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        document.getElementById('controlCenterButton')?.click();
      }
    }
  },[
    el('div',{className:'system-status-header'},[
      el('div',{className:'widget-heading'},[
        wvIcon('system','widget-icon'),
        el('div',{},[
          el('strong',{text:'System Status'}),
          el('small',{
            text:online
              ? `${system.hostname || 'WireVault'} · ${formatUptime(system.uptime_seconds)} uptime`
              : 'WireVault Core is not connected'
          })
        ])
      ]),
      el('span',{
        className:`system-status-health ${online ? 'online' : 'offline'}`,
        text:online ? '● HEALTHY' : '● PREVIEW'
      })
    ]),
    el('div',{className:'system-status-rows'},[
      row(
        'CPU',
        Number.isFinite(load.one) ? String(load.one) : '—',
        null,
        Number.isFinite(system.cpu_temperature_c)
          ? `${system.cpu_temperature_c}°C temperature`
          : 'Load average'
      ),
      row(
        'Memory',
        Number.isFinite(memory.percent) ? `${memory.percent}%` : '—',
        memory.percent,
        Number.isFinite(memory.used_bytes)
          ? `${formatBytes(memory.used_bytes)} used`
          : ''
      ),
      row(
        'Storage',
        Number.isFinite(storage.percent) ? `${storage.percent}%` : '—',
        storage.percent,
        Number.isFinite(storage.free_bytes)
          ? `${formatBytes(storage.free_bytes)} free`
          : ''
      ),
      row(
        'Platform',
        system.machine || '—',
        null,
        system.python ? `Python ${system.python}` : ''
      )
    ]),
  ]);
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
      el('div',{className:'home-heading-actions'},[
        el('button',{
          className:'secondary-button focusable',
          type:'button',
          onclick:refreshDashboard
        },'Refresh'),
        el('button',{
          className:`secondary-button focusable ${editMode ? 'active' : ''}`,
          type:'button',
          onclick:() => {
            editMode = !editMode;
            render();
          }
        },editMode ? 'Done Editing' : 'Edit Home')
      ])
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


    const widgetNodes = [

      systemHealthCard({ system, memory, storage }),
      widget({
        id:'music',
        title:'Music',
        icon:'music',
        value:counts.music || 0,
        detail:'Indexed tracks',
        action:() => router.open('music')
      }),
      widget({
        id:'pictures',
        title:'Pictures',
        icon:'pictures',
        value:counts.pictures || 0,
        detail:'Indexed images',
        action:() => router.open('pictures')
      }),
      widget({
        id:'games',
        title:'Games',
        icon:'games',
        value:counts.games || 0,
        detail:'Indexed ROMs',
        action:() => router.open('games')
      }),
      widget({
        id:'videos',
        title:'Videos',
        icon:'streaming',
        value:counts.videos || 0,
        detail:'Indexed videos',
        action:() => router.open('files')
      }),
      widget({
        id:'scanner',
        title:'Media Scanner',
        icon:'scanner',
        value:scan.running ? 'Scanning' : 'Idle',
        detail:scan.finished_at
          ? `Last scan ${new Date(scan.finished_at * 1000).toLocaleString()}`
          : 'No completed scan yet',
        className:scan.running ? 'widget-scanning' : ''
      }),
      widget({
        id:'weather',
        title:'Weather',
        icon:'weather',
        value:'72°F',
        detail:'Weather service will replace this placeholder'
      })
    
    ];

    const layout = normalizeLayout(loadLayout());
    const nodeById = new Map(
      widgetNodes.map(node => [node.dataset.widgetId, node])
    );

    function moveWidget(id, direction) {
      const index = layout.order.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= layout.order.length) return;
      [layout.order[index], layout.order[target]] =
        [layout.order[target], layout.order[index]];
      saveLayout(layout);
      render();
    }

    function toggleWide(id) {
      layout.wide = layout.wide.includes(id)
        ? layout.wide.filter(item => item !== id)
        : [...layout.wide, id];
      saveLayout(layout);
      render();
    }

    function hideWidget(id) {
      if (!layout.hidden.includes(id)) layout.hidden.push(id);
      saveLayout(layout);
      render();
    }

    function restoreWidget(id) {
      layout.hidden = layout.hidden.filter(item => item !== id);
      saveLayout(layout);
      render();
    }

    function decorateWidget(node, id) {
      node.classList.toggle('widget-layout-wide', layout.wide.includes(id));
      node.classList.toggle('widget-editing', editMode);

      if (!editMode) return node;

      node.append(el('div',{className:'widget-edit-controls'},[
        el('button',{
          type:'button',
          className:'focusable',
          title:'Move left',
          onclick:event => {
            event.stopPropagation();
            moveWidget(id,-1);
          }
        },'←'),
        el('button',{
          type:'button',
          className:'focusable',
          title:'Move right',
          onclick:event => {
            event.stopPropagation();
            moveWidget(id,1);
          }
        },'→'),
        el('button',{
          type:'button',
          className:'focusable',
          title:'Resize widget',
          onclick:event => {
            event.stopPropagation();
            toggleWide(id);
          }
        },layout.wide.includes(id) ? '1×' : '2×'),
        el('button',{
          type:'button',
          className:'focusable widget-hide-control',
          title:'Hide widget',
          onclick:event => {
            event.stopPropagation();
            hideWidget(id);
          }
        },'×')
      ]));
      return node;
    }

    const widgets = el('div',{
      className:`dashboard-widget-grid ${editMode ? 'home-edit-mode' : ''}`
    });

    layout.order.forEach(id => {
      if (layout.hidden.includes(id)) return;
      const node = nodeById.get(id);
      if (node) widgets.append(decorateWidget(node,id));
    });

    const hiddenWidgets = editMode && layout.hidden.length
      ? el('section',{className:'home-hidden-widgets'},[
          el('strong',{text:'Hidden Widgets'}),
          el('div',{className:'home-hidden-widget-list'},
            layout.hidden.map(id =>
              el('button',{
                type:'button',
                className:'secondary-button focusable',
                onclick:() => restoreWidget(id)
              },`+ ${id.charAt(0).toUpperCase()+id.slice(1)}`)
            )
          )
        ])
      : null;

    const editToolbar = editMode
      ? el('section',{className:'home-edit-toolbar'},[
          el('div',{},[
            el('strong',{text:'Edit Home'}),
            el('small',{text:'Move, resize, or hide dashboard widgets.'})
          ]),
          el('button',{
            type:'button',
            className:'secondary-button focusable',
            onclick:() => {
              localStorage.removeItem(layoutKey());
              render();
            }
          },'Restore Default')
        ])
      : null;


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
    wrapper.replaceChildren(
      heading,
      editToolbar,
      hiddenWidgets,
      statusStrip,
      widgets,
      activityPanel
    );
  }

  window.addEventListener('wirevault:profile-changed',() => {
    editMode = false;
    render();
  });

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