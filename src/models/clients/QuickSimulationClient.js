import fs from 'fs'
import {env} from '../../config/env'
import {logger} from '../../instrumentation/logger'
import {idGenerator} from '../../models/tools/idGenerator'
import {redisPubsub, buffersRedis, redisSubscribe} from "../../config/redis"
import {RichError} from "../../utils/RichError"
import {promisify} from "util"

const readfile = promisify(fs.readFile)
const redisGet = promisify(buffersRedis.get).bind(buffersRedis)
const redisSetex = promisify(buffersRedis.setex).bind(buffersRedis)
const redisDel = promisify(buffersRedis.del).bind(buffersRedis)
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
    const {result, before, error} = await this.#waitResponse({pubsubChannel, safe})
    return {
      id,
      before,
      result,
      error,
      original: photo,
      success: !error,
    }
  }

  async #publishRequest(id, photoBuffer, photoRedisKey, expiresAt, options) {
    await redisSetex(photoRedisKey, 25, photoBuffer)
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
    const [resultPhoto, beforePhoto] = await Promise.all([
      redisGet(resultRedisKey),
      redisGet(beforeRedisKey),
    ])
    redisDel(resultRedisKey)
    redisDel(beforeRedisKey)

    const response = {
      'result': resultPhoto,
      'before': beforePhoto
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

  #throwError({message, safe}) {
    if (!message) return
    if (message.match(/timeout/i)) {
      return this.#throwTimeoutError({message, safe})
    }
    let publicMessage = 'Error when executing simulation'
    let errorTag = 'generic'

    if (message.match(/detect/i)) {
      publicMessage = message
      errorTag = 'no-face'
    } else if (message.match(/find.*result/)) {
      errorTag = 'no-result-recorded'
    }
    const error = new RichError({
      publicId: 'simulation-error',
      httpCode: 422,
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
      publicId: 'timeout',
      httpCode: 504,
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
