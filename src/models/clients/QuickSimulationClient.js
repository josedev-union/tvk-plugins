import fs from 'fs'
import {env} from '../../config/env'
import {logger} from '../../instrumentation/logger'
import {idGenerator} from '../../models/tools/idGenerator'
import {redisPubsub, buffersRedis, redisSubscribe} from "../../config/redis"
import {promisify} from "util"

const readfile = promisify(fs.readFile)
const redisGet = promisify(buffersRedis.get).bind(buffersRedis)
const redisSetex = promisify(buffersRedis.setex).bind(buffersRedis)
const redisDel = promisify(buffersRedis.del).bind(buffersRedis)
const PUBSUB_PREFIX = 'listener:pipeline-in-memory'

export class QuickSimulationClient {
  static pubsubRequestKey() { return `${PUBSUB_PREFIX}:request` }
  static pubsubResponseKey(id) { return `${PUBSUB_PREFIX}:${id}:response` }

  async requestSimulation(photoPath, mixFactor=null) {
    const id = idGenerator.newOrderedId()
    logger.info(`[${id}] Requesting Simulation (mixFactor:${mixFactor})`) // (UploadTime: ${new Date().getTime() - startTime} ms)`)
    const photoRedisKey = `pipeline:listener:${id}:photo`
    const photo = await readfile(photoPath)
    const photoBuffer = Buffer.from(photo, 'binary')
    await this.#publishRequest(id, photoBuffer, photoRedisKey, mixFactor)
    const resultPhoto = await this.#waitResponse(QuickSimulationClient.pubsubResponseKey(id))
    return {
      original: photo,
      result: resultPhoto,
    }
  }

  async #publishRequest(id, photoBuffer, photoRedisKey, mixFactor) {
    await redisSetex(photoRedisKey, 15, photoBuffer)
    var params = {
      photo_redis_key: photoRedisKey,
      expires_at: 0//expirationTimeSinceEpoch
    }

    if (mixFactor !== null) {
      params['mix_factor'] = parseFloat(mixFactor)
    }
    const publishedMessage = JSON.stringify({
      id: id,
      params: params
    })
    redisPubsub.publish(QuickSimulationClient.pubsubRequestKey(), publishedMessage)
    logger.info(`[${id}]: Params Published: ${publishedMessage}`)
  }

  async #waitResponse(pubsubChannel) {
    const messageStr = await redisSubscribe(pubsubChannel)
    logger.info(`Result Received ${pubsubChannel} - ${messageStr}`)
    const message = JSON.parse(messageStr)
    if (message['error']) {
      throw new Error(message['error'])
    }
    const resultRedisKey = message['result']['redis_key']
    const resultPhoto = await redisGet(resultRedisKey)
    redisDel(resultRedisKey)
    return resultPhoto
  }
}
