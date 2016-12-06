/**
* Created by ajk on 12/16/15.
*/
'use strict';
// const bluebirdChecks = require('./bluebirdChecks');
const assert = require('assert');
const k = require('../openBCIConstants');
const chai = require('chai');
const expect = chai.expect;
const should = chai.should(); // eslint-disable-line no-unused-vars
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

describe('OpenBCIConstants', function () {
  // afterEach(() => bluebirdChecks.noPendingPromises());
  describe('Turning Channels Off', function () {
    it('channel 1', function () {
      assert.equal('1', k.OBCIChannelOff1);
    });
    it('channel 2', function () {
      assert.equal('2', k.OBCIChannelOff2);
    });
    it('channel 3', function () {
      assert.equal('3', k.OBCIChannelOff3);
    });
    it('channel 4', function () {
      assert.equal('4', k.OBCIChannelOff4);
    });
  });
  describe('Turning Channels On', function () {
    it('channel 1', function () {
      assert.equal('!', k.OBCIChannelOn1);
    });
    it('channel 2', function () {
      assert.equal('@', k.OBCIChannelOn2);
    });
    it('channel 3', function () {
      assert.equal('#', k.OBCIChannelOn3);
    });
    it('channel 4', function () {
      assert.equal('$', k.OBCIChannelOn4);
    });
  });
  describe('SD card Commands', function () {
    it('logs for 1 hour', function () {
      assert.equal('G', k.OBCISDLogForHour1);
    });
    it('logs for 2 hours', function () {
      assert.equal('H', k.OBCISDLogForHour2);
    });
    it('logs for 4 hours', function () {
      assert.equal('J', k.OBCISDLogForHour4);
    });
    it('logs for 12 hours', function () {
      assert.equal('K', k.OBCISDLogForHour12);
    });
    it('logs for 24 hours', function () {
      assert.equal('L', k.OBCISDLogForHour24);
    });
    it('logs for 5 minutes', function () {
      assert.equal('A', k.OBCISDLogForMin5);
    });
    it('logs for 15 minutes', function () {
      assert.equal('S', k.OBCISDLogForMin15);
    });
    it('logs for 30 minutes', function () {
      assert.equal('F', k.OBCISDLogForMin30);
    });
    it('logs for 14 seconds', function () {
      assert.equal('a', k.OBCISDLogForSec14);
    });
    it('stop logging and close the SD file', function () {
      assert.equal('j', k.OBCISDLogStop);
    });
  });
  describe('SD card string Commands', function () {
    it('logs for 1 hour', function () {
      assert.equal('1hour', k.OBCIStringSDHour1);
    });
    it('logs for 2 hours', function () {
      assert.equal('2hour', k.OBCIStringSDHour2);
    });
    it('logs for 4 hours', function () {
      assert.equal('4hour', k.OBCIStringSDHour4);
    });
    it('logs for 12 hours', function () {
      assert.equal('12hour', k.OBCIStringSDHour12);
    });
    it('logs for 24 hours', function () {
      assert.equal('24hour', k.OBCIStringSDHour24);
    });
    it('logs for 5 minutes', function () {
      assert.equal('5min', k.OBCIStringSDMin5);
    });
    it('logs for 15 minutes', function () {
      assert.equal('15min', k.OBCIStringSDMin15);
    });
    it('logs for 30 minutes', function () {
      assert.equal('30min', k.OBCIStringSDMin30);
    });
    it('logs for 14 seconds', function () {
      assert.equal('14sec', k.OBCIStringSDSec14);
    });
  });
  describe('#sdSettingForString', function () {
    it('correct command for 1 hour', function () {
      var expectation = k.OBCISDLogForHour1;
      var result = k.sdSettingForString('1hour');
      return expect(result).to.eventually.equal(expectation);
    });
    it('correct command for 2 hour', function () {
      var expectation = k.OBCISDLogForHour2;
      var result = k.sdSettingForString('2hour');
      return expect(result).to.eventually.equal(expectation);
    });
    it('correct command for 4 hour', function () {
      var expectation = k.OBCISDLogForHour4;
      var result = k.sdSettingForString('4hour');
      return expect(result).to.eventually.equal(expectation);
    });
    it('correct command for 12 hour', function () {
      var expectation = k.OBCISDLogForHour12;
      var result = k.sdSettingForString('12hour');
      return expect(result).to.eventually.equal(expectation);
    });
    it('correct command for 24 hour', function () {
      var expectation = k.OBCISDLogForHour24;
      var result = k.sdSettingForString('24hour');
      return expect(result).to.eventually.equal(expectation);
    });
    it('correct command for 5 min', function () {
      var expectation = k.OBCISDLogForMin5;
      var result = k.sdSettingForString('5min');
      return expect(result).to.eventually.equal(expectation);
    });
    it('correct command for 15 min', function () {
      var expectation = k.OBCISDLogForMin15;
      var result = k.sdSettingForString('15min');
      return expect(result).to.eventually.equal(expectation);
    });
    it('correct command for 30 min', function () {
      var expectation = k.OBCISDLogForMin30;
      var result = k.sdSettingForString('30min');
      return expect(result).to.eventually.equal(expectation);
    });
    it('correct command for 14 seconds', function () {
      var expectation = k.OBCISDLogForSec14;
      var result = k.sdSettingForString('14sec');
      return expect(result).to.eventually.equal(expectation);
    });
    it('Invalid command request', function () {
      var result = k.sdSettingForString('taco');
      return expect(result).to.be.rejected;
    });
  });
  describe('Stream Data Commands', function () {
    it('starts', function () {
      assert.equal('b', k.OBCIStreamStart);
    });
    it('stops', function () {
      assert.equal('s', k.OBCIStreamStop);
    });
  });
  describe('Accel enable/disable commands', function () {
    it('starts', function () {
      assert.equal('n', k.OBCIAccelStart);
    });
    it('stops', function () {
      assert.equal('N', k.OBCIAccelStop);
    });
  });
  describe('Miscellaneous', function () {
    it('queries register settings', function () {
      assert.equal('?', k.OBCIMiscQueryRegisterSettings);
    });
    it('softly resets the board', function () {
      assert.equal('v', k.OBCIMiscSoftReset);
    });
    it('resend packet', function () {
      assert.equal('o', k.OBCIMiscResend);
    });
  });
  describe('should return correct channel off command for number', function () {
    it('Channel 1', function () {
      var expectation = '1';
      var result = k.commandChannelOff(1);
      return expect(result).to.eventually.equal(expectation);
    });
    it('Channel 2', function () {
      var expectation = '2';
      var result = k.commandChannelOff(2);
      return expect(result).to.eventually.equal(expectation);
    });
    it('Channel 3', function () {
      var expectation = '3';
      var result = k.commandChannelOff(3);
      return expect(result).to.eventually.equal(expectation);
    });
    it('Channel 4', function () {
      var expectation = '4';
      var result = k.commandChannelOff(4);
      return expect(result).to.eventually.equal(expectation);
    });
    it('Invalid channel request', function () {
      var result = k.commandChannelOff(17);
      return expect(result).to.be.rejected;
    });
  });
  describe('should return correct channel on command for number', function () {
    it('Channel 1', function () {
      var expectation = '!';
      var result = k.commandChannelOn(1);
      return expect(result).to.eventually.equal(expectation);
    });
    it('Channel 2', function () {
      var expectation = '@';
      var result = k.commandChannelOn(2);
      return expect(result).to.eventually.equal(expectation);
    });
    it('Channel 3', function () {
      var expectation = '#';
      var result = k.commandChannelOn(3);
      return expect(result).to.eventually.equal(expectation);
    });
    it('Channel 4', function () {
      var expectation = '$';
      var result = k.commandChannelOn(4);
      return expect(result).to.eventually.equal(expectation);
    });
    it('Invalid channel request', function () {
      var result = k.commandChannelOn(17);
      return expect(result).to.be.rejected;
    });
  });
  describe('Number of channels', function () {
    it('Ganglion', function () {
      assert.equal(4, k.OBCINumberOfChannelsGanglion);
    });
  });
  describe('Possible Sample Rates', function () {
    it('should be 250', function () {
      assert.equal(200, k.OBCISampleRate200);
    });
  });
  describe('#getVersionNumber', function () {
    it('should get the major version number from a github standard version string', () => {
      var expectedVersion = 6;
      var inputStringVersion = 'v6.0.0';

      expect(k.getVersionNumber(inputStringVersion)).to.equal(expectedVersion);
    });
  });
  describe('Emitters', function () {
    it('Event Emitter Accelerometer', function () {
      assert.equal('accelerometer', k.OBCIEmitterAccelerometer);
    });
    it('Event Emitter BLE Powered On', function () {
      assert.equal('blePoweredOn', k.OBCIEmitterBlePoweredUp);
    });
    it('Event Emitter Close', function () {
      assert.equal('close', k.OBCIEmitterClose);
    });
    it('Event Emitter Dropped Packet', function () {
      assert.equal('droppedPacket', k.OBCIEmitterDroppedPacket);
    });
    it('Event Emitter Error', function () {
      assert.equal('error', k.OBCIEmitterError);
    });
    it('Event Emitter Ganglion Found', function () {
      assert.equal('ganglionFound', k.OBCIEmitterGanglionFound);
    });
    it('Event Emitter Impedance', function () {
      assert.equal('impedance', k.OBCIEmitterImpedance);
    });
    it('Event Emitter Message', function () {
      assert.equal('message', k.OBCIEmitterMessage);
    });
    it('Event Emitter Query', function () {
      assert.equal('query', k.OBCIEmitterQuery);
    });
    it('Event Emitter Raw Data Packet', function () {
      assert.equal('rawDataPacket', k.OBCIEmitterRawDataPacket);
    });
    it('Event Emitter Ready', function () {
      assert.equal('ready', k.OBCIEmitterReady);
    });
    it('Event Emitter Sample', function () {
      assert.equal('sample', k.OBCIEmitterSample);
    });
  });
  describe('General', function () {
    it('Ganglion prefix', function () {
      assert.equal('Ganglion', k.OBCIGanglionPrefix);
    });
    it('Ganglion ble search time', function () {
      assert.equal(20000, k.OBCIGanglionBleSearchTime);
    });
    it('packet size', function () {
      assert.equal(20, k.OBCIGanglionPacketSize);
    });
    it('samples per packet', function () {
      assert.equal(2, k.OBCIGanglionSamplesPerPacket);
    });
    it('packet positions', function () {
      assert.equal(0, k.OBCIGanglionPacket.byteId);
      assert.equal(1, k.OBCIGanglionPacket.dataStart);
      assert.equal(19, k.OBCIGanglionPacket.dataStop);
      assert.equal(20, k.OBCIGanglionPacket.auxByte);
    });
  });
  describe('Commands', function () {
    it('Synthetic data mode enable', function () {
      assert.equal('t', k.OBCIGanglionSyntheticDataEnable);
    });
    it('Synthetic data mode disable', function () {
      assert.equal('T', k.OBCIGanglionSyntheticDataDisable);
    });
    it('Impedance start', function () {
      assert.equal('z', k.OBCIGanglionImpedanceStart);
    });
    it('Impedance stop', function () {
      assert.equal('Z', k.OBCIGanglionImpedanceStop);
    });
  });
  describe('Byte Id', function () {
    it('Raw data', function () {
      assert.equal(0, k.OBCIGanglionByteIdUncompressed);
    });
    it('Sample maximum', function () {
      assert.equal(127, k.OBCIGanglionByteIdSampleMax);
    });
    it('Sample minimum', function () {
      assert.equal(1, k.OBCIGanglionByteIdSampleMin);
    });
    it('Accel', function () {
      assert.equal(128, k.OBCIGanglionByteIdAccel);
    });
    it('Impedance channel 1', function () {
      assert.equal(129, k.OBCIGanglionByteIdImpedanceChannel1);
    });
    it('Impedance channel 2', function () {
      assert.equal(130, k.OBCIGanglionByteIdImpedanceChannel2);
    });
    it('Impedance channel 3', function () {
      assert.equal(131, k.OBCIGanglionByteIdImpedanceChannel3);
    });
    it('Impedance channel 4', function () {
      assert.equal(132, k.OBCIGanglionByteIdImpedanceChannel4);
    });
    it('Impedance channel reference', function () {
      assert.equal(133, k.OBCIGanglionByteIdImpedanceChannelReference);
    });
    it('Multi packet', function () {
      assert.equal(134, k.OBCIGanglionByteIdMultiPacket);
    });
    it('Multi packet stop', function () {
      assert.equal(135, k.OBCIGanglionByteIdMultiPacketStop);
    });
  });
  describe('simblee', function () {
    it('Service', function () {
      assert.equal('fe84', k.SimbleeUuidService);
    });
    it('Receive', function () {
      assert.equal('2d30c082f39f4ce6923f3484ea480596', k.SimbleeUuidReceive);
    });
    it('Service', function () {
      assert.equal('2d30c083f39f4ce6923f3484ea480596', k.SimbleeUuidSend);
    });
    it('Service', function () {
      assert.equal('2d30c084f39f4ce6923f3484ea480596', k.SimbleeUuidDisconnect);
    });
  });
  describe('noble', function () {
    it('Peripheral Connect', function () {
      assert.equal('connect', k.OBCINobleEmitterPeripheralConnect);
    });
    it('Peripheral Disconnect', function () {
      assert.equal('disconnect', k.OBCINobleEmitterPeripheralDisconnect);
    });
    it('Peripheral Discover', function () {
      assert.equal('discover', k.OBCINobleEmitterPeripheralDiscover);
    });
    it('Peripheral Services Discover', function () {
      assert.equal('servicesDiscover', k.OBCINobleEmitterPeripheralServicesDiscover);
    });
    it('Service Characteristics Discover', function () {
      assert.equal('characteristicsDiscover', k.OBCINobleEmitterServiceCharacteristicsDiscover);
    });
    it('Service Read', function () {
      assert.equal('read', k.OBCINobleEmitterServiceRead);
    });
    it('Discover', function () {
      assert.equal('discover', k.OBCINobleEmitterDiscover);
    });
    it('Scan Start', function () {
      assert.equal('scanStart', k.OBCINobleEmitterScanStart);
    });
    it('Scan Stop', function () {
      assert.equal('scanStop', k.OBCINobleEmitterScanStop);
    });
    it('State Change', function () {
      assert.equal('stateChange', k.OBCINobleEmitterStateChange);
    });
    it('State Powered On', function () {
      assert.equal('poweredOn', k.OBCINobleStatePoweredOn);
    });
  });
});
