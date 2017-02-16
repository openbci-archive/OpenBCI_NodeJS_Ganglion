const Ganglion = require('../../index').Ganglion;
const k = require('../../openBCIConstants');
const verbose = true;
let ganglion = new Ganglion({
  debug: true,
  sendCounts: true,
  verbose: verbose
}, (error) => {
  if (error) {
    console.log(error);
  } else {
    if (verbose) {
      console.log('Ganglion initialize completed');
    }
  }
});

function errorFunc (err) {
  throw err;
}

const impedance = false;
const accel = false;

ganglion.once(k.OBCIEmitterGanglionFound, (peripheral) => {
  ganglion.searchStop().catch(errorFunc);

  let droppedPacketCounter = 0;
  let secondCounter = 0;
  let buf = [];
  let sizeOfBuf = 0;
  ganglion.on('sample', (sample) => {
    /** Work with sample */
    console.log(sample.sampleNumber);

    // UNCOMMENT BELOW FOR DROPPED PACKET CALCULATIONS...
    // if (sample.sampleNumber === 0) {
    //   buf.push(droppedPacketCounter);
    //   sizeOfBuf++;
    //   droppedPacketCounter = 0;
    //   if (sizeOfBuf >= 60) {
    //     var sum = 0;
    //     for (let i = 0; i < buf.length; i++) {
    //       sum += parseInt(buf[i], 10);
    //     }
    //     const percentDropped = sum / 6000 * 100;
    //     console.log(`dropped packet rate: ${sum} - percent dropped: %${percentDropped.toFixed(2)}`);
    //     buf.shift();
    //   } else {
    //     console.log(`time till average rate starts ${60 - sizeOfBuf}`);
    //   }
    // }
  });

  ganglion.on('close', () => {
    console.log('close event');
  });

  ganglion.on('droppedPacket', (data) => {
    console.log('droppedPacket:', data);
    droppedPacketCounter++;
  });

  ganglion.on('message', (message) => {
    console.log('message: ', message.toString());
  });

  let lastVal = 0;
  ganglion.on('accelerometer', (accelData) => {
    // Use accel array [0, 0, 0]
    if (accelData[2] - lastVal > 1) {
      console.log(`Diff: ${accelData[2] - lastVal}`);
    }
    lastVal = accelData[2];
    // console.log(`counter: ${accelData[2]}`);
  });

  ganglion.on('impedance', (impedanceObj) => {
    console.log(`channel ${impedanceObj.channelNumber} has impedance ${impedanceObj.impedanceValue}`);
  });

  ganglion.once('ready', () => {
      // if (accel) {
      //     ganglion.accelStart()
      //         .then(() => {
      //             return ganglion.streamStart();
      //         })
      //         .catch(errorFunc);
      // } else if (impedance) {
      //     ganglion.impedanceStart().catch(errorFunc);
      // } else {
      //
      // }
      ganglion.streamStart().catch(errorFunc);
      console.log('ready');

  });

  ganglion.connect("Ganglion-58f3").catch(errorFunc);
});

function exitHandler (options, err) {
  if (options.cleanup) {
    if (verbose) console.log('clean');
    // console.log(connectedPeripheral)
    ganglion.manualDisconnect = true;
    ganglion.disconnect();
    ganglion.removeAllListeners('droppedPacket');
    ganglion.removeAllListeners('accelerometer');
    ganglion.removeAllListeners('sample');
    ganglion.removeAllListeners('message');
    ganglion.removeAllListeners('impedance');
    ganglion.removeAllListeners('close');
    ganglion.removeAllListeners('error');
    ganglion.removeAllListeners('ganglionFound');
    ganglion.removeAllListeners('ready');
    ganglion.destroyNoble();

  }
  if (err) console.log(err.stack);
  if (options.exit) {
    if (verbose) console.log('exit');
    if (impedance) {
      ganglion.impedanceStop().catch(console.log);
    }
    if (ganglion.isSearching()) {
      ganglion.searchStop().catch(console.log);
    }
    if (accel) {
      ganglion.accelStop().catch(console.log);
    }
    ganglion.manualDisconnect = true;
    ganglion.disconnect(true).catch(console.log);
    process.exit(0);
  }
}

if (process.platform === "win32") {
  const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("SIGINT", function () {
    process.emit("SIGINT");
  });
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, {
  cleanup: true
}));

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {
  exit: true
}));

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
  exit: true
}));
