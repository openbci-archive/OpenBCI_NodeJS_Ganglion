[![Join the chat at https://gitter.im/OpenBCI/OpenBCI_NodeJS](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/OpenBCI/OpenBCI_NodeJS?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Build Status](https://travis-ci.org/OpenBCI/OpenBCI_NodeJS_Ganglion.svg?branch=master)](https://travis-ci.org/OpenBCI/OpenBCI_NodeJS_Ganglion)
[![codecov](https://codecov.io/gh/OpenBCI/OpenBCI_NodeJS_Ganglion/branch/master/graph/badge.svg)](https://codecov.io/gh/OpenBCI/OpenBCI_NodeJS_Ganglion)
[![Dependency Status](https://david-dm.org/OpenBCI/OpenBCI_NodeJS_Ganglion.svg)](https://david-dm.org/OpenBCI/OpenBCI_NodeJS_Ganglion)
[![npm](https://img.shields.io/npm/dm/openbci-ganglion.svg?maxAge=2592000)](http://npmjs.com/package/openbci-ganglion)

# OpenBCI Node.js Ganglion SDK

A Node.js module for OpenBCI.

We are proud to support all functionality of the Ganglion (4 channel).

The purpose of this module is to **get connected** and **start streaming** as fast as possible.

### Table of Contents:

---

1. [TL;DR](#tldr)
2. [Prerequisites](#prerequisites)
3. [Installation](#install)
4. [Ganglion](#ganglion)
5. [General Overview](#general-overview)
6. [SDK Reference Guide](#sdk-reference-guide)
   - [Events](#event)
7. [Interfacing With Other Tools](#interfacing-with-other-tools)
8. [Developing](#developing)
9. [Testing](#developing-testing)
10. [Contribute](#contribute)
11. [License](#license)
12. [Roadmap](#roadmap)

## <a name="tldr"></a> TL;DR:

Get connected and start streaming right now

```js
const Ganglion = require("openbci-ganglion");
const ganglion = new Ganglion();
ganglion.once("ganglionFound", peripheral => {
  // Stop searching for BLE devices once a ganglion is found.
  ganglion.searchStop();
  ganglion.on("sample", sample => {
    /** Work with sample */
    console.log(sample.sampleNumber);
    for (let i = 0; i < ganglion.numberOfChannels(); i++) {
      console.log(
        "Channel " +
          (i + 1) +
          ": " +
          sample.channelData[i].toFixed(8) +
          " Volts."
      );
    }
  });
  ganglion.once("ready", () => {
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

- install [Xcode](https://itunes.apple.com/ca/app/xcode/id497799835?mt=12)

### Linux

- Kernel version 3.6 or above
- `libbluetooth-dev`
- `libudev-dev`

#### Running without sudo

In order to stream data on Linux without root/sudo access, you may need to give the `node` binary privileges to start and stop BLE advertising.

```sh
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

**Note:** this command requires `setcap` to be installed. Install it with the `libcap2-bin` package.

```sh
sudo apt-get install libcap2-bin
```

### Windows 8+

- [node-gyp requirements for Windows](https://github.com/TooTallNate/node-gyp#installation)
  - Python 2.7
  - Visual Studio ([Express](https://www.visualstudio.com/en-us/products/visual-studio-express-vs.aspx))
- [node-bluetooth-hci-socket prerequisites](https://github.com/sandeepmistry/node-bluetooth-hci-socket#windows)
  - Compatible Bluetooth 4.0 USB adapter
  - [WinUSB](<https://msdn.microsoft.com/en-ca/library/windows/hardware/ff540196(v=vs.85).aspx>) driver setup for Bluetooth 4.0 USB adapter, using [Zadig tool](http://zadig.akeo.ie/)

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

## Initialization

Initializing the board:

```js
const Ganglion = require("openbci-ganglion");
const ganglion = new Ganglion();
```

For initializing with options, such as verbose print outs:

```js
const Ganglion = require("openbci-ganglion");
const ourBoard = new Ganglion({
  verbose: true
});
```

For initializing with callback, such as to catch errors on `noble` startup:

```js
const Ganglion = require("openbci-ganglion");
const ourBoard = new Ganglion(error => {
  if (error) {
    console.log("error", error);
  } else {
    console.log("no error");
  }
});
```

For initializing with options and callback, such as verbose and to catch errors on `noble` startup:

```js
const Ganglion = require("openbci-ganglion");
const ourBoard = new Ganglion(
  {
    verbose: true
  },
  error => {
    if (error) {
      console.log("error", error);
    } else {
      console.log("no error");
    }
  }
);
```

## 'ready' event

You MUST wait for the 'ready' event to be emitted before streaming/talking with the board. The ready happens asynchronously
so installing the 'sample' listener and writing before the ready event might result in... nothing at all.

```js
const Ganglion = require("openbci-ganglion");
const ourBoard = new Ganglion();
ourBoard
  .connect(portName)
  .then(function(boardSerial) {
    ourBoard.on("ready", function() {
      /** Start streaming, reading registers, what ever your heart desires  */
    });
  })
  .catch(function(err) {
    /** Handle connection errors */
  });
```

## Sample properties:

- `sampleNumber` (a `Number` between 0-255)
- `channelData` (channel data indexed at 0 filled with floating point `Numbers` in Volts)
- `accelData` (`Array` with X, Y, Z accelerometer values when new data available)
- `timeStamp` (`Number` the `boardTime` plus the NTP calculated offset)

The power of this module is in using the sample emitter, to be provided with samples to do with as you wish.

## To get a ['sample'](#event-sample) event, you need to:

1. Call [`.connect(localName | peripheral)`](#method-connect)
2. Install the ['ready'](#event-ready) event emitter on resolved promise
3. In callback for ['ready'](#event-ready) emitter, call [`streamStart()`](#method-stream-start)
4. Install the ['sample'](#event-sample) event emitter

```js
const Ganglion = require("openbci-ganglion");
const ourBoard = new Ganglion();
ourBoard
  .connect(localName)
  .then(function() {
    ourBoard.on("ready", function() {
      ourBoard.streamStart();
      ourBoard.on("sample", function(sample) {
        /** Work with sample */
      });
    });
  })
  .catch(function(err) {
    /** Handle connection errors */
  });
```

Close the connection with [`.streamStop()`](#method-stream-stop) and disconnect with [`.disconnect()`](#method-disconnect)

```js
const Ganglion = require("openbci-ganglion");
const ourBoard = new Ganglion();
ourBoard.streamStop().then(ourBoard.disconnect());
```

See Reference Guide for a complete list of impedance tests.

## <a name="sdk-reference-guide"></a> SDK Reference Guide:

---

## Classes

<dl>
<dt><a href="#Ganglion">Ganglion</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#InitializationObject">InitializationObject</a> : <code>Object</code></dt>
<dd><p>Board optional configurations.</p>
</dd>
<dt><a href="#BLED112AttributeValue">BLED112AttributeValue</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#BLED112AttributeWrite">BLED112AttributeWrite</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#BLEDConnection">BLEDConnection</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#BLED112FindInformationFound">BLED112FindInformationFound</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#BLED112GapConnectDirect">BLED112GapConnectDirect</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#BLED112GroupService">BLED112GroupService</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#BLED112ParseRawAttributeValue">BLED112ParseRawAttributeValue</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#BLED112ParseRawHeadTail">BLED112ParseRawHeadTail</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#BLED112ParseRawWord">BLED112ParseRawWord</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#BLED112Peripheral">BLED112Peripheral</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#BLED112RspGroupType">BLED112RspGroupType</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="Ganglion"></a>

## Ganglion

**Kind**: global class  
**Author**: AJ Keller (@pushtheworldllc)

- [Ganglion](#Ganglion)
  - [new Ganglion(options, callback)](#new_Ganglion_new)
  - _instance_
    - [.options](#Ganglion+options) : [<code>InitializationObject</code>](#InitializationObject)
    - [.\_accelArray](#Ganglion+_accelArray)
    - [.\_bled112WriteCharacteristic](#Ganglion+_bled112WriteCharacteristic) : [<code>BLED112FindInformationFound</code>](#BLED112FindInformationFound)
    - [.buffer](#Ganglion+buffer)
    - [.accelStart()](#Ganglion+accelStart) ⇒ <code>Promise</code>
    - [.accelStop()](#Ganglion+accelStop) ⇒ <code>Promise</code>
    - [.autoReconnect()](#Ganglion+autoReconnect)
    - [.channelOff(channelNumber)](#Ganglion+channelOff) ⇒ <code>Promise.&lt;T&gt;</code>
    - [.channelOn(channelNumber)](#Ganglion+channelOn) ⇒ <code>Promise.&lt;T&gt;</code> \| <code>\*</code>
    - [.cleanupEmitters()](#Ganglion+cleanupEmitters)
    - [.connect(id)](#Ganglion+connect) ⇒ <code>Promise</code>
    - [.destroyNoble()](#Ganglion+destroyNoble)
    - [.destroyBLED112()](#Ganglion+destroyBLED112)
    - [.destroyMultiPacketBuffer()](#Ganglion+destroyMultiPacketBuffer)
    - [.disconnect(stopStreaming)](#Ganglion+disconnect) ⇒ <code>Promise</code>
    - [.getLocalName()](#Ganglion+getLocalName) ⇒ <code>null</code> \| <code>String</code>
    - [.getMutliPacketBuffer()](#Ganglion+getMutliPacketBuffer) ⇒ <code>null</code> \| <code>Buffer</code>
    - [.impedanceStart()](#Ganglion+impedanceStart) ⇒ <code>global.Promise</code> \| <code>Promise</code>
    - [.impedanceStop()](#Ganglion+impedanceStop) ⇒ <code>global.Promise</code> \| <code>Promise</code>
    - [.initDriver()](#Ganglion+initDriver) ⇒ <code>Promise.&lt;any&gt;</code>
    - [.isConnected()](#Ganglion+isConnected) ⇒ <code>boolean</code>
    - [.isNobleReady()](#Ganglion+isNobleReady) ⇒ <code>boolean</code>
    - [.isSearching()](#Ganglion+isSearching) ⇒ <code>boolean</code>
    - [.isStreaming()](#Ganglion+isStreaming) ⇒ <code>boolean</code>
    - [.numberOfChannels()](#Ganglion+numberOfChannels) ⇒ <code>Number</code>
    - [.printRegisterSettings()](#Ganglion+printRegisterSettings) ⇒ <code>Promise.&lt;T&gt;</code> \| <code>\*</code>
    - [.sampleRate()](#Ganglion+sampleRate) ⇒ <code>Number</code>
    - [.searchStart(&#x60;maxSearchTime&#x60;)](#Ganglion+searchStart) ⇒ <code>Promise</code>
    - [.searchStop()](#Ganglion+searchStop) ⇒ <code>global.Promise</code> \| <code>Promise</code>
    - [.softReset()](#Ganglion+softReset) ⇒ <code>Promise</code>
    - [.streamStart()](#Ganglion+streamStart) ⇒ <code>Promise</code>
    - [.streamStop()](#Ganglion+streamStop) ⇒ <code>Promise</code>
    - [.syntheticEnable()](#Ganglion+syntheticEnable) ⇒ <code>Promise</code>
    - [.syntheticDisable()](#Ganglion+syntheticDisable) ⇒ <code>Promise</code>
    - [.write(data)](#Ganglion+write) ⇒ <code>Promise</code>
    - [.\_bled112WriteAndDrain(data)](#Ganglion+_bled112WriteAndDrain) ⇒ <code>Promise</code>
  - _inner_
    - [~o](#Ganglion..o)

<a name="new_Ganglion_new"></a>

### new Ganglion(options, callback)

The initialization method to call first, before any other method.

| Param    | Type                                                       | Description                                                                                                                                                                     |
| -------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| options  | [<code>InitializationObject</code>](#InitializationObject) | (optional) - Board optional configurations.                                                                                                                                     |
| callback | <code>function</code>                                      | (optional) - A callback function used to determine if the noble module was able to be started. This can be very useful on Windows when there is no compatible BLE device found. |

<a name="Ganglion+options"></a>

### ganglion.options : [<code>InitializationObject</code>](#InitializationObject)

**Kind**: instance property of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+_accelArray"></a>

### ganglion.\_accelArray

Private Properties (keep alphabetical)

**Kind**: instance property of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+_bled112WriteCharacteristic"></a>

### ganglion.\_bled112WriteCharacteristic : [<code>BLED112FindInformationFound</code>](#BLED112FindInformationFound)

**Kind**: instance property of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+buffer"></a>

### ganglion.buffer

Public Properties (keep alphabetical)

**Kind**: instance property of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+accelStart"></a>

### ganglion.accelStart() ⇒ <code>Promise</code>

Used to enable the accelerometer. Will result in accelerometer packets arriving 10 times a second.
Note that the accelerometer is enabled by default.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+accelStop"></a>

### ganglion.accelStop() ⇒ <code>Promise</code>

Used to disable the accelerometer. Prevents accelerometer data packets from arriving.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+autoReconnect"></a>

### ganglion.autoReconnect()

Used to start a scan if power is on. Useful if a connection is dropped.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+channelOff"></a>

### ganglion.channelOff(channelNumber) ⇒ <code>Promise.&lt;T&gt;</code>

Send a command to the board to turn a specified channel off

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Author**: AJ Keller (@pushtheworldllc)

| Param         |
| ------------- |
| channelNumber |

<a name="Ganglion+channelOn"></a>

### ganglion.channelOn(channelNumber) ⇒ <code>Promise.&lt;T&gt;</code> \| <code>\*</code>

Send a command to the board to turn a specified channel on

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Author**: AJ Keller (@pushtheworldllc)

| Param         |
| ------------- |
| channelNumber |

<a name="Ganglion+cleanupEmitters"></a>

### ganglion.cleanupEmitters()

Used to clean up emitters

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+connect"></a>

### ganglion.connect(id) ⇒ <code>Promise</code>

The essential precursor method to be called initially to establish a
ble connection to the OpenBCI ganglion board.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>Promise</code> - If the board was able to connect.  
**Author**: AJ Keller (@pushtheworldllc)

| Param | Type                                       | Description                              |
| ----- | ------------------------------------------ | ---------------------------------------- |
| id    | <code>String</code> \| <code>Object</code> | a string local name or peripheral object |

<a name="Ganglion+destroyNoble"></a>

### ganglion.destroyNoble()

Destroys the noble!

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+destroyBLED112"></a>

### ganglion.destroyBLED112()

Destroys the noble!

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+destroyMultiPacketBuffer"></a>

### ganglion.destroyMultiPacketBuffer()

Destroys the multi packet buffer.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+disconnect"></a>

### ganglion.disconnect(stopStreaming) ⇒ <code>Promise</code>

Closes the connection to the board. Waits for stop streaming command to
be sent if currently streaming.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>Promise</code> - - fulfilled by a successful close, rejected otherwise.  
**Author**: AJ Keller (@pushtheworldllc)

| Param         | Type                 | Description                                                           |
| ------------- | -------------------- | --------------------------------------------------------------------- |
| stopStreaming | <code>Boolean</code> | (optional) - True if you want to stop streaming before disconnecting. |

<a name="Ganglion+getLocalName"></a>

### ganglion.getLocalName() ⇒ <code>null</code> \| <code>String</code>

Return the local name of the attached Ganglion device.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+getMutliPacketBuffer"></a>

### ganglion.getMutliPacketBuffer() ⇒ <code>null</code> \| <code>Buffer</code>

Get's the multi packet buffer.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>null</code> \| <code>Buffer</code> - - Can be null if no multi packets received.  
<a name="Ganglion+impedanceStart"></a>

### ganglion.impedanceStart() ⇒ <code>global.Promise</code> \| <code>Promise</code>

Call to start testing impedance.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+impedanceStop"></a>

### ganglion.impedanceStop() ⇒ <code>global.Promise</code> \| <code>Promise</code>

Call to stop testing impedance.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+initDriver"></a>

### ganglion.initDriver() ⇒ <code>Promise.&lt;any&gt;</code>

Initialize the drivers

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+isConnected"></a>

### ganglion.isConnected() ⇒ <code>boolean</code>

Checks if the driver is connected to a board.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>boolean</code> - - True if connected.  
<a name="Ganglion+isNobleReady"></a>

### ganglion.isNobleReady() ⇒ <code>boolean</code>

Checks if bluetooth is powered on.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>boolean</code> - - True if bluetooth is powered on.  
<a name="Ganglion+isSearching"></a>

### ganglion.isSearching() ⇒ <code>boolean</code>

Checks if noble is currently scanning.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>boolean</code> - - True if streaming.  
<a name="Ganglion+isStreaming"></a>

### ganglion.isStreaming() ⇒ <code>boolean</code>

Checks if the board is currently sending samples.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>boolean</code> - - True if streaming.  
<a name="Ganglion+numberOfChannels"></a>

### ganglion.numberOfChannels() ⇒ <code>Number</code>

This function is used as a convenience method to determine how many
channels the current board is using.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>Number</code> - A number
Note: This is dependent on if you configured the board correctly on setup options  
**Author**: AJ Keller (@pushtheworldllc)  
<a name="Ganglion+printRegisterSettings"></a>

### ganglion.printRegisterSettings() ⇒ <code>Promise.&lt;T&gt;</code> \| <code>\*</code>

To print out the register settings to the console

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Author**: AJ Keller (@pushtheworldllc)  
<a name="Ganglion+sampleRate"></a>

### ganglion.sampleRate() ⇒ <code>Number</code>

Get the the current sample rate is.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>Number</code> - The sample rate
Note: This is dependent on if you configured the board correctly on setup options  
<a name="Ganglion+searchStart"></a>

### ganglion.searchStart(&#x60;maxSearchTime&#x60;) ⇒ <code>Promise</code>

List available peripherals so the user can choose a device when not
automatically found.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>Promise</code> - - If scan was started

| Param           | Type                | Description                                                    |
| --------------- | ------------------- | -------------------------------------------------------------- |
| `maxSearchTime` | <code>Number</code> | The amount of time to spend searching. (Default is 20 seconds) |

<a name="Ganglion+searchStop"></a>

### ganglion.searchStop() ⇒ <code>global.Promise</code> \| <code>Promise</code>

Called to end a search.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
<a name="Ganglion+softReset"></a>

### ganglion.softReset() ⇒ <code>Promise</code>

Sends a soft reset command to the board

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>Promise</code> - - Fulfilled if the command was sent to board.  
**Author**: AJ Keller (@pushtheworldllc)  
<a name="Ganglion+streamStart"></a>

### ganglion.streamStart() ⇒ <code>Promise</code>

Sends a start streaming command to the board.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>Promise</code> - indicating if the signal was able to be sent.
Note: You must have successfully connected to an OpenBCI board using the connect
method. Just because the signal was able to be sent to the board, does not
mean the board will start streaming.  
**Author**: AJ Keller (@pushtheworldllc)  
<a name="Ganglion+streamStop"></a>

### ganglion.streamStop() ⇒ <code>Promise</code>

Sends a stop streaming command to the board.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>Promise</code> - indicating if the signal was able to be sent.
Note: You must have successfully connected to an OpenBCI board using the connect
method. Just because the signal was able to be sent to the board, does not
mean the board stopped streaming.  
**Author**: AJ Keller (@pushtheworldllc)  
<a name="Ganglion+syntheticEnable"></a>

### ganglion.syntheticEnable() ⇒ <code>Promise</code>

Puts the board in synthetic data generation mode. Must call streamStart still.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>Promise</code> - indicating if the signal was able to be sent.  
**Author**: AJ Keller (@pushtheworldllc)  
<a name="Ganglion+syntheticDisable"></a>

### ganglion.syntheticDisable() ⇒ <code>Promise</code>

Takes the board out of synthetic data generation mode. Must call streamStart still.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>Promise</code> - - fulfilled if the command was sent.  
**Author**: AJ Keller (@pushtheworldllc)  
<a name="Ganglion+write"></a>

### ganglion.write(data) ⇒ <code>Promise</code>

Used to send data to the board.

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>Promise</code> - - fulfilled if command was able to be sent  
**Author**: AJ Keller (@pushtheworldllc)

| Param | Type                                                                                    | Description           |
| ----- | --------------------------------------------------------------------------------------- | --------------------- |
| data  | <code>Array</code> \| <code>Buffer</code> \| <code>Number</code> \| <code>String</code> | The data to write out |

**Example**

Sends a single character command to the board.

```js
// ourBoard has fulfilled the promise on .connect() and 'ready' has been observed previously
ourBoard.write("a");
```

Sends an array of bytes

```js
// ourBoard has fulfilled the promise on .connect() and 'ready' has been observed previously
ourBoard.write(["x", "0", "1", "0", "0", "0", "0", "0", "0", "X"]);
```

Call crazy? Go for it...

```js
ourBoard.write("t");
ourBoard.write("a");
ourBoard.write("c");
ourBoard.write("o");
```

<a name="Ganglion+_bled112WriteAndDrain"></a>

### ganglion.\_bled112WriteAndDrain(data) ⇒ <code>Promise</code>

Should be used to send data to the board

**Kind**: instance method of [<code>Ganglion</code>](#Ganglion)  
**Returns**: <code>Promise</code> - if signal was able to be sent  
**Author**: AJ Keller (@pushtheworldllc)

| Param | Type                                        | Description           |
| ----- | ------------------------------------------- | --------------------- |
| data  | <code>Buffer</code> \| <code>Buffer2</code> | The data to write out |

<a name="Ganglion..o"></a>

### Ganglion~o

Configuring Options

**Kind**: inner property of [<code>Ganglion</code>](#Ganglion)  
<a name="kOBCIBLED112ParsingConnectDirect"></a>

## kOBCIBLED112ParsingConnectDirect

Used in parsing incoming serial data

**Kind**: global constant  
<a name="InitializationObject"></a>

## InitializationObject : <code>Object</code>

Board optional configurations.

**Kind**: global typedef  
**Properties**

| Name                      | Type                 | Description                                                                                                                                                                                                                    |
| ------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| bled112                   | <code>Boolean</code> | Whether to use bled112 as bluetooth driver or default to first available. (Default `false`)                                                                                                                                    |
| debug                     | <code>Boolean</code> | Print out a raw dump of bytes sent and received. (Default `false`)                                                                                                                                                             |
| driverAutoInit            | <code>Boolean</code> | Used to auto start either noble or the bled112 drivers (Default `true`)                                                                                                                                                        |
| nobleAutoStart            | <code>Boolean</code> | Automatically initialize `noble`. Subscribes to blue tooth state changes and such. (Default `true`)                                                                                                                            |
| nobleScanOnPowerOn        | <code>Boolean</code> | Start scanning for Ganglion BLE devices as soon as power turns on. (Default `true`)                                                                                                                                            |
| sendCounts                | <code>Boolean</code> | Send integer raw counts instead of scaled floats. (Default `false`)                                                                                                                                                            |
| simulate                  | <code>Boolean</code> | (IN-OP) Full functionality, just mock data. (Default `false`)                                                                                                                                                                  |
| simulatorBoardFailure     | <code>Boolean</code> | (IN-OP) Simulates board communications failure. This occurs when the RFduino on the board is not polling the RFduino on the dongle. (Default `false`)                                                                          |
| simulatorHasAccelerometer | <code>Boolean</code> | Sets simulator to send packets with accelerometer data. (Default `true`)                                                                                                                                                       |
| simulatorInjectAlpha      | <code>Boolean</code> | Inject a 10Hz alpha wave in Channels 1 and 2 (Default `true`)                                                                                                                                                                  |
| simulatorInjectLineNoise  | <code>String</code>  | Injects line noise on channels. 3 Possible Options: `60Hz` - 60Hz line noise (Default) [America] `50Hz` - 50Hz line noise [Europe] `none` - Do not inject line noise.                                                          |
| simulatorSampleRate       | <code>Number</code>  | The sample rate to use for the simulator. Simulator will set to 125 if `simulatorDaisyModuleAttached` is set `true`. However, setting this option overrides that setting and this sample rate will be used. (Default is `250`) |
|                           | <code>Boolean</code> | Print out useful debugging events. (Default `false`)                                                                                                                                                                           |

<a name="BLED112AttributeValue"></a>

## BLED112AttributeValue : <code>Object</code>

**Kind**: global typedef  
**Properties**

| Name                    | Type                | Description                                                |
| ----------------------- | ------------------- | ---------------------------------------------------------- |
| characteristicHandle    | <code>Number</code> |                                                            |
| characteristicHandleRaw | <code>Buffer</code> | The string of the advertisement data, not the full ad data |
| connection              | <code>Number</code> | The connection the info is from                            |
| type                    | <code>Number</code> | The type, where 0x01 is data?                              |
| value                   | <code>Buffer</code> | The value from device                                      |

<a name="BLED112AttributeWrite"></a>

## BLED112AttributeWrite : <code>Object</code>

**Kind**: global typedef  
**Properties**

| Name                    | Type                                       | Description                                                   |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| characteristicHandleRaw | <code>Buffer</code>                        | Buffer of length 2 for the service number in the att database |
| connection              | <code>Number</code>                        | Which connection is being used                                |
| value                   | <code>String</code> \| <code>Buffer</code> | The value to send to the device                               |

<a name="BLEDConnection"></a>

## BLEDConnection : <code>Object</code>

**Kind**: global typedef  
**Properties**

| Name               | Type                |
| ------------------ | ------------------- |
| addressType        | <code>Number</code> |
| bonding            | <code>Number</code> |
| connection         | <code>Number</code> |
| connectionInterval | <code>Number</code> |
| flags              | <code>Number</code> |
| latency            | <code>Number</code> |
| sender             | <code>Buffer</code> |
| timeout            | <code>Number</code> |

<a name="BLED112FindInformationFound"></a>

## BLED112FindInformationFound : <code>Object</code>

**Kind**: global typedef  
**Properties**

| Name                    | Type                | Description                                                              |
| ----------------------- | ------------------- | ------------------------------------------------------------------------ |
| characteristicHandle    | <code>Number</code> |                                                                          |
| characteristicHandleRaw | <code>Buffer</code> | The string of the advertisement data, not the full ad data               |
| connection              | <code>Number</code> | The entire end of ad data                                                |
| type                    | <code>Number</code> | The type, where 0x02 is short uuid and 0x10 is long, it's hex for length |
| uuid                    | <code>Buffer</code> |                                                                          |

<a name="BLED112GapConnectDirect"></a>

## BLED112GapConnectDirect : <code>Object</code>

**Kind**: global typedef  
**Properties**

| Name       | Type                |
| ---------- | ------------------- |
| connection | <code>Number</code> |
| result     | <code>Buffer</code> |

<a name="BLED112GroupService"></a>

## BLED112GroupService : <code>Object</code>

**Kind**: global typedef  
**Properties**

| Name       | Type                |
| ---------- | ------------------- |
| connection | <code>number</code> |
| end        | <code>number</code> |
| endRaw     | <code>Buffer</code> |
| start      | <code>number</code> |
| startRaw   | <code>Buffer</code> |
| uuid       | <code>Buffer</code> |

<a name="BLED112ParseRawAttributeValue"></a>

## BLED112ParseRawAttributeValue : <code>Object</code>

**Kind**: global typedef  
**Properties**

| Name                   | Type                                        | Description                                                  |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| buffer                 | <code>Buffer</code> \| <code>Buffer2</code> | The raw data buffer to parse                                 |
| ignore                 | <code>Number</code>                         | The position to ignore in the `word`                         |
| length                 | <code>Number</code>                         | The length of raw you want to extract                        |
| lengthPosition         | <code>Number</code>                         | The position of the byte that stores the length of the value |
| verify                 | <code>Object</code>                         |                                                              |
| verify.comparePosition | <code>Number</code>                         | The value to compare with `position`                         |
| verify.difference      | <code>Number</code>                         | The difference between `position` and `comparePostion`       |
| verify.ignore          | <code>Number</code>                         | The difference between `position` and `comparePostion`       |
| verify.position        | <code>Number</code>                         | The position of the verification byte                        |
| word                   | <code>Buffer</code> \| <code>Buffer2</code> | The 4 byte word to search for, ignore byte in postion 1      |

<a name="BLED112ParseRawHeadTail"></a>

## BLED112ParseRawHeadTail : <code>Object</code>

**Kind**: global typedef  
**Properties**

| Name   | Type                                        | Description                           |
| ------ | ------------------------------------------- | ------------------------------------- |
| buffer | <code>Buffer</code> \| <code>Buffer2</code> | The raw data buffer to parse          |
| head   | <code>Number</code>                         | The head byte to search for           |
| length | <code>Number</code>                         | The length of raw you want to extract |
| tail   | <code>Number</code>                         | The tail byte to search for           |

<a name="BLED112ParseRawWord"></a>

## BLED112ParseRawWord : <code>Object</code>

**Kind**: global typedef  
**Properties**

| Name            | Type                                        | Description                           |
| --------------- | ------------------------------------------- | ------------------------------------- |
| buffer          | <code>Buffer</code> \| <code>Buffer2</code> | The raw data buffer to parse          |
| length          | <code>Number</code>                         | The length of raw you want to extract |
| verify          | <code>Object</code>                         |                                       |
| verify.position | <code>Number</code>                         | The position of the verification byte |
| verify.value    | <code>Number</code>                         | The value of the verification byte    |
| word            | <code>Buffer</code> \| <code>Buffer2</code> | The 4 byte word to search for         |

<a name="BLED112Peripheral"></a>

## BLED112Peripheral : <code>Object</code>

**Kind**: global typedef  
**Properties**

| Name                    | Type                                        | Description                                                                                                      |
| ----------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| addressType             | <code>Number</code>                         |                                                                                                                  |
| advertisement           | <code>Object</code>                         |                                                                                                                  |
| advertisement.localName | <code>String</code>                         | Same as `advertisementDataString` but mimics what noble outputs                                                  |
| advertisementDataString | <code>String</code>                         | The string of the advertisement data, not the full ad data                                                       |
| advertisementDataRaw    | <code>Buffer</code> \| <code>Buffer2</code> | The entire end of ad data                                                                                        |
| bond                    | <code>Number</code>                         |                                                                                                                  |
| packetType              | <code>Number</code>                         | -                                                                                                                |
| rssi                    | <code>Number</code>                         | The RSSI which stands for receive signal strength indicator and is in db so it's negative, and lower the better. |
| sender                  | <code>Buffer</code> \| <code>Buffer2</code> | The mac address                                                                                                  |

<a name="BLED112RspGroupType"></a>

## BLED112RspGroupType : <code>Object</code>

**Kind**: global typedef  
**Properties**

| Name       | Type                |
| ---------- | ------------------- |
| connection | <code>Number</code> |
| result     | <code>Buffer</code> |

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

## <a name="interfacing-with-other-tools"></a> Interfacing With Other Tools:

### <a name="interfacing-with-other-tools-labstreaminglayer"></a> LabStreamingLayer

[LabStreamingLayer](https://github.com/sccn/labstreaminglayer) is a tool for streaming or recording time-series data. It can be used to interface with [Matlab](https://github.com/sccn/labstreaminglayer/tree/master/LSL/liblsl-Matlab), [Python](https://github.com/sccn/labstreaminglayer/tree/master/LSL/liblsl-Python), [Unity](https://github.com/xfleckx/LSL4Unity), and many other programs.

To use LSL with the NodeJS SDK, go to our [labstreaminglayer example](https://github.com/OpenBCI/OpenBCI_NodeJS_Ganglion/tree/master/examples/labstreaminglayer), which contains code that is ready to start an LSL stream of OpenBCI data.

Follow the directions in the [readme](https://github.com/OpenBCI/OpenBCI_NodeJS_Ganglion/blob/master/examples/labstreaminglayer/readme.md) to get started.

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
3. Create your feature branch: `git checkout -b my-new-feature`
4. Make changes
5. If adding a feature, please add test coverage.
6. Ensure tests all pass. (`npm test`)
7. Commit your changes: `git commit -m 'Add some feature'`
8. Push to the branch: `git push origin my-new-feature`
9. Submit a pull request. Make sure it is based off of the `development` branch when submitting! :D

## <a name="license"></a> License:

MIT
