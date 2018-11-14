"use strict";
const EventEmitter = require("events").EventEmitter;
const _ = require("lodash");
let noble;
let SerialPort;
const util = require("util");
// Local imports
const { utilities, constants, debug } = require("openbci-utilities");
const k = constants;
const clone = require("clone");
const bufferEqual = require("buffer-equal");
// const Buffer = require('buffer/');

/**
 * @typedef {Object} InitializationObject Board optional configurations.
 * @property {Boolean} bled112 Whether to use bled112 as bluetooth driver or default to first available. (Default `false`)
 *
 * @property {Boolean} debug Print out a raw dump of bytes sent and received. (Default `false`)
 *
 * @property {Boolean} driverAutoInit Used to auto start either noble or the bled112 drivers (Default `true`)
 *
 * @property {Boolean} nobleAutoStart Automatically initialize `noble`. Subscribes to blue tooth state changes and such.
 *           (Default `true`)
 *
 * @property {Boolean} nobleScanOnPowerOn Start scanning for Ganglion BLE devices as soon as power turns on.
 *           (Default `true`)
 *
 * @property {Boolean} sendCounts Send integer raw counts instead of scaled floats.
 *           (Default `false`)
 *
 * @property {Boolean} simulate (IN-OP) Full functionality, just mock data. (Default `false`)
 *
 * @property {Boolean} simulatorBoardFailure (IN-OP)  Simulates board communications failure. This occurs when the RFduino on
 *                  the board is not polling the RFduino on the dongle. (Default `false`)
 *
 * @property {Boolean} simulatorHasAccelerometer Sets simulator to send packets with accelerometer data. (Default `true`)
 *
 * @property {Boolean} simulatorInjectAlpha Inject a 10Hz alpha wave in Channels 1 and 2 (Default `true`)
 *
 * @property {String} simulatorInjectLineNoise Injects line noise on channels.
 *          3 Possible Options:
 *              `60Hz` - 60Hz line noise (Default) [America]
 *              `50Hz` - 50Hz line noise [Europe]
 *              `none` - Do not inject line noise.
 *
 * @property {Number} simulatorSampleRate The sample rate to use for the simulator. Simulator will set to 125 if
 *                  `simulatorDaisyModuleAttached` is set `true`. However, setting this option overrides that
 *                  setting and this sample rate will be used. (Default is `250`)
 *
 * @property {Boolean} - Print out useful debugging events. (Default `false`)
 */

/**
 * Options object
 * @type {InitializationObject}
 * @private
 */
const _options = {
  bled112: false,
  debug: false,
  driverAutoInit: true,
  nobleAutoStart: true,
  nobleScanOnPowerOn: true,
  sendCounts: false,
  simulate: false,
  simulatorBoardFailure: false,
  simulatorHasAccelerometer: true,
  simulatorInternalClockDrift: 0,
  simulatorInjectAlpha: true,
  simulatorInjectLineNoise: [
    k.OBCISimulatorLineNoiseHz60,
    k.OBCISimulatorLineNoiseHz50,
    k.OBCISimulatorLineNoiseNone
  ],
  simulatorSampleRate: 200,
  verbose: false
};

/**
 * @description The initialization method to call first, before any other method.
 * @param options {InitializationObject} (optional) - Board optional configurations.
 * @param callback {function} (optional) - A callback function used to determine if the noble module was able to be started.
 *    This can be very useful on Windows when there is no compatible BLE device found.
 * @constructor
 * @author AJ Keller (@pushtheworldllc)
 */
