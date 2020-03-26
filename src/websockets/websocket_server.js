import url from 'url'
import {base64_decode} from '../shared/simple_crypto'
import {newRedis} from '../models/redis_pubsub'
import LocalWebsocketServer from './local_websocket_server'
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
    this.onReceive = null
  }

  onUpgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname

    const match = pathname.match(/^\/ws\/processings\/(.*)$/)
    if (match === null) {
      socket.destroy()
      return
    }

    const processingId = match[1]
    const processingIdBase = base64_decode(processingId)
    logger.info(`processingIdBase: ${processingIdBase}`)

    if (!this.generalRedis.isOnline) {
      logger.warn(`WebSocket [DENIED] ${pathname} - Redis is offline`)
      socket.destroy()
      return
    }
    this.generalRedis.get(`progress:ws:${processingIdBase}`, (err, value) => {
      if (value === null) {
        logger.info(`WebSocket [DENIED] ${pathname} - No redis key for ${processingIdBase}, probably it did not started processing`)
        socket.destroy()
      } else {
        const wsServer = this.findOrCreateLocalServer(socket, processingIdBase)
        wsServer.upgradeRequestToWSConnection(request, head)
        logger.info(`WebSocket [SUCCESS] ${pathname}`)
      }
    })
  }

  findOrCreateLocalServer(socket, processingIdBase) {
    let wsServer = this.localServers[processingIdBase]
    if (wsServer !== undefined) {
      return wsServer
    }

    wsServer = new LocalWebsocketServer(socket, processingIdBase, {
      onTerminate: () => {
        delete this.localServers[processingIdBase]
      },
      onReceive: (message) => {
        if (this.onReceive) this.onReceive(processingIdBase, message)
      }
    })
    this.localServers[processingIdBase] = wsServer
    return wsServer
  }
}

export default WebsocketServer
