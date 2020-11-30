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

/* GET presigned post */
router.options('/by-patient', (req, res) => {
  helpers.setCors(req, res)
  res.status(200).send('')
})

router.post('/by-patient', async (req, res) => {
  let params = {}
  for (let k in req.body) params[k] = req.body[k]

  const referer = helpers.getReferer(req)
  const signature = helpers.getSignature(req)
  if (!referer || !signature) {
    return res.status(400).send('')
  }

  const access = await DentistAccessPoint.findOne(params, referer, signature)
  if (!access) {
    return res.status(403).send('')
  }

  const solicitation = ImageProcessingSolicitation.requestedByPatient(Object.assign({
    ip: req.ip,
    origin: referer,
    accessPointId: access.id
  }, params))

  let hasFreeSlot = await SolicitationRateLimit.build().addPatientSlots(solicitation)
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

  helpers.setCors(req, res)
  return res.json({
    presignedUpload: uploadJson,
    presignedDownloadOriginal: urlToGetOriginal,
    presignedDownloadAfter: urlToGetProcessed,
    solicitationId: solicitation.id,
    bucket: env.gcloudBucket,
  })
})

export default router
