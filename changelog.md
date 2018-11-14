# v1.2.0

### Bug Fixes

- Fixes bug where Ganglion did not work with Mojave.

# v1.1.12

### Bug Fixes

- Fixed bug for linux support for BLED112

# v1.1.11

### Bug Fixes

- Fixed bug where manufacturer name changed for BLED112, swtiched to vendor

# v1.1.10

### Improvements

- Can now use BLED112 with Windows

# v1.1.9

### Bug Fixes

- Fixed bug where accelerometer data was not emitted.

# v1.1.8

### Bug Fixes

- Utilities function crashed when trying to parse multi packet message from ganglion

# v1.1.7

### Bug Fixes

- BLED112 could not find ganglions with different names :(

# v1.1.6

### Bug Fixes

- BLED112 port name can change so made dynamic port finding routine and error message when no mattching driver found.

# v1.1.5

Chore bump noble version to v1.9.0 for macOS High Sierra

# v1.1.4

Chore bump serial port version to v6.1.1

### Bug Fixes

- Fix bug where disconnect device was not recognized for BLED112
- Fix bug where local name was not in the same format as noble with bled112

# v1.1.1

Update init functions

# v1.1.0

Add support for BLED112

# v1.0.0

Complete over haul of the core of the application to use the OpenBCI utilities NodeJS package.

### Bug Fixes

- Accel count value was wrong, was twice what it should have been.
- Closes #36 (thanks @chyumin)

### Breaking Changes

- Removed `index.js` and made entry point `openBCIGanglion.js` which leads to import of `const Ganglion = require('openbci-ganglion');` instead of `const Ganglion = require('openbci-ganglion').Ganglion`
- `Constants` are now taken from new [OpenBCI Utilities Module](https://github.com/OpenBCI/OpenBCI_NodeJS_Utilities)

## Beta 1

Initial Beta Release. Adds linting!

# v0.4.4

### New Features

- LSL streaming example (thanks @gabrielibagon)

### Bug Fixes

- Fix #27 by adding delay

# v0.4.3

### Bug Fixes

- Fix #23 by hard setting noble to 0.1.7, 0.1.8 breaks

# v0.4.2

### New Features

- Add callback function to constructor to catch noble errors.

### Bug Fixes

- Fix #19

# v0.4.1

### New Features

- Dropped connection will fire disconnect

### Bug Fixes

- Improvements to disconnect

# v0.4.0

### New Features

- If dropped connection, module will now disconnect and clean up.

### Breaking Changes

- Dropped connection will fire disconnect
- Auto reconnect functionality temporarily removed.

# v0.3.8

### New Features

- Can now subscribe to `scanStart` and `scanStop` to better control scanning.

# v0.3.7

### Bug Fixes

- Improvements to disconnect

# v0.3.6

### Bug Fixes

- Fixed bug where not disconnecting.

# v0.3.5 - 0.3.4 - 0.3.3

### New Features

- Get state of noble with `.isNobleReady()`

### Bug Fixes

- Fix bug where scan stop would not stop scan which led to many problems.

# v0.3.2

### Bug Fixes

- Fix bug where disconnect did not set private property `_connected` to false.

# v0.3.1

### Bug Fixes

- Fix bug with connect

# v0.3.0

### New Features

- Get accelerometer data from the ganglion! (Previous did not work while streaming)

### Breaking Changes

- Major change in how bytes are parse based on byte ID.

### Enhancements

- Refactor file names for clarity
- Removed dependency `underscore`

# v0.2.0

### Enhancements

- Compress with 18bits vs 19bits
- Reworked dropped packet detection and emit of packets.

### Bug Fixes

- Fix bug where ganglionServer example would hang on scan if no board found.
- Fix bug where node process would not disconnect on windows.
- Fix unhandled promise where server would call search start twice.

# v0.1.1

### New Features

- Add function for starting, `.accelStart()`, and stopping, `.accelStop()`, accelerometer.

### Bug Fixes

- Impedance was outputting on verbose instead of debug.

# v0.1.0

Initial release
