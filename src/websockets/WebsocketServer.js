import url from 'url'
import {redisFactory} from '../models/redisFactory'
import {ImageProcessingSolicitation} from '../models/database/ImageProcessingSolicitation'
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

  async onUpgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname

    const match = pathname.match(/^\/ws\/processings\/(.*)$/)
    if (match === null) {
      socket.destroy()
      return
    }

    const solicitationId = match[1]
    logger.info(`solicitationId: ${solicitationId}`)

    const solicitation = await ImageProcessingSolicitation.get(solicitationId)
    if (!solicitation) {
      logger.warn(`WebSocket [DENIED] ${pathname} - Solicitation ${solicitationId} not found`)
      socket.destroy()
      return
    }
    const key = solicitation.filepathOriginal
    logger.info(`Solicitation ${solicitationId} found`)
    logger.info(`key: ${key}`)

    if (!this.generalRedis.isOnline) {
      logger.warn(`WebSocket [DENIED] ${pathname} - Redis is offline`)
      socket.destroy()
      return
    }

    const wsServer = this.findOrCreateLocalServer(socket, key, solicitation)
    wsServer.upgradeRequestToWSConnection(request, head)
    logger.info(`WebSocket [SUCCESS] ${pathname}`)
  }

  findOrCreateLocalServer(socket, key, solicitation) {
    let wsServer = this.localServers[key]
    if (wsServer !== undefined) {
      return wsServer
    }

    wsServer = new LocalWebsocketServer(socket, key, {
      onTerminate: () => {
        delete this.localServers[key]
      },
      onReceive: (message) => {
        if (this.onReceive) this.onReceive(message, solicitation)
      }
    })
    this.localServers[key] = wsServer
    return wsServer
  }
}

export default WebsocketServer
