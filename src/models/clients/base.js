import {env} from '../../config/env'
import {RichError} from "../../utils/RichError"
import {simpleCrypto} from "../../shared/simpleCrypto"


export class QuickClient {
  static pubsubRequestKey() { throw new Error('Getter for PUBSUB request key not implemented.'); }
  static pubsubResponseKey(id) { throw new Error('Getter for PUBSUB response key not implemented.'); }

  async request(req) {
    throw new Error('Not implemented.');
  }

  async #publishRequest(id, photoBuffer, photoRedisKey, expiresAt, options) {
    throw new Error('Not implemented.');
  }

  async #waitResponse({pubsubChannel, safe}) {
    throw new Error('Not implemented.');
  }

  decrypt(content) {
    if (!content) return content
    return simpleCrypto.decrypt(content, env.workerContentEncryptionSecret) || content
  }

  encrypt(content) {
    if (!content) return content
    return simpleCrypto.encrypt(content, env.workerContentEncryptionSecret) || content
  }

  throwError({message, safe}) {
    if (!message) return
    if (message.match(/timeout/i)) {
      return this.#throwTimeoutError({message, safe})
    }
    let publicMessage = `Error when executing ${this.job_type()}`
    let errorTag = 'generic'
    let subtype = undefined

    if (message.match(/detect/i)) {
      publicMessage = message
      errorTag = 'no-face'
      subtype = 'no-face'
    } else if (message.match(/find.*result/)) {
      errorTag = 'no-result-recorded'
    }
    const error = new RichError({
      httpCode: 422,
      id: `${this.job_type()}-error`,
      subtype,
      subtypeIsPublic: true,
      publicMessage,
      debugMessage: message,
      logLevel: 'error',
      tags: {
        [`${this.job_type()}:success`]: false,
        [`${this.job_type()}:error`]: errorTag,
      },
    })

    if (safe) return {error}
    else throw error
  }

  #throwTimeoutError({message, safe}) {
    const error = new RichError({
      httpCode: 504,
      id: 'timeout',
      subtype: `${this.job_type()}-timeout`,
      publicMessage: 'Operation took too long',
      debugMessage: message,
      logLevel: 'error',
      tags: {
        [`${this.job_type()}:success`]: false,
        'error:timeout': `${this.job_type()}-queue-wait`,
        [`${this.job_type()}:error`]: 'queue-wait',
      },
    })

    if (safe) return {error}
    else throw error
  }
}


export class QuickTaskClient extends QuickClient {
  job_type() {
    return "task"
  }
}


export class QuickSimulationClient extends QuickClient {
  job_type() {
    return "simulation"
  }
}
