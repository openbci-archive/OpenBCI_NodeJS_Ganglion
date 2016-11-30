'use strict';
const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const noble = require('noble');
const util = require('util');
// Local imports
const utils = require('./openBCIGanglionUtils');
const k = require('./openBCIConstants');
const openBCIUtils = require('./openBCIUtils');
const clone = require('clone');

const _options = {
  debug: false,
  nobleAutoStart: true,
  nobleScanOnPowerOn: true,
  sendCounts: false,
  simulate: false,
  simulatorBoardFailure: false,
  simulatorHasAccelerometer: true,
  simulatorInternalClockDrift: 0,
  simulatorInjectAlpha: true,
  simulatorInjectLineNoise: [k.OBCISimulatorLineNoiseHz60, k.OBCISimulatorLineNoiseHz50, k.OBCISimulatorLineNoiseNone],
  simulatorSampleRate: 200,
  verbose: false
};

/**
 * @description The initialization method to call first, before any other method.
 * @param options (optional) - Board optional configurations.
 *     - `debug` {Boolean} - Print out a raw dump of bytes sent and received. (Default `false`)
 *
 *     - `nobleAutoStart` {Boolean} - Automatically initialize `noble`. Subscribes to blue tooth state changes and such.
 *           (Default `true`)
 *
 *     - `nobleScanOnPowerOn` {Boolean} - Start scanning for Ganglion BLE devices as soon as power turns on.
 *           (Default `true`)
 *
 *     - `sendCounts` {Boolean} - Send integer raw counts instead of scaled floats.
 *           (Default `false`)
 *
 *     - `simulate` {Boolean} - (IN-OP) Full functionality, just mock data. Must attach Daisy module by setting
 *                  `simulatorDaisyModuleAttached` to `true` in order to get 16 channels. (Default `false`)
 *
 *     - `simulatorBoardFailure` {Boolean} - (IN-OP)  Simulates board communications failure. This occurs when the RFduino on
 *                  the board is not polling the RFduino on the dongle. (Default `false`)
 *
 *     - `simulatorHasAccelerometer` - {Boolean} - Sets simulator to send packets with accelerometer data. (Default `true`)
 *
 *     - `simulatorInjectAlpha` - {Boolean} - Inject a 10Hz alpha wave in Channels 1 and 2 (Default `true`)
 *
 *     - `simulatorInjectLineNoise` {String} - Injects line noise on channels.
 *          3 Possible Options:
 *              `60Hz` - 60Hz line noise (Default) [America]
 *              `50Hz` - 50Hz line noise [Europe]
 *              `none` - Do not inject line noise.
 *
 *     - `simulatorSampleRate` {Number} - The sample rate to use for the simulator. Simulator will set to 125 if
 *                  `simulatorDaisyModuleAttached` is set `true`. However, setting this option overrides that
 *                  setting and this sample rate will be used. (Default is `250`)
 *
 *     - `verbose` {Boolean} - Print out useful debugging events. (Default `false`)
 *
 * @constructor
 * @author AJ Keller (@pushtheworldllc)
 */
function Ganglion (options) {
  if (!(this instanceof Ganglion)) {
    return new Ganglion(options);
  }

  options = (typeof options !== 'function') && options || {};
  let opts = {};

  /** Configuring Options */
  let o;
  for (o in _options) {
    var userOption = (o in options) ? o : o.toLowerCase();
    var userValue = options[userOption];
    delete options[userOption];

    if (typeof _options[o] === 'object') {
      // an array specifying a list of choices
      // if the choice is not in the list, the first one is defaulted to

      if (_options[o].indexOf(userValue) !== -1) {
        opts[o] = userValue;
      } else {
        opts[o] = _options[o][0];
      }
    } else {
      // anything else takes the user value if provided, otherwise is a default

      if (userValue !== undefined) {
        opts[o] = userValue;
      } else {
        opts[o] = _options[o];
      }
    }
  }

  for (o in options) throw new Error('"' + o + '" is not a valid option');

  // Set to global options object
  this.options = clone(opts);

  /** Private Properties (keep alphabetical) */
  this._connected = false;
  this._decompressedSamples = new Array(3);
  this._droppedPacketCounter = 0;
  this._firstPacket = true;
  this._lastDroppedPacket = null;
  this._lastPacket = null;
  this._localName = null;
  this._multiPacketBuffer = null;
  this._packetBuffer = [];
  this._requestedPacketResend = [];
  this._packetCounter = k.OBCIGanglionByteIdSampleMax;
  this._peripheral = null;
  this._scanning = false;
  this._sendCharacteristic = null;
  this._streaming = false;

  /** Public Properties (keep alphabetical) */
  this.peripheralArray = [];
  this.ganglionPeripheralArray = [];
  this.previousPeripheralArray = [];
  this.manualDisconnect = false;

  /** Initializations */
  if (this.options.nobleAutoStart) this._nobleInit(); // It get's the noble going
  for (var i = 0; i < 3; i++) {
    this._decompressedSamples[i] = [0, 0, 0, 0];
  }
}

