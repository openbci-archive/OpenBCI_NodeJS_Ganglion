'use strict';
// const bluebirdChecks = require('./bluebirdChecks');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const should = chai.should(); // eslint-disable-line no-unused-vars
const Ganglion = require('../openBCIGanglion');
const k = require('openbci-utilities/dist/constants');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
// const bufferEqual = require('buffer-equal');
// const obciUtils = require('openbci-utilities/dist/utilities');
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
    verbose: false
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
      const rawBuf = new Buffer([0x80, 0x1A, 0x06, 0x00, 0xCD, 0x00, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0xFF, 0x0F, 0x0E, 0x09, 0x47, 0x61, 0x6E, 0x67, 0x6C, 0x69, 0x6F, 0x6E, 0x2D, 0x35, 0x34, 0x63, 0x61]);

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
  describe('#_bled112ConnectionDisconnected', function () {
    it('should get connection number and result', function () {
      const rawBuf = Buffer.from([0x80, 0x03, 0x03, 0x04, 0x00, 0x08, 0x02]);

      const expectedConnection = 0;
      const expectedReason = 'Link supervision timeout has expired.';
      const expectedReasonRaw = Buffer.from([0x02, 0x08]);

      const expectedOutput = {
        connection: expectedConnection,
        reason: expectedReason,
        reasonRaw: expectedReasonRaw
      };

      const actualOutput = ganglion._bled112ConnectionDisconnected(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
  describe('#_bled112ConnectionMade', function () {
    it('should be able to parse for data', function () {
      const rawBuf = Buffer.from([0x80, 0x10, 0x03, 0x00, 0x01, 0x05, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0x3C, 0x00, 0x64, 0x00, 0x00, 0x00, 0xFF]);

      const expectedConnection = 1;
      const expectedFlags = 5;
      const expectedAddressType = 1;
      const expectedConnectionInterval = 60;
      const expectedTimeout = 100;
      const expectedLatency = 0;
      const expectedBonding = 255;
      const expectedSender = Buffer.from([0xE9, 0x53, 0x00, 0xCE, 0x66, 0xD9]);

      const expectedOutput = {
        addressType: expectedAddressType,
        bonding: expectedBonding,
        connection: expectedConnection,
        connectionInterval: expectedConnectionInterval,
        flags: expectedFlags,
        latency: expectedLatency,
        sender: expectedSender,
        timeout: expectedTimeout
      };

      const actualOutput = ganglion._bled112ConnectionMade(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
  describe('#_bled112FindInformationFound', function () {
    it('should be able to get the handle and uuid from raw data', function () {
      const rawBuf = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x1A, 0x00, 0x02, 0x02, 0x29]);

      const expectedCharacteristicHandle = 26;
      const expectedCharacteristicHandleRaw = Buffer.from([0x00, 0x1A]);
      const expectedConnection = 1;
      const expectedUUID = Buffer.from([0x29, 0x02]);

      const expectedOutput = {
        characteristicHandle: expectedCharacteristicHandle,
        characteristicHandleRaw: expectedCharacteristicHandleRaw,
        connection: expectedConnection,
        uuid: expectedUUID
      };

      const actualOutput = ganglion._bled112FindInformationFound(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
  describe('#_bled112ConnectDirect', function () {
    it('should be able to get the connection result connection handle', function () {
      const rawBuf = Buffer.from([0x00, 0x03, 0x06, 0x03, 0x00, 0x00, 0x01]);

      const expectedConnection = 1;
      const expectedResult = Buffer.from([0x00, 0x00]);

      const expectedOutput = {
        connection: expectedConnection,
        result: expectedResult
      };

      const actualOutput = ganglion._bled112ConnectDirect(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
  describe('#_bled112GroupFound', function () {
    it('should be able to get the connection result connection handle', function () {
      const rawBuf = Buffer.from([0x80, 0x08, 0x04, 0x02, 0x00, 0x17, 0x00, 0x1E, 0x00, 0x02, 0x84, 0xFE]);

      const expectedConnection = 0;
      const expectedEnd = 30;
      const expectedEndRaw = Buffer.from([0x00, 0x1E]);
      const expectedStart = 23;
      const expectedStartRaw = Buffer.from([0x00, 0x17]);
      const expectedUUID = Buffer.from([0xFE, 0x84]);

      const expectedOutput = {
        connection: expectedConnection,
        end: expectedEnd,
        endRaw: expectedEndRaw,
        start: expectedStart,
        startRaw: expectedStartRaw,
        uuid: expectedUUID
      };

      const actualOutput = ganglion._bled112GroupFound(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
  describe('#_bled112GetFindInformation', function () {
    it('should be able to set connection, start and end', function () {
      const expectedOutput = Buffer.from([0x00, 0x05, 0x04, 0x03, 0x00, 0x17, 0x00, 0x1E, 0x00]);

      const expectedConnection = 0;
      const expectedEnd = 30;
      const expectedEndRaw = Buffer.from([0x00, 0x1E]);
      const expectedStart = 23;
      const expectedStartRaw = Buffer.from([0x00, 0x17]);
      const expectedUUID = Buffer.from([0xFE, 0x84]);

      const groupService = {
        connection: expectedConnection,
        end: expectedEnd,
        endRaw: expectedEndRaw,
        start: expectedStart,
        startRaw: expectedStartRaw,
        uuid: expectedUUID
      };

      const actualOutput = ganglion._bled112GetFindInformation(groupService);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
  describe('#_bled112GetConnectDirect', function () {
    it('should get the connect direct response', function () {
      const expectedOutput = Buffer.from([0x00, 0x0F, 0x06, 0x03, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0x3C, 0x00, 0x4C, 0x00, 0x64, 0x00, 0x00, 0x00]);

      const expectedConnection = 1;
      const expectedFlags = 5;
      const expectedAddressType = 1;
      const expectedConnectionInterval = 60;
      const expectedTimeout = 100;
      const expectedLatency = 0;
      const expectedBonding = 255;
      const expectedSender = Buffer.from([0xE9, 0x53, 0x00, 0xCE, 0x66, 0xD9]);

      const bledConnection = {
        addressType: expectedAddressType,
        bonding: expectedBonding,
        connection: expectedConnection,
        connectionInterval: expectedConnectionInterval,
        flags: expectedFlags,
        latency: expectedLatency,
        sender: expectedSender,
        timeout: expectedTimeout
      };

      const actualOutput = ganglion._bled112GetConnectDirect(bledConnection);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
  describe('#_bled112ProcessBytes', function () {
    afterEach(function () {
      ganglion.bled112CleanupEmitters();
    });
    // 'bleEvtConnectionStatus'
    // 'bleEvtAttclientFindInformationFound'
    // 'bleEvtAttclientGroupFound'
    // 'bleEvtAttclientProcedureCompleted'
    // 'bleEvtGapScanResponse'
    // 'bleRspAttclientReadByGroupType'
    // 'bleRspGapDiscoverError'
    // 'bleRspGapDiscoverNoError'
    // 'bleRspGapConnectDirect'
    describe('BLED112EvtAttclientProcedureCompleted', function () {
      const rawBuf = Buffer.from([0x80, 0x05, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);
      it('emit', function (done) {
        ganglion.once('bleEvtAttclientProcedureCompleted', () => {
          done();
        });
        ganglion._bled112ProcessBytes(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessBytes(rawBuf);
        expect(retVal).to.not.equal(null);
      });
    });
    describe('BLED112RspAttclientReadByGroupType', function () {
      const rawBuf = Buffer.from([0x00, 0x03, 0x04, 0x01, 0x02, 0x00, 0x00]);
      it('emit', function (done) {
        ganglion.once('bleRspAttclientReadByGroupType', () => {
          done();
        });
        ganglion._bled112ProcessBytes(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessBytes(rawBuf);
        expect(retVal).to.not.equal(null);
      });
    });
    describe('BLED112EvtConnectionStatus', function () {
      const rawBuf = Buffer.from([0x80, 0x10, 0x03, 0x00, 0x01, 0x05, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0x3C, 0x00, 0x64, 0x00, 0x00, 0x00, 0xFF]);
      const fooBar = {'foo': 'bar'};
      let funcStub;
      before(() => {
        funcStub = sinon.stub(ganglion, '_bled112ConnectionMade');
        funcStub.returns(fooBar);
      });
      after(() => {
        funcStub.reset();
      });
      it('emit', function (done) {
        ganglion.once('bleEvtConnectionStatus', (obj) => {
          expect(obj).to.deep.equal(fooBar);
          done();
        });
        ganglion._bled112ProcessBytes(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessBytes(rawBuf);
        expect(retVal).to.equal(fooBar);
      });
    });
    describe('BLED112EvtConnectionDisconnected', function () {
      const rawBuf = Buffer.from([0x80, 0x03, 0x03, 0x04, 0x00, 0x08, 0x02]);
      const fooBar = {'foo': 'bar'};
      let funcStub;
      before(() => {
        funcStub = sinon.stub(ganglion, '_bled112ConnectionDisconnected');
        funcStub.returns(fooBar);
      });
      after(() => {
        funcStub.reset();
      });
      it('emit', function (done) {
        ganglion.once('bleEvtConnectionDisconnected', (obj) => {
          expect(obj).to.deep.equal(fooBar);
          done();
        });
        ganglion._bled112ProcessBytes(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessBytes(rawBuf);
        expect(retVal).to.equal(fooBar);
      });
    });
    describe('BLED112EvtGapScanResponse', function () {
      const rawBuf = new Buffer([0x80, 0x1A, 0x06, 0x00, 0xCD, 0x00, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0xFF, 0x0F, 0x0E, 0x09, 0x47, 0x61, 0x6E, 0x67, 0x6C, 0x69, 0x6F, 0x6E, 0x2D, 0x35, 0x34, 0x63, 0x61]);
      const mockPeripheral11 = {'rssi': -50, 'sender': Buffer.from([0, 1, 2, 3, 4, 5])};
      const mockPeripheral12 = {'rssi': -51, 'sender': Buffer.from([0, 1, 2, 3, 4, 5])};
      const mockPeripheral2 = {'rssi': -60, 'sender': Buffer.from([6, 7, 8, 9, 10, 11])};
      let funcStub;
      before(() => {
        funcStub = sinon.stub(ganglion, '_bled112DeviceFound');
      });
      beforeEach(() => {
        ganglion.peripheralArray = [];
        funcStub.returns(mockPeripheral11);
      });
      after(() => {
        funcStub.reset();
      });
      it('emit', function (done) {
        ganglion.once('bleEvtGapScanResponse', (obj) => {
          expect(obj).to.deep.equal(mockPeripheral11);
          done();
        });
        ganglion._bled112ProcessBytes(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessBytes(rawBuf);
        expect(retVal).to.equal(mockPeripheral11);
        expect(ganglion.peripheralArray[0]).to.deep.equal(mockPeripheral11);
        funcStub.returns(mockPeripheral12);
        ganglion._bled112ProcessBytes(rawBuf);
        expect(ganglion.peripheralArray[0]).to.deep.equal(mockPeripheral12);
        funcStub.returns(mockPeripheral2);
        ganglion._bled112ProcessBytes(rawBuf);
        expect(ganglion.peripheralArray[1]).to.deep.equal(mockPeripheral2);
      });
    });
    describe('BLED112RspGapConnectDirect', function () {
      const rawBuf = Buffer.from([0x00, 0x03, 0x06, 0x03, 0x00, 0x00, 0x01]);
      const fooBar = {'foo': 'bar'};
      let funcStub;
      before(() => {
        funcStub = sinon.stub(ganglion, '_bled112ConnectDirect');
        funcStub.returns(fooBar);
      });
      after(() => {
        funcStub.reset();
      });
      it('emit', function (done) {
        ganglion.once('bleRspGapConnectDirect', (obj) => {
          expect(obj).to.deep.equal(fooBar);
          done();
        });
        ganglion._bled112ProcessBytes(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessBytes(rawBuf);
        expect(retVal).to.equal(fooBar);
      });
    });
    describe('BLED112EvtAttclientFindInformationFound', function () {
      const rawBuf = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x1A, 0x00, 0x02, 0x02, 0x29]);
      const fooBar = {'foo': 'bar'};
      let funcStub;
      before(() => {
        funcStub = sinon.stub(ganglion, '_bled112FindInformationFound');
        funcStub.returns(fooBar);
      });
      after(() => {
        funcStub.reset();
      });
      it('emit', function (done) {
        ganglion.once('bleEvtAttclientFindInformationFound', (obj) => {
          expect(obj).to.deep.equal(fooBar);
          done();
        });
        ganglion._bled112ProcessBytes(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessBytes(rawBuf);
        expect(retVal).to.equal(fooBar);
      });
    });
    describe('BLED112EvtAttclientGroupFound', function () {
      const rawBuf = Buffer.from([0x80, 0x08, 0x04, 0x02, 0x00, 0x17, 0x00, 0x1E, 0x00, 0x02, 0x84, 0xFE]);
      const fooBar = {'uuid': Buffer.from([0xFE, 0x84])};
      let funcStub;
      before(() => {
        funcStub = sinon.stub(ganglion, '_bled112GroupFound');
        funcStub.returns(fooBar);
      });
      after(() => {
        funcStub.reset();
      });
      it('emit', function (done) {
        ganglion.once('bleEvtAttclientGroupFound', (obj) => {
          expect(obj).to.deep.equal(fooBar);
          done();
        });
        ganglion._bled112ProcessBytes(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessBytes(rawBuf);
        expect(retVal).to.equal(fooBar);
      });
    });
  });
  describe('#_bled112RspGroupType', function () {
    it('should be able to get the connection result connection handle', function () {
      const rawBuf = Buffer.from([0x00, 0x03, 0x06, 0x03, 0x01, 0x00, 0x00]);

      const expectedConnection = 1;
      const expectedResult = Buffer.from([0x00, 0x00]);

      const expectedOutput = {
        connection: expectedConnection,
        result: expectedResult
      };

      const actualOutput = ganglion._bled112RspGroupType(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
});
