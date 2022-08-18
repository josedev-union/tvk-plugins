import util from 'util'
import {TagSet} from './TagSet'

export class RichError extends Error {
  constructor({debugId, httpCode, debugMessage, publicId, publicMessage, cause, namespace, debugDetails={}, tags={}, logAsWarning=false, doLog=true}) {
    debugMessage = debugMessage || publicMessage
    super(debugMessage, {cause})
    if (cause) {
      Object.assign(this, cause)
    }
    this.debugMessage = debugMessage
    this.publicId = publicId || 'internal-error'
    this.debugId = debugId || this.publicId
    this.namespace = namespace || 'internal'
    this.httpCode = httpCode || 500
    this.debugDetails = debugDetails
    this.publicMessage = publicMessage
    this.logAsWarning = logAsWarning
    this.doLog = doLog
    this.cause = cause

    this.tags = new TagSet()
    this.tags.add('error:id', `${this.namespace}:${this.debugId}`)
    this.tags.add('error:namespace', this.namespace)
    this.tags.add('error:is-rich', true)
    this.tags.add(tags)
  }

  static fromError(error) {
    if (error instanceof RichError) return error
    let debugDetails = { nonRichError: true }
    if (error && error.error) {
      const msg = error.error
      delete error.error
      Object.assign(debugDetails, error)
      error = msg
    }
    if (typeof(error) === 'string') error = new Error(error)
    const richError = new RichError({
      debugId: `nodejs-error:${error.code}`,
      debugMessage: error.message,
      cause: error,
      httpCode: error.status || error.httpCode,
      tags: {
        'error:is-rich': false,
        'error:non-rich:code': String(error.code),
      },
      logAsWarning: false,
      debugDetails: debugDetails,
    })
    return richError
  }

  addTag(label, value) {
    this.tags.add(label, value)
  }

  addTags(tags) {
    this.tags.add(tags)
  }

  addDebugDetails(details) {
    this.debugDetails = Object.assign(this.debugDetails, details)
  }

  logLevel() {
    if (!this.doLog) return null
    return this.logAsWarning ? 'warn' : 'error'
  }

  logText() {
    let text = `[${this.debugId}]: ${this.debugMessage}`
    text += `\n${this.stack}`
    if (this.cause) {
      text += `\n[cause]\n${RichError.logTextFor(this.cause)}`
    }
    return text
  }

  static logTextFor(err) {
    if (err.logText) return err.logText()
    else return util.inspect(err)
  }

  data({isDebug=false}) {
    const dt = {
      id: this.publidId || 'internal-error',
      message: this.publicMessage || 'Unexpected Internal Error',
    }
    if (isDebug) {
      dt.debug = {
        "__ALERT__": "THIS DEBUG OBJECT WILL NOT EXIST IN PRODUCTION",
        debugId: this.debugId,
        message: this.debugMessage,
        details: this.debugDetails,
        tags: this.tags,
      }
    }
    return dt
  }
}