// This allows us to use the emitter class freely outside of the module
util.inherits(Ganglion, EventEmitter);

/**
 * Used to enable the accelerometer. Will result in accelerometer packets arriving 10 times a second.
 *  Note that the accelerometer is enabled by default.
 * @return {Promise}
 */
Ganglion.prototype.accelStart = function () {
  return this.write(k.OBCIAccelStart);
};

/**
 * Used to disable the accelerometer. Prevents accelerometer data packets from arriving.
 * @return {Promise}
 */
Ganglion.prototype.accelStop = function () {
  return this.write(k.OBCIAccelStop);
};

/**
 * Used to start a scan if power is on. Useful if a connection is dropped.
 */
Ganglion.prototype.autoReconnect = function () {
  // TODO: send back reconnect status, or reconnect fail
  if (noble.state === k.OBCINobleStatePoweredOn) {
    this._nobleScanStart();
  } else {
    console.warn('BLE not AVAILABLE');
  }
};

/**
 * @description Send a command to the board to turn a specified channel off
 * @param channelNumber
 * @returns {Promise.<T>}
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.channelOff = function (channelNumber) {
  return k.commandChannelOff(channelNumber).then((charCommand) => {
    // console.log('sent command to turn channel ' + channelNumber + ' by sending command ' + charCommand)
    return this.write(charCommand);
  });
};

/**
 * @description Send a command to the board to turn a specified channel on
 * @param channelNumber
 * @returns {Promise.<T>|*}
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.channelOn = function (channelNumber) {
  return k.commandChannelOn(channelNumber).then((charCommand) => {
    // console.log('sent command to turn channel ' + channelNumber + ' by sending command ' + charCommand)
    return this.write(charCommand);
  });
};

/**
 * @description The essential precursor method to be called initially to establish a
 *              ble connection to the OpenBCI ganglion board.
 * @param id {String | Object} - a string local name or peripheral object
 * @returns {Promise} If the board was able to connect.
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.connect = function (id) {
  return new Promise((resolve, reject) => {
    if (_.isString(id)) {
      utils.getPeripheralWithLocalName(this.ganglionPeripheralArray, id)
        .then((p) => {
          this._nobleConnect(p);
        })
        .then(resolve)
        .catch(reject);
    } else if (_.isObject(id)) {
      this._nobleConnect(id)
        .then(resolve)
        .catch(reject);
    } else {
      reject(k.OBCIErrorInvalidByteLength);
    }
  });
};

/**
 * Destroys the multi packet buffer.
 */
Ganglion.prototype.destroyMultiPacketBuffer = function () {
  this._multiPacketBuffer = null;
};

/**
 * @description Closes the connection to the board. Waits for stop streaming command to
 *  be sent if currently streaming.
 * @param stopStreaming {Boolean} (optional) - True if you want to stop streaming before disconnecting.
 * @returns {Promise} - fulfilled by a successful close, rejected otherwise.
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.disconnect = function (stopStreaming) {
  if (!this.isConnected()) return Promise.reject('no board connected');

  // no need for timeout here; streamStop already performs a delay
  return Promise.resolve()
    .then(() => {
      if (stopStreaming) {
        if (this.isStreaming()) {
          if (this.options.verbose) console.log('stop streaming');
          return this.streamStop();
        }
      }
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        // serial emitting 'close' will call _disconnected
        if (this._peripheral) {
          this._peripheral.disconnect((err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        } else {
          reject('no peripheral to disconnect');
        }
      });
    });
};

/**
 * Return the local name of the attached Ganglion device.
 * @return {null|String}
 */
Ganglion.prototype.getLocalName = function () {
  return this._localName;
};

/**
 * Get's the multi packet buffer.
 * @return {null|Buffer} - Can be null if no multi packets received.
 */
Ganglion.prototype.getMutliPacketBuffer = function () {
  return this._multiPacketBuffer;
};

/**
 * Call to start testing impedance.
 * @return {global.Promise|Promise}
 */
Ganglion.prototype.impedanceStart = function () {
  return new Promise((resolve, reject) => {
    this.write(k.OBCIGanglionImpedanceStart)
      .then(() => {
        resolve();
      })
      .catch(reject);
  });
};

/**
 * Call to stop testing impedance.
 * @return {global.Promise|Promise}
 */
