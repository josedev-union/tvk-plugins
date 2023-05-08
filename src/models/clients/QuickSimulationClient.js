import fs from 'fs'
import {logger} from '../../instrumentation/logger'
import {idGenerator} from '../../models/tools/idGenerator'
import {redisPubsub, buffersRedis, redisSubscribe} from "../../config/redis"
import {promisify} from "util"
import {QuickClient} from './base'

const readfile = promisify(fs.readFile)
const redisGet = promisify(buffersRedis.get).bind(buffersRedis)
const redisSetex = promisify(buffersRedis.setex).bind(buffersRedis)
const redisDel = promisify(buffersRedis.del).bind(buffersRedis)

const redisGetSafe = (key) => !key ? undefined : redisGet(key)
const redisDelSafe = (key) => !key ? undefined : redisDel(key)


export class QuickFullSimulationClient extends QuickClient {
  static PUBSUB_PREFIX = 'listener:pipeline-in-memory'
  static pubsubRequestKey() { return `${this.PUBSUB_PREFIX}:request` }
  static pubsubResponseKey(id) { return `${this.PUBSUB_PREFIX}:${id}:response` }

  async requestSimulation({id, photo, photoPath, startStyleImg, endStyleImg, expiresAt=0, options={}, safe=false}) {
    if (!id) id = idGenerator.newOrderedId()
    logger.verbose(`[${id}] Requesting Simulation (${JSON.stringify(options)})`)

    if (!photo) photo = await readfile(photoPath)
    const photoBuffer = Buffer.from(photo, 'binary')
    let startStyleBuffer = null
    if (!startStyleImg) {
      startStyleBuffer = startStyleImg
    } else {
      startStyleBuffer = Buffer.from(startStyleImg, 'binary')
    }
    let endStyleBuffer = null
    if (!endStyleImg) {
      endStyleBuffer = endStyleImg
    } else {
      endStyleBuffer = Buffer.from(endStyleImg, 'binary')
    }

    await this.#publishRequest(id, photoBuffer, startStyleBuffer, endStyleBuffer, expiresAt, options)
    const pubsubChannel = this.constructor.pubsubResponseKey(id)
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

  async #publishRequest(id, photoBuffer, startStyleBuffer, endStyleBuffer, expiresAt, options) {
    const photoRedisKey = `pipeline:listener:${id}:photo`
    const startStyleImgRedisKey = `pipeline:listener:${id}:startStyle`
    const endStyleImgRedisKey = `pipeline:listener:${id}:endStyle`

    const photoEncrypted = this.encrypt(photoBuffer)
    const startStyleEncrypted = this.encrypt(startStyleBuffer)
    const endStyleEncrypted = this.encrypt(endStyleBuffer)

    await redisSetex(photoRedisKey, 45, photoEncrypted)

    var params = {
      photo_redis_key: photoRedisKey,
      expires_at: expiresAt,
      ...options
    }
    if (startStyleEncrypted) {
      await redisSetex(startStyleImgRedisKey, 45, startStyleEncrypted)
      params["start_style_redis_key"] = startStyleImgRedisKey
    }
    if (endStyleEncrypted) {
      await redisSetex(endStyleImgRedisKey, 45, endStyleEncrypted)
      params["end_style_redis_key"] = endStyleImgRedisKey
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
    if (message['status'] === 'error') {
      return this.throwError({message: message['data']['error'], safe})
    }

    const resultRedisKey = message['data']['result_redis_key']
    const beforeRedisKey = message['data']['before_redis_key']
    const morphedRedisKey = message['data']['morphed_redis_key']
    const [resultPhoto, beforePhoto, morphedMouth] = (await Promise.all([
      redisGetSafe(resultRedisKey),
      redisGetSafe(beforeRedisKey),
      redisGetSafe(morphedRedisKey),
    ]))
    .map(content => this.decrypt(content))

    redisDelSafe(resultRedisKey)
    redisDelSafe(beforeRedisKey)
    redisDelSafe(morphedRedisKey)

    const response = {
      'result': resultPhoto,
      'before': beforePhoto,
      'morphed': morphedMouth,
    }
    if (!resultPhoto || !beforePhoto) {
      const errorObj = this.throwError({
        message: "Couldn't find simulation result recorded",
        safe,
      })
      Object.assign(response, errorObj)
    }

    return response
  }
}


export class QuickWhitenSimulationClient extends QuickClient {
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

    if (message['status'] === 'error') {
      return this.throwError({message: message['data']['error'], safe})
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
