import url from 'url'
import WebSocket from 'ws'
import Timeout from '../models/timeout'
import {newRedis} from '../models/redis_pubsub'
import {base64_decode} from '../shared/simple_crypto'

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

    this.generalRedis.get(`progress:ws:${processingId}`, (err, value) => {
      if (value === null) {
        console.log("Connection denied")
        socket.destroy()
      } else {
        const wsServer = this.createLocalServer(socket, processingId)

        wsServer.handleUpgrade(request, socket, head, function(ws) {
          wsServer.emit('connection', ws, request)
        })
      }
    })
  }

  createLocalServer(socket, processingId) {
    let wsServer = this.localServers[processingId]
    if (wsServer !== undefined) {
      return wsServer
    }

    const redis = newRedis()
    redis.subscribe(processingId)
    console.log(`SUBSCRIBED ${processingId}`)

    wsServer = new WebSocket.Server({ noServer: true })
    let timeout = new Timeout(30 * 1000)
    timeout.onExpiration(() => {
      console.log(`Timed out ${processingId}`)
      this.terminate(processingId, wsServer, socket, redis, timeout)
    })
    
    redis.on('message', (channel, message) => {
      console.log(`MESSAGE FROM REDIS ${channel} ${message}`)
      if (message === "#QUIT#") {
        this.terminate(processingId, wsServer, socket, redis, timeout)
      }

      wsServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
      timeout.restart()
    })

    this.localServers[processingId] = wsServer
    return wsServer
  }

  terminate(processingId, wsServer, socket, redis, timeout) {
    delete this.localServers[processingId]
    redis.unsubscribe()
    redis.quit()
    wsServer.close()
    socket.destroy()
    timeout.cancel()
  }
}

export default WebsocketServer
