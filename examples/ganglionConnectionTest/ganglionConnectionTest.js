const Ganglion = require('../../index').Ganglion;
const k = require('../../openBCIConstants');
const verbose = true;
var ganglion = new Ganglion({
  // debug: true,
  sendCounts: true,
  verbose: verbose,
  nobleScanOnPowerOn: false,
  nobleAutoStart: true
});

function errorFunc (err) {
  console.log(err);
}

const impedance = false;
const accel = false;

const fullGangFunc = () => {
  console.log(`fullGangFunc`);
  ganglion.once(k.OBCIEmitterGanglionFound, (peripheral) => {
    console.log('woo');
    let droppedPacketCounter = 0;
    let secondCounter = 0;
    let buf = [];
    let sizeOfBuf = 0;
    ganglion.on('sample', (sample) => {
      /** Work with sample */
      console.log(sample.sampleNumber);
    });

    ganglion.on('droppedPacket', (data) => {
      console.log('droppedPacket:', data);
      droppedPacketCounter++;
    });

    ganglion.on('message', (message) => {
      // console.log('message: ', message.toString());
    });

    let lastVal = 0;
    ganglion.on('accelerometer', (accelData) => {
      // Use accel array [0, 0, 0]
      // console.log(`counter: ${accelData[2]}`);
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
    });

    ganglion.searchStop()
      .then(() => {
        console.log(`search stopped`);
        ganglion.connect(peripheral).catch(errorFunc);
      })
      .catch(errorFunc);

  });
  var startSearchFunc = () => {
    ganglion.searchStart().catch(errorFunc);
  }
  ganglion.once(k.OBCIEmitterBlePoweredUp, startSearchFunc);
  if (ganglion.isNobleReady()) {
    console.log(`noble is ready so starting scan`);
    ganglion.removeListener(k.OBCIEmitterBlePoweredUp, startSearchFunc);
    startSearchFunc()
  } else {
    console.log(`noble is NOT ready so waiting starting scan`);
  }
}


var stopTimeout;
var index = 0;
var startFunc = () => {
  console.log(`starting ${index}`);
  fullGangFunc();
  stopTimeout = setTimeout(stopFunc, 10000);
}

var stopFunc = () => {
  console.log(`disconnecting ${index}`);
  ganglion.removeAllListeners('sample');
  ganglion.removeAllListeners('droppedPacket');
  ganglion.removeAllListeners('message');
  ganglion.removeAllListeners('accelerometer');
  ganglion.removeAllListeners('impedance');
  ganglion.removeAllListeners(k.OBCIEmitterGanglionFound);
  ganglion.removeAllListeners('ready');
  if (ganglion.isConnected()) {
    ganglion.manualDisconnect = true;
    ganglion.disconnect(true)
      .then(() => {
        if (index === 1) {
          killFunc('finished clean');
        } else {
          index++;
          startFunc();
        }
      })
      .catch(killFunc);

  } else {
    console.log(`you were never connected on index ${index}`);
    if (index === 1) {
      killFunc('failed to connect');
    } else {
      index++;
      startFunc();
    }
  }
}

var killFunc = (msg) => {
  console.log(`killFunc msg: ${msg}`);
  process.exit(0);
}

startFunc();

function exitHandler (options, err) {
  if (options.cleanup) {
    if (verbose) console.log('clean');
    ganglion.manualDisconnect = true;
    ganglion.disconnect();
    ganglion.removeAllListeners('droppedPacket');
    ganglion.removeAllListeners('accelerometer');
    ganglion.removeAllListeners('sample');
    ganglion.removeAllListeners('message');
    ganglion.removeAllListeners('impedance');
    ganglion.removeAllListeners('close');
    ganglion.removeAllListeners('ganglionFound');
    ganglion.removeAllListeners('ready');
    ganglion.destroyNoble();
  }
  if (err) console.log(err.stack);
  if (options.exit) {
    if (verbose) console.log('exit');
    clearTimeout(stopTimeout);
    if (impedance) {
      ganglion.impedanceStop().catch(console.log);
    }
    if (ganglion.isSearching()) {
      ganglion.searchStop().catch(console.log);
    }
    if (accel) {
      ganglion.accelStop().catch(console.log);
    }
    // ganglion.manualDisconnect = true;
    // ganglion.disconnect(true).catch(console.log);
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
