import url from 'url'
import {redisFactory} from '../models/redisFactory'
import {SmileTask} from '../models/database/SmileTask'
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

  static upgradeRequestsOn(server) {
    server.on('upgrade', (request, socket, head) => {
      WebsocketServer.instance().onUpgrade(request, socket, head);
    });
  }

  async onUpgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname

    const match = pathname.match(/^\/ws\/smile-tasks\/(.*)$/)
    if (match === null) {
      socket.destroy()
      return
    }

    const taskId = match[1]
    logger.info(`taskId: ${taskId}`)

    const task = await SmileTask.get(taskId)
    if (!task) {
      logger.warn(`WebSocket [DENIED] ${pathname} - SmileTask ${taskId} not found`)
      socket.destroy()
      return
    }
    const key = task.filepathUploaded
    logger.info(`SmileTask ${taskId} found`)
    logger.info(`key: ${key}`)

    if (!this.generalRedis.isOnline) {
      logger.warn(`WebSocket [DENIED] ${pathname} - Redis is offline`)
      socket.destroy()
      return
    }

    const wsServer = this.findOrCreateLocalServer(socket, key, task)
    wsServer.upgradeRequestToWSConnection(request, head)
    logger.info(`WebSocket [SUCCESS] ${pathname}`)
  }

  findOrCreateLocalServer(socket, key, task) {
    let wsServer = this.localServers[key]
    if (wsServer !== undefined) {
      return wsServer
    }

    wsServer = new LocalWebsocketServer(socket, key, {
      onTerminate: () => {
        delete this.localServers[key]
      },
      onReceive: (message) => {
        if (this.onReceive) this.onReceive(message, task)
      }
    })
    this.localServers[key] = wsServer
    return wsServer
  }
}

export default WebsocketServer
