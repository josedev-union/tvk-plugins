import url from 'url'
import {base64_decode} from '../shared/simple_crypto'
import {newRedis} from '../models/redis_pubsub'
import LocalWebsocketServer from '../models/local_websocket_server'

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
    console.log(`Path: ${pathname}`)

    const match = pathname.match(/^\/ws\/processings\/(.*)$/)
    if (match === null) {
      socket.destroy()
      return
    }

    const processingIdBase64 = match[1]
    const processingId = base64_decode(processingIdBase64)
    console.log(`processingId: ${processingId}`)

    if (!this.generalRedis.isOnline) {
      socket.destroy()
      return
    }
    this.generalRedis.get(`progress:ws:${processingId}`, (err, value) => {
      if (value === null) {
        console.log("Connection denied")
        socket.destroy()
      } else {
        const wsServer = this.findOrCreateLocalServer(socket, processingId)
        wsServer.upgradeRequestToWSConnection(request, head)
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
