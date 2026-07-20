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

const editor = document.getElementById('profileEditor');
const editorTitle = document.getElementById('profileEditorTitle');
const editorName = document.getElementById('profileEditorName');
const avatarChoices = document.getElementById('profileAvatarChoices');
const accentChoices = document.getElementById('profileAccentChoices');
const saveChanges = document.getElementById('saveProfileChanges');

const avatarOptions = ['J','A','B','C','D','G','M','P','R','S','V','★'];
const accentOptions = [
  { id:'green', label:'Vault Green', color:'#78ff16', rgb:'120,255,22' },
  { id:'blue', label:'Electric Blue', color:'#32b7ff', rgb:'50,183,255' },
  { id:'purple', label:'Neon Purple', color:'#b56cff', rgb:'181,108,255' },
  { id:'amber', label:'Amber', color:'#ffbf3f', rgb:'255,191,63' },
  { id:'red', label:'Crimson', color:'#ff5f57', rgb:'255,95,87' }
];

let editingAvatar = 'J';
let editingAccent = 'green';
let editorOpen = false;

function setEditorOpen(open, focusName = false) {
  editorOpen = Boolean(open);
  editor?.classList.toggle('open', editorOpen);
  editor?.setAttribute('aria-hidden', String(!editorOpen));

  if (editorOpen) {
    populateEditor();
    editor.scrollIntoView({ behavior:'smooth', block:'nearest' });
    if (focusName) setTimeout(() => editorName?.focus(), 220);
  }
}

function slug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `profile-${Date.now()}`;
}

function normalizeProfile(profile) {
  return {
    id: profile.id,
    name: profile.name || 'User',
    avatar: profile.avatar || (profile.name || 'U').charAt(0).toUpperCase(),
    accent: profile.accent || 'green',
    createdAt: profile.createdAt || Date.now()
  };
}

function loadProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem(profileStorageKey) || '[]');
    if (Array.isArray(saved) && saved.length) {
      const normalized = saved.map(normalizeProfile);
      localStorage.setItem(profileStorageKey, JSON.stringify(normalized));
      return normalized;
    }
  } catch {}

  const defaults = [{
    id: 'justin',
    name: 'Justin',
    avatar: 'J',
    accent: 'green',
    createdAt: Date.now()
  }];

  localStorage.setItem(profileStorageKey, JSON.stringify(defaults));
  localStorage.setItem(activeProfileKey, 'justin');
  return defaults;
}

