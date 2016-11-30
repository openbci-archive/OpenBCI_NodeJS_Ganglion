'use strict';
const k = require('./openBCIConstants');
const _ = require('underscore');

module.exports = {
  getPeripheralLocalNames,
  getPeripheralWithLocalName,
  /**
   * Converts a special ganglion 18 bit compressed number
   *  The compressions uses the LSB, bit 1, as the signed bit, instead of using
   *  the MSB. Therefore you must not look to the MSB for a sign extension, one
   *  must look to the LSB, and the same rules applies, if it's a 1, then it's a
   *  negative and if it's 0 then it's a positive number.
   * @param threeByteBuffer {Buffer}
   *  A 3-byte buffer with only 18 bits of actual data.
   * @return {number} A signed integer.
   */
  convert18bitAsInt32: (threeByteBuffer) => {
    let prefix = 0;

    if (threeByteBuffer[2] & 0x01 > 0) {
      // console.log('\t\tNegative number')
      prefix = 0b11111111111111;
    }

    return (prefix << 18) | (threeByteBuffer[0] << 16) | (threeByteBuffer[1] << 8) | threeByteBuffer[2];
  },
  /**
   * @description Takes a buffer filled with 3 16 bit integers from an OpenBCI device and converts based on settings
   *                  of the MPU, values are in ?
   * @param dataBuf {Buffer} - Buffer that is 6 bytes long
   * @param sendCounts {Boolean} - Multiply by scale factor.
   * @returns {Array} - Array of floats 3 elements long
   * @author AJ Keller (@pushtheworldllc)
   */
  getDataArrayAccel: (dataBuf, sendCounts) => {
    const ACCEL_NUMBER_AXIS = 3;
    // Scale factor for aux data
    const SCALE_FACTOR_ACCEL = 0.008 / Math.pow(2, 6);
    // Must assume +/-4g, normal mode (opposed to low power mode), 12 bits left justfied.
    let accelData = [];
    for (let i = 0; i < ACCEL_NUMBER_AXIS; i++) {
      let index = i * 2;
      if (sendCounts) {
        accelData.push(interpret16bitAsInt32(dataBuf.slice(index, index + 2)));
      } else {
        accelData.push(interpret16bitAsInt32(dataBuf.slice(index, index + 2)) * SCALE_FACTOR_ACCEL);
      }
    }
    return accelData;
  },
  /**
   * @description Very safely checks to see if the noble peripheral is a
   *  ganglion by way of checking the local name property.
   */
  isPeripheralGanglion: (peripheral) => {
    if (peripheral) {
      if (peripheral.hasOwnProperty('advertisement')) {
        if (peripheral.advertisement !== null && peripheral.advertisement.hasOwnProperty('localName')) {
          if (peripheral.advertisement.localName !== undefined && peripheral.advertisement.localName !== null) {
            if (peripheral.advertisement.localName.indexOf(k.OBCIGanglionPrefix) > -1) {
              return true;
            }
          }
        }
      }
    }
    return false;
  },
  sampleAccel: () => {
    return new Buffer([k.OBCIGanglionByteIdAccel, 0, 0, 0, 1, 0, 2]);
  },
  sampleCompressedData: (sampleNumber) => {
    return new Buffer(
      [
        sampleNumber, // 0
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
  },
  sampleImpedanceChannel1: () => {
    return new Buffer([k.OBCIGanglionByteIdImpedanceChannel1, 0, 0, 1]);
  },
  sampleImpedanceChannel2: () => {
    return new Buffer([k.OBCIGanglionByteIdImpedanceChannel2, 0, 0, 1]);
  },
  sampleImpedanceChannel3: () => {
    return new Buffer([k.OBCIGanglionByteIdImpedanceChannel3, 0, 0, 1]);
  },
  sampleImpedanceChannel4: () => {
    return new Buffer([k.OBCIGanglionByteIdImpedanceChannel4, 0, 0, 1]);
  },
  sampleImpedanceChannelReference: () => {
    return new Buffer([k.OBCIGanglionByteIdImpedanceChannelReference, 0, 0, 1]);
  },
  sampleMultiBytePacket: (data) => {
    const bufPre = new Buffer([k.OBCIGanglionByteIdMultiPacket]);
    return Buffer.concat([bufPre, data]);
  },
  sampleMultiBytePacketStop: (data) => {
    const bufPre = new Buffer([k.OBCIGanglionByteIdMultiPacketStop]);
    return Buffer.concat([bufPre, data]);
  },
  sampleOtherData: (data) => {
    const bufPre = new Buffer([255]);
    return Buffer.concat([bufPre, data]);
  },
  sampleUncompressedData: () => {
    return new Buffer(
      [
        0b00000000, // 0
        0b00000000, // 1
        0b00000000, // 2
        0b00000001, // 3
        0b00000000, // 4
        0b00000000, // 5
        0b00000010, // 6
        0b00000000, // 7
        0b00000000, // 8
        0b00000011, // 9
        0b00000000, // 10
        0b00000000, // 11
        0b00000100, // 12
        0b00000001, // 13
        0b00000010, // 14
        0b00000011, // 15
        0b00000100, // 16
        0b00000101, // 17
        0b00000110, // 18
        0b00000111  // 19
      ]);
  }
};

/**
 * @description Get a list of local names from an array of peripherals
 */
function getPeripheralLocalNames (pArray) {
  return new Promise((resolve, reject) => {
    var list = [];
    _.each(pArray, perif => {
      list.push(perif.advertisement.localName);
    });
    if (list.length > 0) {
      return resolve(list);
    } else {
      return reject(`No peripherals discovered with prefix equal to ${k.OBCIGanglionPrefix}`);
    }
  });
}

/**
 * @description Get a peripheral with a local name
 * @param `pArray` {Array} - Array of peripherals
 * @param `localName` {String} - The local name of the BLE device.
 */
function getPeripheralWithLocalName (pArray, localName) {
  return new Promise((resolve, reject) => {
    if (typeof (pArray) !== 'object') return reject(`pArray must be of type Object`);
    _.each(pArray, perif => {
      if (perif.advertisement.hasOwnProperty('localName')) {
        if (perif.advertisement.localName === localName) {
          return resolve(perif);
        }
      }
    });
    return reject(`No peripheral found with localName: ${localName}`);
  });
}

function interpret16bitAsInt32 (twoByteBuffer) {
  var prefix = 0;

  if (twoByteBuffer[0] > 127) {
    // console.log('\t\tNegative number')
    prefix = 65535; // 0xFFFF
  }

  return (prefix << 16) | (twoByteBuffer[0] << 8) | twoByteBuffer[1];
}