Ganglion.prototype.impedanceStop = function () {
  return new Promise((resolve, reject) => {
    this.write(k.OBCIGanglionImpedanceStop)
      .then(() => {
        resolve();
      })
      .catch(reject);
  });
};

/**
 * @description Checks if the driver is connected to a board.
 * @returns {boolean} - True if connected.
 */
Ganglion.prototype.isConnected = function () {
  return this._connected;
};

/**
 * @description Checks if noble is currently scanning.
 * @returns {boolean} - True if streaming.
 */
Ganglion.prototype.isSearching = function () {
  return this._scanning;
};

/**
 * @description Checks if the board is currently sending samples.
 * @returns {boolean} - True if streaming.
 */
Ganglion.prototype.isStreaming = function () {
  return this._streaming;
};

/**
 * @description This function is used as a convenience method to determine how many
 *              channels the current board is using.
 * @returns {Number} A number
 * Note: This is dependent on if you configured the board correctly on setup options
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.numberOfChannels = function () {
  return k.OBCINumberOfChannelsGanglion;
};

/**
 * @description To print out the register settings to the console
 * @returns {Promise.<T>|*}
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.printRegisterSettings = function () {
  return this.write(k.OBCIMiscQueryRegisterSettings);
};

/**
 * @description Get the the current sample rate is.
 * @returns {Number} The sample rate
 * Note: This is dependent on if you configured the board correctly on setup options
 */
Ganglion.prototype.sampleRate = function () {
  if (this.options.simulate) {
    return this.options.simulatorSampleRate;
  } else {
    return k.OBCISampleRate200;
  }
};

/**
 * @description List available peripherals so the user can choose a device when not
 *              automatically found.
 * @param `maxSearchTime` {Number} - The amount of time to spend searching. (Default is 20 seconds)
 * @returns {Promise} - If scan was started
 */
Ganglion.prototype.searchStart = function (maxSearchTime) {
  const searchTime = maxSearchTime || k.OBCIGanglionBleSearchTime;

  return new Promise((resolve, reject) => {
    this._searchTimeout = setTimeout(() => {
      this._nobleScanStop().catch(reject);
      reject('Timeout: Unable to find Ganglion');
    }, searchTime);

    this._nobleScanStart()
      .then(() => {
        resolve();
      })
      .catch((err) => {
        if (err !== k.OBCIErrorNobleAlreadyScanning) { // If it's already scanning
          clearTimeout(this._searchTimeout);
          reject(err);
        }
      });
  });
};

/**
 * Called to end a search.
 * @return {global.Promise|Promise}
 */
Ganglion.prototype.searchStop = function () {
  return this._nobleScanStop();
};

/**
 * @description Sends a soft reset command to the board
 * @returns {Promise} - Fulfilled if the command was sent to board.
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.softReset = function () {
  return this.write(k.OBCIMiscSoftReset);
};

/**
 * @description Sends a start streaming command to the board.
 * @returns {Promise} indicating if the signal was able to be sent.
 * Note: You must have successfully connected to an OpenBCI board using the connect
 *           method. Just because the signal was able to be sent to the board, does not
 *           mean the board will start streaming.
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.streamStart = function () {
  return new Promise((resolve, reject) => {
    if (this.isStreaming()) return reject('Error [.streamStart()]: Already streaming');
    this._streaming = true;
    this.write(k.OBCIStreamStart)
      .then(() => {
        if (this.options.verbose) console.log('Sent stream start to board.');
        resolve();
      })
      .catch(reject);
  });
};

/**
 * @description Sends a stop streaming command to the board.
 * @returns {Promise} indicating if the signal was able to be sent.
 * Note: You must have successfully connected to an OpenBCI board using the connect
 *           method. Just because the signal was able to be sent to the board, does not
 *           mean the board stopped streaming.
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.streamStop = function () {
  return new Promise((resolve, reject) => {
    if (!this.isStreaming()) return reject('Error [.streamStop()]: No stream to stop');
    this._streaming = false;
    this.write(k.OBCIStreamStop)
      .then(() => {
        resolve();
      })
      .catch(reject);
  });
};

/**
 * @description Puts the board in synthetic data generation mode. Must call streamStart still.
 * @returns {Promise} indicating if the signal was able to be sent.
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.syntheticEnable = function () {
  return new Promise((resolve, reject) => {
    this.write(k.OBCIGanglionSyntheticDataEnable)
      .then(() => {
        if (this.options.verbose) console.log('Enabled synthetic data mode.');
        resolve();
      })
      .catch(reject);
  });
};

/**
 * @description Takes the board out of synthetic data generation mode. Must call streamStart still.
 * @returns {Promise} - fulfilled if the command was sent.
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.syntheticDisable = function () {
  return new Promise((resolve, reject) => {
    this.write(k.OBCIGanglionSyntheticDataDisable)
      .then(() => {
        if (this.options.verbose) console.log('Disabled synthetic data mode.');
        resolve();
      })
      .catch(reject);
  });
};

/**
 * @description Used to send data to the board.
 * @param data {Array | Buffer | Number | String} - The data to write out
 * @returns {Promise} - fulfilled if command was able to be sent
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.write = function (data) {
  return new Promise((resolve, reject) => {
    if (this._sendCharacteristic) {
      if (!Buffer.isBuffer(data)) {
        data = new Buffer(data);
      }
      if (this.options.debug) openBCIUtils.debugBytes('>>>', data);
      this._sendCharacteristic.write(data);
      resolve();
    } else {
      reject('Send characteristic not set, please call connect method');
    }
  });
};

// //////// //
// PRIVATES //
// //////// //
/**
 * Builds a sample object from an array and sample number.
 * @param sampleNumber
 * @param rawData
 * @return {{sampleNumber: *}}
 * @private
 */
