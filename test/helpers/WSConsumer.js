import WebSocket from 'ws'

export class WSConsumer {
  constructor(url) {
    this.url = url
    this.closed = false
    this.opened = false
    this.ws = new WebSocket(url)
    this.ws.on('open', () => this.opened = true)
    this.ws.on('close', () => this.closed = true)
  }

  on() {
    WebSocket.prototype.on.apply(this.ws, arguments)
  }
}
