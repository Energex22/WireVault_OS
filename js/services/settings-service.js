export class SettingsService {
  constructor({
    store,
    bus,
    key = 'wirevault-4-settings',
    defaults
  }) {
    this.store = store;
    this.bus = bus;
    this.key = key;
    this.defaults = structuredClone(defaults);
  }

  applyPayload(payload) {
    const merged = {
      ...structuredClone(this.defaults),
      ...(payload || {}),
      libraryFolders: {
        ...structuredClone(this.defaults.libraryFolders),
        ...(payload?.libraryFolders || {})
      }
    };

    this.store.set('settings.theme', merged.theme);
    this.store.set('settings.uiSounds', merged.uiSounds);
    this.store.set('settings.weatherEnabled', merged.weatherEnabled);
    this.store.set('settings.temperatureUnit', merged.temperatureUnit);
    this.store.set('settings.controllerNavigation', merged.controllerNavigation);
    this.store.set('settings.controllerVibration', merged.controllerVibration);
    this.store.set('settings.nightMode', merged.nightMode);
    this.store.set('settings.animations', merged.animations);
    this.store.set('settings.screensaverMinutes', merged.screensaverMinutes);
    this.store.set('library.folders', merged.libraryFolders);
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.key));
      this.applyPayload(saved);
      this.bus.emit('settings:loaded', this.getSnapshot());
    } catch (error) {
      console.warn('Settings load failed; defaults restored', error);
      this.applyPayload(this.defaults);
    }
  }

  getSnapshot() {
    return {
      ...this.store.get('settings'),
      libraryFolders: this.store.get('library.folders')
    };
  }

  save() {
    const payload = this.getSnapshot();
    localStorage.setItem(this.key, JSON.stringify(payload));
    this.bus.emit('settings:saved', payload);
    return payload;
  }

  exportBackup() {
    return {
      format: 'wirevault-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: this.getSnapshot()
    };
  }

  importBackup(backup) {
    if (!backup || backup.format !== 'wirevault-backup' || !backup.settings) {
      throw new Error('Invalid WireVault backup file.');
    }

    this.applyPayload(backup.settings);
    this.save();
    this.bus.emit('settings:restored', this.getSnapshot());
    return this.getSnapshot();
  }

  factoryReset() {
    localStorage.removeItem(this.key);
    this.applyPayload(this.defaults);
    this.save();
    this.bus.emit('settings:factory-reset', this.getSnapshot());
    return this.getSnapshot();
  }
}