Ganglion.prototype._buildSample = function (sampleNumber, rawData) {
  let sample = {
    sampleNumber: sampleNumber,
    timeStamp: Date.now()
  };
  if (this.options.sendCounts) {
    sample['channelDataCounts'] = rawData;
  } else {
    sample['channelData'] = [];
    for (let j = 0; j < k.OBCINumberOfChannelsGanglion; j++) {
      sample.channelData.push(rawData[j] * k.OBCIGanglionScaleFactorPerCountVolts);
    }
  }
  return sample;
};

/**
 * Called to when a compressed packet is received.
 * @param buffer {Buffer} Just the data portion of the sample. So 18 bytes.
 * @return {Array} - An array of deltas of shape 2x4 (2 samples per packet
 *  and 4 channels per sample.)
 * @private
 */
Ganglion.prototype._decompressDeltas = function (buffer) {
  let D = new Array(k.OBCIGanglionSamplesPerPacket); // 2
  D[0] = [0, 0, 0, 0];
  D[1] = [0, 0, 0, 0];

  let receivedDeltas = [];
  for (let i = 0; i < k.OBCIGanglionSamplesPerPacket; i++) {
    receivedDeltas.push([0, 0, 0, 0]);
  }

  let miniBuf;

  // Sample 1 - Channel 1
  miniBuf = new Buffer(
    [
      (buffer[0] >> 6),
      ((buffer[0] & 0x3F) << 2) | (buffer[1] >> 6),
      ((buffer[1] & 0x3F) << 2) | (buffer[2] >> 6)
    ]
  );
  receivedDeltas[0][0] = utils.convert18bitAsInt32(miniBuf);

  // Sample 1 - Channel 2
  miniBuf = new Buffer(
    [
      (buffer[2] & 0x3F) >> 4,
      (buffer[2] << 4) | (buffer[3] >> 4),
      (buffer[3] << 4) | (buffer[4] >> 4)
    ]);
  // miniBuf = new Buffer([(buffer[2] & 0x1F), buffer[3], buffer[4] >> 2]);
  receivedDeltas[0][1] = utils.convert18bitAsInt32(miniBuf);

  // Sample 1 - Channel 3
  miniBuf = new Buffer(
    [
      (buffer[4] & 0x0F) >> 2,
      (buffer[4] << 6) | (buffer[5] >> 2),
      (buffer[5] << 6) | (buffer[6] >> 2)
    ]);
  receivedDeltas[0][2] = utils.convert18bitAsInt32(miniBuf);

  // Sample 1 - Channel 4
  miniBuf = new Buffer(
    [
      (buffer[6] & 0x03),
      buffer[7],
      buffer[8]
    ]);
  receivedDeltas[0][3] = utils.convert18bitAsInt32(miniBuf);

  // Sample 2 - Channel 1
  miniBuf = new Buffer(
    [
      (buffer[9] >> 6),
      ((buffer[9] & 0x3F) << 2) | (buffer[10] >> 6),
      ((buffer[10] & 0x3F) << 2) | (buffer[11] >> 6)
    ]);
  receivedDeltas[1][0] = utils.convert18bitAsInt32(miniBuf);

  // Sample 2 - Channel 2
  miniBuf = new Buffer(
    [
      (buffer[11] & 0x3F) >> 4,
      (buffer[11] << 4) | (buffer[12] >> 4),
      (buffer[12] << 4) | (buffer[13] >> 4)
    ]);
  receivedDeltas[1][1] = utils.convert18bitAsInt32(miniBuf);

  // Sample 2 - Channel 3
  miniBuf = new Buffer(
    [
      (buffer[13] & 0x0F) >> 2,
      (buffer[13] << 6) | (buffer[14] >> 2),
      (buffer[14] << 6) | (buffer[15] >> 2)
    ]);
  receivedDeltas[1][2] = utils.convert18bitAsInt32(miniBuf);

  // Sample 2 - Channel 4
  miniBuf = new Buffer([(buffer[15] & 0x03), buffer[16], buffer[17]]);
  receivedDeltas[1][3] = utils.convert18bitAsInt32(miniBuf);

  return receivedDeltas;
};

