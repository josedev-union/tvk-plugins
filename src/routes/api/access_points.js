import express from 'express';
import {DentistAccessPoint} from '../../models/database/DentistAccessPoint'
const router = express.Router();

router.get('/for-user/:userId', async (req, res) => {
  let access = DentistAccessPoint.findOneByUserId(req.params.userId)
  if (!access) {
    return res.status(404).send('')
  }

  return res.json({
    id: access.id,
    secret: access.secret
  })
})

router.post(':id/image-processing-solicitations', async (req, res) => {
  const signature = helpers.getSignature(req)
  const accessPointId = helpers.normalizeParamValue(req.params.id)
  const deviceId = helpers.normalizeParamValue(req.get(envShared.deviceIdHeaderName))

  if (!signature || !accessPointId || !deviceId) {
    return res.status(400).send('')
  }
  const access = await DentistAccessPoint.get(accessPointId)
  if (!access) {
    return res.status(403).send('')
  }

  let signatureMatches = signer.verify([accessPointId, deviceId], access.secret, envShared.apiSecretToken, signature)
  if (!signatureMatches) {
    return res.status(403).send('')
  }

  const solicitation = ImageProcessingSolicitation.requestedByDentist(Object.assign({
    ip: req.ip,
    deviceId: deviceId,
    accessPointId: accessPointId
  }, params))

  let hasFreeSlot = await SolicitationRateLimit.build().addDentistSlots(solicitation)
  if (!hasFreeSlot) {
    return res.status(403).send('')
  }

  const credentials = ImageProcessingService.build().credentialsFor(solicitation)
  const tasks = [
    solicitation.save(),
    credentials.requestJsonToUpload,
    credentials.requestUrlToGetOriginal,
    credentials.requestUrlToGetProcessed,
  ]
  let [_, uploadJson, urlToGetOriginal, urlToGetProcessed] = await Promise.all(tasks)

  return res.json({
    presignedUpload: uploadJson,
    presignedDownloadOriginal: urlToGetOriginal,
    presignedDownloadAfter: urlToGetProcessed,
    solicitationId: solicitation.id,
    bucket: env.gcloudBucket,
  })
})

export default router
