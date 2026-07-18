export class CoreApiService {
  constructor({ bus, baseUrl = '' }) {
    this.bus = bus;
    this.baseUrl = baseUrl;
    this.online = false;
    this.events = null;
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      cache: 'no-store',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || `Core request failed: ${response.status}`);
    }

    return response.json();
  }

  async health() {
    try {
      const result = await this.request('/api/health');
      this.online = Boolean(result.ok);
      this.bus.emit('core:online', result);
      return result;
    } catch (error) {
      this.online = false;
      this.bus.emit('core:offline', { message: error.message });
      return null;
    }
  }

  system() {
    return this.request('/api/system');
  }

  library(type = '', query = '') {
    const parameters = new URLSearchParams();
    if (type) parameters.set('type', type);
    if (query) parameters.set('q', query);
    const suffix = parameters.toString() ? `?${parameters}` : '';
    return this.request(`/api/library${suffix}`);
  }

  counts() {
    return this.request('/api/library/counts');
  }

  status() {
    return this.request('/api/library/status');
  }

  scan() {
    return this.request('/api/library/scan', {
      method: 'POST',
      body: '{}'
    });
  }

  settings() {
    return this.request('/api/settings');
  }

  updateSettings(payload) {
    return this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  activity(limit = 30) {
    return this.request(`/api/activity?limit=${limit}`);
  }

  notifications(limit = 50) {
    return this.request(`/api/notifications?limit=${limit}`);
  }

  connectEvents() {
    if (!('EventSource' in window)) return;

    this.events?.close();
    this.events = new EventSource(`${this.baseUrl}/api/events`);

    this.events.onopen = () => this.bus.emit('core:events-connected');
    this.events.onerror = () => this.bus.emit('core:events-disconnected');

    [
      'library.scan.started',
      'library.scan.complete',
      'library.scan.error',
      'settings.updated',
      'notification.created'
    ].forEach(eventName => {
      this.events.addEventListener(eventName, event => {
        try {
          this.bus.emit(`core:${eventName}`, JSON.parse(event.data));
        } catch (error) {
          console.error('Invalid core event', error);
        }
      });
    });
  }
}