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
const ganglionSample = require('../openBCIGanglionSample');
const clone = require('clone');

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('#ganglion-constructor', function () {
  it('should callback if only callback used', function (done) {
    const cb = (err) => {
      done(err);
    };
    const ganglion_cb = new Ganglion(cb);
  });
  it('should callback if options and callback', function (done) {
    const cb = (err) => {
      done(err);
    };
    const ganglion_cb = new Ganglion({}, cb);
  });
});

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
  describe('#_processProcessSampleData', function () {
    let funcSpyCompressedData;
    let funcSpyDroppedPacket;
    let funcSpyUncompressedData;
    before(function () {
      funcSpyCompressedData = sinon.spy(ganglion, '_processCompressedData');
      funcSpyDroppedPacket = sinon.spy(ganglion, '_droppedPacket');
      funcSpyUncompressedData = sinon.spy(ganglion, '_processUncompressedData');
    });
    beforeEach(function () {
      funcSpyCompressedData.reset();
      funcSpyDroppedPacket.reset();
      funcSpyUncompressedData.reset();
      ganglion._resetDroppedPacketSystem();
    });
    describe('18bit', function () {
      it('should call proper functions if no dropped packets', function () {
        it('should work on uncompressed data', function () {
          ganglion._processProcessSampleData(ganglionSample.sampleUncompressedData());
          funcSpyUncompressedData.should.have.been.called;
          funcSpyDroppedPacket.should.not.have.been.called;
        });

        it('should work on compressed data', function () {
          ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(1));
          funcSpyCompressedData.should.have.been.called;
          funcSpyDroppedPacket.should.not.have.been.called;
        });
      });
      it('should recognize 0 packet dropped', function () {
        // Send the last buffer, set's ganglion._packetCounter
        ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteId18Bit.max));
        funcSpyCompressedData.should.have.been.called;
        const expectedMissedSample = k.OBCIGanglionByteIdUncompressed;
        // Call the function under test with one more then expected
        const nextPacket = ganglionSample.sampleCompressedData(expectedMissedSample + 1);
        ganglion._processProcessSampleData(nextPacket);
        funcSpyCompressedData.should.have.been.calledTwice;
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample);
      });
      it('should not find a dropped packet on wrap around', function () {
        ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteId18Bit.max - 1));
        funcSpyCompressedData.should.have.been.calledOnce;
        ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteId18Bit.max));
        funcSpyCompressedData.should.have.been.calledTwice;
        ganglion._processProcessSampleData(ganglionSample.sampleUncompressedData());
        funcSpyCompressedData.should.have.been.calledTwice;
        funcSpyUncompressedData.should.have.been.calledOnce;
        ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteIdUncompressed + 1));
        funcSpyCompressedData.should.have.been.calledThrice;
        funcSpyDroppedPacket.should.not.have.been.called;
      });
      it('should recognize dropped packet 99', function () {
        ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteId18Bit.max - 1));
        const expectedMissedSample = k.OBCIGanglionByteId18Bit.max;
        // Call the function under test with one more then expected
        const nextPacket = ganglionSample.sampleUncompressedData();
        ganglion._processProcessSampleData(nextPacket);
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample);
      });
      it('should recognize dropped packet 98 and 99', function () {
        ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteId18Bit.max - 2));
        const expectedMissedSample1 = k.OBCIGanglionByteId18Bit.max - 1;
        const expectedMissedSample2 = k.OBCIGanglionByteId18Bit.max;
        // Call the function under test with one more then expected
        const nextPacket = ganglionSample.sampleUncompressedData();
        ganglion._processProcessSampleData(nextPacket);
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample1);
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample2);
      });
      it('should detect dropped packet 1 and process packet 2', function () {
        // Send the raw buffer, set's ganglion._packetCounter
        ganglion._processProcessSampleData(ganglionSample.sampleUncompressedData());
        const expectedMissedSample = k.OBCIGanglionByteIdUncompressed + 1;
        // Call the function under test with one more then expected
        const nextPacket = ganglionSample.sampleCompressedData(expectedMissedSample + 1);
        ganglion._processProcessSampleData(nextPacket);
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample);
      });
      it('should detect dropped packet 1 & 2 and add process packet 3', function () {
        // Send the last buffer, set's ganglion._packetCounter
        ganglion._processProcessSampleData(ganglionSample.sampleUncompressedData());
        const expectedMissedSample1 = k.OBCIGanglionByteIdUncompressed + 1;
        const expectedMissedSample2 = k.OBCIGanglionByteIdUncompressed + 2;
        // Call the function under test with two more then expected
        const nextPacket = ganglionSample.sampleCompressedData(expectedMissedSample2 + 1);
        ganglion._processProcessSampleData(nextPacket);
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample1);
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample2);
      });
      it('should emit a accel data array with counts', function () {
        const bufAccelX = ganglionSample.sampleCompressedData(k.OBCIGanglionAccelAxisX);
        const bufAccelY = ganglionSample.sampleCompressedData(k.OBCIGanglionAccelAxisY);
        const bufAccelZ = ganglionSample.sampleCompressedData(k.OBCIGanglionAccelAxisZ);
        const expectedXCount = 0;
        const expectedYCount = 1;
        const expectedZCount = 2;
        bufAccelX[k.OBCIGanglionPacket18Bit.auxByte - 1] = expectedXCount;
        bufAccelY[k.OBCIGanglionPacket18Bit.auxByte - 1] = expectedYCount;
        bufAccelZ[k.OBCIGanglionPacket18Bit.auxByte - 1] = expectedZCount;
        const dimensions = 3;
        let accelDataFuncCalled = false;
        const accelDataFunc = (accelData) => {
          accelDataFuncCalled = true;
          expect(accelData.length).to.equal(dimensions);
          for (let i = 0; i < dimensions; i++) {
            expect(accelData[i]).to.equal(i);
          }
        };
        ganglion.once('accelerometer', accelDataFunc);
        ganglion.options.sendCounts = true;
        ganglion._processProcessSampleData(bufAccelX);
        ganglion._processProcessSampleData(bufAccelY);
        ganglion._processProcessSampleData(bufAccelZ);
        expect(accelDataFuncCalled).to.be.equal(true);
        ganglion.options.sendCounts = false;
        ganglion.removeListener('accelerometer', accelDataFunc);
      });
      it('should emit a accel data array with scaled values', function () {
        const bufAccelX = ganglionSample.sampleCompressedData(k.OBCIGanglionAccelAxisX);
        const bufAccelY = ganglionSample.sampleCompressedData(k.OBCIGanglionAccelAxisY);
        const bufAccelZ = ganglionSample.sampleCompressedData(k.OBCIGanglionAccelAxisZ);
        const expectedXCount = 0;
        const expectedYCount = 1;
        const expectedZCount = 2;
        bufAccelX[k.OBCIGanglionPacket18Bit.auxByte - 1] = expectedXCount;
        bufAccelY[k.OBCIGanglionPacket18Bit.auxByte - 1] = expectedYCount;
        bufAccelZ[k.OBCIGanglionPacket18Bit.auxByte - 1] = expectedZCount;
        const dimensions = 3;
        let accelDataFuncCalled = false;
        const accelDataFunc = (accelData) => {
          accelDataFuncCalled = true;
          expect(accelData.length).to.equal(dimensions);
          for (let i = 0; i < dimensions; i++) {
            expect(accelData[i]).to.equal(i * 0.032);
          }
        };
        ganglion.once('accelerometer', accelDataFunc);
        ganglion.options.sendCounts = false;
        ganglion._processProcessSampleData(bufAccelX);
        ganglion._processProcessSampleData(bufAccelY);
        ganglion._processProcessSampleData(bufAccelZ);
        expect(accelDataFuncCalled).to.be.equal(true);
        ganglion.removeListener('accelerometer', accelDataFunc);
      });
    });
    describe('19bit', function () {
      it('should call proper functions if no dropped packets', function () {
        it('should work on uncompressed data', function () {
          ganglion._processProcessSampleData(ganglionSample.sampleUncompressedData());
          funcSpyUncompressedData.should.have.been.called;
          funcSpyDroppedPacket.should.not.have.been.called;
        });

        it('should work on compressed data', function () {
          ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteId19Bit.min));
          funcSpyCompressedData.should.have.been.called;
          funcSpyDroppedPacket.should.not.have.been.called;
        });
      });
      it('should recognize packet 101 was dropped', function () {
        // Send the last buffer, set's ganglion._packetCounter
        ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteId19Bit.max));
        funcSpyCompressedData.should.have.been.called;
        const expectedMissedSample = k.OBCIGanglionByteIdUncompressed;
        // Call the function under test with one more then expected
        const nextPacket = ganglionSample.sampleCompressedData(expectedMissedSample + 1);
        ganglion._processProcessSampleData(nextPacket);
        funcSpyCompressedData.should.have.been.calledTwice;
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample);
      });
      it('should not find a dropped packet on wrap around', function () {
        ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteId19Bit.max - 1));
        funcSpyCompressedData.should.have.been.calledOnce;
        ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteId19Bit.max));
        funcSpyCompressedData.should.have.been.calledTwice;
        ganglion._processProcessSampleData(ganglionSample.sampleUncompressedData());
        funcSpyCompressedData.should.have.been.calledTwice;
        funcSpyUncompressedData.should.have.been.calledOnce;
        ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteId19Bit.min));
        funcSpyCompressedData.should.have.been.calledThrice;
        funcSpyDroppedPacket.should.not.have.been.called;
      });
      it('should recognize dropped packet 199', function () {
        ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteId19Bit.max - 1));
        const expectedMissedSample = k.OBCIGanglionByteId19Bit.max;
        // Call the function under test with one more then expected
        const nextPacket = ganglionSample.sampleUncompressedData();
        ganglion._processProcessSampleData(nextPacket);
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample);
      });
      it('should recognize dropped packet 198 and 199', function () {
        ganglion._processProcessSampleData(ganglionSample.sampleCompressedData(k.OBCIGanglionByteId19Bit.max - 2));
        const expectedMissedSample1 = k.OBCIGanglionByteId19Bit.max - 1;
        const expectedMissedSample2 = k.OBCIGanglionByteId19Bit.max;
        // Call the function under test with one more then expected
        const nextPacket = ganglionSample.sampleUncompressedData();
        ganglion._processProcessSampleData(nextPacket);
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample1);
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample2);
      });
      it('should detect dropped packet 101 and process packet 102', function () {
        // Send the raw buffer, set's ganglion._packetCounter
        ganglion._processProcessSampleData(ganglionSample.sampleUncompressedData());
        const expectedMissedSample = k.OBCIGanglionByteIdUncompressed + 1;
        // Call the function under test with one more then expected
        const nextPacket = ganglionSample.sampleCompressedData(expectedMissedSample + 1);
        ganglion._processProcessSampleData(nextPacket);
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample);
      });
      it('should detect dropped packet 101 & 1022 and add process packet 103', function () {
        // Send the last buffer, set's ganglion._packetCounter
        ganglion._processProcessSampleData(ganglionSample.sampleUncompressedData());
        const expectedMissedSample1 = k.OBCIGanglionByteIdUncompressed + 1;
        const expectedMissedSample2 = k.OBCIGanglionByteIdUncompressed + 2;
        // Call the function under test with two more then expected
        const nextPacket = ganglionSample.sampleCompressedData(expectedMissedSample2 + 1);
        ganglion._processProcessSampleData(nextPacket);
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample1);
        funcSpyDroppedPacket.should.have.been.calledWith(expectedMissedSample2);
      });
    });
  });
  describe('_processBytes', function () {
    let funcSpyImpedanceData;
    let funcSpyMultiBytePacket;
    let funcSpyMultiBytePacketStop;
    let funcSpyOtherData;
    let funcSpyProcessedData;

    before(function () {
      // Put watchers on all functions
      funcSpyImpedanceData = sinon.spy(ganglion, '_processImpedanceData');
      funcSpyMultiBytePacket = sinon.spy(ganglion, '_processMultiBytePacket');
      funcSpyMultiBytePacketStop = sinon.spy(ganglion, '_processMultiBytePacketStop');
      funcSpyOtherData = sinon.spy(ganglion, '_processOtherData');
      funcSpyProcessedData = sinon.spy(ganglion, '_processProcessSampleData');
    });
    beforeEach(function () {
      funcSpyImpedanceData.reset();
      funcSpyMultiBytePacket.reset();
      funcSpyMultiBytePacketStop.reset();
      funcSpyOtherData.reset();
      funcSpyProcessedData.reset();
    });
    it('should route impedance channel 1 packet', function () {
      ganglion._processBytes(ganglionSample.sampleImpedanceChannel1());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route impedance channel 2 packet', function () {
      ganglion._processBytes(ganglionSample.sampleImpedanceChannel2());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route impedance channel 3 packet', function () {
      ganglion._processBytes(ganglionSample.sampleImpedanceChannel3());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route impedance channel 4 packet', function () {
      ganglion._processBytes(ganglionSample.sampleImpedanceChannel4());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route impedance channel reference packet', function () {
      ganglion._processBytes(ganglionSample.sampleImpedanceChannelReference());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route multi packet data', function () {
      ganglion._processBytes(ganglionSample.sampleMultiBytePacket(new Buffer('taco')));
      funcSpyMultiBytePacket.should.have.been.calledOnce;
    });
    it('should route multi packet stop data', function () {
      ganglion._processBytes(ganglionSample.sampleMultiBytePacketStop(new Buffer('taco')));
      funcSpyMultiBytePacketStop.should.have.been.calledOnce;
    });
    it('should route other data packet', function () {
      ganglion._processBytes(ganglionSample.sampleOtherData(new Buffer('blah')));
      funcSpyOtherData.should.have.been.calledOnce;
    });
    it('should route processed data packet', function () {
      ganglion._processBytes(ganglionSample.sampleUncompressedData());
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
