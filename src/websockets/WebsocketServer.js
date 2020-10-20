import url from 'url'
import {simpleCrypto} from '../shared/simpleCrypto'
import {redisFactory} from '../models/redisFactory'
import {LocalWebsocketServer} from './LocalWebsocketServer'
import {logger} from '../instrumentation/logger'

export class WebsocketServer {
  static instance() {
    if (this.singleton === undefined) {
      this.singleton = new WebsocketServer()
    }
    return this.singleton
  }
  
  constructor() {
    this.localServers = {}
    this.generalRedis = redisFactory.newRedisPubsub()
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
    const processingIdBase = simpleCrypto.base64Decode(processingId)
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
