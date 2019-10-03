import express from 'express';
const router = express.Router();
import ImageProcessingService from '../models/image_processing_service'
import ImageProcessingSolicitation from '../models/image_processing_solicitation'
import * as signer from '../shared/signer'
import DentistAccessPoint from '../models/dentist_access_point'
import SolicitationRateLimit from '../models/solicitation_rate_limit';
import Uri from '../models/uri'

/* GET presigned post */
router.options('/image_processing_solicitation', (req, res) => {
  setCors(req, res)
  res.status(200).send('')
})

router.post('/image_processing_solicitation', async function(req, res) {
  let data = {}
  for (let k in req.body) {
    data[k] = req.body[k]
  }
  const referer = req.get('Referer') || req.get('Origin') || req.get('Host')
  const receivedReferer = typeof(referer) === 'string' && referer !== ''
  const signature = req.get('Miroweb-ID')
  const receivedSignature = typeof(signature) === 'string' && signature !== ''
  let access
  if (receivedSignature && receivedReferer) {
    const accessPoints = await DentistAccessPoint.allForHost(referer)
    access = accessPoints.find((access) => {
      return signer.verify(data, access.secret, signature)
    })
  }

  if (access === undefined) {
    return res.status(403).send('')
  }

  const solicitation = ImageProcessingSolicitation.build(Object.assign({
    ip: req.ip,
    origin: referer
  }, data))

  let hasFreeSlot = await SolicitationRateLimit.build().add(solicitation)
  if (!hasFreeSlot) return res.status(403).send('')

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
    sessionId: solicitation.id,
    key: solicitation.imageFilepath,
  })
})

/* GET index */
router.get('/', async (req, res) => {
  let access = (await DentistAccessPoint.allForHost(req.get('Host')))[0]
  res.render('index', {secret: access.secret})
})

function setCors(req, res) {
  const referer = req.get('Referer') || req.get('Origin') || req.get('Host')
  res.set({
    "Access-Control-Allow-Origin": new Uri(referer).toString({path: false}),
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "MIROWEB-ID",
  })
}

export default router
