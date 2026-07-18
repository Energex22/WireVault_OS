# WireVault OS 4.0 — Core Milestone 2.1

This revision changes Home from a duplicate shortcut page into a live widget
dashboard.

## Home no longer duplicates navigation

The main dock at the top remains the only section launcher.

Home now displays:

- WireVault Core connection status
- System health
- CPU temperature
- RAM usage
- Storage usage
- Indexed Music count
- Indexed Picture count
- Indexed Game/ROM count
- Indexed Video count
- Media scanner state
- Last scan time
- Weather placeholder
- Recent Core activity
- Refresh Widgets button

The Music, Pictures, Games, and Videos count widgets can open their related
sections, but they are presented as live status widgets rather than duplicate
navigation shortcuts.

## Start

Windows:

    start_core_windows.bat

Linux / Raspberry Pi:

    ./start_core_linux.sh