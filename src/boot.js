/**
 * Module dependencies.
 */

import app from './app'
import build_debug from 'debug'
import http from 'http'
import { createTerminus, HealthCheckError } from '@godaddy/terminus'
import WebsocketServer from './websockets/websocket_server'
import * as wsCallbacks from './websockets/callbacks'
const debug = build_debug('miroweb:server')

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

createTerminus(server, {
  healthChecks: {
    '/healthz': async function() {
      // throw new HealthCheckError('healthcheck failed', ['error1', 'error2', 'error3'])
      return undefined
    }
  }
});
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
server.on('upgrade', (request, socket, head) => {
  WebsocketServer.instance().onUpgrade(request, socket, head);
});

WebsocketServer.instance().onReceive = (processingIdBase, message) => {
  if (message['event'] === 'end') {
    let [bucket, solicitationId] = processingIdBase.replace(/^\//g, '').replace(/\/$/g, '').split('/')
    wsCallbacks.onProcessingComplete(bucket, solicitationId)
  }
}

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
