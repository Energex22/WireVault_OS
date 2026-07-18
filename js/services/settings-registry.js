export class SettingsRegistry {
  constructor() {
    this.entries = [
      {
        id: 'theme',
        title: 'Theme',
        description: 'Choose the WireVault color and appearance preset.',
        page: 'appearance',
        keywords: ['theme','color','green','appearance','skin','style']
      },
      {
        id: 'uiSounds',
        title: 'Interface Sounds',
        description: 'Enable or disable WireVault navigation and launch sounds.',
        page: 'audio',
        keywords: ['sound','audio','click','beep','ui sound','volume']
      },
      {
        id: 'weatherEnabled',
        title: 'Weather',
        description: 'Show weather information on the dashboard.',
        page: 'system',
        keywords: ['weather','forecast','radar','temperature','rain']
      },
      {
        id: 'temperatureUnit',
        title: 'Temperature Unit',
        description: 'Display weather in Fahrenheit or Celsius.',
        page: 'system',
        keywords: ['fahrenheit','celsius','temperature','degrees','weather unit']
      },
      {
        id: 'controllerNavigation',
        title: 'Controller Navigation',
        description: 'Navigate WireVault with a game controller.',
        page: 'controllers',
        keywords: ['controller','gamepad','xbox','playstation','dpad','stick']
      },
      {
        id: 'controllerVibration',
        title: 'Controller Vibration',
        description: 'Allow supported controllers to vibrate.',
        page: 'controllers',
        keywords: ['vibration','rumble','controller','gamepad']
      },
      {
        id: 'nightMode',
        title: 'Night Mode',
        description: 'Dim the interface for nighttime viewing.',
        page: 'appearance',
        keywords: ['night','dark','dim','brightness','late']
      },
      {
        id: 'animations',
        title: 'Animations',
        description: 'Enable interface transitions and motion.',
        page: 'appearance',
        keywords: ['animations','motion','transition','effects','reduced motion']
      },
      {
        id: 'screensaverMinutes',
        title: 'Screensaver Delay',
        description: 'Choose how long WireVault waits before starting the screensaver.',
        page: 'system',
        keywords: ['screensaver','idle','delay','timeout','sleep']
      },
      {
        id: 'libraryFolders',
        title: 'Media Folders',
        description: 'Music, Pictures, Games, and Videos are managed under Files.',
        page: 'library',
        keywords: ['folder','path','music folder','pictures folder','rom folder','games folder','videos folder','files']
      },
      {
        id: 'wifi',
        title: 'Wi-Fi',
        description: 'Wireless network settings will connect through the Raspberry Pi backend.',
        page: 'network',
        keywords: ['wifi','wi-fi','wireless','internet','network','ssid','router']
      },
      {
        id: 'bluetooth',
        title: 'Bluetooth',
        description: 'Pair controllers, speakers, and other Bluetooth devices.',
        page: 'network',
        keywords: ['bluetooth','pair','wireless controller','speaker','device']
      },
      {
        id: 'backup',
        title: 'Backup and Restore',
        description: 'Export or import WireVault settings and media-folder configuration.',
        page: 'backup',
        keywords: ['backup','restore','export','import','save configuration']
      },
      {
        id: 'factoryReset',
        title: 'Factory Reset',
        description: 'Restore every WireVault setting to its original default.',
        page: 'backup',
        keywords: ['factory reset','reset all','defaults','erase settings','start over']
      }
    ];
  }

  all() {
    return [...this.entries];
  }

  search(query) {
    const normalized = String(query || '').trim().toLowerCase();
    if (!normalized) return [];

    return this.entries
      .map(entry => {
        const haystack = [
          entry.title,
          entry.description,
          entry.page,
          ...(entry.keywords || [])
        ].join(' ').toLowerCase();

        let score = 0;
        if (entry.title.toLowerCase() === normalized) score += 100;
        if (entry.title.toLowerCase().includes(normalized)) score += 50;
        if ((entry.keywords || []).some(keyword => keyword.toLowerCase() === normalized)) score += 40;
        if (haystack.includes(normalized)) score += 15;

        return { ...entry, score };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  }
}