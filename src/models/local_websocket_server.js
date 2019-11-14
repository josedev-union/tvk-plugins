import WebSocket from 'ws'
import Timeout from '../models/timeout'
import {newRedis} from '../models/redis_pubsub'

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
    console.log(`SUBSCRIBED TO ${this.processingId}`)
    redis.subscribe(this.processingId)
    redis.on('message', (channel, message) => {
      console.log(`MESSAGE FROM REDIS ${channel} ${message}`)
      if (message === "#QUIT#") {
        this.terminate()
      }

      this.server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
      this.timeout.restart()
    })
    return redis
  }

  setupInactiveTimeout(inactiveTimeout) {
    let timeout = new Timeout(inactiveTimeout * 1000)
    timeout.onExpiration(() => {
      console.log(`Timed out ${this.processingId}`)
      this.terminate()
    })
    return timeout
  }
}

export default LocalWebsocketServer
