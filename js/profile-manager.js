const profileStorageKey = 'wirevault.profiles.v1';
const activeProfileKey = 'wirevault.profile.active';

const button = document.getElementById('profileButton');
const panel = document.getElementById('profilePanel');
const backdrop = document.getElementById('profileBackdrop');
const closeButton = document.getElementById('closeProfilePanel');
const list = document.getElementById('profileList');
const form = document.getElementById('createProfileForm');
const input = document.getElementById('newProfileName');
const avatar = document.getElementById('profileAvatar');
const nameLabel = document.getElementById('profileName');

function slug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `profile-${Date.now()}`;
}

function loadProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem(profileStorageKey) || '[]');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {}

  const defaults = [{
    id: 'justin',
    name: 'Justin',
    avatar: 'J',
    createdAt: Date.now()
  }];

  localStorage.setItem(profileStorageKey, JSON.stringify(defaults));
  localStorage.setItem(activeProfileKey, 'justin');
  return defaults;
}

function saveProfiles(profiles) {
  localStorage.setItem(profileStorageKey, JSON.stringify(profiles));
}

function activeProfileId() {
  const profiles = loadProfiles();
  const stored = localStorage.getItem(activeProfileKey);
  return profiles.some(profile => profile.id === stored)
    ? stored
    : profiles[0].id;
}

function activeProfile() {
  const profiles = loadProfiles();
  return profiles.find(profile => profile.id === activeProfileId()) || profiles[0];
}

function updateTopBar() {
  const profile = activeProfile();
  avatar.textContent = profile.avatar || profile.name.charAt(0).toUpperCase();
  nameLabel.textContent = profile.name;
}

function openPanel() {
  panel.classList.add('open');
  backdrop.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  backdrop.setAttribute('aria-hidden', 'false');
  renderProfiles();
}

function closePanel() {
  panel.classList.remove('open');
  backdrop.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  backdrop.setAttribute('aria-hidden', 'true');
}

function switchProfile(profile) {
  localStorage.setItem(activeProfileKey, profile.id);
  updateTopBar();
  closePanel();

  window.dispatchEvent(new CustomEvent('wirevault:profile-changed', {
    detail: profile
  }));

  window.WireVault?.toast?.(`Switched to ${profile.name}`);
  window.WireVault?.router?.open('home');
}

function deleteProfile(profile) {
  const profiles = loadProfiles();
  if (profiles.length <= 1) {
    window.WireVault?.toast?.('WireVault needs at least one profile');
    return;
  }

  const updated = profiles.filter(item => item.id !== profile.id);
  saveProfiles(updated);

  if (activeProfileId() === profile.id) {
    localStorage.setItem(activeProfileKey, updated[0].id);
    updateTopBar();
    window.dispatchEvent(new CustomEvent('wirevault:profile-changed', {
      detail: updated[0]
    }));
  }

  renderProfiles();
}

function profileCard(profile) {
  const current = profile.id === activeProfileId();
  const card = document.createElement('div');
  card.className = `profile-card ${current ? 'active' : ''}`;

  const select = document.createElement('button');
  select.type = 'button';
  select.className = 'profile-select focusable';

  const icon = document.createElement('span');
  icon.className = 'profile-card-avatar';
  icon.textContent = profile.avatar || profile.name.charAt(0).toUpperCase();

  const copy = document.createElement('span');
  copy.className = 'profile-card-copy';

  const strong = document.createElement('strong');
  strong.textContent = profile.name;

  const small = document.createElement('small');
  small.textContent = current ? 'CURRENT PROFILE' : 'Switch profile';

  copy.append(strong, small);
  select.append(icon, copy);
  select.addEventListener('click', () => switchProfile(profile));
  card.append(select);

  if (!current) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'profile-delete focusable';
    remove.textContent = '×';
    remove.title = `Delete ${profile.name}`;
    remove.addEventListener('click', () => deleteProfile(profile));
    card.append(remove);
  }

  return card;
}

function renderProfiles() {
  list.replaceChildren();
  loadProfiles().forEach(profile => list.append(profileCard(profile)));
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const name = input.value.trim();
  if (!name) return;

  const profiles = loadProfiles();
  let id = slug(name);
  let suffix = 2;

  while (profiles.some(profile => profile.id === id)) {
    id = `${slug(name)}-${suffix++}`;
  }

  const profile = {
    id,
    name,
    avatar: name.charAt(0).toUpperCase(),
    createdAt: Date.now()
  };

  profiles.push(profile);
  saveProfiles(profiles);
  input.value = '';
  switchProfile(profile);
});

button?.addEventListener('click', openPanel);
closeButton?.addEventListener('click', closePanel);
backdrop?.addEventListener('click', closePanel);

window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && panel.classList.contains('open')) {
    closePanel();
  }
});

updateTopBar();

window.WireVaultProfiles = {
  get active() {
    return activeProfile();
  },
  list: loadProfiles,
  open: openPanel,
  close: closePanel
};