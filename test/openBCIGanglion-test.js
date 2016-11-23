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
        0b00001000, // 4
        0b00000000, // 5
        0b00000101, // 6
        0b00000000, // 7
        0b00000000, // 8
        0b01001000, // 9
        0b00000000, // 10
        0b00001001, // 11
        0b11110000, // 12
        0b00000001, // 13
        0b10110000, // 14
        0b00000000, // 15
        0b00110000, // 16
        0b00000000, // 17
        0b00001000  // 18
      ]);
    let expectedValue = [[0, 2, 10, 4], [262148, 507910, 393222, 8]];
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
        0b10111111, // 2
        0b11111111, // 3
        0b11101111, // 4
        0b11111111, // 5
        0b11111100, // 6
        0b11111111, // 7
        0b11111111, // 8
        0b01011000, // 9
        0b00000000, // 10
        0b00001011, // 11
        0b00111110, // 12
        0b00111000, // 13
        0b11100000, // 14
        0b00000000, // 15
        0b00111111, // 16
        0b11110000, // 17
        0b00000001  // 18
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
  describe('_processBytes', function () {
    let funcSpyAccel;
    let funcSpyCompressedData;
    let funcSpyImpedanceData;
    let funcSpyMultiBytePacket;
    let funcSpyMultiBytePacketStop;
    let funcSpyOtherData;
    let funcSpyUncompressedData;

    before(function () {
      // Put watchers on all functions
      funcSpyAccel = sinon.spy(ganglion, '_processAccel');
      funcSpyCompressedData = sinon.spy(ganglion, '_processCompressedData');
      funcSpyImpedanceData = sinon.spy(ganglion, '_processImpedanceData');
      funcSpyMultiBytePacket = sinon.spy(ganglion, '_processMultiBytePacket');
      funcSpyMultiBytePacketStop = sinon.spy(ganglion, '_processMultiBytePacketStop');
      funcSpyOtherData = sinon.spy(ganglion, '_processOtherData');
      funcSpyUncompressedData = sinon.spy(ganglion, '_processUncompressedData');
    });
    beforeEach(function () {
      funcSpyAccel.reset();
      funcSpyCompressedData.reset();
      funcSpyImpedanceData.reset();
      funcSpyMultiBytePacket.reset();
      funcSpyMultiBytePacketStop.reset();
      funcSpyOtherData.reset();
      funcSpyUncompressedData.reset();
    });
    it('should route accel packet', function () {
      ganglion._processBytes(utils.sampleAccel());
      funcSpyAccel.should.have.been.calledOnce;
    });
    it('should route compressed data packet', function () {
      ganglion._processBytes(utils.sampleCompressedData(3));
      funcSpyCompressedData.should.have.been.calledOnce;
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
    it('should route uncompressed data packet', function () {
      ganglion._processBytes(utils.sampleUncompressedData());
      funcSpyUncompressedData.should.have.been.calledOnce;
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
