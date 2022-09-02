import util from 'util'
import {TagSet} from './TagSet'
import {Blob, Buffer} from 'buffer'

export class RichError extends Error {
  constructor({debugId, httpCode, debugMessage, publicId, publicMessage, cause, namespace, debugDetails={}, tags={}, logLevel='error'}) {
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
    this.debugDetails = {}
    this.addDebugDetails(debugDetails)
    this.publicMessage = publicMessage
    this.logLevel = logLevel
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
    if (!error instanceof Error) return null
    const richError = new RichError({
      debugId: `nodejs-error:${error.code}`,
      debugMessage: error.message,
      cause: error,
      httpCode: error.status || error.httpCode,
      tags: {
        'error:is-rich': false,
        'error:non-rich:code': String(error.code),
      },
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
    Object.assign(this.debugDetails, this.#simplify(details))
  }

  #simplify(obj) {
    if (obj.constructor === Object) {
      const newObj = {}
      Object.entries(obj).forEach(([key, val]) => newObj[key] = this.#simplify(val))
      return newObj
    } else if (Array.isArray(obj)) {
      return obj.map((val) => this.#simplify(val))
    } else if (this.#hasSize(obj)) {
      return this.#shortening(obj, 150)
    } else {
      return obj
    }
  }

  #hasSize(obj) {
    const t = typeof(obj)
    return (t === 'object' && (typeof(obj['size']) !== 'undefined' || typeof(obj['length']) !== 'undefined'))
  }

  #shortening(obj, maxSizeChars) {
    const asJson = JSON.stringify(obj)
    if (asJson.length <= maxSizeChars) return obj

    const simplified = {}
    simplified['typeof'] = typeof(obj)
    const sizeAttrs = ['size', 'length']
    const allAttrs = ['type', 'constructor', ...sizeAttrs]
    allAttrs.forEach((key) => {
      if (typeof(obj[key]) !== 'undefined') {
        simplified[key] = obj[key]
      }
    })

    sizeAttrs.forEach((key) => {
      if (typeof(simplified[key]) === 'function') {
        simplified[key] = simplified[key]()
      }
    })

    if (typeof(obj.slice) !== 'function') {
      obj = asJson
    }

    const maxSize = typeof(obj) === 'string' ? maxSizeChars : Math.round(maxSizeChars/5.0)
    simplified['slice'] = obj.slice(0, maxSize)
    return simplified
  }

  logText() {
    let text = `[${this.debugId}]: ${this.debugMessage}`
    text += `\nDETAILS: ${JSON.stringify(this.debugDetails || {})}`
    text += `\n${this.stack}`
    if (this.cause) {
      text += `\n[cause] ${RichError.logTextFor(this.cause)}`
    }
    return text
  }

  static logTextFor(err) {
    if (err.logText) return err.logText()
    else return `${err.message}\n${err.stack}`
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
