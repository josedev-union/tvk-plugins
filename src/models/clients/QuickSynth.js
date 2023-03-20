import fs from 'fs'
import {env} from '../../config/env'
import {logger} from '../../instrumentation/logger'
import {idGenerator} from '../tools/idGenerator'
import {redisPubsub, buffersRedis, redisSubscribe} from "../../config/redis"
import {RichError} from "../../utils/RichError"
import {simpleCrypto} from "../../shared/simpleCrypto"
import {promisify} from "util"

const readfile = promisify(fs.readFile)
const redisGet = promisify(buffersRedis.get).bind(buffersRedis)
const redisSetex = promisify(buffersRedis.setex).bind(buffersRedis)
const redisDel = promisify(buffersRedis.del).bind(buffersRedis)

const redisGetSafe = (key) => !key ? undefined : redisGet(key)
const redisDelSafe = (key) => !key ? undefined : redisDel(key)

const PUBSUB_PREFIX = 'listener:quick:synth'

// TODO(joseb): Declare a basic class and inherit it
export class QuickSynthClient {
  static PUBSUB_PREFIX = 'listener:quick:synth'
  static pubsubRequestKey() { return `${PUBSUB_PREFIX}:request` }
  static pubsubResponseKey(id) { return `${this.PUBSUB_PREFIX}:${id}:response` }

  async request({id, photo, photoPath, expiresAt=0, options={}, safe=false}) {
    if (!id) id = idGenerator.newOrderedId()
    logger.verbose(`[${id}] Requesting task (${JSON.stringify(options)})`)
    const photoRedisKey = `task:listener:${id}:photo`
    if (!photo) photo = await readfile(photoPath)
    const photoBuffer = Buffer.from(photo, 'binary')
    await this.#publishRequest(id, photoBuffer, photoRedisKey, expiresAt, options)
    const pubsubChannel = QuickSynthClient.pubsubResponseKey(id)
    const {result, error} = await this.#waitResponse({pubsubChannel, safe})
    return {
      id,
      result,
      error,
      original: photo,
      success: !error,
    }
  }

  async #publishRequest(id, photoBuffer, photoRedisKey, expiresAt, options) {
    const photoEncrypted = this.#encrypt(photoBuffer)
    await redisSetex(photoRedisKey, 45, photoEncrypted)
    var params = {
      photo_redis_key: photoRedisKey,
      expires_at: expiresAt,
      ...options
    }

    const publishedMessage = JSON.stringify({
      id: id,
      params: params
    })
    redisPubsub.publish(QuickSynthClient.pubsubRequestKey(), publishedMessage)
    logger.verbose(`[${id}]: Params Published: ${publishedMessage}`)
  }

  async #waitResponse({pubsubChannel, safe}) {
    const messageStr = await redisSubscribe(pubsubChannel)
    logger.verbose(`Result Received ${pubsubChannel} - ${messageStr}`)
    const message = JSON.parse(messageStr)

    if (message['error']) {
      return this.#throwError({message: message['error'], safe})
    }

    const resultRedisKey = message['data']['result_redis_key']
    const [resultPhoto,] = (await Promise.all([
      redisGetSafe(resultRedisKey),
    ]))
    .map(content => this.#decrypt(content))

    redisDelSafe(resultRedisKey)
    const response = {
      'result': resultPhoto,
    }
    if (!resultPhoto) {
      const errorObj = this.#throwError({
        message: "Couldn't find task result recorded",
        safe,
      })
      Object.assign(response, errorObj)
    }

    return response
  }

  #decrypt(content) {
    if (!content) return content
    return simpleCrypto.decrypt(content, env.workerContentEncryptionSecret) || content
  }

  #encrypt(content) {
    if (!content) return content
    return simpleCrypto.encrypt(content, env.workerContentEncryptionSecret) || content
  }

  #throwError({message, safe}) {
    if (!message) return
    if (message.match(/timeout/i)) {
      return this.#throwTimeoutError({message, safe})
    }
    let publicMessage = 'Error when executing task'
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
      id: 'task-error',
      subtype,
      subtypeIsPublic: true,
      publicMessage,
      debugMessage: message,
      logLevel: 'error',
      tags: {
        'task:success': false,
        'task:error': errorTag,
      },
    })

    if (safe) return {error}
    else throw error
  }

  #throwTimeoutError({message, safe}) {
    const error = new RichError({
      httpCode: 504,
      id: 'timeout',
      subtype: 'task-timeout',
      publicMessage: 'Operation took too long',
      debugMessage: message,
      logLevel: 'error',
      tags: {
        'task:success': false,
        'error:timeout': 'task-queue-wait',
        'task:error': 'queue-wait',
      },
    })

    if (safe) return {error}
    else throw error
  }
}
