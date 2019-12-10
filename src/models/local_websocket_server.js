import WebSocket from 'ws'
import Timeout from '../models/timeout'
import {newRedis} from '../models/redis_pubsub'
import logger from '../models/logger'

class LocalWebsocketServer {
  constructor(socket, processingId, {onTerminate = null, inactiveTimeout = 30}) {
    this.onTerminate = onTerminate
    this.socket = socket
    this.processingId = processingId
    this.onTerminate = onTerminate

    this.server = this.setupWebsocketServer()
    this.redis = this.setupRedisPubSub()
    this.timeout = this.setupInactiveTimeout(inactiveTimeout)
  }

  upgradeRequestToWSConnection(request, head) {
    this.server.handleUpgrade(request, this.socket, head, (ws) => {
      this.server.emit('connection', ws, request)
    })
  }

  terminate() {
    if (this.onTerminate) this.onTerminate()
    this.redis.unsubscribe()
    this.redis.quit()
    this.server.close()
    this.socket.destroy()
    this.timeout.cancel()
  }

  setupWebsocketServer() {
    return new WebSocket.Server({ noServer: true })
  }

  setupRedisPubSub() {
    let redis = newRedis()
    redis.on('error', () => this.terminate())
    redis.subscribe(this.processingId)
    redis.on('message', (channel, message) => {
      logger.info(`WebsocketServer ${this.processingId} - Received message from redis ${channel} ${message}`)
      if (message === "#QUIT#") {
        this.terminate()
        return
      }

      this.sendToClients(message)
      this.timeout.restart()
    })
    return redis
  }

  setupInactiveTimeout(inactiveTimeout) {
    let timeout = new Timeout(inactiveTimeout * 1000)
    timeout.onExpiration(() => {
      logger.info(`WebsocketServer ${this.processingId} - Timed out (Too long without messages)`)
      let msg = JSON.stringify({
        event: 'error',
        code: 'timeout',
        message: 'Server are waiting too much for progress.'
      })
      this.sendToClients(msg)
      this.terminate()
    })
    return timeout
  }

  sendToClients(message) {
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }
}

export default LocalWebsocketServer
