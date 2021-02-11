import express from 'express';
const router = express.Router();

// const src = '../..'
import {SmileTask} from "../../models/database/SmileTask"
import {smileTaskSecurity as security} from "../../middlewares/smileTaskSecurity"
import {getModel} from "../../middlewares/getModel"
import {SmileResourcesGuide} from "../../models/storage/SmileResourcesGuide"

router.post('/solicitation',
security.getContentType,
security.getSignature,
security.getImageMD5,
getModel.client,
security.verifySignature,
async (req, res) => {
  const smileTask = SmileTask.build(SmileTask.RequesterType.inhouseClient(), {
    ip: req.ip,
    userId: res.locals.dentUser.id,
    clientId: res.locals.dentClient.id,
    imageMD5: res.locals.dentImageMD5,
    contentType: res.locals.dentImageContentType,
  })

  const resources = SmileResourcesGuide.build()
  let [_, uploadDescriptor, resultDescriptorGet] = await Promise.all([
    smileTask.save(),
    resources.uploadDescriptor(smileTask),
    resources.resultDescriptorGet(smileTask),
  ])

  return res.json({
    uploadDescriptor: uploadDescriptor,
    resultDescriptorGet: resultDescriptorGet,
    progressWebsocket: `/ws/smile-tasks/${smileTask.id}`,
  })
})

export default router
