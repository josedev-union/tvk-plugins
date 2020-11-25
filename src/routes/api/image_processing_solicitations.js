import express from 'express';
const router = express.Router();
import {ImageProcessingService} from '../../models/storage/ImageProcessingService'
import {ImageProcessingSolicitation} from '../../models/database/ImageProcessingSolicitation'
import {DentistAccessPoint} from '../../models/database/DentistAccessPoint'
import {SolicitationRateLimit} from '../../models/database/SolicitationRateLimit'
import {Uri} from '../../models/tools/Uri'
import {env} from '../../config/env'
import {envShared} from '../../shared/envShared'
import {helpers} from '../helpers'

/* GET presigned post */
router.options('/', (req, res) => {
  setCors(req, res)
  res.status(200).send('')
})

router.post('/', async (req, res) => {
  let params = {}
  for (let k in req.body) params[k] = req.body[k]

  const referer = helpers.getReferer(req)
  const signature = helpers.normalizeParamValue(req.get(envShared.signatureHeaderName))
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

  setCors(req, res)
  return res.json({
    presignedUpload: uploadJson,
    presignedDownloadOriginal: urlToGetOriginal,
    presignedDownloadAfter: urlToGetProcessed,
    solicitationId: solicitation.id,
    bucket: env.gcloudBucket,
  })
})

function setCors(req, res) {
  const referer = req.get('Referer') || req.get('Origin') || req.get('Host')
  res.set({
    "Access-Control-Allow-Origin": new Uri(referer).toString({path: false}),
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": envShared.signatureHeaderName,
  })
}

export default router
