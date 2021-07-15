import fs from 'fs'
import express from 'express'
import formidable from 'formidable'
const router = express.Router()

import {SmileTask} from "../../models/database/SmileTask"
import {smileTaskSecurity as security} from "../../middlewares/smileTaskSecurity"
import {getModel} from "../../middlewares/getModel"
import {rateLimit} from "../../middlewares/rateLimit"
import {SmileResourcesGuide} from "../../models/storage/SmileResourcesGuide"
import {env} from "../../config/env"
import {redisPubsub} from "../../config/redis"
import {helpers} from '../helpers'
import {idGenerator} from '../../models/tools/idGenerator'

const userRateLimit = rateLimit({
  limit: env.userRateLimit.amount,
  expiresIn: env.userRateLimit.timeWindow,
  lookup: (_, res) => res.locals.dentUser.id,
})

const ipRateLimit = rateLimit({
  limit: env.ipRateLimit.amount,
  expiresIn: env.ipRateLimit.timeWindow,
  lookup: (req, _) => req.ip,
})

const clientRateLimit = rateLimit({
  limit: env.clientRateLimit.amount,
  expiresIn: env.clientRateLimit.timeWindow,
  lookup: (_, res) => res.locals.dentClient.id,
})

function timenowStr() {
  return new Date().toLocaleString('en-US', {hour12: false}).match(/\d{2}:\d{2}:\d{2}/)[0];
}


class Timeout {
  constructor({timeSeconds, onTimeout, startNow=true}) {
    this.timeSeconds = timeSeconds;
    this.outOfTime = false;
    this.onTimeout = onTimeout;
    if (startNow) this.start();
  }

  start() {
    console.log(`Start Timeout: ${this.timeSeconds}`)
    if (this.timeSeconds <= 0) return;
    setTimeout(() => {
      this.outOfTime = true;
      this.onTimeout();
    }, this.timeSeconds*1000)
  }

  isOutOfTime() {
    return this.outOfTime;
  }

  wrapCancelOnTimeout(func, timeout) {
    let obj = this;
    return function() {
      if (obj.outOfTime) return;
      let args = [];
      let numOfArgs = arguments.length;
      for (let i = 2; i < numOfArgs; i++) {
        args.push(arguments[i]);
      }
      return func.apply(null, args)
    }
  }
}

router.post('/',
//security.getContentType,
//security.getSignature,
//security.getImageMD5,
//getModel.client,
//security.verifySignature,
//userRateLimit,
//ipRateLimit,
//clientRateLimit,
helpers.asyncCatchError(async (req, res, next) => {
  const routeTimeout = new Timeout({
    timeSeconds: env.quickSimulationRouteTimeout,
    onTimeout: () => helpers.respondError(res, 504, 'Timeout!!'),
    startNow: true,
  });
  const routeNoUploadTimeout = new Timeout({
    timeSeconds: env.quickSimulationRouteNoUploadTimeout,
    onTimeout: () => helpers.respondError(res, 504, 'Timeout!!'),
    startNow: false,
  });
  next = routeTimeout.wrapCancelOnTimeout(next)
  next = routeNoUploadTimeout.wrapCancelOnTimeout(next)
  console.log(`[0 - ${timenowStr()}]: Request Received`)
  const form = formidable({ multiples: true })
  const startTime = new Date().getTime()
  return form.parse(req, (err, fields, files) => {
    if (err) throw err;
    if (env.skipQuickSimulation) {
      return res.status(201).json({"skipped": true})
    }

    routeNoUploadTimeout.start()
    if (routeTimeout.isOutOfTime() || routeNoUploadTimeout.isOutOfTime()) return;
    const id = idGenerator.newOrderedId()
    console.log(`[1 - ${timenowStr()} - ${id}]: Request Received (UploadTime: ${new Date().getTime() - startTime} ms)`)
    const photoRedisKey = `pipeline:listener:${id}:photo`
    fs.readFile(files.photo.path, (err, photo) => {
      if (err) throw err;
      redisPubsub.setex(photoRedisKey, env.quickSimulationTimeout, Buffer.from(photo, 'binary'), (err) => {
        if (err) throw err;
      })
      if (routeTimeout.isOutOfTime() || routeNoUploadTimeout.isOutOfTime()) return;
      redisPubsub.publish('pipeline:listener:request', JSON.stringify({
        id: id,
        params: {
          photo_redis_key: photoRedisKey,
          mix_factor: parseFloat(fields.mix_factor),
        }
      }))
      console.log(`[2 - ${timenowStr()} - ${id}]: Params Published`)
      const subscriber = redisPubsub.duplicate()
      subscriber.on('message', (channel, messageStr) => {
        console.log(`[3 - ${timenowStr()} - ${id}]: Result Received ${messageStr}`)
        const message = JSON.parse(messageStr)
        subscriber.unsubscribe()
        if (message['error']) {
          helpers.respondError(res, 500, message['error']);
          return;
        }
        const result_redis_key = message['result']['redis_key']
        redisPubsub.get(result_redis_key, (err, result_photo) => {
          if (err) throw err;
          redisPubsub.del(result_redis_key)
          // console.log(`ResultPhoto: ${result_photo}`)
          if (routeTimeout.isOutOfTime() || routeNoUploadTimeout.isOutOfTime()) return;
          res.header('Content-Type', 'image/jpeg')
          return res.send(result_photo)
        })
      })
      subscriber.subscribe(`pipeline:listener:${id}:response`)
    })
  })

  // const manualReview = req.body.manualReview

  // const smileTask = SmileTask.build(SmileTask.RequesterType.inhouseClient(), {
  //   ip: req.ip,
  //   userId: res.locals.dentUser.id,
  //   clientId: res.locals.dentClient.id,
  //   imageMD5: res.locals.dentImageMD5,
  //   contentType: res.locals.dentImageContentType,
  // })

  // const resources = SmileResourcesGuide.build()
  // let uploadDescriptorTask
  // if (manualReview) {
  //   uploadDescriptorTask = resources.uploadDescriptor(smileTask, {overwriteImageName: 'smile_review_pending'})
  // } else {
  //   uploadDescriptorTask = resources.uploadDescriptor(smileTask)
  // }
  // let [_, uploadDescriptor] = await Promise.all([
  //   smileTask.save(),
  //   uploadDescriptorTask,
  // ])

  // let response = {
  //   uploadDescriptor: uploadDescriptor,
  //   originalPath: smileTask.filepathUploaded,
  //   resultPath: smileTask.filepathResult,
  //   preprocessedPath: smileTask.filepathPreprocessed,
  //   sideBySidePath: smileTask.filepathSideBySide,
  //   sideBySideSmallPath: smileTask.filepathSideBySideSmall,
  //   smileTaskId: smileTask.id,
  // }

  // if (!manualReview) {
  //   response.progressWebsocket = `/ws/smile-tasks/${smileTask.id}`
  // }

  //return res.json(response)
}))

export default router
