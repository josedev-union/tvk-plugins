import url from 'url'
import {base64_decode} from '../shared/simple_crypto'
import {newRedis} from '../models/redis_pubsub'
import LocalWebsocketServer from '../models/local_websocket_server'
import logger from '../models/logger'

class WebsocketServer {
  static instance() {
    if (this.singleton === undefined) {
      this.singleton = new WebsocketServer()
    }
    return this.singleton
  }
  
  constructor() {
    this.localServers = {}
    this.generalRedis = newRedis()
  }

  onUpgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname

    const match = pathname.match(/^\/ws\/processings\/(.*)$/)
    if (match === null) {
      socket.destroy()
      return
    }

    const processingIdBase64 = match[1]
    const processingId = base64_decode(processingIdBase64)
    logger.info(`processingId: ${processingId}`)

    if (!this.generalRedis.isOnline) {
      logger.warn(`WebSocket [DENIED] ${pathname} - Redis is offline`)
      socket.destroy()
      return
    }
    this.generalRedis.get(`progress:ws:${processingId}`, (err, value) => {
      if (value === null) {
        logger.info(`WebSocket [DENIED] ${pathname} - No redis key for ${processingId}, probably it did not started processing`)
        socket.destroy()
      } else {
        const wsServer = this.findOrCreateLocalServer(socket, processingId)
        wsServer.upgradeRequestToWSConnection(request, head)
        logger.info(`WebSocket [SUCCESS] ${pathname}`)
      }
    })
  }

  findOrCreateLocalServer(socket, processingId) {
    let wsServer = this.localServers[processingId]
    if (wsServer !== undefined) {
      return wsServer
    }

    wsServer = new LocalWebsocketServer(socket, processingId, {
      onTerminate: () => {
        delete this.localServers[processingId]
      }
    })
    this.localServers[processingId] = wsServer
    return wsServer
  }
}

export default WebsocketServer
