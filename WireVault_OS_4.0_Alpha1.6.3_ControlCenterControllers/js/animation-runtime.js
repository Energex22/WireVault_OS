const body = document.body;

const curtain = document.createElement('div');
curtain.className = 'wv-route-curtain';
curtain.setAttribute('aria-hidden', 'true');
document.body.append(curtain);

const halo = document.createElement('div');
halo.className = 'wv-focus-halo';
halo.setAttribute('aria-hidden', 'true');
document.body.append(halo);

let lastRoute = null;
let routeTimer = null;
let enterTimer = null;
let haloFrame = null;
let keyboardNavigation = false;

const focusSelector = [
  '.focusable',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function hideHalo() {
  cancelAnimationFrame(haloFrame);
  halo.classList.remove('visible');
}

function validFocusTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (!target.isConnected) return false;
  if (!target.matches(focusSelector)) return false;

  const style = getComputedStyle(target);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    Number(style.opacity) === 0
  ) return false;

  const rect = target.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;

  const vw = window.innerWidth || document.documentElement.clientWidth;
  const vh = window.innerHeight || document.documentElement.clientHeight;

  if (
    rect.right <= 0 ||
    rect.bottom <= 0 ||
    rect.left >= vw ||
    rect.top >= vh
  ) return false;

  return true;
}

function updateHalo(target = document.activeElement) {
  cancelAnimationFrame(haloFrame);

  haloFrame = requestAnimationFrame(() => {
    if (!keyboardNavigation || !validFocusTarget(target)) {
      hideHalo();
      return;
    }

    const rect = target.getBoundingClientRect();
    halo.style.left = `${Math.round(rect.left - 4)}px`;
    halo.style.top = `${Math.round(rect.top - 4)}px`;
    halo.style.width = `${Math.round(rect.width + 8)}px`;
    halo.style.height = `${Math.round(rect.height + 8)}px`;
    halo.style.borderRadius =
      getComputedStyle(target).borderRadius || '14px';
    halo.classList.add('visible');
  });
}

function clearRouteClasses() {
  body.classList.remove('wv-route-leaving', 'wv-route-entering');
}

function animateRoute(route) {
  if (!route || route === lastRoute) return;
  lastRoute = route;

  clearTimeout(routeTimer);
  clearTimeout(enterTimer);
  hideHalo();
  clearRouteClasses();

  // Page contents switch immediately. Component hover, focus, panel,
  // toast, dock, and boot animations remain enabled.
  requestAnimationFrame(() => updateHalo(document.activeElement));
}
function currentRoute() {
  return (
    window.WireVault?.store?.get('navigation.route') ||
    document.querySelector('.dock-button.active')?.dataset.route ||
    'home'
  );
}

document.addEventListener('keydown', event => {
  if (
    event.key === 'Tab' ||
    event.key.startsWith('Arrow') ||
    ['Enter', ' ', 'PageUp', 'PageDown'].includes(event.key)
  ) {
    keyboardNavigation = true;
    requestAnimationFrame(() => updateHalo(document.activeElement));
  }
});

document.addEventListener('pointerdown', () => {
  keyboardNavigation = false;
  hideHalo();
}, true);

document.addEventListener('focusin', event => updateHalo(event.target));

document.addEventListener('focusout', () => {
  hideHalo();
  requestAnimationFrame(() => updateHalo(document.activeElement));
});

window.addEventListener('resize', () => updateHalo(document.activeElement));
window.addEventListener('scroll', () => updateHalo(document.activeElement), true);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hideHalo();
});

function connectToWireVault() {
  if (!window.WireVault?.bus) {
    setTimeout(connectToWireVault, 50);
    return;
  }

  window.WireVault.bus.on('route:changed', ({ route }) => {
    animateRoute(route);
  });

  lastRoute = currentRoute();
}

connectToWireVault();

window.WireVaultAnimations = {
  animateRoute,
  updateHalo,
  hideHalo,
  setLoading(element, loading = true) {
    element?.classList.toggle('wv-loading', Boolean(loading));
  }
};

/* Alpha 0.9.2 boot sequence */
(function wireVaultBootSequence() {
  const screen = document.getElementById('wireVaultBoot');
  const progress = document.getElementById('wireVaultBootProgress');
  const status = document.getElementById('wireVaultBootStatus');
  const skip = document.getElementById('wireVaultBootSkip');

  if (!screen || !progress || !status) return;

  const alreadyShown = sessionStorage.getItem('wirevault.boot.shown') === '1';
  const steps = [
    [16, 'Initializing Core'],
    [36, 'Loading Interface'],
    [58, 'Connecting Media Library'],
    [78, 'Preparing Controllers'],
    [94, 'Starting WireVault'],
    [100, 'Ready']
  ];

  let finished = false;
  let timers = [];

  function finishBoot() {
    if (finished) return;
    finished = true;

    timers.forEach(clearTimeout);
    progress.style.width = '100%';
    status.textContent = 'Ready';
    sessionStorage.setItem('wirevault.boot.shown', '1');

    setTimeout(() => {
      screen.classList.add('complete');
      document.body.classList.remove('wv-booting');

      setTimeout(() => {
        screen.remove();
      }, 520);
    }, alreadyShown ? 80 : 260);
  }

  function startBoot() {
    document.body.classList.add('wv-booting');

    if (alreadyShown) {
      progress.style.width = '100%';
      status.textContent = 'WireVault Ready';
      timers.push(setTimeout(finishBoot, 280));
      return;
    }

    steps.forEach(([percent, message], index) => {
      timers.push(setTimeout(() => {
        progress.style.width = `${percent}%`;
        status.textContent = message;

        if (percent === 100) {
          timers.push(setTimeout(finishBoot, 300));
        }
      }, 330 + index * 330));
    });
  }

  skip?.addEventListener('click', finishBoot);

  window.addEventListener('keydown', event => {
    if (
      !finished &&
      ['Enter', 'Escape', ' ', 'Gamepad0'].includes(event.key)
    ) {
      event.preventDefault();
      finishBoot();
    }
  });

  startBoot();

  window.WireVaultBoot = {
    finish: finishBoot,
    replay() {
      sessionStorage.removeItem('wirevault.boot.shown');
      window.location.reload();
    }
  };
})();
