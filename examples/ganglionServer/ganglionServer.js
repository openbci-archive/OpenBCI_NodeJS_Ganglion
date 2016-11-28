const Ganglion = require('../../index').Ganglion;
const k = require('../../openBCIConstants');
const verbose = true;
var ganglion = new Ganglion({
  debug: true,
  sendCounts: true,
  verbose: verbose
});

function errorFunc (err) {
  throw err;
}

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
    // console.log(`z: ${accelData[2]}`);
  });

  ganglion.once('ready', () => {
    ganglion.streamStart().catch(errorFunc);
    console.log('ready');
  });

  ganglion.connect(peripheral).catch(errorFunc);
});

ganglion.searchStart().catch(errorFunc);

function exitHandler (options, err) {
  if (options.cleanup) {
    if (verbose) console.log('clean');
    // console.log(connectedPeripheral)
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
