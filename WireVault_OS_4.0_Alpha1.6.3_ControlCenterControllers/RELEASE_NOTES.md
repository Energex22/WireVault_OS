# WireVault OS 4.0 — Alpha 1.6.3

## Cleaner top bar

Removed the repeated Wi-Fi, Bluetooth, and Controller indicators from the
persistent top header. Wi-Fi and Bluetooth remain available in Control Center.

The top status area now contains only:

- Notifications
- Active profile
- Control Center

## Controller status in Control Center

Added a Controllers card showing:

- Connected controller count
- Controller name
- Mapping type
- Button count
- Battery icon and percentage when exposed by the browser/controller
- Battery unavailable when the Gamepad API provides no battery data

The card updates when controllers connect or disconnect and refreshes every two
seconds while WireVault is running.

## Commit

`Move controller status into Control Center`