'use strict';
// const bluebirdChecks = require('./bluebirdChecks');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const should = chai.should(); // eslint-disable-line no-unused-vars
const Ganglion = require('../../openBCIGanglion');
const k = require('openbci-utilities/dist/constants');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const bufferEqual = require('buffer-equal');
const obciUtils = require('openbci-utilities/dist/utilities');
const clone = require('clone');


chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('#ganglion-constructor', function () {
  it('should callback if only callback used', function (done) {
    const cb = (err) => {
      done(err);
    };
    const ganglionCB = new Ganglion(cb);
    expect(ganglionCB).to.exist();
  });
  it('should callback if options and callback', function (done) {
    const cb = (err) => {
      done(err);
    };
    const ganglionCB = new Ganglion({}, cb);
    expect(ganglionCB).to.exist();
  });
});

describe('#ganglion', function () {
  const mockProperties = {
    bled112: false,
    debug: false,
    nobleAutoStart: false,
    nobleScanOnPowerOn: false,
    sendCounts: false,
    simulate: false,
    simulatorBoardFailure: false,
    simulatorHasAccelerometer: true,
    simulatorInternalClockDrift: 0,
    simulatorInjectAlpha: true,
    simulatorInjectLineNoise: k.OBCISimulatorLineNoiseHz60,
    simulatorSampleRate: 200,
    verbose: false,
  };
  const expectedProperties = clone(mockProperties);
  const ganglion = new Ganglion(mockProperties);
  it('should have properties', function () {
    expect(ganglion.options).to.deep.equal(expectedProperties);
  });
  it('should return 4 channels', function () {
    expect(ganglion.numberOfChannels()).to.equal(4);
  });
  describe('#_bled112DeviceFound', function () {
    it('should be able to parse for data', function () {
      const rawBuf = new Buffer([0x80, 0x1A, 0x06, 0x00, 0xCD, 0x00, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0xFF, 0x0F, 0x0E, 0x09, 0x47, 0x61, 0x6E, 0x67, 0x6C, 0x69, 0x6F, 0x6E, 0x2D, 0x35, 0x34, 0x63, 0x61])

      const expectedAddressType = 1;
      const expectedAdvertiseDataString = 'Ganglion-54ca';
      const expectedAdvertiseDataRaw = new Buffer([0x0E, 0x09, 0x47, 0x61, 0x6E, 0x67, 0x6C, 0x69, 0x6F, 0x6E, 0x2D, 0x35, 0x34, 0x63, 0x61]);
      const expectedBond = 255;
      const expectedPacketType = 0;
      const expectedRSSI = -51;
      const expectedSender = new Buffer([0xE9, 0x53, 0x00, 0xCE, 0x66, 0xD9]);

      const expectedOutput = {
        addressType: expectedAddressType,
        advertisementDataString: expectedAdvertiseDataString,
        advertisementDataRaw: expectedAdvertiseDataRaw,
        bond: expectedBond,
        packetType: expectedPacketType,
        rssi: expectedRSSI,
        sender: expectedSender
      };

      const actualOutput = ganglion._bled112DeviceFound(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
  describe('#_bled112ConnectionMade', function () {
    it('should be able to parse for data', function () {
      const rawBuf = new Buffer([0x80, 0x10, 0x03, 0x00, 0x01, 0x05, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0x3C, 0x00, 0x64, 0x00, 0x00, 0x00, 0xFF]);

      const expectedConnection = 1;
      const expectedAddressType = 1;
      const expectedAdvertiseDataString = 'Ganglion-54ca';
      const expectedAdvertiseDataRaw = new Buffer([0x0E, 0x09, 0x47, 0x61, 0x6E, 0x67, 0x6C, 0x69, 0x6F, 0x6E, 0x2D, 0x35, 0x34, 0x63, 0x61]);
      const expectedBond = 255;
      const expectedPacketType = 0;
      const expectedRSSI = -51;
      const expectedSender = new Buffer([0xE9, 0x53, 0x00, 0xCE, 0x66, 0xD9]);

      const expectedOutput = {
        addressType: expectedAddressType,
        advertisementDataString: expectedAdvertiseDataString,
        advertisementDataRaw: expectedAdvertiseDataRaw,
        bond: expectedBond,
        packetType: expectedPacketType,
        rssi: expectedRSSI,
        sender: expectedSender
      };

      const actualOutput = ganglion._bled112DeviceFound(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
});
