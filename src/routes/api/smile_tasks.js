import express from 'express';
const router = express.Router();

import {SmileTask} from "../../models/database/SmileTask"
import {smileTaskSecurity as security} from "../../middlewares/smileTaskSecurity"
import {getModel} from "../../middlewares/getModel"
import {rateLimit} from "../../middlewares/rateLimit"
import {SmileResourcesGuide} from "../../models/storage/SmileResourcesGuide"
import {env} from "../../config/env"
import {helpers} from '../helpers'

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

router.post('/solicitation',
security.getContentType,
security.getSignature,
security.getImageMD5,
getModel.client,
security.verifySignature,
userRateLimit,
ipRateLimit,
clientRateLimit,
helpers.asyncCatchError(async (req, res) => {
  const manualReview = req.body.manualReview

  const smileTask = SmileTask.build(SmileTask.RequesterType.inhouseClient(), {
    ip: req.ip,
    userId: res.locals.dentUser.id,
    clientId: res.locals.dentClient.id,
    imageMD5: res.locals.dentImageMD5,
    contentType: res.locals.dentImageContentType,
  })

  const resources = SmileResourcesGuide.build()
  let uploadDescriptorTask
  if (manualReview) {
    uploadDescriptorTask = resources.uploadDescriptor(smileTask, {overwriteImageName: 'smile_review_pending'})
  } else {
    uploadDescriptorTask = resources.uploadDescriptor(smileTask)
  }
  let [_, uploadDescriptor] = await Promise.all([
    smileTask.save(),
    uploadDescriptorTask,
  ])

  let response = {
    uploadDescriptor: uploadDescriptor,
    originalPath: smileTask.filepathUploaded,
    resultPath: smileTask.filepathResult,
    smileTaskId: smileTask.id,
  }

  if (!manualReview) {
    response.progressWebsocket = `/ws/smile-tasks/${smileTask.id}`
  }

  return res.json(response)
}))

export default router
