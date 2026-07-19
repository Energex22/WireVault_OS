# WireVault Alpha 0.9.4

## Fixed

- Removed the remaining single flash when switching pages.
- Removed repeated automatic media scans.
- Removed routine scan-complete notification spam.

## New scan behavior

- One scan when WireVault Core starts.
- Manual scans through **Files → Scan**.
- Scan failures remain eligible for notifications.
- Successful scans update status and activity without filling Notification Center.

## Animations retained

- Boot animation
- Dock selection
- Card hover and controller focus
- Control Center and Notification Center
- Toasts and scan spinner

## Commit

`Stop automatic scan spam and remove route flash`