/**
 * Utilize `receivedDeltas` to get actual count values.
 * @param receivedDeltas {Array} - An array of deltas
 *  of shape 2x4 (2 samples per packet and 4 channels per sample.)
 * @private
 */
Ganglion.prototype._decompressSamples = function (receivedDeltas) {
  // add the delta to the previous value
  for (let i = 1; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      this._decompressedSamples[i][j] = this._decompressedSamples[i - 1][j] - receivedDeltas[i - 1][j];
    }
  }
};

/**
 * @description Called once when for any reason the ble connection is no longer open.
 * @private
 */
Ganglion.prototype._disconnected = function () {
  this._streaming = false;

  // Clean up _noble
  // TODO: Figure out how to fire function on process ending from inside module
  // noble.removeListener('discover', this._nobleOnDeviceDiscoveredCallback);

  if (this._peripheral) {
    this._peripheral.removeAllListeners('servicesDiscover');
    this._peripheral.removeAllListeners('connect');
    this._peripheral.removeAllListeners('disconnect');
  }

  // _peripheral = null;
  if (this.options.verbose) console.log('Disconnected');
  if (!this.manualDisconnect) {
    this.autoReconnect();
  }

  this.emit('close');
};

/**
 * Call to destroy the noble event emitters.
 * @private
 */
Ganglion.prototype._nobleDestroy = function () {
  noble.removeAllListeners(k.OBCINobleEmitterStateChange);
  noble.removeAllListeners(k.OBCINobleEmitterDiscover);
};

Ganglion.prototype._nobleConnect = function (peripheral) {
  return new Promise((resolve, reject) => {
    if (this.isConnected()) return reject('already connected!');

    this._peripheral = peripheral;
    this._localName = peripheral.advertisement.localName;
    // if (_.contains(_peripheral.advertisement.localName, rfduino.localNamePrefix)) {
    // TODO: slice first 8 of localName and see if that is ganglion
    // here is where we can capture the advertisement data from the rfduino and check to make sure its ours
    if (this.options.verbose) console.log('Device is advertising \'' + this._peripheral.advertisement.localName + '\' service.');
    // TODO: filter based on advertising name ie make sure we are looking for the right thing
    // if (this.options.verbose) console.log("serviceUUID: " + this._peripheral.advertisement.serviceUuids);

    this._peripheral.on(k.OBCINobleEmitterPeripheralConnect, () => {
      // if (this.options.verbose) console.log("got connect event");
      this._peripheral.discoverServices();
      if (this._scanning) this._nobleScanStop();
    });

    this._peripheral.on(k.OBCINobleEmitterPeripheralDisconnect, () => {
      this._disconnected();
    });

    this._peripheral.on(k.OBCINobleEmitterPeripheralServicesDiscover, (services) => {
      let rfduinoService;

      for (var i = 0; i < services.length; i++) {
        if (services[i].uuid === k.SimbleeUuidService) {
          rfduinoService = services[i];
          // if (this.options.verbose) console.log("Found simblee Service");
          break;
        }
      }

      if (!rfduinoService) {
        reject('Couldn\'t find the simblee service.');
      }

      rfduinoService.on(k.OBCINobleEmitterServiceCharacteristicsDiscover, (characteristics) => {
        // if (this.options.verbose) console.log('Discovered ' + characteristics.length + ' service characteristics');
        var receiveCharacteristic;

        for (var i = 0; i < characteristics.length; i++) {
          // console.log(characteristics[i].uuid);
          if (characteristics[i].uuid === k.SimbleeUuidReceive) {
            receiveCharacteristic = characteristics[i];
          }
          if (characteristics[i].uuid === k.SimbleeUuidSend) {
            // if (this.options.verbose) console.log("Found sendCharacteristicUUID");
            this._sendCharacteristic = characteristics[i];
            if (this.options.verbose) console.log('connected');
            this._connected = true;
            this.emit(k.OBCIEmitterReady);
            resolve();
          }
        }

        if (receiveCharacteristic) {
          receiveCharacteristic.on(k.OBCINobleEmitterServiceRead, (data) => {
            // TODO: handle all the data, both streaming and not
            this._processBytes(data);
          });

          // if (this.options.verbose) console.log('Subscribing for data notifications');
          receiveCharacteristic.notify(true);
        }
      });

      rfduinoService.discoverCharacteristics();
    });

    // if (this.options.verbose) console.log("Calling connect");

    this._peripheral.connect((err) => {
      if (err) {
        if (this.options.verbose) console.log(`Unable to connect with error: ${err}`);
        this._connected = false;
        this._peripheral = null;
        reject(err);
      }
    });
  });
};

