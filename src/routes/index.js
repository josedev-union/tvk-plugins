import express from 'express';
const router = express.Router();
import ImageProcessingService from '../models/image_processing_service'
import ImageProcessingSolicitation from '../models/image_processing_solicitation'
import * as signer from '../models/signer'
import DentistAccessPoint from '../models/dentist_access_point'

/* GET presigned post */
router.post('/image_processing_solicitation', async function(req, res) {
  let origin = req.get('Origin')
  let signature = req.get('Miroweb-ID')
  let receivedSignature = typeof(signature) === 'string' && signature !== ''
  let accessPoints = await DentistAccessPoint.allForHost(origin)
  let access = accessPoints.find((access) => {
    return signer.verify(req.body, access.secret, signature)
  })

  if (!receivedSignature || access === undefined) {
    return res.status(403).send('')
  }

  const solicitation = ImageProcessingSolicitation.build(Object.assign({
    ip: req.ip,
    origin: origin
  }, req.body))

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
    sessionId: solicitation.id,
    key: solicitation.imageFilepath,
  })
})

/* GET index */
router.get('/', async function(req, res) {
  res.render('index')
})

export default router
