const Ganglion = require('openbci-ganglion').Ganglion;
var portPub = 'tcp://127.0.0.1:3004';
var zmq = require('zmq-prebuilt');
var socket = zmq.socket('pair');
var verbose = false;

let ganglion = new Ganglion({
  nobleAutoStart: true,
  sendCounts: true,
  verbose: true
}, (error) => {
  if (error) {
    console.log(error);
  } else {
    if (verbose) {
      console.log('Ganglion initialize completed');
    }
  }
});

ganglion.once('ganglionFound', (peripheral) => {
  ganglion.searchStop();
  ganglion.on('sample', (sample) => {
    sendToPython({
      action: 'process',
      command: 'sample',
      message: sample
    });
  });
  ganglion.once('ready', () => {
    ganglion.streamStart();
  });
  ganglion.connect(peripheral);
});

// ganglion.searchStart();
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
    ganglion.manualDisconnect = true;
    ganglion.disconnect(true).catch(console.log);
    process.exit(0);
  }
}

// ZMQ
socket.bind(portPub, function (err) {
  if (err) throw err;
  console.log(`bound to ${portPub}`);
});

/**
 * Used to send a message to the Python process.
 * @param  {Object} interProcessObject The standard inter-process object.
 * @return {None}
 */
var sendToPython = (interProcessObject, verbose) => {
  if (verbose) {
    console.log(`<- out ${JSON.stringify(interProcessObject)}`);
  }
  if (socket) {
    socket.send(JSON.stringify(interProcessObject));
  }
};

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
