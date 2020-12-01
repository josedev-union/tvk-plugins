import express from 'express';
const router = express.Router();
import {ImageProcessingService} from '../../models/storage/ImageProcessingService'
import {ImageProcessingSolicitation} from '../../models/database/ImageProcessingSolicitation'
import {DentistAccessPoint} from '../../models/database/DentistAccessPoint'
import {SolicitationRateLimit} from '../../models/database/SolicitationRateLimit'
import {env} from '../../config/env'
import {envShared} from '../../shared/envShared'
import {signer} from '../../shared/signer'
import {helpers} from '../helpers'

router.get('/for-user/:userId', async (req, res) => {
  const access = await DentistAccessPoint.findOneByUserId(req.params.userId)
  if (!access) {
    return res.status(404).send('')
  }

  return res.json({
    id: access.id,
    secret: access.secret
  })
})

router.post('/:id/image-processing-solicitations', async (req, res) => {
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

  let signatureMatches = signer.apiVerify([accessPointId, deviceId], access.secret, signature)
  if (!signatureMatches) {
    return res.status(403).send('')
  }

  const solicitation = ImageProcessingSolicitation.requestedByDentist({
    ip: req.ip,
    deviceId: deviceId,
    accessPointId: accessPointId
  })

  let hasFreeSlot = await SolicitationRateLimit.buildForDentist().addDentistSlots(solicitation)
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