function Ganglion(options, callback) {
  if (!(this instanceof Ganglion)) {
    return new Ganglion(options, callback);
  }

  if (options instanceof Function) {
    callback = options;
    options = {};
  }

  options = (typeof options !== "function" && options) || {};
  let opts = {};

  /** Configuring Options */
  let o;
  for (o in _options) {
    let userOption = o in options ? o : o.toLowerCase();
    let userValue = options[userOption];
    delete options[userOption];

    if (typeof _options[o] === "object") {
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

  for (o in options)
    throw new Error('"' + o + '" is not a valid option');

  // Set to global options object
  /**
   * @type {InitializationObject}
   */
  this.options = clone(opts);

  /** Private Properties (keep alphabetical) */
  this._accelArray = [0, 0, 0];
  this._bled112Characteristics = [];
  this._bled112Connected = false;
  this._bled112Connection = -1;
  this._bled112GanglionGroup = null;
  this._bled112ParsingMode = kOBCIBLED112ParsingNormal;
  this._bled112ParseParallelProcedureComplete = false;
  this._bled112ParsingAttributeValue = {
    buffer: Buffer.from([]),
    ignore: 1,
    length: 0,
    lengthPosition: 8,
    verify: {
      position: 1,
      comparePosition: 8,
      difference: 5
    },
    word: bleEvtAttclientAttributeValue
  };
  this._bled112ParsingAttributeWrite = {
    buffer: Buffer.from([]),
    length: 7,
    word: bleRspAttclientAttributeWrite
  };
  this._bled112ParsingConnectionStatus = {
    buffer: Buffer.from([]),
    length: 20,
    word: bleEvtConnectionStatus
  };
  this._bled112ParsingConnectDirect = {
    buffer: Buffer.from([]),
    length: 7,
    word: bleRspGapConnectDirect
  };
  this._bled112ParsingDisconnect = {
    buffer: Buffer.from([]),
    length: 7,
    word: bleRspGapDisconnect
  };
  this._bled112ParsingDiscover = {
    buffer: Buffer.from([]),
    length: 30,
    word: bleEvtGapScanResponse
  };
  this._bled112ParsingFindInfoLong = {
    buffer: Buffer.from([]),
    length: 24,
    verify: {
      position: 7,
      value: 0x10
    },
    word: bleEvtAttclientFindInformationFoundLong
  };
  this._bled112ParsingFindInfoShort = {
    buffer: Buffer.from([]),
    length: 10,
    verify: {
      position: 7,
      value: 0x02
    },
    word: bleEvtAttclientFindInformationFoundShort
  };
  this._bled112ParsingGroup = {
    buffer: Buffer.from([]),
    length: 12,
    word: bleEvtAttclientGroupFound
  };
  this._bled112ParsingProcedureComplete = {
    buffer: Buffer.from([]),
    length: 9,
    word: bleEvtAttclientProcedureCompleted
  };
  /** @type {BLED112FindInformationFound} */
  this._bled112WriteCharacteristic = null;
  this._connected = false;
  this._decompressedSamples = new Array(3);
  this._droppedPacketCounter = 0;
  this._firstPacket = true;
  this._localName = null;
  this._packetCounter = k.OBCIGanglionByteId18Bit.max;
  this._peripheral = null;
  this._rawDataPacketToSample = k.rawDataToSampleObjectDefault(
    k.numberOfChannelsForBoardType(k.OBCIBoardGanglion)
  );
  this._rawDataPacketToSample.scale = !this.options.sendCounts;
  this._rawDataPacketToSample.sendCounts = this.options.sendCounts;
  this._rawDataPacketToSample.protocol = k.OBCIProtocolBLE;
  this._rawDataPacketToSample.verbose = this.options.verbose;
  this._rfduinoService = null;
  this._receiveCharacteristic = null;
  this._scanning = false;
  this._sendCharacteristic = null;
  this._streaming = false;

  /** Public Properties (keep alphabetical) */
  this.buffer = null;
  this.ganglionPeripheralArray = [];
  this.manualDisconnect = false;
  this.peripheralArray = [];
  this.previousPeripheralArray = [];

  /** Initializations */
  for (let i = 0; i < 3; i++) {
    this._decompressedSamples[i] = [0, 0, 0, 0];
  }

  if (this.options.driverAutoInit) {
    this.initDriver()
      .then(() => {
        if (callback) callback();
      })
      .catch(err => {
        if (callback) callback(err);
      });
  } else {
    if (callback) callback();
  }
}

// This allows us to use the emitter class freely outside of the module
util.inherits(Ganglion, EventEmitter);

/**
 * Used to enable the accelerometer. Will result in accelerometer packets arriving 10 times a second.
 *  Note that the accelerometer is enabled by default.
 * @return {Promise}
 */
Ganglion.prototype.accelStart = function() {
  return this.write(k.OBCIAccelStart);
};

/**
 * Used to disable the accelerometer. Prevents accelerometer data packets from arriving.
 * @return {Promise}
 */
Ganglion.prototype.accelStop = function() {
  return this.write(k.OBCIAccelStop);
};

/**
 * Used to start a scan if power is on. Useful if a connection is dropped.
 */
Ganglion.prototype.autoReconnect = function() {
  // TODO: send back reconnect status, or reconnect fail
  if (noble.state === k.OBCINobleStatePoweredOn) {
    this._nobleScanStart();
  } else {
    console.warn("BLE not AVAILABLE");
  }
};

/**
 * @description Send a command to the board to turn a specified channel off
 * @param channelNumber
 * @returns {Promise.<T>}
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.channelOff = function(channelNumber) {
  return k.commandChannelOff(channelNumber).then(charCommand => {
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
Ganglion.prototype.channelOn = function(channelNumber) {
  return k.commandChannelOn(channelNumber).then(charCommand => {
    // console.log('sent command to turn channel ' + channelNumber + ' by sending command ' + charCommand)
    return this.write(charCommand);
  });
};

/**
 * Used to clean up emitters
 */
Ganglion.prototype.cleanupEmitters = function() {
  this.removeAllListeners("droppedPacket");
  this.removeAllListeners("accelerometer");
  this.removeAllListeners("sample");
  this.removeAllListeners("message");
  this.removeAllListeners("impedance");
  this.removeAllListeners("close");
  this.removeAllListeners("error");
  this.removeAllListeners("ganglionFound");
  this.removeAllListeners("ready");
};

/**
 * @description The essential precursor method to be called initially to establish a
 *              ble connection to the OpenBCI ganglion board.
 * @param id {String | Object} - a string local name or peripheral object
 * @returns {Promise} If the board was able to connect.
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.connect = function(id) {
  return new Promise((resolve, reject) => {
    if (_.isString(id)) {
      if (this.options.bled112) {
        let gPerih = null;
        _.forEach(this.peripheralArray, peripheral => {
          if (peripheral.advertisementDataString === id) {
            gPerih = peripheral;
          }
        });
        if (gPerih) {
          this._bled112Connect(gPerih)
            .then(resolve)
            .catch(reject);
        }
      } else {
        k.getPeripheralWithLocalName(this.ganglionPeripheralArray, id)
          .then(p => {
            return this._nobleConnect(p);
          })
          .then(resolve)
          .catch(reject);
      }
    } else if (_.isObject(id)) {
      let func;
      if (this.options.bled112) func = this._bled112Connect.bind(this);
      else func = this._nobleConnect.bind(this);
      func(id)
        .then(resolve)
        .catch(reject);
    } else {
      reject(k.OBCIErrorInvalidByteLength);
    }
  });
};

/**
 * Destroys the noble!
 */
Ganglion.prototype.destroyNoble = function() {
  this._nobleDestroy();
};

/**
 * Destroys the noble!
 */
Ganglion.prototype.destroyBLED112 = function() {
  if (this.options.verbose) console.log("destroyBLED112");
  this._bled112SerialClose();
};

/**
 * Destroys the multi packet buffer.
 */
Ganglion.prototype.destroyMultiPacketBuffer = function() {
  this._rawDataPacketToSample.multiPacketBuffer = null;
};

/**
 * @description Closes the connection to the board. Waits for stop streaming command to
 *  be sent if currently streaming.
 * @param stopStreaming {Boolean} (optional) - True if you want to stop streaming before disconnecting.
 * @returns {Promise} - fulfilled by a successful close, rejected otherwise.
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.disconnect = function(stopStreaming) {
  // no need for timeout here; streamStop already performs a delay
  return Promise.resolve()
    .then(() => {
      if (stopStreaming) {
        if (this.isStreaming()) {
          if (this.options.verbose) console.log("stop streaming");
          return this.streamStop();
        }
      }
      return Promise.resolve();
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        // serial emitting 'close' will call _disconnected
        if (this._bled112Connection >= 0) {
          if (this.options.verbose)
            console.log("Calling disconnect on bled112");
          let disconnectTimeout = null;
          this.once(kOBCIEmitterBLED112RspGapDisconnect, () => {
            if (this.options.verbose)
              console.log("Disconnected as clean as possible");
            clearTimeout(disconnectTimeout);
            this._disconnected();
            resolve();
          });
          this._bled112Disconnect()
            .then(() => {
              disconnectTimeout = setTimeout(() => {
                reject(Error("Failed to get disconnect message"));
              }, 1000);
            })
            .catch(err => {
              this._disconnected();
              reject(err);
            });
        } else if (this._peripheral) {
          this._peripheral.disconnect(err => {
            if (err) {
              this._disconnected();
              reject(err);
            } else {
              this._disconnected();
              resolve();
            }
          });
        } else {
          reject("no peripheral to disconnect");
        }
      });
    });
};

/**
 * Return the local name of the attached Ganglion device.
 * @return {null|String}
 */
Ganglion.prototype.getLocalName = function() {
  return this._localName;
};

/**
 * Get's the multi packet buffer.
 * @return {null|Buffer} - Can be null if no multi packets received.
 */
Ganglion.prototype.getMutliPacketBuffer = function() {
  return this._rawDataPacketToSample.multiPacketBuffer;
};

/**
 * Call to start testing impedance.
 * @return {global.Promise|Promise}
 */
Ganglion.prototype.impedanceStart = function() {
  return this.write(k.OBCIGanglionImpedanceStart);
};

/**
 * Call to stop testing impedance.
 * @return {global.Promise|Promise}
 */
Ganglion.prototype.impedanceStop = function() {
  return this.write(k.OBCIGanglionImpedanceStop);
};

/**
 * Initialize the drivers
 * @returns {Promise<any>}
 */
Ganglion.prototype.initDriver = function(portName) {
  return new Promise((resolve, reject) => {
    try {
      if (this.options.bled112) {
        SerialPort = require("serialport");
        if (portName) {
          this._bled112Init(portName)
            .then(() => {
              resolve();
            })
            .catch(reason => {
              reject(reason);
            });
        } else {
          SerialPort.list((err, ports) => {
            if (err) {
              reject(err);
            } else {
              const portPre = /\/dev\/tty.usbmodem/;
              let bledPort = null;
              for (let port of ports) {
                if (process.platform === "win32") {
                  if (port.pnpId === "USB\\VID_2458&PID_0001\\1") {
                    bledPort = port;
                    break;
                  }
                } else if (process.platform === "linux") {
                  if (
                    port.pnpId ===
                    "usb-Bluegiga_Low_Energy_Dongle_1-if00"
                  ) {
                    bledPort = port;
                    break;
                  }
                } else {
                  if (port.comName.match(portPre) !== null) {
                    bledPort = port;
                    break;
                  }
                }
              }
              if (bledPort) {
                this._bled112Init(bledPort.comName)
                  .then(() => {
                    resolve();
                  })
                  .catch(reason => {
                    reject(reason);
                  });
              } else {
                reject(Error("No BLED112 port found"));
              }
            }
          });
        }
      } else {
        noble = require("noble-mac");
        if (this.options.nobleAutoStart) this._nobleInit(); // It get's the noble going
        resolve();
      }
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * @description Checks if the driver is connected to a board.
 * @returns {boolean} - True if connected.
 */
Ganglion.prototype.isConnected = function() {
  return this._connected;
};

/**
 * @description Checks if bluetooth is powered on.
 * @returns {boolean} - True if bluetooth is powered on.
 */
Ganglion.prototype.isNobleReady = function() {
  return this._nobleReady();
};

/**
 * @description Checks if noble is currently scanning.
 * @returns {boolean} - True if streaming.
 */
Ganglion.prototype.isSearching = function() {
  return this._scanning;
};

/**
 * @description Checks if the board is currently sending samples.
 * @returns {boolean} - True if streaming.
 */
Ganglion.prototype.isStreaming = function() {
  return this._streaming;
};

/**
 * @description This function is used as a convenience method to determine how many
 *              channels the current board is using.
 * @returns {Number} A number
 * Note: This is dependent on if you configured the board correctly on setup options
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.numberOfChannels = function() {
  return k.OBCINumberOfChannelsGanglion;
};

/**
 * @description To print out the register settings to the console
 * @returns {Promise.<T>|*}
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.printRegisterSettings = function() {
  return this.write(k.OBCIMiscQueryRegisterSettings);
};

/**
 * @description Get the the current sample rate is.
 * @returns {Number} The sample rate
 * Note: This is dependent on if you configured the board correctly on setup options
 */
Ganglion.prototype.sampleRate = function() {
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
Ganglion.prototype.searchStart = function(maxSearchTime) {
  const searchTime = maxSearchTime || k.OBCIGanglionBleSearchTime;

  return new Promise((resolve, reject) => {
    this._searchTimeout = setTimeout(() => {
      if (this.options.bled112) {
        this._bled112ScanStop().catch(reject);
      } else {
        this._nobleScanStop().catch(reject);
      }
      reject("Timeout: Unable to find Ganglion");
    }, searchTime);
    if (this.options.bled112) {
      this._bled112ScanStart()
        .then(() => {
          resolve();
        })
        .catch(err => {
          if (err !== k.OBCIErrorNobleAlreadyScanning) {
            // If it's already scanning
            clearTimeout(this._searchTimeout);
            reject(err);
          }
        });
    } else {
      this._nobleScanStart()
        .then(() => {
          resolve();
        })
        .catch(err => {
          if (err !== k.OBCIErrorNobleAlreadyScanning) {
            // If it's already scanning
            clearTimeout(this._searchTimeout);
            reject(err);
          }
        });
    }
  });
};

/**
 * Called to end a search.
 * @return {global.Promise|Promise}
 */
Ganglion.prototype.searchStop = function() {
  if (this.options.bled112) {
    return this._bled112ScanStop();
  } else {
    return this._nobleScanStop();
  }
};

/**
 * @description Sends a soft reset command to the board
 * @returns {Promise} - Fulfilled if the command was sent to board.
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype.softReset = function() {
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
Ganglion.prototype.streamStart = function() {
  return new Promise((resolve, reject) => {
    if (this.isStreaming())
      return reject("Error [.streamStart()]: Already streaming");
    this.once("sample", () => {
      this._streaming = true;
    });
    this.write(k.OBCIStreamStart)
      .then(() => {
        if (this.options.verbose)
          console.log("Sent stream start to board.");
        if (this.options.bled112) this._bled112ParseForNormal();
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
Ganglion.prototype.streamStop = function() {
  return new Promise((resolve, reject) => {
    if (!this.isStreaming())
      return reject("Error [.streamStop()]: No stream to stop");
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
Ganglion.prototype.syntheticEnable = function() {
  return new Promise((resolve, reject) => {
    this.write(k.OBCIGanglionSyntheticDataEnable)
      .then(() => {
        if (this.options.verbose)
          console.log("Enabled synthetic data mode.");
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
Ganglion.prototype.syntheticDisable = function() {
  return new Promise((resolve, reject) => {
    this.write(k.OBCIGanglionSyntheticDataDisable)
      .then(() => {
        if (this.options.verbose)
          console.log("Disabled synthetic data mode.");
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
Ganglion.prototype.write = function(data) {
  return new Promise((resolve, reject) => {
    if (this._sendCharacteristic) {
      if (!Buffer.isBuffer(data)) {
        data = new Buffer(data);
      }
      this._sendCharacteristic.write(data, true, err => {
        if (err) {
          reject(err);
        } else {
          if (this.options.debug) debug.default(">>>", data);
          resolve();
        }
      });
    } else if (this._bled112WriteCharacteristic) {
      this.once(kOBCIEmitterBLED112RspAttclientAttributeWrite, res => {
        if (bufferEqual(res.result, bleResultNoError)) {
          resolve();
        } else {
          reject(
            Error(
              "Unable to write to BLED112 attribute",
              res.result[0] | res.result[1]
            )
          );
        }
      });
      this._bled112ParseForNormal();
      this._bled112WriteAndDrain(
        this._bled112GetAttributeWrite({
          characteristicHandleRaw: this._bled112WriteCharacteristic
            .characteristicHandleRaw,
          connection: this._bled112WriteCharacteristic.connection,
          value: data
        })
      ).catch(reject);
    } else {
      reject("Send characteristic not set, please call connect method");
    }
  });
};

// //////// //
// PRIVATES //

/**
 * @description Called once when for any reason the ble connection is no longer open.
 * @private
 */
Ganglion.prototype._disconnected = function() {
  this._streaming = false;
  this._connected = false;

  // Clean up _noble
  // TODO: Figure out how to fire function on process ending from inside module
  // noble.removeListener('discover', this._nobleOnDeviceDiscoveredCallback);

  if (this._receiveCharacteristic) {
    this._receiveCharacteristic.removeAllListeners(
      k.OBCINobleEmitterServiceRead
    );
  }

  this._receiveCharacteristic = null;

  if (this._rfduinoService) {
    this._rfduinoService.removeAllListeners(
      k.OBCINobleEmitterServiceCharacteristicsDiscover
    );
  }

  this._rfduinoService = null;

  if (this._peripheral) {
    this._peripheral.removeAllListeners(
      k.OBCINobleEmitterPeripheralConnect
    );
    this._peripheral.removeAllListeners(
      k.OBCINobleEmitterPeripheralDisconnect
    );
    this._peripheral.removeAllListeners(
      k.OBCINobleEmitterPeripheralServicesDiscover
    );
  }

  this._peripheral = null;

  if (!this.manualDisconnect) {
    // this.autoReconnect();
  }

  if (this.options.verbose) console.log(`Private disconnect clean up`);

  this.emit("close");
};

/**
 * Call to destroy the noble event emitters.
 * @private
 */
Ganglion.prototype._nobleDestroy = function() {
  if (noble) {
    noble.removeAllListeners(k.OBCINobleEmitterStateChange);
    noble.removeAllListeners(k.OBCINobleEmitterDiscover);
  }
};

Ganglion.prototype._nobleConnect = function(peripheral) {
  return new Promise((resolve, reject) => {
    if (this.isConnected()) return reject("already connected!");

    this._peripheral = peripheral;
    this._localName = peripheral.advertisement.localName;
    // if (_.contains(_peripheral.advertisement.localName, rfduino.localNamePrefix)) {
    // TODO: slice first 8 of localName and see if that is ganglion
    // here is where we can capture the advertisement data from the rfduino and check to make sure its ours
    if (this.options.verbose)
      console.log(
        "Device is advertising '" +
          this._peripheral.advertisement.localName +
          "' service."
      );
    // TODO: filter based on advertising name ie make sure we are looking for the right thing
    // if (this.options.verbose) console.log("serviceUUID: " + this._peripheral.advertisement.serviceUuids);

    this._peripheral.on(k.OBCINobleEmitterPeripheralConnect, () => {
      // if (this.options.verbose) console.log("got connect event");
      this._peripheral.discoverServices();
      if (this.isSearching()) this._nobleScanStop();
    });

    this._peripheral.on(k.OBCINobleEmitterPeripheralDisconnect, () => {
      if (this.options.verbose) console.log("Peripheral disconnected");
      this._disconnected();
    });

    this._peripheral.on(
      k.OBCINobleEmitterPeripheralServicesDiscover,
      services => {
        for (let i = 0; i < services.length; i++) {
          if (services[i].uuid === k.SimbleeUuidService) {
            this._rfduinoService = services[i];
            // if (this.options.verbose) console.log("Found simblee Service");
            break;
          }
        }

        if (!this._rfduinoService) {
          reject("Couldn't find the simblee service.");
        }

        this._rfduinoService.once(
          k.OBCINobleEmitterServiceCharacteristicsDiscover,
          characteristics => {
            if (this.options.verbose)
              console.log(
                "Discovered " +
                  characteristics.length +
                  " service characteristics"
              );
            for (let i = 0; i < characteristics.length; i++) {
              // console.log(characteristics[i].uuid);
              if (characteristics[i].uuid === k.SimbleeUuidReceive) {
                if (this.options.verbose)
                  console.log("Found receiveCharacteristicUUID");
                this._receiveCharacteristic = characteristics[i];
              }
              if (characteristics[i].uuid === k.SimbleeUuidSend) {
                if (this.options.verbose)
                  console.log("Found sendCharacteristicUUID");
                this._sendCharacteristic = characteristics[i];
              }
            }

            if (
              this._receiveCharacteristic &&
              this._sendCharacteristic
            ) {
              this._receiveCharacteristic.on(
                k.OBCINobleEmitterServiceRead,
                data => {
                  // TODO: handle all the data, both streaming and not
                  this._processBytes(data);
                }
              );

              // if (this.options.verbose) console.log('Subscribing for data notifications');
              this._receiveCharacteristic.notify(true);

              this._connected = true;
              this.emit(k.OBCIEmitterReady);
              resolve();
            } else {
              reject(
                "unable to set both receive and send characteristics!"
              );
            }
          }
        );

        this._rfduinoService.discoverCharacteristics();
      }
    );

    // if (this.options.verbose) console.log("Calling connect");

    this._peripheral.connect(err => {
      if (err) {
        if (this.options.verbose)
          console.log(`Unable to connect with error: ${err}`);
        this._disconnected();
        reject(err);
      }
    });
  });
};

/**
 * Call to add the noble event listeners.
 * @private
 */
Ganglion.prototype._nobleInit = function() {
  noble.on(k.OBCINobleEmitterStateChange, state => {
    // TODO: send state change error to gui

    // If the peripheral array is empty, do a scan to fill it.
    if (state === k.OBCINobleStatePoweredOn) {
      if (this.options.verbose) console.log("Bluetooth powered on");
      this.emit(k.OBCIEmitterBlePoweredUp);
      if (this.options.nobleScanOnPowerOn) {
        this._nobleScanStart().catch(err => {
          console.log(err);
        });
      }
      if (this.peripheralArray.length === 0) {
      }
    } else {
      if (this.isSearching()) {
        this._nobleScanStop().catch(err => {
          console.log(err);
        });
      }
    }
  });

  noble.on(
    k.OBCINobleEmitterDiscover,
    this._nobleOnDeviceDiscoveredCallback.bind(this)
  );
};

/**
 * Event driven function called when a new device is discovered while scanning.
 * @param peripheral {Object} Peripheral object from noble.
 * @private
 */
Ganglion.prototype._nobleOnDeviceDiscoveredCallback = function(
  peripheral
) {
  // if(this.options.verbose) console.log(peripheral.advertisement);
  this.peripheralArray.push(peripheral);
  if (k.isPeripheralGanglion(peripheral)) {
    if (this.options.verbose) console.log("Found ganglion!");
    if (
      _.isUndefined(
        _.find(this.ganglionPeripheralArray, p => {
          return (
            p.advertisement.localName ===
            peripheral.advertisement.localName
          );
        })
      )
    ) {
      this.ganglionPeripheralArray.push(peripheral);
    }
    this.emit(k.OBCIEmitterGanglionFound, peripheral);
  }
};

Ganglion.prototype._nobleReady = function() {
  return noble.state === k.OBCINobleStatePoweredOn;
};

/**
 * Call to perform a scan to get a list of peripherals.
 * @returns {global.Promise|Promise}
 * @private
 */
Ganglion.prototype._nobleScanStart = function() {
  return new Promise((resolve, reject) => {
    if (this.isSearching())
      return reject(k.OBCIErrorNobleAlreadyScanning);
    if (!this._nobleReady())
      return reject(k.OBCIErrorNobleNotInPoweredOnState);

    this.peripheralArray = [];
    noble.once(k.OBCINobleEmitterScanStart, () => {
      if (this.options.verbose) console.log("Scan started");
      this._scanning = true;
      this.emit(k.OBCINobleEmitterScanStart);
      resolve();
    });
    // Only look so simblee ble devices and allow duplicates (multiple ganglions)
    // noble.startScanning([k.SimbleeUuidService], true);
    noble.startScanning([], false);
  });
};

/**
 * Stop an active scan
 * @return {global.Promise|Promise}
 * @private
 */
Ganglion.prototype._nobleScanStop = function() {
  return new Promise((resolve, reject) => {
    if (!this.isSearching())
      return reject(k.OBCIErrorNobleNotAlreadyScanning);
    if (this.options.verbose) console.log(`Stopping scan`);

    noble.once(k.OBCINobleEmitterScanStop, () => {
      this._scanning = false;
      this.emit(k.OBCINobleEmitterScanStop);
      if (this.options.verbose) console.log("Scan stopped");
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
Ganglion.prototype._processBytes = function(data) {
  if (this.options.debug && !this.options.bled112)
    debug.default("<<", data);
  this._rawDataPacketToSample.rawDataPacket = data;
  this._processProcessSampleData(data);
  this._packetCounter = parseInt(data[0]);
  const obj = utilities.parseGanglion(this._rawDataPacketToSample);
  if (obj) {
    if (Array.isArray(obj)) {
      obj.forEach(sample => {
        this.emit(k.OBCIEmitterSample, sample);
        if (sample.hasOwnProperty("accelData")) {
          if (sample.accelData.length === 3) {
            this.emit("accelerometer", sample.accelData);
          } else {
            delete sample.accelData;
          }
        }
        if (sample.hasOwnProperty("accelDataCounts")) {
          if (sample.accelDataCounts.length === 3) {
            this.emit("accelerometer", sample.accelDataCounts);
          }
        }
      });
    } else if (obj.hasOwnProperty("message")) {
      this.emit(k.OBCIEmitterMessage, obj.message);
    } else if (obj.hasOwnProperty("impedanceValue")) {
      this.emit("impedance", obj);
    } else {
      if (this.options.verbose)
        console.log(
          "Ganglion.prototype._processBytes: Invalid return object",
          obj
        );
    }
  }
  return obj;
};

Ganglion.prototype._droppedPacket = function(droppedPacketNumber) {
  this._droppedPacketCounter++;
  let droppedPacketArray = [];
  if (droppedPacketNumber === 0) {
    droppedPacketArray = [0];
  } else if (droppedPacketNumber < k.OBCIGanglionByteId18Bit.max) {
    droppedPacketArray.push(droppedPacketNumber * 2 - 1);
    droppedPacketArray.push(droppedPacketNumber * 2);
  } else {
    droppedPacketArray.push((droppedPacketNumber - 100) * 2 - 1);
    droppedPacketArray.push((droppedPacketNumber - 100) * 2);
  }
  this.emit(k.OBCIEmitterDroppedPacket, droppedPacketArray);
};

Ganglion.prototype._resetDroppedPacketSystem = function() {
  this._packetCounter = -1;
  this._firstPacket = true;
  this._droppedPacketCounter = 0;
};

/**
 * Checks for dropped packets
 * @param data {Buffer}
 * @private
 */
Ganglion.prototype._processProcessSampleData = function(data) {
  const curByteId = parseInt(data[0]);
  const difByteId = curByteId - this._packetCounter;

  if (this._firstPacket) {
    this._firstPacket = false;
    return;
  }

  // Wrap around situation
  if (difByteId < 0) {
    if (this._packetCounter <= k.OBCIGanglionByteId18Bit.max) {
      if (this._packetCounter === k.OBCIGanglionByteId18Bit.max) {
        if (curByteId !== k.OBCIGanglionByteIdUncompressed) {
          this._droppedPacket(curByteId - 1);
        }
      } else {
        let tempCounter = this._packetCounter + 1;
        while (tempCounter <= k.OBCIGanglionByteId18Bit.max) {
          this._droppedPacket(tempCounter);
          tempCounter++;
        }
      }
    } else if (this._packetCounter === k.OBCIGanglionByteId19Bit.max) {
      if (curByteId !== k.OBCIGanglionByteIdUncompressed) {
        this._droppedPacket(curByteId - 1);
      }
    } else {
      let tempCounter = this._packetCounter + 1;
      while (tempCounter <= k.OBCIGanglionByteId19Bit.max) {
        this._droppedPacket(tempCounter);
        tempCounter++;
      }
    }
  } else if (difByteId > 1) {
    if (
      this._packetCounter === k.OBCIGanglionByteIdUncompressed &&
      curByteId === k.OBCIGanglionByteId19Bit.min
    ) {
      return;
    } else {
      let tempCounter = this._packetCounter + 1;
      while (tempCounter < curByteId) {
        this._droppedPacket(tempCounter);
        tempCounter++;
      }
    }
  }
};

// ///////////////////////////////////////////////////////////////////////////////////////////
// ///////////////////////////////////////////////////////////////////////////////////////////
// BLED112 //////////////////////////////////////////////////////////////////////////////////
// ///////////////////////////////////////////////////////////////////////////////////////////
// ///////////////////////////////////////////////////////////////////////////////////////////

const kOBCIEmitterBLED112EvtAttclientFindInformationFound =
  "bleEvtAttclientFindInformationFound";
const kOBCIEmitterBLED112EvtAttclientGroupFound =
  "bleEvtAttclientGroupFound";
const kOBCIEmitterBLED112EvtAttclientProcedureCompleted =
  "bleEvtAttclientProcedureCompleted";
const kOBCIEmitterBLED112EvtConnectionDisconnected =
  "bleEvtConnectionDisconnected";
const kOBCIEmitterBLED112EvtConnectionStatus = "bleEvtConnectionStatus";
const kOBCIEmitterBLED112EvtGapScanResponse = "bleEvtGapScanResponse";
const kOBCIEmitterBLED112RspAttclientAttributeWrite =
  "bleRspAttclientAttributeWrite";
const kOBCIEmitterBLED112RspAttclientFindInformationFound =
  "bleRspAttclientFindInfomationFound";
const kOBCIEmitterBLED112RspAttclientReadByGroupType =
  "bleRspAttclientReadByGroupType";
const kOBCIEmitterBLED112RspGapDiscoverError = "bleRspGapDiscoverError";
const kOBCIEmitterBLED112RspGapDiscoverNoError =
  "bleRspGapDiscoverNoError";
const kOBCIEmitterBLED112RspGapConnectDirect = "bleRspGapConnectDirect";
const kOBCIEmitterBLED112RspGapDisconnect = "bleRspGapDisconnect";

const bleEvtAttclientFindInformationFoundShort = Buffer.from([
  0x80,
  0x06,
  0x04,
  0x04
]);
const bleEvtAttclientFindInformationFoundLong = Buffer.from([
  0x80,
  0x14,
  0x04,
  0x04
]);
const bleEvtAttclientGroupFound = Buffer.from([0x80, 0x08, 0x04, 0x02]);
const bleEvtAttclientProcedureCompleted = Buffer.from([
  0x80,
  0x05,
  0x04,
  0x01
]);
const bleEvtAttclientAttributeValue = Buffer.from([
  0x80,
  0x05,
  0x04,
  0x05
]);
const bleEvtConnectionStatus = Buffer.from([0x80, 0x10, 0x03, 0x00]);
const bleEvtConnectionDisconnected = Buffer.from([
  0x80,
  0x03,
  0x03,
  0x04
]);
const bleEvtGapScanResponse = Buffer.from([0x80, 0x1a, 0x06, 0x00]);
const bleResultNoError = Buffer.from([0, 0]);
const bleRspAttclientAttributeWrite = Buffer.from([
  0x00,
  0x03,
  0x04,
  0x05
]);
const bleRspAttclientReadByGroupType = Buffer.from([
  0x00,
  0x03,
  0x04,
  0x01
]);
const bleRspAttclientFindInformationFound = Buffer.from([
  0x00,
  0x03,
  0x04,
  0x03
]);
const bleRspGapConnectDirect = Buffer.from([0x00, 0x03, 0x06, 0x03]);
const bleRspGapDiscover = Buffer.from([0x00, 0x02, 0x06, 0x02]);
const bleRspGapDisconnect = Buffer.from([0x00, 0x03, 0x03, 0x00]);

const ganglionUUIDCCC = Buffer.from([0x29, 0x02]);
const ganglionUUIDCharacteristic = Buffer.from([
  0x2d,
  0x30,
  0xc0,
  0x83,
  0xf3,
  0x9f,
  0x4c,
  0xe6,
  0x92,
  0x3f,
  0x34,
  0x84,
  0xea,
  0x48,
  0x05,
  0x96
]);
const ganglionUUIDService = Buffer.from([0xfe, 0x84]);

/** Used in parsing incoming serial data */
const kOBCIBLED112ParsingConnectDirect = 0;
const kOBCIBLED112ParsingConnectionStatus = 1;
const kOBCIBLED112ParsingDisconnect = 2;
const kOBCIBLED112ParsingDiscover = 3;
const kOBCIBLED112ParsingFindInfo = 4;
const kOBCIBLED112ParsingGroup = 5;
const kOBCIBLED112ParsingNormal = 6;
const kOBCIBLED112ParsingProcedureComplete = 7;

/**
 * Call to init with a port name
 * @param portName - Serialport name of the BLED112
 * @returns {Promise}
 * @private
 */
Ganglion.prototype._bled112Init = function(portName) {
  return new Promise((resolve, reject) => {
    this.portName = portName || "/dev/tty.usbmodem1";
    if (this.options.verbose)
      console.log("_bled112Init: using real board " + this.portName);
    this.serial = new SerialPort(
      this.portName,
      {
        baudRate: 256000,
        highWaterMark: 64
      },
      err => {
        if (err) reject(err);
      }
    );
    this.serial.on("data", data => {
      this._bled112ProcessBytes(data);
    });
    this.serial.once("open", () => {
      this._bled112Connected = true;
      if (this.options.verbose) console.log("Serial Port Open");
      this.emit("open");
      if (this.options.verbose)
        console.log("Ganglion with BLED112 ready to go!");
      if (this.options.nobleScanOnPowerOn) {
        this._bled112ScanStart()
          .then(() => {
            if (this.options.verbose)
              console.log("On serial port open start scan success");
            resolve();
          })
          .catch(err => {
            if (this.options.verbose)
              console.log(
                "On serial port open start scan error",
                err.message
              );
            reject(err);
          });
      } else {
        resolve();
      }
    });
    this.serial.once("close", () => {
      if (this.options.verbose) console.log("Serial Port Closed");
      // 'close' is emitted in _disconnected()
      this._bled112SerialDisconnected();
    });
    this.serial.once("error", err => {
      if (this.options.verbose) console.log("Serial Port Error");
      this.emit("error", err);
      this._bled112SerialDisconnected(err);
    });
  });
};

/**
 * @typedef {Object} BLED112AttributeValue
 * @property {Number} characteristicHandle
 * @property {Buffer} characteristicHandleRaw - The string of the advertisement data, not the full ad data
 * @property {Number} connection - The connection the info is from
 * @property {Number} type - The type, where 0x01 is data?
 * @property {Buffer} value - The value from device
 */

/**
 * @typedef {Object} BLED112AttributeWrite
 * @property {Buffer} characteristicHandleRaw - Buffer of length 2 for the service number in the att database
 * @property {Number} connection - Which connection is being used
 * @property {String | Buffer} value - The value to send to the device
 */

/**
 * @typedef {Object} BLEDConnection
 * @property {Number} addressType
 * @property {Number} bonding
 * @property {Number} connection
 * @property {Number} connectionInterval
 * @property {Number} flags
 * @property {Number} latency
 * @property {Buffer} sender
 * @property {Number} timeout
 */

/**
 * @typedef {Object} BLED112FindInformationFound
 * @property {Number} characteristicHandle
 * @property {Buffer} characteristicHandleRaw - The string of the advertisement data, not the full ad data
 * @property {Number} connection - The entire end of ad data
 * @property {Number} type - The type, where 0x02 is short uuid and 0x10 is long, it's hex for length
 * @property {Buffer} uuid
 */

/**
 * @typedef {Object} BLED112GapConnectDirect
 * @property {Number} connection
 * @property {Buffer} result
 */

/**
 * @typedef {Object} BLED112GroupService
 * @property {number} connection
 * @property {number} end
 * @property {Buffer} endRaw
 * @property {number} start
 * @property {Buffer} startRaw
 * @property {Buffer} uuid
 */

/**
 * @typedef {Object} BLED112ParseRawAttributeValue
 * @property buffer {Buffer | Buffer2} - The raw data buffer to parse
 * @property ignore {Number} - The position to ignore in the `word`
 * @property length {Number} - The length of raw you want to extract
 * @property lengthPosition {Number} - The position of the byte that stores the length of the value
 * @property verify {Object}
 * @property verify.comparePosition {Number} - The value to compare with `position`
 * @property verify.difference {Number} - The difference between `position` and `comparePostion`
 * @property verify.ignore {Number} - The difference between `position` and `comparePostion`
 * @property verify.position {Number} - The position of the verification byte
 * @property word {Buffer | Buffer2} - The 4 byte word to search for, ignore byte in postion 1
 */

/**
 * @typedef {Object} BLED112ParseRawHeadTail
 * @property buffer {Buffer | Buffer2} - The raw data buffer to parse
 * @property head {Number} - The head byte to search for
 * @property length {Number} - The length of raw you want to extract
 * @property tail {Number} - The tail byte to search for
 */

/**
 * @typedef {Object} BLED112ParseRawWord
 * @property buffer {Buffer | Buffer2} - The raw data buffer to parse
 * @property length {Number} - The length of raw you want to extract
 * @property verify {Object}
 * @property verify.position {Number} - The position of the verification byte
 * @property verify.value {Number} - The value of the verification byte
 * @property word {Buffer | Buffer2} - The 4 byte word to search for
 */

/**
 * @typedef {Object} BLED112Peripheral
 * @property {Number} addressType
 * @property {Object} advertisement
 * @property {String} advertisement.localName - Same as `advertisementDataString` but mimics what noble outputs
 * @property {String} advertisementDataString - The string of the advertisement data, not the full ad data
 * @property {Buffer | Buffer2} advertisementDataRaw - The entire end of ad data
 * @property {Number} bond
 * @property {Number} packetType -
 * @property {Number} rssi - The RSSI which stands for receive signal strength indicator and is in db so it's negative,
 *  and lower the better.
 * @property {Buffer | Buffer2} sender The mac address
 */

/**
 * @typedef {Object} BLED112RspGroupType
 * @property {Number} connection
 * @property {Buffer} result
 */

/**
 * Parse the value and get other information
 * @param data
 * @returns {BLED112AttributeValue}
 * @private
 */
Ganglion.prototype._bled112AttributeValue = function(data) {
  return {
    characteristicHandle: data[6] | data[5],
    characteristicHandleRaw: Buffer.from([data[6], data[5]]),
    connection: data[4],
    type: data[7],
    value: data.slice(9)
  };
};

/**
 * Connect to a BLE device
 * Steps:
 *  1. Connect to peripheral with mac address
 *  2. Discover Services (read by group type)
 *  3. Parse group found for uuid 0xFE84
 *  4. Discover descriptors using start and end from group found response (find information)
 *  5. Parse find information found responses for uuid 2902, store as Client Characteristic Configuration
 *  6. Parse find information found responses for uuid 2d30...0596, there should be three, save the middle as the write characteristic, first one is read
 *  7. Wait for attclient procedure complete, timeout after 1 second with reject
 *  8. If CCC and write were found, continue, else reject,
 *  9. Write the 0x01 to 0x2902 characteristic handle
 *  10. Wait for procedure completed, resolve, timeout after 1 second with reject
 * @param p {BLED112Peripheral}
 * @returns {Promise}
 * @private
 */
Ganglion.prototype._bled112Connect = function(p) {
  if (this.options.verbose)
    console.log("Attempting BLED112 Connect to", JSON.stringify(p));
  return new Promise((resolve, reject) => {
    if (this.isConnected()) return reject(Error("already connected!"));
    const writeNotifyAttribute = res => {
      if (bufferEqual(res.result, bleResultNoError)) {
        if (this.options.verbose)
          console.log(`_bled112Connect: Success wrote attribute to CCC`);
        // const attemptWriteFunction = (infos) => {
        //   this._bled112WriteCharacteristic = infos.shift();
        //   if (this.options.verbose) console.log('attempting write on ', JSON.stringify(this._bled112WriteCharacteristic));
        //   const sampleFoundFunc = (sample) => {
        //     if (verbose) console.log('got a sample see ', JSON.stringify(sample));
        //     clearTimeout(timeoutFunc);
        //   };
        //   const timeoutFunc = setTimeout(() => {
        //     this.removeListener('sample', sampleFoundFunc);
        //     attemptWriteFunction(infos);
        //   }, 500);
        //   this.once('sample', sampleFoundFunc);
        //   this.write(k.OBCIStreamStart)
        //     .then(() => {
        //       if (this.options.verbose) console.log('Sent stream start to board.');
        //       resolve();
        //     })
        //     .catch(reject);
        // };
        this._bled112Characteristics.forEach(info => {
          if (bufferEqual(ganglionUUIDCharacteristic, info.uuid)) {
            if (this.options.verbose)
              console.log("Victory! Write characteristic set!");
            this._bled112ParseForNormal();
            this._bled112WriteCharacteristic = info;
            this.emit("ready");
            resolve();

            // this._bled112ParseForNormal();
            // resolve();
          }
        });

        // attemptWriteFunction(possibleWriteInfos);
        // if (possibleWriteInfos.length === 2) {
        //   if (possibleWriteInfos[0].characteristicHandle < possibleWriteInfos[1].characteristicHandle) {
        //     this._bled112WriteCharacteristic = possibleWriteInfos[1];
        //   } else {
        //     this._bled112WriteCharacteristic = possibleWriteInfos[0];
        //   }
        //   if (this.options.verbose) console.log('Write characteristic set to', JSON.stringify(this._bled112WriteCharacteristic));
        //   resolve();
        if (this._bled112WriteCharacteristic === null) {
          throw Error("unable to find write characteristic");
        }
      } else {
        if (this.options.verbose)
          console.log(
            `_bled112Connect: Failed to write attribute to CCC`
          );
      }
    };
    let endFindInformationFoundTimeout = null;
    const endFindInformationFound = () => {
      this.removeListener(
        kOBCIEmitterBLED112EvtAttclientFindInformationFound,
        findInformationFound
      );
      if (this.options.verbose)
        console.log("Find information found complete.");
      if (this._bled112GanglionUUIDCCC) {
        this._bled112ParseForProcedureComplete();
        this.once(
          kOBCIEmitterBLED112EvtAttclientProcedureCompleted,
          writeNotifyAttribute
        );
        this._bled112WriteAndDrain(
          this._bled112GetAttributeWrite({
            characteristicHandleRaw: this._bled112GanglionUUIDCCC
              .characteristicHandleRaw,
            connection: this._bled112Connection,
            value: Buffer.from([0x01, 0x00])
          })
        ).catch(err => {
          if (this.options.verbose) console.log(err);
        });
      } else {
        throw Error("Ganglion uuid ccc is not set");
      }
    };

    /**
     * Called when information if found
     * @param information {BLED112FindInformationFound}
     */
    const findInformationFound = information => {
      if (this.options.verbose)
        console.log(
          "Find information found",
          JSON.stringify(information)
        );
      let newHandles = [];
      this._bled112Characteristics.forEach(
        /**
         *
         * @param info {BLED112FindInformationFound}
         */
        info => {
          if (
            info.characteristicHandle !==
            information.characteristicHandle
          ) {
            newHandles.push(info);
          }
        }
      );
      newHandles.push(information);
      this._bled112Characteristics = newHandles;
      if (bufferEqual(ganglionUUIDCCC, information.uuid)) {
        this._bled112GanglionUUIDCCC = information;
        if (this.options.verbose)
          console.log(
            `ganglionUUIDCCC characteristic found: ${JSON.stringify(
              information
            )}`
          );
      }
      if (endFindInformationFoundTimeout) {
        clearTimeout(endFindInformationFoundTimeout);
      }
      endFindInformationFoundTimeout = setTimeout(
        endFindInformationFound,
        500
      ); // End find information found  after no new characteristics
      // this._bled112Characteristics.push(information);
    };
    const groupFound = group => {
      if (bufferEqual(ganglionUUIDService, group.uuid)) {
        if (this.options.verbose)
          console.log("Ganglion Group Found", JSON.stringify(group));
        this._bled112GanglionGroup = group;
      }
    };
    const procedureComplete = () => {
      this._bled112ParseParallelProcedureComplete = false;
      if (this._bled112GanglionGroup) {
        if (this.options.verbose) console.log("Procedure completed");

        this._bled112Characteristics = [];
        this._bled112ParseForFindInfoFound();
        this.on(
          kOBCIEmitterBLED112EvtAttclientFindInformationFound,
          findInformationFound
        );
        this.removeListener(
          kOBCIEmitterBLED112EvtAttclientGroupFound,
          groupFound
        );
        this._bled112WriteAndDrain(
          this._bled112GetFindInformation(this._bled112GanglionGroup)
        ).catch(reject);
      } else {
        if (this.options.verbose)
          console.log(
            "Critical failure... Ganglion group not set... exiting."
          );
        process.exit(0);
      }
    };
    this.on(kOBCIEmitterBLED112EvtAttclientGroupFound, groupFound);
    this.once(
      kOBCIEmitterBLED112EvtAttclientProcedureCompleted,
      procedureComplete
    );
    this.once(kOBCIEmitterBLED112EvtConnectionStatus, newConnection => {
      this._connected = true;
      this._bled112ParseParallelProcedureComplete = true;
      this._bled112ParseForGroup();
      this._bled112WriteAndDrain(
        this._bled112GetReadByGroupType(newConnection)
      ).catch(reject);
    });
    this.once(kOBCIEmitterBLED112RspGapConnectDirect, () => {
      this._bled112ParseForConnectionStatus();
    });

    // Connect to peripheral with mac address
    // this._bled112Connection = p.connection;
    this._bled112ParseForConnectDirect();
    this._bled112WriteAndDrain(
      this._bled112GetConnectDirect({
        addressType: 1,
        connectionIntervalMaximum: 76,
        connectionIntervalMinimum: 10,
        latency: 0,
        sender: p.sender,
        timeout: 100
      })
    ).catch(reject);
  });
};

/**
 * Parses a raw data for gap connect
 * @param data
 * @returns {BLED112GapConnectDirect}
 * @private
 */
Ganglion.prototype._bled112ConnectDirect = function(data) {
  return {
    connection: data[6],
    result: Buffer.from([data[5], data[4]])
  };
};

/**
 * Sent after a connection has been made to device
 * @param data {Buffer} -  20 byte buffer
 * @returns BLEDConnection
 * @private
 */
Ganglion.prototype._bled112ConnectionMade = function(data) {
  return {
    addressType: data[12],
    bonding: data[19],
    connection: data[4],
    connectionInterval: data[14] | data[13],
    flags: data[5],
    latency: data[18] | data[17],
    sender: Buffer.from([
      data[11],
      data[10],
      data[9],
      data[8],
      data[7],
      data[6]
    ]),
    timeout: data[16] | data[15]
  };
};

/**
 *
 * @param data
 * @returns {{connection: number, reasonRaw: Buffer2, reasonString: string}}
 * @private
 */
Ganglion.prototype._bled112ConnectionDisconnected = function(data) {
  const raw = Buffer.from([data[6], data[5]]);
  let reason = "";
  if (
    bufferEqual(
      Buffer.from([data[6], data[5]]),
      Buffer.from([0x02, 0x08])
    )
  ) {
    reason = "Link supervision timeout has expired.";
  }
  return {
    connection: data[4],
    reasonRaw: raw,
    reason: reason
  };
};

/**
 * Parse a ble_evt_gap_scan_response
 * @param data
 * @returns BLED112Peripheral
 * @private
 */
Ganglion.prototype._bled112DeviceFound = function(data) {
  return {
    addressType: data[12],
    advertisement: {
      localName: data.slice(17, 30).toString()
    },
    advertisementDataString: data.slice(17, 30).toString(),
    advertisementDataRaw: data.slice(15, 30),
    bond: data[13],
    packetType: data[5],
    rssi: -(~(0xffffff00 | data[4]) + 1),
    sender: Buffer.from([
      data[11],
      data[10],
      data[9],
      data[8],
      data[7],
      data[6]
    ])
  };
};

/**
 * Clean up all the BLED112 emitters
 * @private
 */
Ganglion.prototype.bled112CleanupEmitters = function() {
  this.removeAllListeners(kOBCIEmitterBLED112RspGapDiscoverNoError);
  this.removeAllListeners(kOBCIEmitterBLED112RspGapDiscoverError);
  this.removeAllListeners(
    kOBCIEmitterBLED112RspAttclientReadByGroupType
  );
  this.removeAllListeners(kOBCIEmitterBLED112RspGapConnectDirect);
  this.removeAllListeners(kOBCIEmitterBLED112RspGapDisconnect);
  this.removeAllListeners(kOBCIEmitterBLED112EvtGapScanResponse);
  this.removeAllListeners(kOBCIEmitterBLED112EvtConnectionStatus);
  this.removeAllListeners(
    kOBCIEmitterBLED112EvtAttclientFindInformationFound
  );
  this.removeAllListeners(kOBCIEmitterBLED112EvtAttclientGroupFound);
  this.removeAllListeners(
    kOBCIEmitterBLED112EvtAttclientProcedureCompleted
  );
};

/**
 * Call to destroy the noble event emitters.
 * @private
 */
Ganglion.prototype._bled112SerialClose = function() {
  if (this.options.verbose) console.log("_bled112SerialClose");
  if (this.serial) {
    this.serial.close(err => {
      if (err) {
        if (this.options.verbose)
          console.log("Serial Port Close Error", err);
      }
    });
  }
};

Ganglion.prototype._bled112Disconnect = function() {
  return new Promise((resolve, reject) => {
    if (this._bled112Connection >= 0) {
      if (this.options.verbose)
        console.log("Sending disconnect command");
      this.once(kOBCIEmitterBLED112RspGapDisconnect, () => {
        if (this.options.verbose)
          console.log("_bled112Disconnect: success");
        resolve();
      });
      this._bled112ParsingMode = kOBCIBLED112ParsingDisconnect;

      this._bled112WriteAndDrain(
        this._bled112GetDisconnect(this._bled112Connection)
      ).catch(console.log);
    } else {
      reject(Error("No connection made"));
    }
  });
};

/**
 * @description Called once when for any reason the ble connection is no longer open.
 * @private
 */
Ganglion.prototype._bled112SerialDisconnected = function() {
  this._streaming = false;
  this._connected = false;
  this._bled112Connected = false;
  this._bled112GanglionGroup = null;
  this._bled112Connection = -1;

  this.bled112CleanupEmitters();

  this.serial.removeAllListeners("close");
  this.serial.removeAllListeners("error");
  this.serial.removeAllListeners("data");
  this.serial = null;

  if (this.options.verbose)
    console.log(`Private BLED112 disconnect clean up`);

  this.emit("close");
};

/**
 * Parse the information found raw data packet
 * @param data
 * @returns {BLED112FindInformationFound}
 * @private
 */
Ganglion.prototype._bled112FindInformationFound = function(data) {
  const uuidLenPosition = 7;
  const uuidArray = [];
  for (let i = data[uuidLenPosition] - 1; i >= 0; i--) {
    uuidArray.push(data[uuidLenPosition + 1 + i]);
  }
  return {
    characteristicHandle: data[6] | data[5],
    characteristicHandleRaw: Buffer.from([data[6], data[5]]),
    connection: data[4],
    uuidLength: uuidArray.length,
    uuid: Buffer.from(uuidArray)
  };
};

/**
 * Used to get the buffer of the attribute to write
 * @param p {BLED112AttributeWrite}
 * @returns {Buffer | Buffer2}
 * @private
 */
Ganglion.prototype._bled112GetAttributeWrite = function(p) {
  let outputArray = [
    0x00,
    0x05,
    0x04,
    0x05,
    p.connection,
    p.characteristicHandleRaw[1],
    p.characteristicHandleRaw[0],
    p.value.length
  ];
  if (typeof p.value === "string") {
    for (let i = 0; i < p.value.length; i++) {
      outputArray.push(p.value.charCodeAt(i));
    }
  } else {
    for (let i = 0; i < p.value.length; i++) {
      outputArray.push(p.value[i]);
    }
  }
  return Buffer.from(outputArray);
};

/**
 * Used to get the buffer of the attribute to write
 * @param p {BLED112AttributeWrite}
 * @returns {Buffer | Buffer2}
 * @private
 */
Ganglion.prototype._bled112GetAttributeWriteAlt = function(p) {
  let outputArray = [
    0x00,
    0x06,
    0x04,
    0x05,
    p.connection,
    p.characteristicHandleRaw[1],
    p.characteristicHandleRaw[0],
    p.value.length
  ];
  if (typeof p.value === "string") {
    for (let i = 0; i < p.value.length; i++) {
      outputArray.push(p.value.charCodeAt(i));
    }
  } else {
    for (let i = 0; i < p.value.length; i++) {
      outputArray.push(p.value[i]);
    }
  }
  return Buffer.from(outputArray);
};

/**
 * Get buffer to connect to a device
 * @param p {Object}
 * @param p.addressType {Number}
 * @param p.connectionIntervalMaximum {Number}
 * @param p.connectionIntervalMinimum {Number}
 * @param p.latency {Number}
 * @param p.sender {Buffer} - 6 byte mac address of device
 * @param p.timeout {Number}
 * @returns {Buffer | Buffer2}
 * @private
 */
Ganglion.prototype._bled112GetConnectDirect = function(p) {
  return Buffer.from([
    0x00,
    0x0f,
    0x06,
    0x03,
    p.sender[5],
    p.sender[4],
    p.sender[3],
    p.sender[2],
    p.sender[1],
    p.sender[0],
    p.addressType,
    p.connectionIntervalMinimum & 0x00ff,
    (p.connectionIntervalMinimum & 0xff00) >> 8,
    p.connectionIntervalMaximum & 0x00ff,
    (p.connectionIntervalMaximum & 0xff00) >> 8,
    p.timeout & 0x00ff,
    (p.timeout & 0xff00) >> 8,
    p.latency & 0x00ff,
    (p.latency & 0xff00) >> 8
  ]);
};

Ganglion.prototype._bled112GetDisconnect = function(connection) {
  return Buffer.from([0x00, 0x01, 0x03, 0x00, connection]);
};

Ganglion.prototype._bled112GetDiscover = function() {
  return Buffer.from([0x00, 0x01, 0x06, 0x02, 0x02]);
};

/**
 * Creates a packet for finding information about a service group. It's like hitting the `Discover Descriptors`
 * @param groupService {BLED112GroupService}
 * @returns {Buffer | Buffer2}
 * @private
 */
Ganglion.prototype._bled112GetFindInformation = function(groupService) {
  return Buffer.from([
    0x00,
    0x05,
    0x04,
    0x03,
    groupService.connection,
    groupService.startRaw[1],
    groupService.startRaw[0],
    groupService.endRaw[1],
    groupService.endRaw[0]
  ]);
};

/**
 * Get the parsing object for raw attribute values
 * @param newBuffer {Buffer | Buffer2} - New buffer to set to object
 * @return {BLED112ParseRawAttributeValue}
 * @private
 */
Ganglion.prototype._bled112GetParsingAttributeValue = function(
  newBuffer
) {
  if (newBuffer) this._bled112ParsingAttributeValue.buffer = newBuffer;
  return this._bled112ParsingAttributeValue;
};

/**
 * Get the parsing object for attribute writes
 * @param newBuffer {Buffer | Buffer2} - New buffer to set to object
 * @return {BLED112ParseRawAttributeValue}
 * @private
 */
Ganglion.prototype._bled112GetParsingAttributeWrite = function(
  newBuffer
) {
  if (newBuffer) this._bled112ParsingAttributeWrite.buffer = newBuffer;
  return this._bled112ParsingAttributeWrite;
};

/**
 * Get the parsing object for connect direct status event
 * @param newBuffer {Buffer | Buffer2} - New buffer to set to object
 * @return {BLED112ParseRawAttributeValue}
 * @private
 */
Ganglion.prototype._bled112GetParsingConnectionStatus = function(
  newBuffer
) {
  if (newBuffer) this._bled112ParsingConnectionStatus.buffer = newBuffer;
  return this._bled112ParsingConnectionStatus;
};

/**
 * Get the parsing object for connect direct response
 * @param newBuffer {Buffer | Buffer2} - New buffer to set to object
 * @return {BLED112ParseRawAttributeValue}
 * @private
 */
Ganglion.prototype._bled112GetParsingConnectDirect = function(
  newBuffer
) {
  if (newBuffer) this._bled112ParsingConnectDirect.buffer = newBuffer;
  return this._bled112ParsingConnectDirect;
};

/**
 * Get the parsing object for disconnect
 * @param newBuffer {Buffer | Buffer2} - New buffer to set to object
 * @return {BLED112ParseRawAttributeValue}
 * @private
 */
Ganglion.prototype._bled112GetParsingDisconnect = function(newBuffer) {
  if (newBuffer) this._bled112ParsingDisconnect.buffer = newBuffer;
  return this._bled112ParsingDisconnect;
};

/**
 * Get the parsing object for discovering groups
 * @param newBuffer {Buffer | Buffer2} - New buffer to set to object
 * @return {BLED112ParseRawHeadTail}
 * @private
 */
Ganglion.prototype._bled112GetParsingDiscover = function(newBuffer) {
  if (newBuffer) this._bled112ParsingDiscover.buffer = newBuffer;
  return this._bled112ParsingDiscover;
};

/**
 * Get the parsing object for find information found long uuid
 * @param newBuffer {Buffer | Buffer2} - New buffer to set to object
 * @return {BLED112ParseRawWord}
 * @private
 */
Ganglion.prototype._bled112GetParsingFindInfoLong = function(newBuffer) {
  if (newBuffer) this._bled112ParsingFindInfoLong.buffer = newBuffer;
  return this._bled112ParsingFindInfoLong;
};

/**
 * Get the parsing object for find information found short uuid
 * @param newBuffer {Buffer | Buffer2} - New buffer to set to object
 * @return {BLED112ParseRawWord}
 * @private
 */
Ganglion.prototype._bled112GetParsingFindInfoShort = function(
  newBuffer
) {
  if (newBuffer) this._bled112ParsingFindInfoShort.buffer = newBuffer;
  return this._bled112ParsingFindInfoShort;
};

/**
 * Get the parsing object for groups
 * @param newBuffer {Buffer | Buffer2} - New buffer to set to object
 * @return {BLED112ParseRawWord}
 * @private
 */
Ganglion.prototype._bled112GetParsingGroup = function(newBuffer) {
  if (newBuffer) this._bled112ParsingGroup.buffer = newBuffer;
  return this._bled112ParsingGroup;
};

/**
 * Get the parsing object for procedure found
 * @param newBuffer {Buffer | Buffer2} - New buffer to set to object
 * @return {BLED112ParseRawWord}
 * @private
 */
Ganglion.prototype._bled112GetParsingProcedureComplete = function(
  newBuffer
) {
  if (newBuffer)
    this._bled112ParsingProcedureComplete.buffer = newBuffer;
  return this._bled112ParsingProcedureComplete;
};

/**
 * Creates a packet for getting services about a ble connection. It's like hitting the `Services Discover`
 * @param p {Object}
 * @param p.connection {Number} - The connection number
 * @returns {Buffer | Buffer2}
 * @private
 */
Ganglion.prototype._bled112GetReadByGroupType = function(p) {
  return Buffer.from([
    0x00,
    0x08,
    0x04,
    0x01,
    p.connection,
    0x01,
    0x00,
    0xff,
    0xff,
    0x02,
    0x00,
    0x28
  ]);
};

Ganglion.prototype._bled112ParseForConnectionStatus = function() {
  this._bled112ParsingMode = kOBCIBLED112ParsingConnectionStatus;
};

Ganglion.prototype._bled112ParseForConnectDirect = function() {
  this._bled112ParsingMode = kOBCIBLED112ParsingConnectDirect;
};

Ganglion.prototype._bled112ParseForDisconnect = function() {
  this._bled112ParsingMode = kOBCIBLED112ParsingDisconnect;
};

Ganglion.prototype._bled112ParseForDiscover = function() {
  this._bled112ParsingMode = kOBCIBLED112ParsingDiscover;
};

Ganglion.prototype._bled112ParseForFindInfoFound = function() {
  if (this.options.verbose)
    console.log("Parsing for find info find events");
  this._bled112ParsingMode = kOBCIBLED112ParsingFindInfo;
};

Ganglion.prototype._bled112ParseForGroup = function() {
  if (this.options.verbose) console.log("Parsing for group events");
  this._bled112ParsingMode = kOBCIBLED112ParsingGroup;
};

Ganglion.prototype._bled112ParseForNormal = function() {
  if (this.options.verbose) console.log("Parsing for normal");
  this._bled112ParsingMode = kOBCIBLED112ParsingNormal;
};

Ganglion.prototype._bled112ParseForProcedureComplete = function() {
  if (this.options.verbose)
    console.log("Parsing for procedure complete");
  this._bled112ParsingMode = kOBCIBLED112ParsingProcedureComplete;
};

/**
 * This is the event from 'service discover' and this has the uuid for the ganglion which is 0xFE84
 * @param data
 * @returns {BLED112GroupService}
 * @private
 */
Ganglion.prototype._bled112GroupFound = function(data) {
  return {
    connection: data[4],
    end: data[8] | data[7],
    endRaw: Buffer.from([data[8], data[7]]),
    start: data[6] | data[5],
    startRaw: Buffer.from([data[6], data[5]]),
    uuid: Buffer.from([data[11], data[10]])
  };
};

Ganglion.prototype._bled112ProcessRaw = function(data) {
  // if (this.options.debug) debug.default('<<', data);
  if (data[0] === 0x00) {
    if (data[1] === 0x02) {
      if (
        bufferEqual(
          data.slice(0, bleRspGapDiscover.byteLength),
          bleRspGapDiscover
        )
      ) {
        const code = data[5] | data[4];
        if (code === 0x0000) {
          if (this.options.verbose)
            console.log("BLED112RspGapDiscoverNoError");
          this.emit(kOBCIEmitterBLED112RspGapDiscoverNoError);
        } else {
          if (this.options.verbose)
            console.log("BLED112RspGapDiscoverError: ", code);
          this.emit(kOBCIEmitterBLED112RspGapDiscoverError, code);
        }
        return data;
      }
    } else if (data[1] === 0x03) {
      if (
        bufferEqual(
          data.slice(0, bleRspAttclientReadByGroupType.byteLength),
          bleRspAttclientReadByGroupType
        )
      ) {
        if (this.options.verbose)
          console.log("BLED112RspAttclientReadByGroupType");
        this.emit(kOBCIEmitterBLED112RspAttclientReadByGroupType);
        return data;
      } else if (
        bufferEqual(
          data.slice(0, bleRspGapConnectDirect.byteLength),
          bleRspGapConnectDirect
        )
      ) {
        const newConnection = this._bled112ConnectDirect(data);
        this._bled112Connection = newConnection.connection;
        if (this.options.verbose)
          console.log(
            `BLED112RspGapConnectDirect: ${JSON.stringify(
              newConnection
            )}`
          );
        this.emit(kOBCIEmitterBLED112RspGapConnectDirect, newConnection);
        return newConnection;
      } else if (
        bufferEqual(
          data.slice(0, bleRspGapDisconnect.byteLength),
          bleRspGapDisconnect
        )
      ) {
        const killedConnection = {
          connection: data[4],
          result: data[6] | data[5]
        };
        if (this.options.verbose)
          console.log(
            `BLED112RspGapDisconnect: ${JSON.stringify(
              killedConnection
            )}`
          );
        this._bled112Connection = -1;
        this.emit(kOBCIEmitterBLED112RspGapDisconnect, killedConnection);
        return killedConnection;
      } else if (
        bufferEqual(
          data.slice(0, bleRspAttclientAttributeWrite.byteLength),
          bleRspAttclientAttributeWrite
        )
      ) {
        const newAttributeWriteRsp = this._bled112RspFindInformationFound(
          data
        );
        if (this.options.verbose)
          console.log(
            `BLED112RspAttclientAttributeWrite: ${JSON.stringify(
              newAttributeWriteRsp
            )}`
          );
        this.emit(
          kOBCIEmitterBLED112RspAttclientAttributeWrite,
          newAttributeWriteRsp
        );
        return newAttributeWriteRsp;
      } else if (
        bufferEqual(
          data.slice(0, bleRspAttclientFindInformationFound.byteLength),
          bleRspAttclientFindInformationFound
        )
      ) {
        const newInformationRsp = this._bled112RspFindInformationFound(
          data
        );
        if (this.options.verbose)
          console.log(
            `BLED112RspAttclientFindInformationFound: ${JSON.stringify(
              newInformationRsp
            )}`
          );
        this.emit(
          kOBCIEmitterBLED112RspAttclientFindInformationFound,
          newInformationRsp
        );
        return newInformationRsp;
      }
    }
  } else if (data[0] === 0x80) {
    if (
      bufferEqual(
        data.slice(0, bleEvtGapScanResponse.byteLength),
        bleEvtGapScanResponse
      )
    ) {
      const newPeripheral = this._bled112DeviceFound(data);
      let peripheralFound = false;
      this.peripheralArray.forEach(peripheral => {
        if (bufferEqual(peripheral.sender, newPeripheral.sender)) {
          peripheral.rssi = newPeripheral.rssi;
          peripheralFound = true;
        }
      });
      if (!peripheralFound) this.peripheralArray.push(newPeripheral);
      if (this.options.verbose)
        console.log(
          `BLED112EvtGapScanResponse: ${JSON.stringify(newPeripheral)}`
        );
      this.emit(kOBCIEmitterBLED112EvtGapScanResponse, newPeripheral);
      if (newPeripheral.advertisementDataString.match(/Ganglion/)) {
        // if (this.options.verbose) console.log(`Ganglion Found: ${JSON.stringify(newPeripheral)}`);
        this.emit(k.OBCIEmitterGanglionFound, newPeripheral);
      }
      return newPeripheral;
    } else if (
      bufferEqual(
        data.slice(0, bleEvtConnectionDisconnected.byteLength),
        bleEvtConnectionDisconnected
      )
    ) {
      const newConnectionDisconnect = this._bled112ConnectionDisconnected(
        data
      );
      if (this.options.verbose)
        console.log(
          `BLED112EvtConnectionDisconnect: ${JSON.stringify(
            newConnectionDisconnect
          )}`
        );
      this.emit(
        kOBCIEmitterBLED112EvtConnectionDisconnected,
        newConnectionDisconnect
      );
      return newConnectionDisconnect;
    } else if (
      bufferEqual(
        data.slice(0, bleEvtConnectionStatus.byteLength),
        bleEvtConnectionStatus
      )
    ) {
      const newConnection = this._bled112ConnectionMade(data);
      if (this.options.verbose)
        console.log(
          `BLED112EvtConnectionStatus: ${JSON.stringify(newConnection)}`
        );
      this.emit(kOBCIEmitterBLED112EvtConnectionStatus, newConnection);
      return newConnection;
    } else if (
      bufferEqual(
        data.slice(
          0,
          bleEvtAttclientFindInformationFoundShort.byteLength
        ),
        bleEvtAttclientFindInformationFoundShort
      )
    ) {
      const newInformation = this._bled112FindInformationFound(data);
      if (this.options.verbose)
        console.log(
          `BLED112EvtAttclientFindInformationFoundShort: ${JSON.stringify(
            newInformation
          )}`
        );
      this.emit(
        kOBCIEmitterBLED112EvtAttclientFindInformationFound,
        newInformation
      );
      return newInformation;
    } else if (
      bufferEqual(
        data.slice(
          0,
          bleEvtAttclientFindInformationFoundLong.byteLength
        ),
        bleEvtAttclientFindInformationFoundLong
      )
    ) {
      const newInformation = this._bled112FindInformationFound(data);
      if (this.options.verbose)
        console.log(
          `BLED112EvtAttclientFindInformationFoundLong: ${JSON.stringify(
            newInformation
          )}`
        );
      this.emit(
        kOBCIEmitterBLED112EvtAttclientFindInformationFound,
        newInformation
      );
      return newInformation;
    } else if (
      bufferEqual(
        data.slice(0, bleEvtAttclientGroupFound.byteLength),
        bleEvtAttclientGroupFound
      )
    ) {
      const newGroup = this._bled112GroupFound(data);
      if (bufferEqual(newGroup.uuid, ganglionUUIDService)) {
        this._bled112Service = newGroup;
        if (this.options.verbose)
          console.log(
            `BLED112EvtAttclientGroupFound: ${JSON.stringify(newGroup)}`
          );
        this.emit(kOBCIEmitterBLED112EvtAttclientGroupFound, newGroup);
        return newGroup;
      }
      if (this.options.verbose)
        console.log(
          `BLED112EvtAttclientGroupFound: ${JSON.stringify(newGroup)}`
        );
      return newGroup;
    } else if (
      bufferEqual(
        data.slice(0, bleEvtAttclientProcedureCompleted.byteLength),
        bleEvtAttclientProcedureCompleted
      )
    ) {
      if (this.options.verbose)
        console.log("BLED112EvtAttclientProcedureCompleted");
      this.emit(kOBCIEmitterBLED112EvtAttclientProcedureCompleted, {
        result: Buffer.from([data[6], data[5]])
      });
      return data;
    } else if (
      bleEvtAttclientAttributeValue[0] === 0x80 &&
      bleEvtAttclientAttributeValue[2] === 0x04 &&
      bleEvtAttclientAttributeValue[3] === 0x05
    ) {
      const newAttributeValue = this._bled112AttributeValue(data);
      // if (this.options.verbose) console.log(`BLED112EvtAttributeValue: ${JSON.stringify(newAttributeValue)}`);
      return this._processBytes(newAttributeValue.value);
    }
  }
  if (this.options.verbose)
    console.log("Not able to identify the data", data);
  return data;
};

/**
 * @description Consider the '_processBytes' method to be the work horse of this
 *              entire framework. This method gets called any time there is new
 *              data coming in on the serial port. If you are familiar with the
 *              'serialport' package, then every time data is emitted, this function
 *              gets sent the input data. The data comes in very fragmented, sometimes
 *              we get half of a packet, and sometimes we get 3 and 3/4 packets, so
 *              we will need to store what we don't read for next time.
 * @param data - a buffer of unknown size
 * @private
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype._bled112ProcessBytes = function(data) {
  if (this.options.debug) debug.default("<<", data);

  // Concat old buffer
  let oldDataBuffer = null;
  if (this.buffer) {
    oldDataBuffer = this.buffer;
    data = Buffer.concat(
      [this.buffer, data],
      data.length + this.buffer.length
    );
  }

  let out = null;
  let tempOut = null;

  switch (this._bled112ParsingMode) {
    case kOBCIBLED112ParsingConnectDirect:
      out = this._bled112ParseForRaws(
        this._bled112GetParsingConnectDirect(data)
      );
      break;
    case kOBCIBLED112ParsingConnectionStatus:
      out = this._bled112ParseForRaws(
        this._bled112GetParsingConnectionStatus(data)
      );
      break;
    case kOBCIBLED112ParsingDisconnect:
      out = this._bled112ParseForRaws(
        this._bled112GetParsingDisconnect(data)
      );
      break;
    case kOBCIBLED112ParsingDiscover:
      out = this._bled112ParseForRaws(
        this._bled112GetParsingDiscover(data)
      );
      break;
    case kOBCIBLED112ParsingGroup:
      out = this._bled112ParseForRaws(
        this._bled112GetParsingGroup(data)
      );
      if (this._bled112ParseParallelProcedureComplete) {
        tempOut = this._bled112ParseForRaws(
          this._bled112GetParsingProcedureComplete(out.buffer)
        );
        tempOut.raws.forEach(raw => out.raws.push(raw));
        out.buffer = tempOut.buffer;
      }
      break;
    case kOBCIBLED112ParsingFindInfo:
      out = this._bled112ParseForRaws(
        this._bled112GetParsingFindInfoShort(data)
      );
      tempOut = this._bled112ParseForRaws(
        this._bled112GetParsingFindInfoLong(out.buffer)
      );
      tempOut.raws.forEach(raw => out.raws.push(raw));
      out.buffer = tempOut.buffer;
      break;
    case kOBCIBLED112ParsingNormal:
      out = this._bled112ParseForRaws(
        this._bled112GetParsingAttributeValue(data)
      );
      tempOut = this._bled112ParseForRaws(
        this._bled112GetParsingAttributeWrite(out.buffer)
      );
      tempOut.raws.forEach(raw => out.raws.push(raw));
      out.buffer = tempOut.buffer;
      break;
    case kOBCIBLED112ParsingProcedureComplete:
      out = this._bled112ParseForRaws(
        this._bled112GetParsingProcedureComplete(data)
      );
      break;
    default:
      break;
  }
  if (out) {
    out.raws.forEach(raw => {
      this._bled112ProcessRaw(raw);
    });
    this.buffer = out.buffer;
  } else {
    this._bled112ProcessRaw(data);
    this.buffer = null;
  }

  if (this.buffer && oldDataBuffer) {
    if (bufferEqual(this.buffer, oldDataBuffer)) {
      this.buffer = null;
    }
  }
};

/**
 *
 * @param o {BLED112ParseRawHeadTail | BLED112ParseRawWord | BLED112ParseRawAttributeValue} - The options for the parse
 * @return {{buffer: *, raws: Array}}
 * @private
 */
Ganglion.prototype._bled112ParseForRaws = function(o) {
  if (!o.buffer) {
    return {
      buffer: o.buffer,
      raws: []
    };
  }
  let bytesToParse = o.buffer.length;
  let rawScanResponses = [];
  // Exit if we have a buffer with less data than a packet
  if (bytesToParse < o.length) {
    return {
      buffer: o.buffer,
      raws: []
    };
  }

  let parsePosition = 0;
  // Begin parseing
  while (parsePosition <= bytesToParse - o.length) {
    let rawFound = false;
    if (o.hasOwnProperty("head")) {
      // Is the current byte a head byte
      if (o.buffer[parsePosition] === o.head) {
        // Now that we know the first is a head byte
        if (o.buffer[parsePosition + o.length - 1] === o.tail) {
          rawFound = true;
        }
      }
    } else if (o.hasOwnProperty("ignore")) {
      if (
        o.buffer[parsePosition] === 0x80 &&
        o.buffer[parsePosition + 2] === 0x04 &&
        o.buffer[parsePosition + 3] === 0x05
      ) {
        if (
          o.buffer[parsePosition + o.verify.position] -
            o.verify.difference ===
          o.buffer[parsePosition + o.verify.comparePosition]
        ) {
          const newLength =
            o.buffer[parsePosition + o.lengthPosition] +
            o.lengthPosition +
            1;
          if (parsePosition <= bytesToParse - newLength) {
            o.length = newLength;
            rawFound = true;
          }
        }
      }
    } else {
      // is the current front equal to the word
      if (
        bufferEqual(
          o.word,
          Buffer.from(
            o.buffer.slice(
              parsePosition,
              parsePosition + o.word.byteLength
            )
          )
        )
      ) {
        if (o.hasOwnProperty("verify")) {
          if (
            o.buffer[parsePosition + o.verify.position] ===
            o.verify.value
          ) {
            rawFound = true;
          }
        } else {
          rawFound = true;
        }
      }
    }
    if (rawFound) {
      // Grab the raw packet, make a copy of it.
      let rawPacket = Buffer.from(
        o.buffer.slice(parsePosition, parsePosition + o.length)
      );

      rawScanResponses.push(rawPacket);
      // Overwrite the o.buffer with a new buffer
      let tempBuf;
      if (parsePosition > 0) {
        tempBuf = Buffer.concat(
          [
            o.buffer.slice(0, parsePosition),
            o.buffer.slice(parsePosition + o.length)
          ],
          o.buffer.byteLength - o.length
        );
      } else {
        tempBuf = o.buffer.slice(o.length);
      }
      if (tempBuf.length === 0) {
        o.buffer = null;
      } else {
        o.buffer = Buffer.from(tempBuf);
      }
      // Move the parse position up one packet
      parsePosition = -1;
      bytesToParse -= o.length;
      if (o.hasOwnProperty("ignore")) {
        o.length = 10;
      }
    }
    parsePosition++;
  }
  return {
    buffer: o.buffer,
    raws: rawScanResponses
  };
};

Ganglion.prototype._bled112Ready = function() {
  return this._bled112Connected;
};

/**
 * Parses a raw data response from ATT call to attribute write
 * @param data
 * @returns {BLED112GapConnectDirect}
 * @private
 */
Ganglion.prototype._bled112RspAttributeWrite = function(data) {
  return {
    connection: data[4],
    result: Buffer.from([data[6], data[5]])
  };
};

/**
 * Parses a raw data response from ATT call to find information about a service
 * @param data
 * @returns {BLED112GapConnectDirect}
 * @private
 */
Ganglion.prototype._bled112RspFindInformationFound = function(data) {
  return {
    connection: data[4],
    result: Buffer.from([data[6], data[5]])
  };
};

/**
 * Parse the response from group type
 * @param data {Buffer}
 * @returns {BLED112RspGroupType}
 * @private
 */
Ganglion.prototype._bled112RspGroupType = function(data) {
  return {
    connection: data[4],
    result: Buffer.from([data[6], data[5]])
  };
};

/**
 * Call to perform a scan to get a list of peripherals.
 * @returns {global.Promise|Promise}
 * @private
 */
Ganglion.prototype._bled112ScanStart = function() {
  return new Promise((resolve, reject) => {
    if (this.isSearching()) return reject(Error("Scan already started"));

    this.peripheralArray = [];
    this._scanning = true;
    this._bled112WriteAndDrain(this._bled112GetDiscover())
      .then(() => {
        this._bled112ParseForDiscover();
        resolve();
      })
      .catch(err => {
        reject(err);
      });
  });
};

/**
 * Stop an active scan
 * @return {global.Promise|Promise}
 * @private
 */
Ganglion.prototype._bled112ScanStop = function() {
  if (!this.isSearching())
    return Promise.reject(k.OBCIErrorNobleNotAlreadyScanning);
  if (this.options.verbose) console.log(`Stopping scan`);
  this._scanning = false;
  return this._bled112WriteAndDrain(
    new Buffer([0x00, 0x00, 0x06, 0x04])
  );
};

/**
 * @description Should be used to send data to the board
 * @param data {Buffer | Buffer2} - The data to write out
 * @returns {Promise} if signal was able to be sent
 * @author AJ Keller (@pushtheworldllc)
 */
Ganglion.prototype._bled112WriteAndDrain = function(data) {
  if (this.options.debug) debug.default(">>>", data);

  return new Promise((resolve, reject) => {
    if (!this._bled112Connected)
      return reject(Error("Serial port not open"));
    this.serial.write(data, error => {
      if (error) {
        console.log("Error [writeAndDrain]: " + error);
        reject(error);
      } else {
        this.serial.drain(() => {
          resolve();
        });
      }
    });
  });
};

module.exports = Ganglion;
