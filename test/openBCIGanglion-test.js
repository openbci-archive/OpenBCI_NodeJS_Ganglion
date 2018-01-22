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
  describe('#_bled112Connect', function () {
    // Connect to device

    // Make writeable

  });
  describe('#_bled112AttributeValue', function () {
    it('should be able to get the connection, atthandle type and value for data', function () {
      const rawBuf = Buffer.from([0x80, 0x19, 0x04, 0x05, 0x00, 0x19, 0x00, 0x01, 0x14, 0x6A, 0x00, 0x97, 0xC0, 0x2A, 0x30, 0x01, 0x38, 0x01, 0x59, 0x60, 0x17, 0x64, 0x03, 0x83, 0x00, 0x78, 0x30, 0x02, 0xB2]);

      const expectedConnection = 0;
      const expectedCharacteristicHandle = 25;
      const expectedCharacteristicHandleRaw = Buffer.from([0x00, 0x19]);
      const expectedType = 1;
      const expectedValue = Buffer.from([0x6A, 0x00, 0x97, 0xC0, 0x2A, 0x30, 0x01, 0x38, 0x01, 0x59, 0x60, 0x17, 0x64, 0x03, 0x83, 0x00, 0x78, 0x30, 0x02, 0xB2]);

      const expectedOutput = {
        characteristicHandle: expectedCharacteristicHandle,
        characteristicHandleRaw: expectedCharacteristicHandleRaw,
        connection: expectedConnection,
        type: expectedType,
        value: expectedValue
      };

      const actualOutput = ganglion._bled112AttributeValue(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
    it('should be able to get the connection, atthandle type and value for impedance', function () {
      const rawBuf = Buffer.from([0x80, 0x0B, 0x04, 0x05, 0x00, 0x19, 0x00, 0x01, 0x06, 0xCA, 0x31, 0x32, 0x30, 0x37, 0x5A]);

      const expectedConnection = 0;
      const expectedCharacteristicHandle = 25;
      const expectedCharacteristicHandleRaw = Buffer.from([0x00, 0x19]);
      const expectedType = 1;
      const expectedValue = Buffer.from([0xCA, 0x31, 0x32, 0x30, 0x37, 0x5A]);

      const expectedOutput = {
        characteristicHandle: expectedCharacteristicHandle,
        characteristicHandleRaw: expectedCharacteristicHandleRaw,
        connection: expectedConnection,
        type: expectedType,
        value: expectedValue
      };

      const actualOutput = ganglion._bled112AttributeValue(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
    it('should be able to get the connection, atthandle type and value multi packet message', function () {
      const rawBuf = Buffer.from([0x80, 0x19, 0x04, 0x05, 0x00, 0x19, 0x00, 0x01, 0x14, 0xce, 0x44, 0x65, 0x61, 0x63, 0x74, 0x69, 0x76, 0x61, 0x74, 0x69, 0x6E, 0x67, 0x20, 0x63, 0x68, 0x61, 0x6E, 0x6E, 0x65]);

      const expectedConnection = 0;
      const expectedCharacteristicHandle = 25;
      const expectedCharacteristicHandleRaw = Buffer.from([0x00, 0x19]);
      const expectedType = 1;
      const expectedValue = Buffer.from([0xCE, 0x44, 0x65, 0x61, 0x63, 0x74, 0x69, 0x76, 0x61, 0x74, 0x69, 0x6E, 0x67, 0x20, 0x63, 0x68, 0x61, 0x6E, 0x6E, 0x65]);

      const expectedOutput = {
        characteristicHandle: expectedCharacteristicHandle,
        characteristicHandleRaw: expectedCharacteristicHandleRaw,
        connection: expectedConnection,
        type: expectedType,
        value: expectedValue
      };

      const actualOutput = ganglion._bled112AttributeValue(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
    it('should be able to get the connection, atthandle type and value for multi packet message end', function () {
      const rawBuf = Buffer.from([0x80, 0x0A, 0x04, 0x05, 0x00, 0x19, 0x00, 0x01, 0x05, 0xCF, 0x6C, 0x20, 0x32, 0x0A]);

      const expectedConnection = 0;
      const expectedCharacteristicHandle = 25;
      const expectedCharacteristicHandleRaw = Buffer.from([0x00, 0x19]);
      const expectedType = 1;
      const expectedValue = Buffer.from([0xCF, 0x6C, 0x20, 0x32, 0x0A]);

      const expectedOutput = {
        characteristicHandle: expectedCharacteristicHandle,
        characteristicHandleRaw: expectedCharacteristicHandleRaw,
        connection: expectedConnection,
        type: expectedType,
        value: expectedValue
      };

      const actualOutput = ganglion._bled112AttributeValue(rawBuf);

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
  describe('#_bled112FindInformationFound', function () {
    it('should be able to get the handle and uuid from raw data with short uuid', function () {
      const rawBuf = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x1A, 0x00, 0x02, 0x02, 0x29]);

      const expectedCharacteristicHandle = 26;
      const expectedCharacteristicHandleRaw = Buffer.from([0x00, 0x1A]);
      const expectedConnection = 1;
      const expectedUUIDLength = rawBuf[7];
      const expectedUUID = Buffer.from([0x29, 0x02]);

      const expectedOutput = {
        characteristicHandle: expectedCharacteristicHandle,
        characteristicHandleRaw: expectedCharacteristicHandleRaw,
        connection: expectedConnection,
        uuidLength: expectedUUIDLength,
        uuid: expectedUUID
      };

      const actualOutput = ganglion._bled112FindInformationFound(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
    it('should be able to get the handle and uuid from raw data with big uuid', function () {
      const rawBuf = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x19, 0x00, 0x10, 0x96, 0x05, 0x48, 0xEA, 0x84, 0x34, 0x3F, 0x92, 0xE6, 0x4C, 0x9F, 0xF3, 0x82, 0xC0, 0x30, 0x2D]);

      const expectedCharacteristicHandle = 25;
      const expectedCharacteristicHandleRaw = Buffer.from([0x00, 0x19]);
      const expectedConnection = 1;
      const expectedUUIDLength = rawBuf[7];
      const expectedUUID = Buffer.from([0x2D, 0x30, 0xC0, 0x82, 0xF3, 0x9F, 0x4C, 0xE6, 0x92, 0x3F, 0x34, 0x84, 0xEA, 0x48, 0x05, 0x96]);

      const expectedOutput = {
        characteristicHandle: expectedCharacteristicHandle,
        characteristicHandleRaw: expectedCharacteristicHandleRaw,
        connection: expectedConnection,
        uuidLength: expectedUUIDLength,
        uuid: expectedUUID
      };

      const actualOutput = ganglion._bled112FindInformationFound(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
  describe('#_bled112GetAttributeWrite', function () {
    it('should get the attribute write packet with buffer', function () {
      const expectedOutput = Buffer.from([0x00, 0x05, 0x04, 0x05, 0x00, 0x1A, 0x00, 0x02, 0x01, 0x00]);

      const expectedConnection = 0;
      const expectedCharacteristicHandleRaw = Buffer.from([0x00, 0x1A]);
      const expectedValue = Buffer.from([0x01, 0x00]);

      const bledAttributeWrite = {
        connection: expectedConnection,
        characteristicHandleRaw: expectedCharacteristicHandleRaw,
        value: expectedValue
      };

      const actualOutput = ganglion._bled112GetAttributeWrite(bledAttributeWrite);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
    it('should get the attribute write packet with a char', function () {
      const expectedOutput = Buffer.from([0x00, 0x05, 0x04, 0x05, 0x00, 0x1A, 0x00, 0x01, 0x62]);

      const expectedConnection = 0;
      const expectedCharacteristicHandleRaw = Buffer.from([0x00, 0x1A]);
      const expectedValue = 'b';

      const bledAttributeWrite = {
        connection: expectedConnection,
        characteristicHandleRaw: expectedCharacteristicHandleRaw,
        value: expectedValue
      };

      const actualOutput = ganglion._bled112GetAttributeWrite(bledAttributeWrite);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
    it('should get the attribute write packet with string', function () {
      const expectedOutput = Buffer.from([0x00, 0x05, 0x04, 0x05, 0x00, 0x1A, 0x00, 0x02, 0x61, 0x6A]);

      const expectedConnection = 0;
      const expectedCharacteristicHandleRaw = Buffer.from([0x00, 0x1A]);
      const expectedValue = 'aj';

      const bledAttributeWrite = {
        connection: expectedConnection,
        characteristicHandleRaw: expectedCharacteristicHandleRaw,
        value: expectedValue
      };

      const actualOutput = ganglion._bled112GetAttributeWrite(bledAttributeWrite);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
  describe('#_bled112GetConnectDirect', function () {
    it('should get the connect direct packet', function () {
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
  describe('#_bled112GetReadByGroupType', function () {
    it('should be able to set connection and uuid', function () {
      const expectedOutput = Buffer.from([0x00, 0x08, 0x04, 0x01, 0x00, 0x01, 0x00, 0xFF, 0xFF, 0x02, 0x00, 0x28]);

      const expectedConnection = 0;

      const p = {
        connection: expectedConnection
      };

      const actualOutput = ganglion._bled112GetReadByGroupType(p);

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
  describe('#_bled112ProcessRaw', function () {
    afterEach(function () {
      ganglion.bled112CleanupEmitters();
    });
    describe('BLED112EvtAttclientProcedureCompleted', function () {
      const rawBuf = Buffer.from([0x80, 0x05, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);
      it('emit', function (done) {
        ganglion.once('bleEvtAttclientProcedureCompleted', () => {
          done();
        });
        ganglion._bled112ProcessRaw(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessRaw(rawBuf);
        expect(retVal).to.not.equal(null);
      });
    });
    describe('BLED112RspAttclientAttributeWrite', function () {
      const rawBuf = Buffer.from([0x00, 0x03, 0x04, 0x05, 0x02, 0x00, 0x00]);
      it('emit', function (done) {
        ganglion.once('bleRspAttclientAttributeWrite', () => {
          done();
        });
        ganglion._bled112ProcessRaw(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessRaw(rawBuf);
        expect(retVal).to.not.equal(null);
      });
    });
    describe('BLED112RspAttclientFindInfomationFound', function () {
      const rawBuf = Buffer.from([0x00, 0x03, 0x04, 0x03, 0x02, 0x00, 0x00]);
      it('emit', function (done) {
        ganglion.once('bleRspAttclientFindInfomationFound', () => {
          done();
        });
        ganglion._bled112ProcessRaw(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessRaw(rawBuf);
        expect(retVal).to.not.equal(null);
      });
    });
    describe('BLED112RspAttclientReadByGroupType', function () {
      const rawBuf = Buffer.from([0x00, 0x03, 0x04, 0x01, 0x02, 0x00, 0x00]);
      it('emit', function (done) {
        ganglion.once('bleRspAttclientReadByGroupType', () => {
          done();
        });
        ganglion._bled112ProcessRaw(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessRaw(rawBuf);
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
        ganglion._bled112ProcessRaw(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessRaw(rawBuf);
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
        ganglion._bled112ProcessRaw(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessRaw(rawBuf);
        expect(retVal).to.equal(fooBar);
      });
    });
    describe('BLED112EvtGapScanResponse', function () {
      const rawBuf = new Buffer([0x80, 0x1A, 0x06, 0x00, 0xCD, 0x00, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0xFF, 0x0F, 0x0E, 0x09, 0x47, 0x61, 0x6E, 0x67, 0x6C, 0x69, 0x6F, 0x6E, 0x2D, 0x35, 0x34, 0x63, 0x61]);
      const mockPeripheral11 = {'rssi': -50, 'advertisementDataString': 'Ganglion-23ca','sender': Buffer.from([0, 1, 2, 3, 4, 5])};
      const mockPeripheral12 = {'rssi': -51, 'advertisementDataString': 'Ganglion-23ca','sender': Buffer.from([0, 1, 2, 3, 4, 5])};
      const mockPeripheral2 = {'rssi': -60, 'advertisementDataString': 'Ganglion-23cb','sender': Buffer.from([6, 7, 8, 9, 10, 11])};
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
      it('emit bleEvtGapScanResponse', function (done) {
        ganglion.once('bleEvtGapScanResponse', (obj) => {
          expect(obj).to.deep.equal(mockPeripheral11);
          done();
        });
        ganglion._bled112ProcessRaw(rawBuf);
      });
      it('emit ganglionFound', function (done) {
        ganglion.once('ganglionFound', (obj) => {
          expect(obj).to.deep.equal(mockPeripheral11);
          done();
        });
        ganglion._bled112ProcessRaw(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessRaw(rawBuf);
        expect(retVal).to.equal(mockPeripheral11);
        expect(ganglion.peripheralArray[0]).to.deep.equal(mockPeripheral11);
        funcStub.returns(mockPeripheral12);
        ganglion._bled112ProcessRaw(rawBuf);
        expect(ganglion.peripheralArray[0]).to.deep.equal(mockPeripheral12);
        funcStub.returns(mockPeripheral2);
        ganglion._bled112ProcessRaw(rawBuf);
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
        ganglion._bled112ProcessRaw(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessRaw(rawBuf);
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
        ganglion._bled112ProcessRaw(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessRaw(rawBuf);
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
        ganglion._bled112ProcessRaw(rawBuf);
      });
      it('returns', function () {
        const retVal = ganglion._bled112ProcessRaw(rawBuf);
        expect(retVal).to.equal(fooBar);
      });
    });
  });
  describe('#_bled112ParseForRaws', function () {
    it('should be able to extract attribute values when only thing in input data', function () {
      let expectedScanResponse = Buffer.from([0x80, 0x0A, 0x04, 0x05, 0x00, 0x19, 0x00, 0x01, 0x05, 0xCF, 0x6C, 0x20, 0x32, 0x0A]);

      let inputObj = ganglion._bled112GetParsingAttributeValue(expectedScanResponse);
      let actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(expectedScanResponse);
      expect(actualOutput.raws.length).to.equal(1);
      expect(actualOutput.buffer).to.equal(null);

      // Another one
      expectedScanResponse = Buffer.from([0x80, 0x19, 0x04, 0x05, 0x00, 0x19, 0x00, 0x01, 0x14, 0xce, 0x44, 0x65, 0x61, 0x63, 0x74, 0x69, 0x76, 0x61, 0x74, 0x69, 0x6E, 0x67, 0x20, 0x63, 0x68, 0x61, 0x6E, 0x6E, 0x65]);

      inputObj = ganglion._bled112GetParsingAttributeValue(expectedScanResponse);
      actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(expectedScanResponse);
      expect(actualOutput.raws.length).to.equal(1);
      expect(actualOutput.buffer).to.equal(null);

      // And another one
      expectedScanResponse = Buffer.from([0x80, 0x0B, 0x04, 0x05, 0x00, 0x19, 0x00, 0x01, 0x06, 0xCA, 0x31, 0x32, 0x30, 0x37, 0x5A]);

      inputObj = ganglion._bled112GetParsingAttributeValue(expectedScanResponse);
      actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(expectedScanResponse);
      expect(actualOutput.raws.length).to.equal(1);
      expect(actualOutput.buffer).to.equal(null);

      // And another one
      expectedScanResponse = Buffer.from([0x80, 0x19, 0x04, 0x05, 0x00, 0x19, 0x00, 0x01, 0x14, 0x6A, 0x00, 0x97, 0xC0, 0x2A, 0x30, 0x01, 0x38, 0x01, 0x59, 0x60, 0x17, 0x64, 0x03, 0x83, 0x00, 0x78, 0x30, 0x02, 0xB2]);

      inputObj = ganglion._bled112GetParsingAttributeValue(expectedScanResponse);
      actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(expectedScanResponse);
      expect(actualOutput.raws.length).to.equal(1);
      expect(actualOutput.buffer).to.equal(null);
    });
    it('should be able to extract scan response when only thing in input data', function () {
      const expectedScanResponse = Buffer.from([0x80, 0x1A, 0x06, 0x00, 0xCD, 0x00, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0xFF, 0x0F, 0x0E, 0x09, 0x47, 0x61, 0x6E, 0x67, 0x6C, 0x69, 0x6F, 0x6E, 0x2D, 0x35, 0x34, 0x63, 0x61]);

      const inputObj = ganglion._bled112GetParsingDiscover(expectedScanResponse);
      const actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(expectedScanResponse);
      expect(actualOutput.raws.length).to.equal(1);
      expect(actualOutput.buffer).to.equal(null);
    });
    it('should be able to extract one scan responses and keep junk in front', function () {
      const junk = Buffer.from([0x06, 0x00, 0xbd, 0x00, 0xd9, 0x66, 0xce, 0x00, 0x53, 0xe9, 0x01, 0xff, 0x0f, 0x0e, 0x09, 0x47]);
      const scanResponse1 = Buffer.from([0x80, 0x1A, 0x06, 0x00, 0xCD, 0x00, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0xFF, 0x0F, 0x0E, 0x09, 0x47, 0x61, 0x6E, 0x67, 0x6C, 0x69, 0x6F, 0x6E, 0x2D, 0x35, 0x34, 0x63, 0x61]);
      const inputData = Buffer.concat([junk, scanResponse1]);

      const inputObj = ganglion._bled112GetParsingDiscover(inputData);
      const actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(scanResponse1);
      expect(actualOutput.raws.length).to.equal(1);
      expect(actualOutput.buffer).to.deep.equal(junk);
    });
    it('should be able to extract two scan responses and keep junk in front', function () {
      const junk = Buffer.from([0x06, 0x00, 0xbd, 0x00, 0xd9, 0x66, 0xce, 0x00, 0x53, 0xe9, 0x01, 0xff, 0x0f, 0x0e, 0x09, 0x47]);
      const scanResponse1 = Buffer.from([0x80, 0x1A, 0x06, 0x00, 0xCD, 0x00, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0xFF, 0x0F, 0x0E, 0x09, 0x47, 0x61, 0x6E, 0x67, 0x6C, 0x69, 0x6F, 0x6E, 0x2D, 0x35, 0x34, 0x63, 0x61]);
      const scanResponse2 = Buffer.from([0x80, 0x1A, 0x06, 0x00, 0xCD, 0x00, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0xFF, 0x0F, 0x0E, 0x09, 0x47, 0x61, 0x6E, 0x67, 0x6C, 0x69, 0x6F, 0x6E, 0x2D, 0x35, 0x34, 0x63, 0x61]);
      const inputData = Buffer.concat([junk, scanResponse1, scanResponse2]);

      const inputObj = ganglion._bled112GetParsingDiscover(inputData);
      const actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(scanResponse1);
      expect(actualOutput.raws[1]).to.deep.equal(scanResponse2);
      expect(actualOutput.raws.length).to.equal(2);
      expect(actualOutput.buffer).to.deep.equal(junk);
    });
    it('should be able to extract one scan responses and concat junk in front with segment of next scan response', function () {
      const junk = Buffer.from([0x06, 0x00, 0xbd, 0x00, 0xd9, 0x66, 0xce, 0x00, 0x53, 0xe9, 0x01, 0xff, 0x0f, 0x0e, 0x09, 0x47]);
      const scanResponse1 = Buffer.from([0x80, 0x1A, 0x06, 0x00, 0xCD, 0x00, 0xD9, 0x66, 0xCE, 0x00, 0x53, 0xE9, 0x01, 0xFF, 0x0F, 0x0E, 0x09, 0x47, 0x61, 0x6E, 0x67, 0x6C, 0x69, 0x6F, 0x6E, 0x2D, 0x35, 0x34, 0x63, 0x61]);
      const halfScanResponse2 = Buffer.from([0x80, 0x1A, 0x06, 0x00, 0xCD, 0x00, 0xD9]);
      const inputData = Buffer.concat([junk, scanResponse1, halfScanResponse2]);

      const inputObj = ganglion._bled112GetParsingDiscover(inputData);
      const actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(scanResponse1);
      expect(actualOutput.raws.length).to.equal(1);
      expect(actualOutput.buffer).to.deep.equal(Buffer.concat([junk, halfScanResponse2]));
    });
    it('should be able to get one group found', function () {
      const expectedGroupFoundResponse = Buffer.from([0x80, 0x08, 0x04, 0x02, 0x00, 0x17, 0x00, 0x1E, 0x00, 0x02, 0x84, 0xFE]);

      const inputObj = ganglion._bled112GetParsingGroup(expectedGroupFoundResponse);
      const actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(expectedGroupFoundResponse);
      expect(actualOutput.raws.length).to.equal(1);
      expect(actualOutput.buffer).to.equal(null);
    });
    it('should be able to extract one group found and keep junk in front', function () {
      const junk = Buffer.from([0x06, 0x00, 0xbd, 0x00, 0xd9, 0x66, 0xce, 0x00, 0x53, 0xe9, 0x01, 0xff, 0x0f, 0x0e, 0x09, 0x47]);
      const scanResponse1 = Buffer.from([0x80, 0x08, 0x04, 0x02, 0x00, 0x17, 0x00, 0x1E, 0x00, 0x02, 0x84, 0xFE]);
      const inputData = Buffer.concat([junk, scanResponse1]);

      const inputObj = ganglion._bled112GetParsingGroup(inputData);
      const actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(scanResponse1);
      expect(actualOutput.raws.length).to.equal(1);
      expect(actualOutput.buffer).to.deep.equal(junk);
    });
    it('should be able to extract two group found responses and keep junk in front', function () {
      const junk = Buffer.from([0x06, 0x00, 0xbd, 0x00, 0xd9, 0x66, 0xce, 0x00, 0x53, 0xe9, 0x01, 0xff, 0x0f, 0x0e, 0x09, 0x47]);
      const scanResponse1 = Buffer.from([0x80, 0x08, 0x04, 0x02, 0x00, 0x17, 0x00, 0x1E, 0x00, 0x02, 0x84, 0xFE]);
      const scanResponse2 = Buffer.from([0x80, 0x08, 0x04, 0x02, 0x00, 0x17, 0x00, 0x1E, 0x00, 0x02, 0x01, 0x80]);
      const inputData = Buffer.concat([junk, scanResponse1, scanResponse2]);

      const inputObj = ganglion._bled112GetParsingGroup(inputData);
      const actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(scanResponse1);
      expect(actualOutput.raws[1]).to.deep.equal(scanResponse2);
      expect(actualOutput.raws.length).to.equal(2);
      expect(actualOutput.buffer).to.deep.equal(junk);
    });
    it('should be able to extract one group found responses and concat junk in front with junk in end, which is a segment of next scan response', function () {
      const junk = Buffer.from([0x06, 0x00, 0xbd, 0x00, 0xd9, 0x66, 0xce, 0x00, 0x53, 0xe9, 0x01, 0xff, 0x0f, 0x0e, 0x09, 0x47]);
      const scanResponse1 = Buffer.from([0x80, 0x08, 0x04, 0x02, 0x00, 0x17, 0x00, 0x1E, 0x00, 0x02, 0x84, 0xFE]);
      const halfScanResponse2 = Buffer.from([0x80, 0x08, 0x04, 0x02, 0x00, 0x17]);
      const inputData = Buffer.concat([junk, scanResponse1, halfScanResponse2]);

      const inputObj = ganglion._bled112GetParsingGroup(inputData);
      const actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(scanResponse1);
      expect(actualOutput.raws.length).to.equal(1);
      expect(actualOutput.buffer).to.deep.equal(Buffer.concat([junk, halfScanResponse2]));
    });
    it('should be able to get one find info found with long uuid', function () {
      const expectedFindInfoLong = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x19, 0x00, 0x10, 0x96, 0x05, 0x48, 0xEA, 0x84, 0x34, 0x3F, 0x92, 0xE6, 0x4C, 0x9F, 0xF3, 0x82, 0xC0, 0x30, 0x2D]);

      const inputObj = ganglion._bled112GetParsingFindInfoLong(expectedFindInfoLong);
      const actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(expectedFindInfoLong);
      expect(actualOutput.raws.length).to.equal(1);
      expect(actualOutput.buffer).to.equal(null);
    });
    it('should be able to get one find info found with short uuid', function () {
      const expectedFindInfoShort = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x1A, 0x00, 0x02, 0x02, 0x29]);

      const inputObj = ganglion._bled112GetParsingFindInfoShort(expectedFindInfoShort);
      const actualOutput = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutput.raws[0]).to.deep.equal(expectedFindInfoShort);
      expect(actualOutput.raws.length).to.equal(1);
      expect(actualOutput.buffer).to.equal(null);
    });
    it('should be able to get one find info found with short uuid and then one with long', function () {
      const expectedFindInfoShort = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x1A, 0x00, 0x02, 0x02, 0x29]);
      const expectedFindInfoLong = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x19, 0x00, 0x10, 0x96, 0x05, 0x48, 0xEA, 0x84, 0x34, 0x3F, 0x92, 0xE6, 0x4C, 0x9F, 0xF3, 0x82, 0xC0, 0x30, 0x2D]);

      const inputData = Buffer.concat([expectedFindInfoShort, expectedFindInfoLong]);

      let inputObj = ganglion._bled112GetParsingFindInfoShort(inputData);
      const actualOutputShort = ganglion._bled112ParseForRaws(inputObj);
      expect(actualOutputShort.raws[0]).to.deep.equal(expectedFindInfoShort);
      expect(actualOutputShort.raws.length).to.equal(1);
      expect(actualOutputShort.buffer).to.deep.equal(expectedFindInfoLong);

      inputObj = ganglion._bled112GetParsingFindInfoLong(actualOutputShort.buffer);
      const actualOutputLong = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutputLong.raws[0]).to.deep.equal(expectedFindInfoLong);
      expect(actualOutputLong.raws.length).to.equal(1);
      expect(actualOutputLong.buffer).to.equal(null);
    });
    it('should be able to get one find info found with long uuid and then one with short', function () {
      const expectedFindInfoShort = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x1A, 0x00, 0x02, 0x02, 0x29]);
      const expectedFindInfoLong = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x19, 0x00, 0x10, 0x96, 0x05, 0x48, 0xEA, 0x84, 0x34, 0x3F, 0x92, 0xE6, 0x4C, 0x9F, 0xF3, 0x82, 0xC0, 0x30, 0x2D]);

      const inputData = Buffer.concat([expectedFindInfoLong, expectedFindInfoShort]);

      let inputObj = ganglion._bled112GetParsingFindInfoShort(inputData);
      const actualOutputShort = ganglion._bled112ParseForRaws(inputObj);
      expect(actualOutputShort.raws[0]).to.deep.equal(expectedFindInfoShort);
      expect(actualOutputShort.raws.length).to.equal(1);
      expect(actualOutputShort.buffer).to.deep.equal(expectedFindInfoLong);

      inputObj = ganglion._bled112GetParsingFindInfoLong(actualOutputShort.buffer);
      const actualOutputLong = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutputLong.raws[0]).to.deep.equal(expectedFindInfoLong);
      expect(actualOutputLong.raws.length).to.equal(1);
      expect(actualOutputLong.buffer).to.equal(null);
    });
    it('should be able to get one find info found with short, long, short', function () {
      const expectedFindInfoShort1 = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x1A, 0x00, 0x02, 0x02, 0x29]);
      const expectedFindInfoLong = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x19, 0x00, 0x10, 0x96, 0x05, 0x48, 0xEA, 0x84, 0x34, 0x3F, 0x92, 0xE6, 0x4C, 0x9F, 0xF3, 0x82, 0xC0, 0x30, 0x2D]);
      const expectedFindInfoShort2 = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x1A, 0x00, 0x02, 0x03, 0x29]);

      const inputData = Buffer.concat([expectedFindInfoShort1, expectedFindInfoLong, expectedFindInfoShort2]);

      let inputObj = ganglion._bled112GetParsingFindInfoShort(inputData);
      const actualOutputShort = ganglion._bled112ParseForRaws(inputObj);
      expect(actualOutputShort.raws[0]).to.deep.equal(expectedFindInfoShort1);
      expect(actualOutputShort.raws[1]).to.deep.equal(expectedFindInfoShort2);
      expect(actualOutputShort.raws.length).to.equal(2);
      expect(actualOutputShort.buffer).to.deep.equal(expectedFindInfoLong);

      inputObj = ganglion._bled112GetParsingFindInfoLong(actualOutputShort.buffer);
      const actualOutputLong = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutputLong.raws[0]).to.deep.equal(expectedFindInfoLong);
      expect(actualOutputLong.raws.length).to.equal(1);
      expect(actualOutputLong.buffer).to.equal(null);
    });
    it('should be able to get one find info found with long, short, long', function () {
      const expectedFindInfoLong1 = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x19, 0x00, 0x10, 0x96, 0x05, 0x48, 0xEA, 0x84, 0x34, 0x3F, 0x92, 0xE6, 0x4C, 0x9F, 0xF3, 0x82, 0xC0, 0x30, 0x2D]);
      const expectedFindInfoShort = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x1A, 0x00, 0x02, 0x02, 0x29]);
      const expectedFindInfoLong2 = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x19, 0x00, 0x10, 0x96, 0x05, 0x48, 0xEA, 0x84, 0x34, 0x3F, 0x92, 0xE6, 0x4C, 0x9F, 0xF3, 0x82, 0xC0, 0x30, 0x2C]);

      const inputData = Buffer.concat([expectedFindInfoLong1, expectedFindInfoShort, expectedFindInfoLong2]);

      let inputObj = ganglion._bled112GetParsingFindInfoShort(inputData);
      const actualOutputShort = ganglion._bled112ParseForRaws(inputObj);
      expect(actualOutputShort.raws[0]).to.deep.equal(expectedFindInfoShort);
      expect(actualOutputShort.raws.length).to.equal(1);
      expect(actualOutputShort.buffer).to.deep.equal(Buffer.concat([expectedFindInfoLong1, expectedFindInfoLong2]));

      inputObj = ganglion._bled112GetParsingFindInfoLong(actualOutputShort.buffer);
      const actualOutputLong = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutputLong.raws[0]).to.deep.equal(expectedFindInfoLong1);
      expect(actualOutputLong.raws[1]).to.deep.equal(expectedFindInfoLong2);
      expect(actualOutputLong.raws.length).to.equal(2);
      expect(actualOutputLong.buffer).to.equal(null);
    });
    it('should be able to get one find info found with long, short and return half of long', function () {
      const junk = Buffer.from([0x19, 0x00, 0x10, 0x96, 0x05, 0x48, 0xEA, 0x84, 0x34, 0x3F, 0x92, 0xE6, 0x4C, 0x9F, 0xF3, 0x82, 0xC0, 0x30, 0x2D]);
      const expectedFindInfoLong = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x19, 0x00, 0x10, 0x96, 0x05, 0x48, 0xEA, 0x84, 0x34, 0x3F, 0x92, 0xE6, 0x4C, 0x9F, 0xF3, 0x82, 0xC0, 0x30, 0x2D]);
      const junk2 = Buffer.from([0x19, 0x00, 0x10, 0x96, 0x05, 0x48, 0xEA, 0x84, 0x34, 0x3F, 0x92, 0xE6, 0x4C, 0x9F, 0xF3, 0x82, 0xC0, 0x30, 0x2D]);
      const expectedFindInfoShort = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x1A, 0x00, 0x02, 0x02, 0x29]);
      const expectedHalfFindInfoLong = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x19, 0x00, 0x10, 0x96, 0x05]);

      const inputData = Buffer.concat([junk, expectedFindInfoLong, junk2, expectedFindInfoShort, expectedHalfFindInfoLong]);

      let inputObj = ganglion._bled112GetParsingFindInfoShort(inputData);
      const actualOutputShort = ganglion._bled112ParseForRaws(inputObj);
      expect(actualOutputShort.raws[0]).to.deep.equal(expectedFindInfoShort);
      expect(actualOutputShort.raws.length).to.equal(1);
      expect(actualOutputShort.buffer).to.deep.equal(Buffer.concat([junk, expectedFindInfoLong, junk2, expectedHalfFindInfoLong]));

      inputObj = ganglion._bled112GetParsingFindInfoLong(actualOutputShort.buffer);
      const actualOutputLong = ganglion._bled112ParseForRaws(inputObj);

      expect(actualOutputLong.raws[0]).to.deep.equal(expectedFindInfoLong);
      expect(actualOutputLong.raws.length).to.equal(1);
      expect(actualOutputLong.buffer).to.deep.equal(Buffer.concat([junk, junk2, expectedHalfFindInfoLong]));
    });
  });
  describe('#_bled112RspAttributeWrite', function () {
    it('should be able to get the connection and result', function () {
      const rawBuf = Buffer.from([0x00, 0x03, 0x04, 0x05, 0x02, 0x01, 0x00]);

      const expectedConnection = 2;
      const expectedResult = Buffer.from([0x00, 0x01]);

      const expectedOutput = {
        connection: expectedConnection,
        result: expectedResult
      };

      const actualOutput = ganglion._bled112RspAttributeWrite(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
    });
  });
  describe('#_bled112ProcessBytes', function () {
    let funcStub;
    before(() => {
      funcStub = sinon.stub(ganglion, '_bled112ProcessRaw');
    });
    after(() => {
      funcStub.reset();
    });
    afterEach(() => {
      funcStub.resetHistory();
      ganglion.buffer = null;
    });
    it('should be able to get find info founds', function () {
      const expectedFindInfoLong1 = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x19, 0x00, 0x10, 0x96, 0x05, 0x48, 0xEA, 0x84, 0x34, 0x3F, 0x92, 0xE6, 0x4C, 0x9F, 0xF3, 0x82, 0xC0, 0x30, 0x2D]);
      const expectedFindInfoShort = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x1A, 0x00, 0x02, 0x02, 0x29]);
      const expectedFindInfoLong2 = Buffer.from([0x80, 0x06, 0x04, 0x04, 0x01, 0x19, 0x00, 0x10, 0x96, 0x05, 0x48, 0xEA, 0x84, 0x34, 0x3F, 0x92, 0xE6, 0x4C, 0x9F, 0xF3, 0x82, 0xC0, 0x30, 0x2C]);

      const inputData = Buffer.concat([expectedFindInfoLong1, expectedFindInfoShort, expectedFindInfoLong2]);

      // Set driver to look for find info founds
      ganglion._bled112ParseForFindInfoFound();
      ganglion._bled112ProcessBytes(inputData);

      expect(funcStub.args[0][0]).to.deep.equal(expectedFindInfoShort);
      expect(funcStub.args[1][0]).to.deep.equal(expectedFindInfoLong1);
      expect(funcStub.args[2][0]).to.deep.equal(expectedFindInfoLong2);
    });
    it('should be able to find one group found responses and concat junk in front with junk in end, which is a segment of next scan response', function () {
      const junk = Buffer.from([0x06, 0x00, 0xbd, 0x00, 0xd9, 0x66, 0xce, 0x00, 0x53, 0xe9, 0x01, 0xff, 0x0f, 0x0e, 0x09, 0x47]);
      const scanResponse1 = Buffer.from([0x80, 0x08, 0x04, 0x02, 0x00, 0x17, 0x00, 0x1E, 0x00, 0x02, 0x84, 0xFE]);
      const halfScanResponse2 = Buffer.from([0x80, 0x08, 0x04, 0x02, 0x00, 0x17]);
      const inputData = Buffer.concat([junk, scanResponse1, halfScanResponse2]);

      // Set driver to look for groups
      ganglion._bled112ParseForGroup();
      ganglion._bled112ProcessBytes(inputData);

      expect(funcStub.args[0][0]).to.deep.equal(scanResponse1);
      expect(funcStub.callCount).to.equal(1);
      // Should keep other stuff in the buffer
      expect(ganglion.buffer).to.deep.equal(Buffer.concat([junk, halfScanResponse2]));
    });
  });
  describe('#_bled112RspFindInformationFound', function () {
    it('should be able to get the connection and result', function () {
      const rawBuf = Buffer.from([0x00, 0x03, 0x04, 0x03, 0x02, 0x01, 0x00]);

      const expectedConnection = 2;
      const expectedResult = Buffer.from([0x00, 0x01]);

      const expectedOutput = {
        connection: expectedConnection,
        result: expectedResult
      };

      const actualOutput = ganglion._bled112RspFindInformationFound(rawBuf);

      expect(actualOutput).to.deep.equal(expectedOutput);
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
