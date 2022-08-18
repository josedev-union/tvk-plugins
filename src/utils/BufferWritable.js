import { Writable } from 'stream'

export class BufferWritable extends Writable {
  constructor(options) {
    super(options);
    this.content = []
  }
  _write(chunk, encoding, callback) {
    this.content.push(chunk)
    callback()
  }
  _final(callback) {
    this.content = Buffer.concat(this.content)
    callback()
  }
}
