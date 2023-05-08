import fs from 'fs'
import {logger} from '../../instrumentation/logger'
import {idGenerator} from '../tools/idGenerator'
import {redisPubsub, buffersRedis, redisSubscribe} from "../../config/redis"
import {promisify} from "util"
import {QuickClient} from './base'

const readfile = promisify(fs.readFile)
const redisGet = promisify(buffersRedis.get).bind(buffersRedis)
const redisSetex = promisify(buffersRedis.setex).bind(buffersRedis)
const redisDel = promisify(buffersRedis.del).bind(buffersRedis)

const redisGetSafe = (key) => !key ? undefined : redisGet(key)
const redisDelSafe = (key) => !key ? undefined : redisDel(key)


export class QuickWhitenClient extends QuickClient {
  static PUBSUB_PREFIX = 'listener:quick:whiten'
  static pubsubRequestKey() { return `${this.PUBSUB_PREFIX}:request` }
  static pubsubResponseKey(id) { return `${this.PUBSUB_PREFIX}:${id}:response` }

  async request({id, photo, photoPath, expiresAt=0, options={}, safe=false}) {
    if (!id) id = idGenerator.newOrderedId()
    logger.verbose(`[${id}] Requesting task (${JSON.stringify(options)})`)
    const photoRedisKey = `task:listener:${id}:photo`
    if (!photo) photo = await readfile(photoPath)
    const photoBuffer = Buffer.from(photo, 'binary')
    await this.#publishRequest(id, photoBuffer, photoRedisKey, expiresAt, options)
    const pubsubChannel = this.constructor.pubsubResponseKey(id)
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
    const photoEncrypted = this.encrypt(photoBuffer)
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
    redisPubsub.publish(this.constructor.pubsubRequestKey(), publishedMessage)
    logger.verbose(`[${id}]: Params Published: ${publishedMessage}`)
  }

  async #waitResponse({pubsubChannel, safe}) {
    const messageStr = await redisSubscribe(pubsubChannel)
    logger.verbose(`Result Received ${pubsubChannel} - ${messageStr}`)
    const message = JSON.parse(messageStr)

    if (message['error']) {
      return this.throwError({message: message['error'], safe})
    }

    const resultRedisKey = message['data']['result_redis_key']
    const beforeRedisKey = message['data']['before_redis_key']
    const [resultPhoto, beforePhoto] = (await Promise.all([
      redisGetSafe(resultRedisKey),
      redisGetSafe(beforeRedisKey),
    ]))
    .map(content => this.decrypt(content))

    redisDelSafe(resultRedisKey)
    const response = {
      'result': resultPhoto,
      'before': beforePhoto,
    }
    if (!resultPhoto) {
      const errorObj = this.throwError({
        message: "Couldn't find task result recorded",
        safe,
      })
      Object.assign(response, errorObj)
    }

    return response
  }
}
