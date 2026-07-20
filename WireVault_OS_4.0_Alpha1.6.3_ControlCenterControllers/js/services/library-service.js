export class LibraryService {
  constructor({ store, bus, coreApi }) {
    this.store = store;
    this.bus = bus;
    this.coreApi = coreApi;
  }

  async refreshAll() {
    if (!this.coreApi.online) return false;

    const [music, pictures, games, videos, counts, status, settings] =
      await Promise.all([
        this.coreApi.library('music'),
        this.coreApi.library('pictures'),
        this.coreApi.library('games'),
        this.coreApi.library('videos'),
        this.coreApi.counts(),
        this.coreApi.status(),
        this.coreApi.settings()
      ]);

    this.store.set('library.items.music', music);
    this.store.set('library.items.pictures', pictures);
    this.store.set('library.items.games', games);
    this.store.set('library.items.videos', videos);
    this.store.set('library.counts', counts);
    this.store.set('library.scanStatus', status);
    this.store.set('library.folders', settings.media_folders || {});

    this.bus.emit('library:refreshed', {
      music,
      pictures,
      games,
      videos,
      counts,
      status
    });

    return true;
  }

  async refreshType(type) {
    if (!this.coreApi.online) return [];
    const items = await this.coreApi.library(type);
    this.store.set(`library.items.${type}`, items);
    this.bus.emit('library:type-refreshed', { type, items });
    return items;
  }

  async requestScan() {
    if (!this.coreApi.online) {
      this.bus.emit('library:scan-unavailable');
      return null;
    }
    return this.coreApi.scan();
  }

  async configureFolders(folders) {
    if (!this.coreApi.online) {
      this.store.set('library.folders', folders);
      this.bus.emit('library:folders-local', folders);
      return folders;
    }

    const settings = await this.coreApi.settings();
    const updated = await this.coreApi.updateSettings({
      ...settings,
      media_folders: folders
    });

    this.store.set('library.folders', updated.media_folders || folders);
    this.bus.emit('library:folders-changed', updated.media_folders || folders);
    return updated.media_folders || folders;
  }

  getFolders() {
    return this.store.get('library.folders') || {};
  }

  getLibrary(type) {
    return this.store.get(`library.items.${type}`) || [];
  }

  getCounts() {
    return this.store.get('library.counts') || {
      music: 0,
      pictures: 0,
      games: 0,
      videos: 0
    };
  }

  getScanStatus() {
    return this.store.get('library.scanStatus') || {};
  }
}