/**
 * Call to add the noble event listeners.
 * @private
 */
Ganglion.prototype._nobleInit = function () {
  noble.on(k.OBCINobleEmitterStateChange, (state) => {
    // TODO: send state change error to gui

    // If the peripheral array is empty, do a scan to fill it.
    if (state === k.OBCINobleStatePoweredOn) {
      if (this.options.verbose) console.log('Bluetooth powered on');
      this.emit(k.OBCIEmitterBlePoweredUp);
      if (this.options.nobleScanOnPowerOn) {
        this._nobleScanStart().catch((err) => {
          throw err;
        });
      }
      if (this.peripheralArray.length === 0) {
      }
    } else {
      if (this.isSearching()) {
        this._nobleScanStop().catch((err) => {
          throw err;
        });
      }
    }
  });

  noble.on(k.OBCINobleEmitterDiscover, this._nobleOnDeviceDiscoveredCallback.bind(this));
};

/**
 * Event driven function called when a new device is discovered while scanning.
 * @param peripheral {Object} Peripheral object from noble.
 * @private
 */
Ganglion.prototype._nobleOnDeviceDiscoveredCallback = function (peripheral) {
  // if(this.options.verbose) console.log(peripheral.advertisement);
  this.peripheralArray.push(peripheral);
  if (utils.isPeripheralGanglion(peripheral)) {
    if (this.options.verbose) console.log('Found ganglion!');
    if (_.isUndefined(_.find(this.ganglionPeripheralArray,
        (p) => {
          return p.advertisement.localName === peripheral.advertisement.localName;
        }))) {
      this.ganglionPeripheralArray.push(peripheral);
    }
    this.emit(k.OBCIEmitterGanglionFound, peripheral);
  }
};

Ganglion.prototype._nobleReady = function () {
  return noble.state === k.OBCINobleStatePoweredOn;
};

/**
 * Call to perform a scan to get a list of peripherals.
 * @returns {global.Promise|Promise}
 * @private
 */
Ganglion.prototype._nobleScanStart = function () {
  return new Promise((resolve, reject) => {
    if (this.isSearching()) return reject(k.OBCIErrorNobleAlreadyScanning);
    if (!this._nobleReady()) return reject(k.OBCIErrorNobleNotInPoweredOnState);

    this.peripheralArray = [];
    noble.once(k.OBCINobleEmitterScanStart, () => {
      if (this.options.verbose) console.log('Scan started');
      this._scanning = true;
      resolve();
    });
    // Only look so simblee ble devices and allow duplicates (multiple ganglions)
    // noble.startScanning([k.SimbleeUuidService], true);
    noble.startScanning([], false).catch((err) => {
      console.log(err);
    })
  });
};

/**
 * Stop an active scan
 * @return {global.Promise|Promise}
 * @private
 */
Ganglion.prototype._nobleScanStop = function () {
  return new Promise((resolve, reject) => {
    if (this.isSearching()) return reject(k.OBCIErrorNobleNotAlreadyScanning);
    if (this.options.verbose) console.log(`Stopping scan`);

    noble.once(k.OBCINobleEmitterScanStop, () => {
      this._scanning = false;
      if (this.options.verbose) console.log('Scan stopped');
      resolve();
    });
    // Stop noble from scanning
    noble.stopScanning();
  });
};

/**
 * Route incoming data to proper functions
 * @param data {Buffer} - Data buffer from noble Ganglion.
 * @private
 */
Ganglion.prototype._processBytes = function (data) {
  if (this.options.debug) openBCIUtils.debugBytes('<<', data);
  this.lastPacket = data;
  let byteId = parseInt(data[0]);
  if (byteId <= k.OBCIGanglionByteIdSampleMax) {
    this._processProcessSampleData(data);
  } else {
    switch (byteId) {
      case k.OBCIGanglionByteIdAccel:
        this._processAccel(data);
        break;
      case k.OBCIGanglionByteIdMultiPacket:
        this._processMultiBytePacket(data);
        break;
      case k.OBCIGanglionByteIdMultiPacketStop:
        this._processMultiBytePacketStop(data);
        break;
      case k.OBCIGanglionByteIdImpedanceChannel1:
      case k.OBCIGanglionByteIdImpedanceChannel2:
      case k.OBCIGanglionByteIdImpedanceChannel3:
      case k.OBCIGanglionByteIdImpedanceChannel4:
      case k.OBCIGanglionByteIdImpedanceChannelReference:
        this._processImpedanceData(data);
        break;
      default:
        this._processOtherData(data);
    }
  }
};

