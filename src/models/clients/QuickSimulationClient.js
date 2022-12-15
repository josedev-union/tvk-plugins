import fs from 'fs'
import {env} from '../../config/env'
import {logger} from '../../instrumentation/logger'
import {idGenerator} from '../../models/tools/idGenerator'
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
const PUBSUB_PREFIX = 'listener:pipeline-in-memory'

export class QuickSimulationClient {
  static pubsubRequestKey() { return `${PUBSUB_PREFIX}:request` }
  static pubsubResponseKey(id) { return `${PUBSUB_PREFIX}:${id}:response` }

  async requestSimulation({id, photo, photoPath, expiresAt=0, options={}, safe=false}) {
    if (!id) id = idGenerator.newOrderedId()
    logger.verbose(`[${id}] Requesting Simulation (${JSON.stringify(options)})`)
    const photoRedisKey = `pipeline:listener:${id}:photo`
    if (!photo) photo = await readfile(photoPath)
    const photoBuffer = Buffer.from(photo, 'binary')
    await this.#publishRequest(id, photoBuffer, photoRedisKey, expiresAt, options)
    const pubsubChannel = QuickSimulationClient.pubsubResponseKey(id)
    const {result, before, morphed, error} = await this.#waitResponse({pubsubChannel, safe})
    return {
      id,
      before,
      result,
      morphed,
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
    redisPubsub.publish(QuickSimulationClient.pubsubRequestKey(), publishedMessage)
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
    const beforeRedisKey = message['data']['before_redis_key']
    const morphedRedisKey = message['data']['morphed_redis_key']
    const [resultPhoto, beforePhoto, morphedMouth] = (await Promise.all([
      redisGetSafe(resultRedisKey),
      redisGetSafe(beforeRedisKey),
      redisGetSafe(morphedRedisKey),
    ]))
    .map(content => this.#decrypt(content))

    redisDelSafe(resultRedisKey)
    redisDelSafe(beforeRedisKey)
    redisDelSafe(morphedRedisKey)

    const response = {
      'result': resultPhoto,
      'before': beforePhoto,
      'morphed': morphedMouth,
    }
    if (!resultPhoto || !beforePhoto) {
      const errorObj = this.#throwError({
        message: "Couldn't find simulation result recorded",
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
    let publicMessage = 'Error when executing simulation'
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
      id: 'simulation-error',
      subtype,
      subtypeIsPublic: true,
      publicMessage,
      debugMessage: message,
      logLevel: 'error',
      tags: {
        'simulation:success': false,
        'simulation:error': errorTag,
      },
    })

    if (safe) return {error}
    else throw error
  }

  #throwTimeoutError({message, safe}) {
    const error = new RichError({
      httpCode: 504,
      id: 'timeout',
      subtype: 'simulation-timeout',
      publicMessage: 'Operation took too long',
      debugMessage: message,
      logLevel: 'error',
      tags: {
        'simulation:success': false,
        'error:timeout': 'simulation-queue-wait',
        'simulation:error': 'queue-wait',
      },
    })

    if (safe) return {error}
    else throw error
  }
}
