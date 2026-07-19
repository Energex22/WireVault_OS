# WireVault OS 4.0 — Alpha 0.6 Notification Center

This release adds a live slide-out Notification Center.

## Added

- Notification button in the top status area
- Unread notification badge
- Slide-out notification panel
- Notification history from WireVault Core
- Live updates through Server-Sent Events
- Library-scan completion notifications
- Notification level styling:
  - info
  - success
  - warning
  - error
- Relative time labels
- Clear View button
- Escape closes the panel
- Opening the panel marks the current notifications as seen

## Core integration

The Notification Center uses:

    GET /api/notifications

and listens for:

    notification.created
    library.scan.complete

## Git commit suggestion

    Add live notification center

## Start

Windows:

    start_core_windows.bat

Linux / Raspberry Pi:

    ./start_core_linux.sh