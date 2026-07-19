# WireVault Alpha 0.9.6

## Home

The large System Health widget is now a real all-in-one Raspberry Pi card:

- Core state
- Hostname
- Uptime
- CPU temperature
- One-minute CPU load
- Memory usage
- Storage usage and free space
- Architecture
- Python version

The separate Temperature, Memory, and Storage cards were removed to avoid
duplicating the same information.

## Control Center

Added a compact Raspberry Pi system panel with the same live information.

Clicking the Home system card opens Control Center.

## Future layout editing

The system card remains a two-column widget and is structured so a later
per-user Home editor can move, resize, hide, or restore it.

## Commit

`Add Raspberry Pi system health panels`