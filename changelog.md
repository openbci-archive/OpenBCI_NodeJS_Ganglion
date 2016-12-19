# 0.3.7

### Bug Fixes
* Improvements to disconnect

# 0.3.6

### Bug Fixes
* Fixed bug where not disconnecting.

# 0.3.5 - 0.3.4 - 0.3.3

### New Features
* Get state of noble with `.isNobleReady()`

### Bug Fixes
* Fix bug where scan stop would not stop scan which led to many problems.

# 0.3.2

### Bug Fixes
* Fix bug where disconnect did not set private property `_connected` to false.

# 0.3.1

### Bug Fixes
* Fix bug with connect

# 0.3.0

### New Features
* Get accelerometer data from the ganglion! (Previous did not work while streaming)

### Breaking Changes
* Major change in how bytes are parse based on byte ID.

### Enhancements
* Refactor file names for clarity
* Removed dependency `underscore`

# 0.2.0

### Enhancements
* Compress with 18bits vs 19bits
* Reworked dropped packet detection and emit of packets.

### Bug Fixes
* Fix bug where ganglionServer example would hang on scan if no board found.
* Fix bug where node process would not disconnect on windows.
* Fix unhandled promise where server would call search start twice.

# 0.1.1

### New Features
* Add function for starting, `.accelStart()`, and stopping, `.accelStop()`, accelerometer.

### Bug Fixes
* Impedance was outputting on verbose instead of debug.

# 0.1.0

Initial release
