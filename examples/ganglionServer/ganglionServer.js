const Ganglion = require('../../index').Ganglion;
const k = require('../../openBCIConstants');
const verbose = true;
var ganglion = new Ganglion({
  // debug: true,
  sendCounts: true,
  verbose: verbose
});

function errorFunc (err) {
  throw err;
}

const impedance = false;
const accel = true;

ganglion.once(k.OBCIEmitterGanglionFound, (peripheral) => {
  ganglion.searchStop().catch(errorFunc);

  ganglion.on('sample', (sample) => {
    /** Work with sample */
    // console.log(sample.sampleNumber);
    // for (var i = 0; i < ganglion.numberOfChannels(); i++) {
    //   console.log("Channel " + (i + 1) + ": " + sample.channelData[i].toFixed(8) + " Volts.");
    // }
  });

  ganglion.on('droppedPackets', (data) => {
    // console.log('droppedPackets:', data);
  });

  ganglion.on('message', (message) => {
    console.log('message: ', message.toString());
  });

  ganglion.on('accelerometer', (accelData) => {
    // Use accel array [0, 0, 0]
    console.log(`counter: ${accelData[2]}`);
  });

  ganglion.on('impedance', (impedanceObj) => {
    console.log(`channel ${impedanceObj.channelNumber} has impedance ${impedanceObj.impedanceValue}`);
  });

  ganglion.once('ready', () => {
    if (accel) {
      ganglion.accelStart()
        .then(() => {
          return ganglion.streamStart();
        })
        .catch(errorFunc);
    } else if (impedance) {
      ganglion.impedanceStart().catch(errorFunc);
    } else {
      ganglion.streamStart().catch(errorFunc);
    }
    console.log('ready');
  });

  ganglion.connect(peripheral).catch(errorFunc);
});

ganglion.searchStart().catch(errorFunc);

function exitHandler (options, err) {
  if (options.cleanup) {
    if (verbose) console.log('clean');
    // console.log(connectedPeripheral)
    if (impedance) {
      ganglion.impedanceStop();
    }
    if (ganglion.isSearching()) {
      ganglion.searchStop();
    }
    if (accel) {
      ganglion.accelStop()
        .then(() => {
          return ganglion.streamStop();
        });
    }
    ganglion.manualDisconnect = true;
    ganglion.disconnect();
  }
  if (err) console.log(err.stack);
  if (options.exit) {
    if (verbose) console.log('exit');
    if (ganglion.isConnected()) {
      ganglion.disconnect()
        .then(() => {
          process.exit();
        })
        .catch((err) => {
          if (verbose) console.log(err);
          process.exit();
        });
    }
  }
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