/**
 * Process an accel packet of data.
 * @param data {Buffer}
 *  Data packet buffer from noble.
 * @private
 */
Ganglion.prototype._processAccel = function (data) {
  if (this.options.debug) openBCIUtils.debugBytes('Accel <<< ', data);
  const accelData = utils.getDataArrayAccel(data.slice(k.OBCIGanglionPacket.accelStart, k.OBCIGanglionPacket.accelStop), this.options.sendCounts);
  this.emit(k.OBCIEmitterAccelerometer, accelData);
};

/**
 * Process an compressed packet of data.
 * @param data {Buffer}
 *  Data packet buffer from noble.
 * @private
 */
Ganglion.prototype._processCompressedData = function (data) {
  // check for dropped packet
  // if (parseInt(data[0]) - this._packetCounter !== 1) {
  //   this.lastDroppedPacket = parseInt(data[0]); // - 2;
  //   // var retryString = "&"+dropped;
  //   // var reset = Buffer.from(retryString);
  //   // _sendCharacteristic.write(reset);
  //   this._droppedPacketCounter++;
  //   this.emit(k.OBCIEmitterDroppedPacket, [parseInt(data[0]) - 1]);
  //   // if (this.options.verbose) console.error('\t>>>PACKET DROP<<<  ' + this._packetCounter + '  ' + this.lastDroppedPacket + ' ' + this._droppedPacketCounter);
  // }

  // let buffer = data.slice(k.OBCIGanglionPacket.dataStart, k.OBCIGanglionPacket.dataStop);
  //
  // if (k.getVersionNumber(process.version) >= 6) {
  //   // From introduced in node version 6.x.x
  //   buffer = Buffer.from(buffer);
  // } else {
  //   buffer = new Buffer(buffer);
  // }

  // Decompress the buffer into array
  this._decompressSamples(this._decompressDeltas(data.slice(k.OBCIGanglionPacket.dataStart, k.OBCIGanglionPacket.dataStop)));

  this._packetCounter = parseInt(data[0]);

  const sample1 = this._buildSample(this._packetCounter * 2 - 1, this._decompressedSamples[1]);
  this.emit(k.OBCIEmitterSample, sample1);

  const sample2 = this._buildSample(this._packetCounter * 2, this._decompressedSamples[2]);
  this.emit(k.OBCIEmitterSample, sample2);

  // Rotate the 0 position for next time
  for (let i = 0; i < k.OBCINumberOfChannelsGanglion; i++) {
    this._decompressedSamples[0][i] = this._decompressedSamples[2][i];
  }
};

/**
 * Process and emit an impedance value
 * @param data {Buffer}
 * @private
 */
Ganglion.prototype._processImpedanceData = function (data) {
  if (this.options.debug) openBCIUtils.debugBytes('Impedance <<< ', data);
  const byteId = parseInt(data[0]);
  let channelNumber;
  switch (byteId) {
    case k.OBCIGanglionByteIdImpedanceChannel1:
      channelNumber = 1;
      break;
    case k.OBCIGanglionByteIdImpedanceChannel2:
      channelNumber = 2;
      break;
    case k.OBCIGanglionByteIdImpedanceChannel3:
      channelNumber = 3;
      break;
    case k.OBCIGanglionByteIdImpedanceChannel4:
      channelNumber = 4;
      break;
    case k.OBCIGanglionByteIdImpedanceChannelReference:
      channelNumber = 0;
      break;
  }

  let output = {
    channelNumber: channelNumber,
    impedanceValue: 0
  };

  let end = data.length;

  while (_.isNaN(Number(data.slice(1, end))) && end !== 0) {
    end--;
  }

  if (end !== 0) {
    output.impedanceValue = Number(data.slice(1, end));
  }

  this.emit('impedance', output);
};

/**
 * Used to stack multi packet buffers into the multi packet buffer. This is finally emitted when a stop packet byte id
 *  is received.
 * @param data {Buffer}
 *  The multi packet buffer.
 * @private
 */
Ganglion.prototype._processMultiBytePacket = function (data) {
  if (this._multiPacketBuffer) {
    this._multiPacketBuffer = Buffer.concat([this._multiPacketBuffer, data.slice(k.OBCIGanglionPacket.dataStart, k.OBCIGanglionPacket.dataStop)]);
  } else {
    this._multiPacketBuffer = data.slice(k.OBCIGanglionPacket.dataStart, k.OBCIGanglionPacket.dataStop);
  }
};

