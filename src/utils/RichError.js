import util from 'util'
import {TagSet} from './TagSet'
import {Blob, Buffer} from 'buffer'

export class RichError extends Error {
  constructor({debugId, httpCode, debugMessage, publicId, publicMessage, cause, namespace, debugDetails={}, tags={}, logLevel='error'}) {
    debugMessage = debugMessage || publicMessage
    if (cause) {
      //super(debugMessage, {cause})
      super(debugMessage)
      //this.cause = cause
      this.originalCause = cause
      Object.assign(this, cause)
      //Error.captureStackTrace(this)
      this.stack = cause.stack
    } else {
      super(debugMessage)
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
    const t = typeof(obj)
    if (!obj || (t !== 'string' && t !== 'object')) {
      return obj
    }

    const asArray = this.#asArray(obj)
    if (asArray) {
      return this.#simplifiedArray(obj, asArray)
    } else if (t === 'string') {
      return this.#simplifyString(obj)
    } else if (t === 'object') {
      return this.#simplifiedObject(obj)
    } else {
      return obj
    }
  }

  #asArray(obj) {
    let asArray = undefined
    if (obj.buffer instanceof ArrayBuffer) {
      asArray = [...obj]
    } else if (obj instanceof ArrayBuffer) {
      asArray = [...new Uint8Array(obj)]
    } else if (Array.isArray(obj)) {
      asArray = obj
    }
    return asArray
  }

  #isTypedArray(obj) {
    return obj instanceof ArrayBuffer || obj.buffer instanceof ArrayBuffer
  }

  #simplifiedObject(obj) {
    const newObj = Object.assign({}, obj)

    Object.entries(obj).forEach(([key, val]) => {
      if (key.startsWith('_')) {
        delete newObj[key]
      } else {
        newObj[key] = this.#simplify(val)
      }
    })

    if (obj.constructor !== Object) {
      newObj['[!]CONSTRUCTOR'] = obj.constructor.name
    }

    if (Object.keys(obj).length > 25) {
      let asStr = null
      try {
        asStr = JSON.stringify(newObj)
      } catch {
        asStr = String(newObj)
      }
      return `[!] ${this.#simplify(asStr)}`
    } else {
      return newObj
    }
  }

  #simplifiedArray(obj, asArray) {
    if (obj.constructor !== Array) {
      return this.#simplify({
        "[!] CONSTRUCTOR": obj.constructor.name,
        "[!] values": asArray,
      })
    }

    const simpleTypesCount = {
      'null': 0,
      'number': 0,
      'string': 0,
      'boolean': 0,
      'undefined': 0,
      'all': 0,
    }
    obj.forEach((val) => {
      const t = val === null ? 'null' : typeof(val)
      if (t in simpleTypesCount) {
        simpleTypesCount[t]++
        simpleTypesCount['all']++
      }
    })
    //const areAllSimple = simpleTypesCount['all'] === obj.length
    const areAllNumbers = simpleTypesCount['number'] === obj.length
    let maxLength = 7
    if (areAllNumbers) {
      maxLength = 20
    }
    const simplified = obj.slice(0, maxLength).map((val) => this.#simplify(val))
    if (simplified.length != obj.length) {
      simplified.push('[!]...')
    }
    if (areAllNumbers) {
      return `[!] ${this.#simplify(JSON.stringify(simplified))}`
    } else {
      return simplified
    }
  }

  #hasSize(obj) {
    const t = typeof(obj)
    return (t === 'object' && (typeof(obj['size']) !== 'undefined' || typeof(obj['length']) !== 'undefined'))
  }

  #simplifyString(obj) {
    let simplified = obj.slice(0, 150)
    if (simplified.length !== obj.length) {
      simplified += ' [!]...'
    }
    return simplified
  }

  logText() {
    let text = `[${this.debugId}]: ${this.debugMessage}`
    text += `\n${this.stack}`
    if (this.cause) {
      text += `\n[cause] ${RichError.logTextFor(this.cause)}`
    }
    text += `\nDETAILS: ${JSON.stringify(this.debugDetails || {})}`
    return text
  }

  static logTextFor(err) {
    if (err.logText) return err.logText()
    else return `${err.message}\n${err.stack}`
  }

  data({isDebug=false}) {
    const dt = {
      id: this.publicId || 'internal-error',
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
