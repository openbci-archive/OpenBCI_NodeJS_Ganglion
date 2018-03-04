const Ganglion = require('../../openBCIGanglion');
const k = require('openbci-utilities/dist/constants');
const verbose = true;
const debug = false;
let ganglion = new Ganglion({
  bled112: true,
  debug: debug,
  nobleScanOnPowerOn: true,
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
const DO_PACKET_CALCULATIONS = true;
const cycle = () => {
  ganglion.once(k.OBCIEmitterGanglionFound, (peripheral) => {
    // UNCOMMENT BELOW FOR DROPPED PACKET CALCULATIONS...
    let droppedPacketCounter = 0;
    let buf = [];
    let sizeOfBuf = 0;
    let droppedPacketFunc = () => {
      buf.push(droppedPacketCounter);
      sizeOfBuf++;
      droppedPacketCounter = 0;
      if (sizeOfBuf >= 60) {
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          sum += parseInt(buf[i], 10);
        }
        const percentDropped = sum / 6000 * 100;
        console.log(`dropped packet rate: ${sum} - percent dropped: %${percentDropped.toFixed(2)}`);
        buf.shift();
      } else {
        console.log(`time till average rate starts ${60 - sizeOfBuf}`);
      }
    };
    let droppedPacketInterval = null;
    ganglion.on('sample', (sample) => {
      /** Work with sample */
      if (sample.valid) {
        console.log(JSON.stringify(sample));
        // UNCOMMENT BELOW FOR DROPPED PACKET CALCULATIONS...
        if (DO_PACKET_CALCULATIONS) {
          if (droppedPacketInterval === null) {
            droppedPacketInterval = setInterval(droppedPacketFunc, 1000);
          }
        }
      } else {
        console.log('err');
      }
    });

    ganglion.on('close', () => {
      console.log('close event');
    });

    ganglion.on('droppedPacket', (data) => {
      // console.log('droppedPacket', data);
      if (DO_PACKET_CALCULATIONS) {
        droppedPacketCounter++;
      }
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
      console.log('ready');
      setTimeout(() => {
        console.log('start stream');
        ganglion.streamStart().catch(errorFunc);
      }, 2000);
      // ganglion.disconnect(false)
      //   .then(() => {
      //     console.log('disconnected');
      //   })
      //   .catch((err) => {
      //     console.log(err);
      //   })
    });
    console.log('Date: ', Date.now());
    ganglion.searchStop()
      .then(() => {
        console.log('Date: ', Date.now());
        return ganglion.connect(peripheral.advertisementDataString);
      }).catch(errorFunc);
  });
};

cycle();

function exitHandler (options, err) {
  if (options.cleanup) {
    if (verbose) console.log('clean');
    ganglion.destroyBLED112();
    ganglion.cleanupEmitters();
  }
  if (err) console.log(err.stack);
  if (options.exit) {
    if (verbose) console.log('exit');
    if (impedance) {
      ganglion.impedanceStop().catch(console.log);
    }

    if (accel) {
      ganglion.accelStop().catch(console.log);
    }

    if (ganglion.isSearching()) {
      ganglion.searchStop()
        .catch((err) => {
          console.log(err);
          process.exit(0);
        });
    } else {
      if (verbose) console.log('Disconnecting ganglion');
      ganglion.disconnect(true)
        .then(() => {
          if (verbose) console.log('Disconnected!');
          process.exit(0);
        })
        .catch((err) => {
          console.log(err);
          process.exit(0);
        });
    }
  }
}

if (process.platform === 'win32') {
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('SIGINT', function () {
    process.emit('SIGINT');
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
