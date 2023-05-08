import fs from 'fs'
import {env} from '../../config/env'
import {logger} from '../../instrumentation/logger'
import {idGenerator} from '../tools/idGenerator'
import {redisPubsub, buffersRedis, redisSubscribe} from "../../config/redis"
import {RichError} from "../../utils/RichError"
import {simpleCrypto} from "../../shared/simpleCrypto"
import {promisify} from "util"
import {QuickClient} from './base'

const readfile = promisify(fs.readFile)
const redisGet = promisify(buffersRedis.get).bind(buffersRedis)
const redisSetex = promisify(buffersRedis.setex).bind(buffersRedis)
const redisDel = promisify(buffersRedis.del).bind(buffersRedis)

const redisGetSafe = (key) => !key ? undefined : redisGet(key)
const redisDelSafe = (key) => !key ? undefined : redisDel(key)


export class QuickSynthClient extends QuickClient {
  static PUBSUB_PREFIX = 'listener:quick:synth'
  static pubsubRequestKey() { return `${this.PUBSUB_PREFIX}:request` }
  static pubsubResponseKey(id) { return `${this.PUBSUB_PREFIX}:${id}:response` }

  async request({id, segmap, segmapPath, startStyleImg, endStyleImg, expiresAt=0, options={}, safe=false}) {
    if (!id) id = idGenerator.newOrderedId()
    logger.verbose(`[${id}] Requesting task (${JSON.stringify(options)})`)

    if (!segmap) segmap = await readfile(segmapPath)
    const segmapBuffer = Buffer.from(segmap, 'binary')
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

    await this.#publishRequest(id, segmapBuffer, startStyleBuffer, endStyleBuffer, expiresAt, options)
    const pubsubChannel = this.constructor.pubsubResponseKey(id)
    const {result, startStats, endStats, error} = await this.#waitResponse({pubsubChannel, safe})
    return {
      id,
      result,
      startStats,
      endStats,
      error,
      original: segmap,
      success: !error,
    }
  }

  async #publishRequest(id, segmapBuffer, startStyleBuffer, endStyleBuffer, expiresAt, options) {
    const segmapRedisKey = `task:listener:${id}:segmap`
    const startStyleImgRedisKey = `task:listener:${id}:startStyle`
    const endStyleImgRedisKey = `task:listener:${id}:endStyle`

    const segmapEncrypted = this.encrypt(segmapBuffer)
    const startStyleEncrypted = this.encrypt(startStyleBuffer)
    const endStyleEncrypted = this.encrypt(endStyleBuffer)

    await redisSetex(segmapRedisKey, 45, segmapEncrypted)

    var params = {
      segmap_redis_key: segmapRedisKey,
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
    const [resultPhoto,] = (await Promise.all([
      redisGetSafe(resultRedisKey),
    ]))
    .map(content => this.decrypt(content))

    redisDelSafe(resultRedisKey)
    const response = {
      'result': resultPhoto,
      'startStats': message['data']['start_stats'],
      'endStats': message['data']['end_stats'],
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
