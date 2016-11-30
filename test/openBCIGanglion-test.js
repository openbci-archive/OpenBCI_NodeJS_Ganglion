'use strict';
// const bluebirdChecks = require('./bluebirdChecks');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const should = chai.should(); // eslint-disable-line no-unused-vars
const Ganglion = require('../openBCIGanglion');
const k = require('../openBCIConstants');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const bufferEqual = require('buffer-equal');
const utils = require('../openBCIGanglionUtils');
const clone = require('clone');

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('#ganglion', function () {
  const mockProperties = {
    nobleAutoStart: false,
    nobleScanOnPowerOn: false,
    simulate: false,
    simulatorBoardFailure: false,
    simulatorHasAccelerometer: true,
    simulatorInternalClockDrift: 0,
    simulatorInjectAlpha: true,
    simulatorInjectLineNoise: k.OBCISimulatorLineNoiseHz60,
    simulatorSampleRate: 200,
    verbose: false,
    debug: false,
    sendCounts: false
  };
  const expectedProperties = clone(mockProperties);
  const ganglion = new Ganglion(mockProperties);
  it('should have properties', function () {
    expect(ganglion.options).to.deep.equal(expectedProperties);
  });
  it('should return 4 channels', function () {
    expect(ganglion.numberOfChannels()).to.equal(4);
  });
  it('should extract the proper values for each channel', function () {
    let buffer = new Buffer(
      [
        0b00000000, // 0
        0b00000000, // 1
        0b00000000, // 2
        0b00000000, // 3
        0b00100000, // 4
        0b00000000, // 5
        0b00101000, // 6
        0b00000000, // 7
        0b00000100, // 8
        0b10000000, // 9
        0b00000000, // 10
        0b10111100, // 11
        0b00000000, // 12
        0b00000111, // 13
        0b00000000, // 14
        0b00101000, // 15
        0b11000000, // 16
        0b00001010  // 17
      ]);
    let expectedValue = [[0, 2, 10, 4], [131074, 245760, 114698, 49162]];
    let actualValue = ganglion._decompressDeltas(buffer);

    for (let i = 0; i < 4; i++) {
      (actualValue[0][i]).should.equal(expectedValue[0][i]);
      (actualValue[1][i]).should.equal(expectedValue[1][i]);
    }
  });
  it('should extract the proper values for each channel (neg test)', function () {
    let buffer = new Buffer(
      [
        0b11111111, // 0
        0b11111111, // 1
        0b01111111, // 2
        0b11111111, // 3
        0b10111111, // 4
        0b11111111, // 5
        0b11100111, // 6
        0b11111111, // 7
        0b11110101, // 8
        0b00000000, // 9
        0b00000001, // 10
        0b01001111, // 11
        0b10001110, // 12
        0b00110000, // 13
        0b00000000, // 14
        0b00011111, // 15
        0b11110000, // 16
        0b00000001  // 17
      ]);
    let expectedValue = [[-3, -5, -7, -11], [-262139, -198429, -262137, -4095]];
    let actualValue = ganglion._decompressDeltas(buffer);

    for (let i = 0; i < 4; i++) {
      (actualValue[0][i]).should.equal(expectedValue[0][i]);
      (actualValue[1][i]).should.equal(expectedValue[1][i]);
    }
  });
  it('should destroy the multi packet buffer', function () {
    ganglion.destroyMultiPacketBuffer();
    expect(ganglion.getMutliPacketBuffer()).to.equal(null);
  });
  it('should stack and emit one buffer from several multi packet buffer', function () {
    const bufMultPacket = new Buffer([k.OBCIGanglionByteIdMultiPacket]);
    const bufMultPacketStop = new Buffer([k.OBCIGanglionByteIdMultiPacketStop]);
    const buf1 = new Buffer('taco');
    const newBuffer1 = Buffer.concat([bufMultPacket, buf1]);
    ganglion._processMultiBytePacket(newBuffer1);
    expect(bufferEqual(ganglion.getMutliPacketBuffer(), buf1)).to.equal(true);

    const buf2 = new Buffer('vegas');
    const newBuffer2 = Buffer.concat([bufMultPacket, buf2]);
    ganglion._processMultiBytePacket(newBuffer2);
    expect(bufferEqual(ganglion.getMutliPacketBuffer(), Buffer.concat([buf1, buf2])));

    const bufStop = new Buffer('hola');
    const newBufferStop = Buffer.concat([bufMultPacketStop, bufStop]);
    let messageEventCalled = false;
    ganglion.once('message', (data) => {
      expect(bufferEqual(data, Buffer.concat([buf1, buf2, bufStop]))).to.equal(true);
      messageEventCalled = true;
    });
    ganglion._processMultiBytePacketStop(newBufferStop);
    expect(ganglion.getMutliPacketBuffer()).to.equal(null);
    expect(messageEventCalled).to.equal(true);

    ganglion.once('message', (data) => {
      expect(bufferEqual(data, bufStop)).to.equal(true);
    });
    ganglion._processMultiBytePacketStop(newBufferStop);
    expect(ganglion.getMutliPacketBuffer()).to.equal(null);
  });
  it('should be able to just get one packet buffer message', function () {
    const bufStop = new Buffer('hola');
    const bufMultPacketStop = new Buffer([k.OBCIGanglionByteIdMultiPacketStop]);
    const newBufferStop = Buffer.concat([bufMultPacketStop, bufStop]);
    let messageEventCalled = false;
    ganglion.once('message', (data) => {
      expect(bufferEqual(data, bufStop)).to.equal(true);
      messageEventCalled = true;
    });
    ganglion._processMultiBytePacketStop(newBufferStop);
    expect(ganglion.getMutliPacketBuffer()).to.equal(null);
    expect(messageEventCalled).to.equal(true);
  });
  describe('accel', function () {
    after(() => {
      ganglion.removeAllListeners('accelerometer');
    });
    afterEach(() => {
      ganglion.options.sendCounts = false;
    });
    it('should emit a accel data array with counts', function () {
      const bufAccel = utils.sampleAccel();
      const dimensions = 3;
      const accelDataFunc = (accelData) => {
        expect(accelData.length).to.equal(dimensions);
        for (let i = 0; i < dimensions; i++) {
          expect(accelData[i]).to.equal(i);
        }
      };
      ganglion.on('accelerometer', accelDataFunc);
      ganglion.options.sendCounts = true;
      ganglion._processAccel(bufAccel);
      ganglion.removeListener('accelerometer', accelDataFunc);
    });
    it('should emit a accel data array with counts', function () {
      const bufAccel = utils.sampleAccel();
      const dimensions = 3;
      const accelDataFunc = (accelData) => {
        expect(accelData.length).to.equal(dimensions);
        for (let i = 0; i < dimensions; i++) {
          expect(accelData[i]).to.equal(i * 0.008 / Math.pow(2, 6));
        }
      };
      ganglion.on('accelerometer', accelDataFunc);
      ganglion._processAccel(bufAccel);
      ganglion.removeListener('accelerometer', accelDataFunc);
    });
  });
  describe('#_processProcessSampleData', function () {
    let funcSpyCompressedData;
    let funcSpyUncompressedData;
    let funcSpyWrite;
    before(function () {
      funcSpyWrite = sinon.spy(ganglion, 'write');
      funcSpyCompressedData = sinon.spy(ganglion, '_processCompressedData');
      funcSpyUncompressedData = sinon.spy(ganglion, '_processUncompressedData');
    });
    beforeEach(function () {
      funcSpyWrite.reset();
      funcSpyCompressedData.reset();
      funcSpyUncompressedData.reset();
      ganglion._resetDroppedPacketSystem();
    });
    it('should call proper functions if no dropped packets', function () {
      it('should work on uncompressed data', function () {
        ganglion._processProcessSampleData(utils.sampleUncompressedData());
        funcSpyUncompressedData.should.have.been.called;
      });

      it('should work on compressed data', function () {
        ganglion._processProcessSampleData(utils.sampleCompressedData(1));
        funcSpyCompressedData.should.have.been.called;
      });
    });
    it('should try to resend 0 packet and add packet 1 to buffer', function () {
      // Send the last buffer, set's ganglion._packetCounter
      ganglion._processProcessSampleData(utils.sampleCompressedData(k.OBCIGanglionByteIdSampleMax));
      const expectedMissedSample = k.OBCIGanglionByteIdUncompressed;
      // Call the function under test with one more then expected
      const nextPacket = utils.sampleCompressedData(expectedMissedSample + 1);
      ganglion._processProcessSampleData(nextPacket);
      expect(bufferEqual(funcSpyWrite.firstCall.args[0], (new Buffer([k.OBCIMiscResend, expectedMissedSample])))).to.equal(true);
      expect(ganglion._requestedPacketResend[0]).to.equal(expectedMissedSample);
      expect(bufferEqual(ganglion._packetBuffer[0], nextPacket)).to.equal(true);

      funcSpyCompressedData.reset();
      const nextNextPacket = utils.sampleCompressedData(expectedMissedSample + 2);
      ganglion._processProcessSampleData(nextNextPacket);
      expect(bufferEqual(ganglion._packetBuffer[1], nextNextPacket)).to.equal(true);
      funcSpyCompressedData.should.not.have.been.called;

      const missedPacket = utils.sampleUncompressedData();
      ganglion._processProcessSampleData(missedPacket);
      expect(bufferEqual(funcSpyUncompressedData.firstCall.args[0], missedPacket)).to.equal(true);
      expect(bufferEqual(funcSpyCompressedData.firstCall.args[0], nextPacket)).to.equal(true);
      expect(bufferEqual(funcSpyCompressedData.secondCall.args[0], nextNextPacket)).to.equal(true);
      expect(ganglion._packetBuffer).to.deep.equal([]);
      expect(ganglion._requestedPacketResend).to.deep.equal([]);

    });
    it('should not find a dropped packet on wrap around', function () {
      ganglion._processProcessSampleData(utils.sampleCompressedData(k.OBCIGanglionByteIdSampleMax - 1));
      funcSpyCompressedData.should.have.been.calledOnce;
      ganglion._processProcessSampleData(utils.sampleCompressedData(k.OBCIGanglionByteIdSampleMax));
      funcSpyCompressedData.should.have.been.calledTwice;
      ganglion._processProcessSampleData(utils.sampleUncompressedData());
      funcSpyCompressedData.should.have.been.calledTwice;
      funcSpyUncompressedData.should.have.been.calledOnce;
      ganglion._processProcessSampleData(utils.sampleCompressedData(k.OBCIGanglionByteIdUncompressed + 1));
      funcSpyCompressedData.should.have.been.calledThrice;
      funcSpyWrite.should.not.have.been.called;
    });
    it('should try to resend packet 127', function () {
      ganglion._processProcessSampleData(utils.sampleCompressedData(k.OBCIGanglionByteIdSampleMax - 1));
      const expectedMissedSample = k.OBCIGanglionByteIdSampleMax;
      // Call the function under test with one more then expected
      const nextPacket = utils.sampleUncompressedData();
      ganglion._processProcessSampleData(nextPacket);
      expect(bufferEqual(funcSpyWrite.firstCall.args[0], (new Buffer([k.OBCIMiscResend, expectedMissedSample])))).to.equal(true);
      expect(ganglion._requestedPacketResend[0]).to.equal(expectedMissedSample);
      expect(bufferEqual(ganglion._packetBuffer[0], nextPacket)).to.equal(true);
    });
    it('should try to resend packet 126 and 127', function () {
      ganglion._processProcessSampleData(utils.sampleCompressedData(k.OBCIGanglionByteIdSampleMax - 2));
      const expectedMissedSample1 = k.OBCIGanglionByteIdSampleMax - 1;
      const expectedMissedSample2 = k.OBCIGanglionByteIdSampleMax;
      // Call the function under test with one more then expected
      const nextPacket = utils.sampleUncompressedData();
      ganglion._processProcessSampleData(nextPacket);
      expect(bufferEqual(funcSpyWrite.firstCall.args[0], (new Buffer([k.OBCIMiscResend, expectedMissedSample1])))).to.equal(true);
      expect(bufferEqual(funcSpyWrite.secondCall.args[0], (new Buffer([k.OBCIMiscResend, expectedMissedSample2])))).to.equal(true);
      expect(ganglion._requestedPacketResend).to.deep.equal([expectedMissedSample1, expectedMissedSample2]);
      expect(bufferEqual(ganglion._packetBuffer[0], nextPacket)).to.equal(true);
    });
    it('should try to resend packet 1 and add packet 2 to buffer', function () {
      // Send the last buffer, set's ganglion._packetCounter
      ganglion._processProcessSampleData(utils.sampleUncompressedData());
      const expectedMissedSample = k.OBCIGanglionByteIdUncompressed + 1;
      // Call the function under test with one more then expected
      const nextPacket = utils.sampleCompressedData(expectedMissedSample + 1);
      ganglion._processProcessSampleData(nextPacket);
      expect(bufferEqual(funcSpyWrite.firstCall.args[0], (new Buffer([k.OBCIMiscResend, expectedMissedSample])))).to.equal(true);
      expect(ganglion._requestedPacketResend[0]).to.equal(expectedMissedSample);
      expect(bufferEqual(ganglion._packetBuffer[0], nextPacket)).to.equal(true);
    });
    it('should try to resend packet 1 & 2 and add packet 3 to buffer', function () {
      // Send the last buffer, set's ganglion._packetCounter
      ganglion._processProcessSampleData(utils.sampleUncompressedData());
      const expectedMissedSample1 = k.OBCIGanglionByteIdUncompressed + 1;
      const expectedMissedSample2 = k.OBCIGanglionByteIdUncompressed + 2;
      // Call the function under test with two more then expected
      const nextPacket = utils.sampleCompressedData(expectedMissedSample2 + 1);
      ganglion._processProcessSampleData(nextPacket);
      expect(bufferEqual(funcSpyWrite.firstCall.args[0], (new Buffer([k.OBCIMiscResend, expectedMissedSample1])))).to.equal(true);
      expect(bufferEqual(funcSpyWrite.secondCall.args[0], (new Buffer([k.OBCIMiscResend, expectedMissedSample2])))).to.equal(true);
      expect(ganglion._requestedPacketResend).to.deep.equal([expectedMissedSample1, expectedMissedSample2]);
      expect(bufferEqual(ganglion._packetBuffer[0], nextPacket)).to.equal(true);
    });
  });
  describe('_processBytes', function () {
    let funcSpyAccel;
    let funcSpyImpedanceData;
    let funcSpyMultiBytePacket;
    let funcSpyMultiBytePacketStop;
    let funcSpyOtherData;
    let funcSpyProcessedData;

    before(function () {
      // Put watchers on all functions
      funcSpyAccel = sinon.spy(ganglion, '_processAccel');
      funcSpyImpedanceData = sinon.spy(ganglion, '_processImpedanceData');
      funcSpyMultiBytePacket = sinon.spy(ganglion, '_processMultiBytePacket');
      funcSpyMultiBytePacketStop = sinon.spy(ganglion, '_processMultiBytePacketStop');
      funcSpyOtherData = sinon.spy(ganglion, '_processOtherData');
      funcSpyProcessedData = sinon.spy(ganglion, '_processProcessSampleData');
    });
    beforeEach(function () {
      funcSpyAccel.reset();
      funcSpyImpedanceData.reset();
      funcSpyMultiBytePacket.reset();
      funcSpyMultiBytePacketStop.reset();
      funcSpyOtherData.reset();
      funcSpyProcessedData.reset();
    });
    it('should route accel packet', function () {
      ganglion._processBytes(utils.sampleAccel());
      funcSpyAccel.should.have.been.calledOnce;
    });
    it('should route impedance channel 1 packet', function () {
      ganglion._processBytes(utils.sampleImpedanceChannel1());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route impedance channel 2 packet', function () {
      ganglion._processBytes(utils.sampleImpedanceChannel2());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route impedance channel 3 packet', function () {
      ganglion._processBytes(utils.sampleImpedanceChannel3());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route impedance channel 4 packet', function () {
      ganglion._processBytes(utils.sampleImpedanceChannel4());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route impedance channel reference packet', function () {
      ganglion._processBytes(utils.sampleImpedanceChannelReference());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route multi packet data', function () {
      ganglion._processBytes(utils.sampleMultiBytePacket(new Buffer('taco')));
      funcSpyMultiBytePacket.should.have.been.calledOnce;
    });
    it('should route multi packet stop data', function () {
      ganglion._processBytes(utils.sampleMultiBytePacketStop(new Buffer('taco')));
      funcSpyMultiBytePacketStop.should.have.been.calledOnce;
    });
    it('should route other data packet', function () {
      ganglion._processBytes(utils.sampleOtherData(new Buffer('blah')));
      funcSpyOtherData.should.have.been.calledOnce;
    });
    it('should route processed data packet', function () {
      ganglion._processBytes(utils.sampleUncompressedData());
      funcSpyProcessedData.should.have.been.calledOnce;
    });
  });
  it('should emit impedance value', function () {
    let expectedImpedanceValue = 1099;
    const payloadBuf = new Buffer(`${expectedImpedanceValue}${k.OBCIGanglionImpedanceStop}`);
    let totalEvents = 0;
    let runningEventCount = 0;

    // Channel 1
    totalEvents++;
    let expectedChannelNumber = 1;
    let impPre = new Buffer([k.OBCIGanglionByteIdImpedanceChannel1]);
    let expectedReturnValue = {
      channelNumber: expectedChannelNumber,
      impedanceValue: expectedImpedanceValue
    };
    let dataBuf = Buffer.concat([impPre, payloadBuf]);
    ganglion.once('impedance', (actualImpedanceValue) => {
      expect(actualImpedanceValue).to.deep.equal(expectedReturnValue);
      runningEventCount++;
    });
    ganglion._processImpedanceData(dataBuf);

    // Channel 2
    totalEvents++;
    expectedChannelNumber = 2;
    impPre[0] = k.OBCIGanglionByteIdImpedanceChannel2;
    expectedReturnValue = {
      channelNumber: expectedChannelNumber,
      impedanceValue: expectedImpedanceValue
    };
    dataBuf = Buffer.concat([impPre, payloadBuf]);
    ganglion.once('impedance', (actualImpedanceValue) => {
      expect(actualImpedanceValue).to.deep.equal(expectedReturnValue);
      runningEventCount++;
    });
    ganglion._processImpedanceData(dataBuf);

    // Channel 3
    totalEvents++;
    expectedChannelNumber = 3;
    impPre[0] = k.OBCIGanglionByteIdImpedanceChannel3;
    expectedReturnValue = {
      channelNumber: expectedChannelNumber,
      impedanceValue: expectedImpedanceValue
    };
    dataBuf = Buffer.concat([impPre, payloadBuf]);
    ganglion.once('impedance', (actualImpedanceValue) => {
      expect(actualImpedanceValue).to.deep.equal(expectedReturnValue);
      runningEventCount++;
    });
    ganglion._processImpedanceData(dataBuf);

    // Channel 4
    totalEvents++;
    expectedChannelNumber = 4;
    impPre[0] = k.OBCIGanglionByteIdImpedanceChannel4;
    expectedReturnValue = {
      channelNumber: expectedChannelNumber,
      impedanceValue: expectedImpedanceValue
    };
    dataBuf = Buffer.concat([impPre, payloadBuf]);
    ganglion.once('impedance', (actualImpedanceValue) => {
      expect(actualImpedanceValue).to.deep.equal(expectedReturnValue);
      runningEventCount++;
    });
    ganglion._processImpedanceData(dataBuf);

    // Channel Reference
    totalEvents++;
    expectedChannelNumber = 0;
    impPre[0] = k.OBCIGanglionByteIdImpedanceChannelReference;
    expectedReturnValue = {
      channelNumber: expectedChannelNumber,
      impedanceValue: expectedImpedanceValue
    };
    dataBuf = Buffer.concat([impPre, payloadBuf]);
    ganglion.once('impedance', (actualImpedanceValue) => {
      expect(actualImpedanceValue).to.deep.equal(expectedReturnValue);
      runningEventCount++;
    });
    ganglion._processImpedanceData(dataBuf);

    // Makes sure the correct amount of events were called.
    expect(runningEventCount).to.equal(totalEvents);
  });

});

xdescribe('#noble', function () {
  xdescribe('#_nobleInit', function () {
    it('should emit powered on', function (done) {
      const ganglion = new Ganglion({
        verbose: true,
        nobleAutoStart: false,
        nobleScanOnPowerOn: false
      });
      ganglion.once(k.OBCIEmitterBlePoweredUp, () => {
        // Able to get powered up thing
        done();
      });
      ganglion._nobleInit();
    });
  });
  describe('#_nobleScan', function () {
    const searchTime = k.OBCIGanglionBleSearchTime * 2;

    this.timeout(searchTime + 1000);
    it('gets peripherals', function (done) {
      const ganglion = new Ganglion({
        verbose: true,
        nobleScanOnPowerOn: false
      });

      const doScan = () => {
        ganglion._nobleScan(searchTime)
          .then((list) => {
            console.log('listPeripherals', list);
            if (list) done();
          })
          .catch((err) => {
            done(err);
            console.log(err);
          });
      };

      if (ganglion._nobleReady()) {
        doScan();
      } else {
        ganglion.on('blePoweredOn', doScan());
      }
    });
  });
});
