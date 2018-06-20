const Ganglion = require('../../openBCIGanglion');
const k = require('openbci-utilities/dist/constants');
const verbose = true;
let ganglion = new Ganglion({
  debug: false,
  verbose: verbose,
  sendCounts: false
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

const accel = true;

ganglion.once(k.OBCIEmitterGanglionFound, (peripheral) => {
  ganglion.searchStop().catch(errorFunc);

  ganglion.on('sample', (sample) => {
    // console.log(sample.sampleNumber);
  });

  ganglion.on('close', () => {
    console.log('close event');
  });

  ganglion.on('message', (message) => {
    console.log('message: ', message.toString());
  });

  ganglion.on('accelerometer', (accelData) => {
    console.log('accelData', accelData);
  });

  ganglion.once('ready', () => {
    if (accel) {
      ganglion.accelStart()
        .then(() => {
          return ganglion.streamStart();
        })
        .catch(errorFunc);
    } else {
      ganglion.streamStart().catch(errorFunc);
    }
  });

  ganglion.connect(peripheral).catch(errorFunc);
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
