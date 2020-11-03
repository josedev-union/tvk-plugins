/**
 * Module dependencies.
 */

import app from './app'
import build_debug from 'debug'
import http from 'http'
import { createTerminus, HealthCheckError } from '@godaddy/terminus'
import {WebsocketServer} from './websockets/WebsocketServer'
import {wsCallbacks} from './websockets/wsCallbacks'
import {env} from './config/env'
const debug = build_debug('dentrino-web:server')

/**
 * Get port from environment and store in Express.
 */

app.set('port', env.port);

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
server.listen(env.port);
server.on('error', onError);
server.on('listening', onListening);
server.on('upgrade', (request, socket, head) => {
  WebsocketServer.instance().onUpgrade(request, socket, head);
});

WebsocketServer.instance().onReceive = (message, solicitation) => {
  if (message['event'] === 'finished') {
    wsCallbacks.onProcessingComplete(solicitation)
  }
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof env.port === 'string'
    ? 'Pipe ' + env.port
    : 'Port ' + env.port;

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