/**
 * Adds the `data` buffer to the multi packet buffer and emits the buffer as 'message'
 * @param data {Buffer}
 *  The multi packet stop buffer.
 * @private
 */
Ganglion.prototype._processMultiBytePacketStop = function (data) {
  this._processMultiBytePacket(data);
  this.emit(k.OBCIEmitterMessage, this._multiPacketBuffer);
  this.destroyMultiPacketBuffer();
};

Ganglion.prototype._resetDroppedPacketSystem = function () {
  this._packetBuffer = [];
  this._requestedPacketResend = [];
  this._packetCounter = -1;
  this._firstPacket = true;
};

Ganglion.prototype._droppedPacket = function (droppedPacketNumber) {
  this.write(new Buffer([k.OBCIMiscResend, droppedPacketNumber]));
  this.emit(k.OBCIEmitterDroppedPacket, [droppedPacketNumber]);
  this._requestedPacketResend.push(droppedPacketNumber);
};

Ganglion.prototype._processProcessSampleData = function(data) {
  const curByteId = parseInt(data[0]);
  const difByteId = curByteId - this._packetCounter;

  if (this._firstPacket) {
    this._firstPacket = false;
    this._processRouteSampleData(data);
    return;
  }

  if (this._requestedPacketResend.length > 0) {
    let dumped = false;
    for (let i = 0; i < this._requestedPacketResend.length; i++) {
      if (this._requestedPacketResend[i] === curByteId) {
        dumped = true;
        const tempCurBytId = this._packetCounter;
        this._processRouteSampleData(data);
        this._packetCounter = tempCurBytId;
        this._requestedPacketResend.splice(i, 1);
        let bufData = this._packetBuffer.shift();
        while (bufData) {
          this._processRouteSampleData(bufData);
          bufData = this._packetBuffer.shift();
        }
        return;
      }
    }
    if (!dumped) {
      this._packetBuffer.push(data);
      this._packetCounter = curByteId;
      return;
    }
  }

  // Wrap around situation
  if (difByteId < 0) {
    if (this._packetCounter === 127) {
      if (curByteId === 0) {
        this._processRouteSampleData(data);
      } else {
        this._droppedPacket(curByteId - 1);
      }
    } else {
      let tempCounter = this._packetCounter + 1;
      while (tempCounter <= 127) {
        this._droppedPacket(tempCounter);
        tempCounter++;
      }
    }
    this._packetBuffer.push(data);
    this._packetCounter = curByteId;
  } else if (difByteId > 1) {
    let tempCounter = this._packetCounter + 1;
    while (tempCounter < curByteId) {
      this._droppedPacket(tempCounter);
      tempCounter++;
    }
    this._packetBuffer.push(data);
    this._packetCounter = curByteId;
  // Dropped packet
  } else {
    this._processRouteSampleData(data);
  }
};

Ganglion.prototype._processRouteSampleData = function(data) {
  if (parseInt(data[0]) === k.OBCIGanglionByteIdUncompressed) {
    this._processUncompressedData(data);
  } else {
    this._processCompressedData(data);
  }
};

/**
 * The default route when a ByteId is not recognized.
 * @param data {Buffer}
 * @private
 */
Ganglion.prototype._processOtherData = function (data) {
  openBCIUtils.debugBytes('OtherData <<< ', data);
};

/**
 * Process an uncompressed packet of data.
 * @param data {Buffer}
 *  Data packet buffer from noble.
 * @private
 */
Ganglion.prototype._processUncompressedData = function (data) {
  let start = 1;

  // Resets the packet counter back to zero
  this._packetCounter = k.OBCIGanglionByteIdUncompressed;  // used to find dropped packets
  for (let i = 0; i < 4; i++) {
    this._decompressedSamples[0][i] = interpret24bitAsInt32(data, start);  // seed the decompressor
    start += 3;
  }

  const newSample = this._buildSample(0, this._decompressedSamples[0]);
  this.emit(k.OBCIEmitterSample, newSample);
};

module.exports = Ganglion;

function interpret24bitAsInt32 (byteArray, index) {
  // little endian
  var newInt = (
    ((0xFF & byteArray[index]) << 16) |
    ((0xFF & byteArray[index + 1]) << 8) |
    (0xFF & byteArray[index + 2])
  );
  if ((newInt & 0x00800000) > 0) {
    newInt |= 0xFF000000;
  } else {
    newInt &= 0x00FFFFFF;
  }
  return newInt;
}
