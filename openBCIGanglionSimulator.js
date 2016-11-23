// const dgram = require('dgram');
// const gaussian = require('gaussian');
// const k = require('openBCIContants');

// let stream;

// var startStream = () => {
//   const intervalInMS = 1000 / k.OBCISampleRate200;
//   let sampleNumber = 0;
//   let sampleGenerator = randomSample(4, k.OBCISampleRate200, true, `60Hz`);
//
//   var getSample = sampleNumber => {
//     let arr = getArrayFromSample(sampleGenerator(sampleNumber));
//       // console.log(`${sampleNumber},${arr[0].toString()},${arr[1].toString()},${arr[2].toString()},${arr[3].toString()}`);
//     return `${sampleNumber},${arr[0].toString()},${arr[1].toString()},${arr[2].toString()},${arr[3].toString()}`;
//   };
//
//   stream = setInterval(() => {
//     let sampArray = getSample(sampleNumber);
//     // Send the packet to all clients
//     this.emit('read', samp);
//     // Increment the sample number
//     sampleNumber++;
//   }, intervalInMS);
// };

/**
 * @description Mainly used by the simulator to convert a randomly generated sample into a std OpenBCI V3 Packet
 * @param sample - A sample object
 * @returns {Array}
 */
// function getArrayFromSample (sample) {
//   var array = [];
//   for (var i = 0; i < 4; i++) {
//     array.push(Math.floor(interpret24bitAsInt32(floatTo3ByteBuffer(sample.channelData[i]))));
//   }
//   return array;
// }

// function floatTo3ByteBuffer (float) {
//   var intBuf = new Buffer(3); // 3 bytes for 24 bits
//   intBuf.fill(0); // Fill the buffer with 0s
//
//   var temp = float / (k.OBCIGanglionMCP3912Vref / k.OBCIGanglionMCP3912Gain / (Math.pow(2, 23) - 1)); // Convert to counts
//
//   temp = Math.floor(temp); // Truncate counts number
//
//     // Move into buffer
//   intBuf[2] = temp & 255;
//   intBuf[1] = (temp & (255 << 8)) >> 8;
//   intBuf[0] = (temp & (255 << 16)) >> 16;
//
//   return intBuf;
// }
//
// /**
//  * @description Create a configurable function to return samples for a simulator. This implements 1/f filtering injection to create more brain like data.
//  * @param numberOfChannels {Number} - The number of channels in the sample... either 8 or 16
//  * @param sampleRateHz {Number} - The sample rate
//  * @param injectAlpha {Boolean} - True if you want to inject noise
//  * @param lineNoise {String} - A string that can be either:
//  *              `60Hz` - 60Hz line noise (Default) (ex. __United States__)
//  *              `50Hz` - 50Hz line noise (ex. __Europe__)
//  *              `None` - Do not inject line noise.
//  *
//  * @returns {Function}
//  */
// var randomSample = (numberOfChannels, sampleRateHz, injectAlpha, lineNoise) => {
//   const distribution = gaussian(0, 1);
//   const sineWaveFreqHz10 = 10;
//   const sineWaveFreqHz50 = 50;
//   const sineWaveFreqHz60 = 60;
//   const uVolts = 1000000;
//
//   var sinePhaseRad = new Array(numberOfChannels + 1); // prevent index error with '+1'
//   sinePhaseRad.fill(0);
//
//   // Init arrays to hold coefficients for each channel and init to 0
//   //  This gives the 1/f filter memory on each iteration
//   var b0 = new Array(numberOfChannels).fill(0);
//   var b1 = new Array(numberOfChannels).fill(0);
//   var b2 = new Array(numberOfChannels).fill(0);
//
//   /**
//    * @description Use a 1/f filter
//    * @param previousSampleNumber {Number} - The previous sample number
//    */
//   return previousSampleNumber => {
//     let sample = newSample();
//     for (var i = 0; i < numberOfChannels; i++) { // channels are 0 indexed
//           // This produces white noise
//       let whiteNoise = distribution.ppf(Math.random()) * Math.sqrt(sampleRateHz / 2) / uVolts;
//
//       switch (i) {
//         case 0: // Add 10Hz signal to channel 1... brainy
//         case 1:
//           if (injectAlpha) {
//             sinePhaseRad[i] += 2 * Math.PI * sineWaveFreqHz10 / sampleRateHz;
//             if (sinePhaseRad[i] > 2 * Math.PI) {
//               sinePhaseRad[i] -= 2 * Math.PI;
//             }
//             whiteNoise += (5 * Math.SQRT2 * Math.sin(sinePhaseRad[i])) / uVolts;
//           }
//           break;
//         default:
//           sinePhaseRad[i] += 2 * Math.PI * sineWaveFreqHz60 / sampleRateHz;
//           if (sinePhaseRad[i] > 2 * Math.PI) {
//             sinePhaseRad[i] -= 2 * Math.PI;
//           }
//           whiteNoise += (8 * Math.SQRT2 * Math.sin(sinePhaseRad[i])) / uVolts;
//           break;
//       }
//           /**
//            * See http://www.firstpr.com.au/dsp/pink-noise/ section "Filtering white noise to make it pink"
//            */
//       b0[i] = 0.99765 * b0[i] + whiteNoise * 0.0990460;
//       b1[i] = 0.96300 * b1[i] + whiteNoise * 0.2965164;
//       b2[i] = 0.57000 * b2[i] + whiteNoise * 1.0526913;
//       sample.channelData[i] = b0[i] + b1[i] + b2[i] + whiteNoise * 0.1848;
//     }
//     if (previousSampleNumber == 255) {
//       sample.sampleNumber = 0;
//     } else {
//       sample.sampleNumber = previousSampleNumber + 1;
//     }
//
//     return sample;
//   };
// };
//
// function newSample (sampleNumber) {
//   if (sampleNumber || sampleNumber === 0) {
//     if (sampleNumber > 255) {
//       sampleNumber = 255;
//     }
//   } else {
//     sampleNumber = 0;
//   }
//   return {
//     sampleNumber: sampleNumber,
//     channelData: []
//   };
// }
