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
const Buffer = require('buffer/');


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
  it('should destroy the multi packet buffer', function () {
    ganglion.destroyMultiPacketBuffer();
    expect(ganglion.getMutliPacketBuffer()).to.equal(null);
  });
  it('should stack and emit one buffer from several multi packet buffer', function () {
    const bufMultPacket = new Buffer([k.OBCIGanglionByteIdMultiPacket]);
    const bufMultPacketStop = new Buffer([k.OBCIGanglionByteIdMultiPacketStop]);
    const buf1 = new Buffer('taco');
    const newBuffer1 = Buffer.concat([bufMultPacket, buf1]);
    ganglion._processBytes(newBuffer1);
    expect(bufferEqual(ganglion.getMutliPacketBuffer(), buf1)).to.equal(true);

    const buf2 = new Buffer('vegas');
    const newBuffer2 = Buffer.concat([bufMultPacket, buf2]);
    ganglion._processBytes(newBuffer2);
    expect(bufferEqual(ganglion.getMutliPacketBuffer(), Buffer.concat([buf1, buf2])));

    const bufStop = new Buffer('hola');
    const newBufferStop = Buffer.concat([bufMultPacketStop, bufStop]);
    let messageEventCalled = false;
    ganglion.once('message', (data) => {
      expect(bufferEqual(data, Buffer.concat([buf1, buf2, bufStop]))).to.equal(true);
      messageEventCalled = true;
    });
    ganglion._processBytes(newBufferStop);
    expect(ganglion.getMutliPacketBuffer()).to.equal(null);
    expect(messageEventCalled).to.equal(true);

    ganglion.once('message', (data) => {
      expect(bufferEqual(data, bufStop)).to.equal(true);
    });
    ganglion._processBytes(newBufferStop);
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
    ganglion._processBytes(newBufferStop);
    expect(ganglion.getMutliPacketBuffer()).to.equal(null);
    expect(messageEventCalled).to.equal(true);
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
      ganglion._processBytes(obciUtils.sampleImpedanceChannel1());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route impedance channel 2 packet', function () {
      ganglion._processBytes(obciUtils.sampleImpedanceChannel2());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route impedance channel 3 packet', function () {
      ganglion._processBytes(obciUtils.sampleImpedanceChannel3());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route impedance channel 4 packet', function () {
      ganglion._processBytes(obciUtils.sampleImpedanceChannel4());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route impedance channel reference packet', function () {
      ganglion._processBytes(obciUtils.sampleImpedanceChannelReference());
      funcSpyImpedanceData.should.have.been.calledOnce;
    });
    it('should route multi packet data', function () {
      ganglion._processBytes(obciUtils.sampleMultiBytePacket(new Buffer('taco')));
      funcSpyMultiBytePacket.should.have.been.calledOnce;
    });
    it('should route multi packet stop data', function () {
      ganglion._processBytes(obciUtils.sampleMultiBytePacketStop(new Buffer('taco')));
      funcSpyMultiBytePacketStop.should.have.been.calledOnce;
    });
    it('should route other data packet', function () {
      ganglion._processBytes(obciUtils.sampleOtherData(new Buffer('blah')));
      funcSpyOtherData.should.have.been.calledOnce;
    });
    it('should route processed data packet', function () {
      ganglion._processBytes(obciUtils.sampleUncompressedData());
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
