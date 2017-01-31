[![Join the chat at https://gitter.im/OpenBCI/OpenBCI_NodeJS](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/OpenBCI/OpenBCI_NodeJS?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Build Status](https://travis-ci.org/OpenBCI/OpenBCI_NodeJS_Ganglion.svg?branch=master)](https://travis-ci.org/OpenBCI/OpenBCI_NodeJS_Ganglion)
[![codecov](https://codecov.io/gh/OpenBCI/OpenBCI_NodeJS_Ganglion/branch/master/graph/badge.svg)](https://codecov.io/gh/OpenBCI/OpenBCI_NodeJS_Ganglion)
[![Dependency Status](https://david-dm.org/OpenBCI/OpenBCI_NodeJS_Ganglion.svg)](https://david-dm.org/OpenBCI/OpenBCI_NodeJS_Ganglion)
[![npm](https://img.shields.io/npm/dm/openbci-ganglion.svg?maxAge=2592000)](http://npmjs.com/package/openbci-ganglion)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/Flet/semistandard)

# OpenBCI Node.js SDK

A Node.js module for OpenBCI ~ written with love by [Push The World!](http://www.pushtheworldllc.com)

We are proud to support all functionality of the Ganglion (4 channel). Push The World is actively developing and maintaining this module.

The purpose of this module is to **get connected** and **start streaming** as fast as possible.

### Table of Contents:
---

1. [TL;DR](#tldr)
2. [Prerequisites](#prerequisites)
3. [Installation](#install)
4. [Ganglion](#ganglion)
  2. [General Overview](#general-overview)
  3. [SDK Reference Guide](#sdk-reference-guide)
    * [Constructor](#constructor)
    * [Methods](#method)
    * [Events](#event)
    * [Constants](#constants)
6. [Interfacing With Other Tools](#interfacing-with-other-tools)
7. [Developing](#developing)
8. [Testing](#developing-testing)
9. [Contribute](#contribute)
10. [License](#license)
11. [Roadmap](#roadmap)

## <a name="tldr"></a> TL;DR:
Get connected and start streaming right now

```js
const Ganglion = require('openbci-ganglion').Ganglion;
const ganglion = new Ganglion();
ganglion.once('ganglionFound', (peripheral) => {
  // Stop searching for BLE devices once a ganglion is found.
  ganglion.searchStop();
  ganglion.on('sample', (sample) => {
    /** Work with sample */
    console.log(sample.sampleNumber);
    for (let i = 0; i < ganglion.numberOfChannels(); i++) {
      console.log("Channel " + (i + 1) + ": " + sample.channelData[i].toFixed(8) + " Volts.");
    }
  });
  ganglion.once('ready', () => {
    ganglion.streamStart();
  });
  ganglion.connect(peripheral);
});
// Start scanning for BLE devices
ganglion.searchStart();
```

## <a name="prerequisites"></a> Prerequisites:

Please ensure [Python 2.7 is installed](https://www.python.org/downloads/) for all OS.

### macOS

 * install [Xcode](https://itunes.apple.com/ca/app/xcode/id497799835?mt=12)
 
### Linux

 * Kernel version 3.6 or above
 * ```libbluetooth-dev```
 
### Windows 8+

 * [node-gyp requirements for Windows](https://github.com/TooTallNate/node-gyp#installation)
   * Python 2.7
   * Visual Studio ([Express](https://www.visualstudio.com/en-us/products/visual-studio-express-vs.aspx))
 * [node-bluetooth-hci-socket prerequisites](https://github.com/sandeepmistry/node-bluetooth-hci-socket#windows)
   * Compatible Bluetooth 4.0 USB adapter
   * [WinUSB](https://msdn.microsoft.com/en-ca/library/windows/hardware/ff540196(v=vs.85).aspx) driver setup for Bluetooth 4.0 USB adapter, using [Zadig tool](http://zadig.akeo.ie/)

See [@don](https://github.com/don)'s set up guide on [Bluetooth LE with Node.js and Noble on Windows](https://www.youtube.com/watch?v=mL9B8wuEdms).

 
## <a name="install"></a> Installation:
Install from npm:
```
npm install openbci-ganglion
```

## <a name="about"></a> About:

The Ganglion driver used by OpenBCI's Processing GUI and Electron Hub. 

Check out the [**_automatic_** tests](https://codecov.io/gh/OpenBCI/OpenBCI_NodeJS_Ganglion) written for it!

## <a name="general-overview"></a> General Overview:

Initialization
--------------

Initializing the board:

```js
const Ganglion = require('openbci-ganglion').Ganglion;
const ganglion = new Ganglion();
```

For initializing with options, such as verbose print outs:

```js
const Ganglion = require('openbci-ganglion').Ganglion;
const ourBoard = new Ganglion({
  verbose: true
});
```

For initializing with callback, such as to catch errors on `noble` startup:

```js
const Ganglion = require('openbci-ganglion').Ganglion;
const ourBoard = new Ganglion((error) => {
  if (error) {
    console.log("error", error);  
  } else {
    console.log("no error");
  }
});
```
For initializing with options and callback, such as verbose and to catch errors on `noble` startup:

```js
const Ganglion = require('openbci-ganglion').Ganglion;
const ourBoard = new Ganglion({
  verbose: true
},(error) => {
  if (error) {
    console.log("error", error);  
  } else {
    console.log("no error");
  }
});
```


'ready' event
------------

You MUST wait for the 'ready' event to be emitted before streaming/talking with the board. The ready happens asynchronously
so installing the 'sample' listener and writing before the ready event might result in... nothing at all.

```js
const Ganglion = require('openbci-ganglion').Ganglion;
const ourBoard = new Ganglion();
ourBoard.connect(portName).then(function(boardSerial) {
    ourBoard.on('ready',function() {
        /** Start streaming, reading registers, what ever your heart desires  */
    });
}).catch(function(err) {
    /** Handle connection errors */
});            
```

Sample properties:
------------------
* `sampleNumber` (a `Number` between 0-255)
* `channelData` (channel data indexed at 0 filled with floating point `Numbers` in Volts)
* `accelData` (`Array` with X, Y, Z accelerometer values when new data available)
* `timeStamp` (`Number` the `boardTime` plus the NTP calculated offset)

The power of this module is in using the sample emitter, to be provided with samples to do with as you wish.

To get a ['sample'](#event-sample) event, you need to:
-------------------------------------
1. Call [`.connect(localName | peripheral)`](#method-connect)
2. Install the ['ready'](#event-ready) event emitter on resolved promise
3. In callback for ['ready'](#event-ready) emitter, call [`streamStart()`](#method-stream-start)
4. Install the ['sample'](#event-sample) event emitter
```js
const Ganglion = require('openbci-ganglion').Ganglion;
const ourBoard = new Ganglion();
ourBoard.connect(localName).then(function() {
    ourBoard.on('ready',function() {
        ourBoard.streamStart();
        ourBoard.on('sample',function(sample) {
            /** Work with sample */
        });
    });
}).catch(function(err) {
    /** Handle connection errors */
});            
```
Close the connection with [`.streamStop()`](#method-stream-stop) and disconnect with [`.disconnect()`](#method-disconnect)
```js
const Ganglion = require('openbci-ganglion').Ganglion;
const ourBoard = new Ganglion();
ourBoard.streamStop().then(ourBoard.disconnect());
```

See Reference Guide for a complete list of impedance tests.

## <a name="sdk-reference-guide"></a> SDK Reference Guide:
---------------
### <a name="constructor"></a> Constructor:

#### <a name="init"></a> Ganglion (options, callback)

Create new instance of a Ganglion board.

**_options (optional)_**

Board optional configurations.

* `debug` {Boolean} - Print out a raw dump of bytes sent and received (Default `false`)
* `nobleAutoStart` {Boolean} - Automatically initialize `noble`. Subscribes to blue tooth state changes and such. (Default `true`)
* `nobleScanOnPowerOn` {Boolean} - Start scanning for Ganglion BLE devices as soon as power turns on.  (Default `true`)
* `sendCounts` {Boolean} - Send integer raw counts instead of scaled floats. (Default `false`)
* `simulate` {Boolean} - Full functionality, just mock data. Must attach Daisy module by setting `simulatorDaisyModuleAttached` to `true` in order to get 16 channels. (Default `false`)
* `simulatorBoardFailure` {Boolean} - Simulates board communications failure. This occurs when the RFduino on the board is not polling the RFduino on the dongle. (Default `false`)
* `simulatorHasAccelerometer` - {Boolean} - Sets simulator to send packets with accelerometer data. (Default `true`)
* `simulatorInjectAlpha` - {Boolean} - Inject a 10Hz alpha wave in Channels 1 and 2 (Default `true`)
* `simulatorInjectLineNoise` {String} - Injects line noise on channels. (3 Possible Options)
  * `60Hz` - 60Hz line noise (Default) [America]
  * `50Hz` - 50Hz line noise [Europe]
  * `none` - Do not inject line noise.
* `simulatorSampleRate` {Number} - The sample rate to use for the simulator. Simulator will set to 125 if `simulatorDaisyModuleAttached` is set `true`. However, setting this option overrides that setting and this sample rate will be used. (Default is `250`)
* `verbose` {Boolean} - Print out useful debugging events (Default `false`)

**Note, we have added support for either all lowercase OR camel case for the options, use whichever style you prefer.**

**_callback (optional)_**

Callback function to catch errors. Returns only error if an error was encountered.

### <a name="methods"></a> Methods:

#### <a name="method-accel-start"></a> .accelStart()

Used to enable the accelerometer. Will result in accelerometer packets arriving 10 times a second.

**Note that the accelerometer is enabled by default.**

**_Returns_** {Promise} - fulfilled once the command was sent to the board.

#### <a name="method-accel-stop"></a> .accelStop()

Used to disable the accelerometer. Prevents accelerometer data packets from arriving.

**Note that the accelerometer is enabled by default.**

**_Returns_** {Promise} - fulfilled once the command was sent to the board.

#### <a name="method-auto-reconnect"></a> .autoReconnect()

Used to start a scan if power is on. Useful if a connection is dropped.

#### <a name="method-channel-off"></a> .channelOff(channelNumber)

Turn off a specified channel

**_channelNumber_**

A number (1-4) specifying which channel you want to turn off.

**_Returns_** {Promise} - fulfilled once the command was sent to the board.

#### <a name="method-channel-on"></a> .channelOn(channelNumber)

Turn on a specified channel

**_channelNumber_**

A number (1-4) specifying which channel you want to turn on.

**_Returns_** {Promise} - fulfilled once the command was sent to the board.

#### <a name="method-connect"></a> .connect(portName)

The essential precursor method to be called initially to establish a ble connection to the OpenBCI ganglion board.

**_id_** {String | Object}

A string `localName` or [`peripheral`](https://github.com/sandeepmistry/noble#peripheral) (from [`noble`](https://github.com/sandeepmistry/noble)) object.

**_Returns_** {Promise} - fulfilled by a successful connection to the board.

#### <a name="method-destroy-multi-packet-buffer"></a> .destroyMultiPacketBuffer()

Destroys the multi packet buffer. The mulit packet buffer holds data from the multi packet messages.

#### <a name="method-disconnect"></a> .disconnect(stopStreaming)

Closes the connection to the board. Waits for stop streaming command to be sent if currently streaming.

**_stopStreaming_** {Boolean} (optional)

`true` if you want to stop streaming before disconnecting. (Default `false`)

**_Returns_** {Promise} - fulfilled by a successful close, rejected otherwise.

#### <a name="method-get-local-name"></a> .getLocalName()

Gets the local name of the attached Ganglion device. This is only valid after [`.connect()`](#method-connect)

**_Returns_** {null|String} - The local name.

#### <a name="method-get-mutli-packet-buffer"></a> .getMutliPacketBuffer()

Get's the multi packet buffer.

**_Returns_** {null|Buffer} - Can be null if no multi packets received.

#### <a name="method-impedance-start"></a> .impedanceStart()

Call to start testing impedance.

**_Returns_** {Promise} - that fulfills when all the commands are sent to the board.

#### <a name="method-impedance-stop"></a> .impedanceStop()

Call to stop testing impedance.

**_Returns_** {Promise} - that fulfills when all the commands are sent to the board.

#### <a name="method-is-connected"></a> .isConnected()

Checks if the driver is connected to a board.

**_Returns_** {Boolean} - true if connected

#### <a name="method-is-noble-ready"></a> .isNobleReady()

Checks if bluetooth is powered on. Cannot start scanning till this is true.

**_Returns_** {Boolean} - true if bluetooth is powered on. 

#### <a name="method-is-searching"></a> .isSearching()

Checks if noble is currently scanning. See [`.searchStart()`](#method-search-start) and [`.searchStop`()`](#method-search-stop`)

**_Returns_** {Boolean} - true if searching. 

#### <a name="method-is-streaming"></a> .isStreaming()

Checks if the board is currently sending samples.

**_Returns_** {Boolean} - true if streaming

#### <a name="method-number-of-channels"></a> .numberOfChannels()

Get the current number of channels available to use. (i.e. 4).

**_Returns_** {Number} - The total number of available channels.

#### <a name="method-print-register-settings"></a> .printRegisterSettings()

Prints all register settings for the for board.

**_Returns_** {Promise} - Fulfilled if the command was sent to board.

#### <a name="method-sample-rate"></a> .sampleRate()

Get the current sample rate.

**Note: This is dependent on if you configured the board correctly on setup options. Specifically as a daisy.**

**_Returns_** {Number} - The current sample rate.

#### <a name="method-search-start"></a> .searchStart()

Call to make `noble` start scanning for Ganglions.

**_maxSearchTime_** {Number}

The amount of time to spend searching. (Default is 20 seconds) 

**_Returns_** {Promise} - fulfilled if scan was started.

#### <a name="method-search-stop"></a> .searchStop()

Call to make `noble` stop scanning for Ganglions.

**_Returns_** {Promise} - fulfilled if scan was stopped.

#### <a name="method-soft-reset"></a> .softReset()

Sends a soft reset command to the board.

**_Returns_** {Promise} - Fulfilled if the command was sent to board.

#### <a name="method-stream-start"></a> .streamStart()

Sends a start streaming command to the board.

**Note, You must have called and fulfilled [`.connect()`](#method-connect) AND observed a `'ready'` emitter before calling this method.**

**_Returns_** {Promise} - fulfilled if the command was sent.

#### <a name="method-stream-stop"></a> .streamStop()

Sends a stop streaming command to the board.

**Note, You must have called and fulfilled [`.connect()`](#method-connect) AND observed a `'ready'` emitter before calling this method.**

**_Returns_** {Promise} - fulfilled if the command was sent.

#### <a name="method-synthetic-enable"></a> .syntheticEnable()

Puts the board in synthetic data generation mode. Must call streamStart still.

**_Returns_** {Promise} - fulfilled if the command was sent.

#### <a name="method-synthetic-disable"></a> .syntheticDisable()

Puts the board in synthetic data generation mode. Must call streamStart still.

**_Returns_** {Promise} - Indicating if the command was sent.

#### <a name="method-write"></a> .write(data)

Used to send data to the board.

**_data_** {Array | Buffer | Number | String}

The data to write out.

**_Returns_** {Promise} - fulfilled if command was able to be sent.

**Example**

Sends a single character command to the board.
```js
// ourBoard has fulfilled the promise on .connect() and 'ready' has been observed previously
ourBoard.write('a');
```

Sends an array of bytes
```js
// ourBoard has fulfilled the promise on .connect() and 'ready' has been observed previously
ourBoard.write(['x','0','1','0','0','0','0','0','0','X']);
```

Call crazy? Go for it...
```js
ourBoard.write('t');
ourBoard.write('a');
ourBoard.write('c');
ourBoard.write('o');
```

### <a name="event"></a> Events:

#### <a name="event-accelerometer"></a> .on('accelerometer', callback)

Emitted when the module receives accelerometer data.

Returns an object with properties:

**_accelData_** {Array}

Array of floats for each dimension in g's. 

**NOTE:** Only present if `sendCounts` is `true`.

**_accelDataCounts_** {Array}

Array of integers for each dimension in counts. 

**NOTE:** Only present if `sendCounts` is `false`.

Example (if `sendCounts` is `false`):
```json
{
  "accelData": [0.0, 0.0, 0.0, 0.0]
}
```

Example (if `sendCounts` is `true`):
```json
{
  "accelDataCounts": [0, 0, 0, 0]
}
```

#### <a name="event-dropped-packet"></a> .on('droppedPacket', callback)

Emitted when a packet (or packets) are dropped. Returns an array.

#### <a name="event-error"></a> .on('error', callback)

Emitted when there is an on the serial port.

#### <a name="event-impedance"></a> .on('impedance', callback)

Emitted when there is a new impedance available. 

Returns an object with properties:

**_channelNumber_** {Number}

The channel number: 1, 2, 3, 4 respectively and 0 for reference.

**_impedanceValue_** {Number}

The impedance in ohms.

Example:
```json
{
  "channelNumber": 0,
  "impedanceValue": 0
}
```

#### <a name="event-raw-data-packet"></a> .on('rawDataPacket', callback)

Emitted when there is a new raw data packet available.

#### <a name="event-ready"></a> .on('ready', callback)

Emitted when the board is in a ready to start streaming state.

#### <a name="event-sample"></a> .on('sample', callback)

Emitted when there is a new sample available.

Returns an object with properties:

**_channelData_** {Array}

Array of floats for each channel in volts.. 

**NOTE:** Only present if `sendCounts` is `true`.

**_channelDataCounts_** {Array}

Array of integers for each channel in counts. 

**NOTE:** Only present if `sendCounts` is `false`.

**_sampleNumber_** {Number}

The sample number. Only goes up to 254.

**_timeStamp_** {Number}

The time the sample is packed up. Not accurate for ERP.

Example (if `sendCounts` is `false`):
```json
{
  "channelData": [0.0, 0.0, 0.0, 0.0],
  "sampleNumber": 0,
  "timeStamp": 0
}
```

Example (if `sendCounts` is `true`):
```json
{
  "channelDataCounts": [0, 0, 0, 0],
  "sampleNumber": 0,
  "timeStamp": 0
}
```

#### <a name="event-scan-start"></a> .on('scanStart', callback)

Emitted when a noble scan is started.

#### <a name="event-scan-stop"></a> .on('scanStop', callback)

Emitted when a noble scan is stopped.

## <a name="developing"></a> Developing:
### <a name="developing-running"></a> Running:

```
npm install
```

### <a name="developing-testing"></a> Testing:

```
npm test
```

## <a name="contribute"></a> Contribute:

1. Fork it!
2. Branch off of `development`: `git checkout development`
2. Create your feature branch: `git checkout -b my-new-feature`
3. Make changes
4. If adding a feature, please add test coverage.
5. Ensure tests all pass. (`npm test`)
6. Commit your changes: `git commit -m 'Add some feature'`
7. Push to the branch: `git push origin my-new-feature`
8. Submit a pull request. Make sure it is based off of the `development` branch when submitting! :D

## <a name="license"></a> License:

MIT