function saveProfiles(profiles) {
  localStorage.setItem(
    profileStorageKey,
    JSON.stringify(profiles.map(normalizeProfile))
  );
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

function accentDefinition(id) {
  return accentOptions.find(option => option.id === id) || accentOptions[0];
}

function applyAccent(profile) {
  const accent = accentDefinition(profile.accent);
  const root = document.documentElement;

  root.style.setProperty('--wv-green', accent.color);
  root.style.setProperty('--wv-green-dim', `rgba(${accent.rgb},.55)`);
  root.style.setProperty('--wv-accent', accent.color);
  root.style.setProperty('--wv-accent-rgb', accent.rgb);
  root.style.setProperty('--wv-accent-soft', `rgba(${accent.rgb},.12)`);
  root.style.setProperty('--wv-accent-medium', `rgba(${accent.rgb},.28)`);
  root.style.setProperty('--wv-accent-strong', `rgba(${accent.rgb},.55)`);
  root.style.setProperty('--wv-accent-glow', `rgba(${accent.rgb},.32)`);

  root.dataset.profileAccent = accent.id;
}

function updateTopBar() {
  const profile = activeProfile();
  avatar.textContent = profile.avatar;
  nameLabel.textContent = profile.name;
  applyAccent(profile);
}

function openPanel() {
  panel.classList.add('open');
  backdrop.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  backdrop.setAttribute('aria-hidden', 'false');
  renderProfiles();
  setEditorOpen(false);
}

function closePanel() {
  panel.classList.remove('open');
  backdrop.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  backdrop.setAttribute('aria-hidden', 'true');
  setEditorOpen(false);
}

function emitProfileChanged(profile) {
  window.dispatchEvent(new CustomEvent('wirevault:profile-changed', {
    detail: profile
  }));
}

function switchProfile(profile) {
  localStorage.setItem(activeProfileKey, profile.id);
  updateTopBar();
  renderProfiles();
  populateEditor();
  emitProfileChanged(profile);

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
    emitProfileChanged(updated[0]);
  }

  renderProfiles();
  populateEditor();
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
  icon.textContent = profile.avatar;
  icon.style.borderColor = accentDefinition(profile.accent).color;
  icon.style.color = accentDefinition(profile.accent).color;

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

  if (current) {
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'profile-edit-button focusable';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => {
      setEditorOpen(!editorOpen, !editorOpen);
    });
    card.append(edit);
  } else {
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

function renderAvatarChoices() {
  avatarChoices.replaceChildren();

  avatarOptions.forEach(option => {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className =
      `profile-avatar-choice focusable ${editingAvatar === option ? 'active' : ''}`;
    choice.textContent = option;
    choice.addEventListener('click', () => {
      editingAvatar = option;
      renderAvatarChoices();
    });
    avatarChoices.append(choice);
  });
}

function renderAccentChoices() {
  accentChoices.replaceChildren();

  accentOptions.forEach(option => {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className =
      `profile-accent-choice focusable ${editingAccent === option.id ? 'active' : ''}`;
    choice.title = option.label;

    const dot = document.createElement('span');
    dot.style.background = option.color;

    const text = document.createElement('small');
    text.textContent = option.label;

    choice.append(dot, text);
    choice.addEventListener('click', () => {
      editingAccent = option.id;
      renderAccentChoices();
    });
    accentChoices.append(choice);
  });
}

function populateEditor() {
  const profile = activeProfile();
  editorTitle.textContent = profile.name;
  editorName.value = profile.name;
  editingAvatar = profile.avatar;
  editingAccent = profile.accent;
  renderAvatarChoices();
  renderAccentChoices();
}

function saveEditor() {
  const name = editorName.value.trim();
  if (!name) {
    window.WireVault?.toast?.('Profile name cannot be empty');
    return;
  }

  const profiles = loadProfiles();
  const id = activeProfileId();
  const index = profiles.findIndex(profile => profile.id === id);
  if (index < 0) return;

  profiles[index] = {
    ...profiles[index],
    name,
    avatar: editingAvatar,
    accent: editingAccent
  };

  saveProfiles(profiles);
  updateTopBar();
  renderProfiles();
  populateEditor();
  emitProfileChanged(profiles[index]);
  setEditorOpen(false);
  window.WireVault?.toast?.('Profile saved');
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
    accent: 'green',
    createdAt: Date.now()
  };

  profiles.push(profile);
  saveProfiles(profiles);
  input.value = '';
  switchProfile(profile);
});

saveChanges?.addEventListener('click', saveEditor);
button?.addEventListener('click', openPanel);
closeButton?.addEventListener('click', closePanel);
backdrop?.addEventListener('click', closePanel);

window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && panel.classList.contains('open')) {
    closePanel();
  }
});

updateTopBar();

function hideDuplicateAccentSetting(root = document) {
  const candidates = root.querySelectorAll(
    '.setting-row, .settings-row, .setting-card, .settings-card, label'
  );

  candidates.forEach(element => {
    const text = element.textContent?.trim().toLowerCase() || '';
    if (
      text.includes('accent color') ||
      text.includes('interface accent')
    ) {
      element.classList.add('profile-managed-accent-setting');
      element.setAttribute(
        'title',
        'Accent color is managed by the active WireVault profile.'
      );
    }
  });
}

const accentSettingObserver = new MutationObserver(records => {
  records.forEach(record => {
    record.addedNodes.forEach(node => {
      if (node instanceof Element) hideDuplicateAccentSetting(node);
    });
  });
});

accentSettingObserver.observe(document.body, {
  childList:true,
  subtree:true
});

hideDuplicateAccentSetting();

window.WireVaultProfiles = {
  get active() {
    return activeProfile();
  },
  list: loadProfiles,
  open: openPanel,
  close: closePanel
};