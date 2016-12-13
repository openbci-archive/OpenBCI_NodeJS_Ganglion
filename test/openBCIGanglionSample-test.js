'use strict';
// const sinon = require('sinon');
const chai = require('chai');
const should = chai.should(); // eslint-disable-line no-unused-vars
const expect = chai.expect;
const assert = chai.assert;
const ganglionSample = require('../openBCIGanglionSample');
const k = require('../openBCIConstants');

var chaiAsPromised = require('chai-as-promised');
var sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('openBCIGanglionUtils', function () {
  describe('#convert18bitAsInt32', function () {
    it('converts a small positive number', function () {
      const buf1 = new Buffer([0x00, 0x06, 0x90]); // 0x000690 === 1680
      const num = ganglionSample.convert18bitAsInt32(buf1);
      assert.equal(num, 1680);
    });
    it('converts a small positive number', function () {
      const buf1 = new Buffer([0x00, 0x06, 0x90]); // 0x000690 === 1680
      const num = ganglionSample.convert18bitAsInt32(buf1);
      assert.equal(num, 1680);
    });
    it('converts a large positive number', function () {
      const buf1 = new Buffer([0x02, 0xC0, 0x00]); // 0x02C001 === 180225
      const num = ganglionSample.convert18bitAsInt32(buf1);
      assert.equal(num, 180224);
    });
    it('converts a small negative number', function () {
      const buf1 = new Buffer([0xFF, 0xFF, 0xFF]); // 0xFFFFFF === -1
      const num = ganglionSample.convert18bitAsInt32(buf1);
      num.should.be.approximately(-1, 1);
    });
    it('converts a large negative number', function () {
      const buf1 = new Buffer([0x04, 0xA1, 0x01]); // 0x04A101 === -220927
      const num = ganglionSample.convert18bitAsInt32(buf1);
      num.should.be.approximately(-220927, 1);
    });
  });
  describe('#convert19bitAsInt32', function () {
    it('converts a small positive number', function () {
      const buf1 = new Buffer([0x00, 0x06, 0x90]); // 0x000690 === 1680
      const num = ganglionSample.convert19bitAsInt32(buf1);
      assert.equal(num, 1680);
    });
    it('converts a small positive number', function () {
      const buf1 = new Buffer([0x00, 0x06, 0x90]); // 0x000690 === 1680
      const num = ganglionSample.convert19bitAsInt32(buf1);
      assert.equal(num, 1680);
    });
    it('converts a large positive number', function () {
      const buf1 = new Buffer([0x02, 0xC0, 0x00]); // 0x02C001 === 180225
      const num = ganglionSample.convert19bitAsInt32(buf1);
      assert.equal(num, 180224);
    });
    it('converts a small negative number', function () {
      const buf1 = new Buffer([0xFF, 0xFF, 0xFF]); // 0xFFFFFF === -1
      const num = ganglionSample.convert19bitAsInt32(buf1);
      num.should.be.approximately(-1, 1);
    });
    it('converts a large negative number', function () {
      const buf1 = new Buffer([0x04, 0xA1, 0x01]); // 0x04A101 === -220927
      const num = ganglionSample.convert19bitAsInt32(buf1);
      num.should.be.approximately(-220927, 1);
    });
  });
  describe('decompressDeltas18Bit', function () {
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
      let actualValue = ganglionSample.decompressDeltas18Bit(buffer);

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
      let actualValue = ganglionSample.decompressDeltas18Bit(buffer);

      for (let i = 0; i < 4; i++) {
        (actualValue[0][i]).should.equal(expectedValue[0][i]);
        (actualValue[1][i]).should.equal(expectedValue[1][i]);
      }
    });
  });
  describe('decompressDeltas19Bit', function () {
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
      let actualValue = ganglionSample.decompressDeltas19Bit(buffer);
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
      let actualValue = ganglionSample.decompressDeltas19Bit(buffer);

      for (let i = 0; i < 4; i++) {
        (actualValue[0][i]).should.equal(expectedValue[0][i]);
        (actualValue[1][i]).should.equal(expectedValue[1][i]);
      }
    });
  });
});
