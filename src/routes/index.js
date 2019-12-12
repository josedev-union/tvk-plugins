import express from 'express';
const router = express.Router();
import ImageProcessingService from '../models/image_processing_service'
import ImageProcessingSolicitation from '../models/image_processing_solicitation'
import DentistAccessPoint from '../models/dentist_access_point'
import SolicitationRateLimit from '../models/solicitation_rate_limit';
import Uri from '../models/uri'

/* GET presigned post */
router.options('/image_processing_solicitation', (req, res) => {
  setCors(req, res)
  res.status(200).send('')
})

router.post('/image_processing_solicitation', async (req, res) => {
  let params = {}
  for (let k in req.body) params[k] = req.body[k]

  const referer = normalizeParamValue(req.get('Referer') || req.get('Origin') || req.get('Host'))
  const signature = normalizeParamValue(req.get('Miroweb-ID'))
  if (!referer || !signature) {
    return res.status(400).send('')
  }

  const access = await DentistAccessPoint.findOne(params, referer, signature)
  if (!access) {
    return res.status(403).send('')
  }

  const solicitation = ImageProcessingSolicitation.build(Object.assign({
    ip: req.ip,
    origin: referer
  }, params))

  let hasFreeSlot = await SolicitationRateLimit.build().add(solicitation)
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
    sessionId: solicitation.id,
    key: solicitation.imageFilepath,
    bucket: process.env.MIROWEB_S3_BUCKET,
  })
})

/* GET index */
router.get('/', async (req, res) => {
  const access = (await DentistAccessPoint.allForHost(req.get('Host')))[0]
  if (!access) {
    return res.status(403).send('Not allowed')
  }
  res.render('index', {secret: access.secret})
})

function normalizeParamValue(value) {
  return isSet(value) ? value : null
}

function isSet(value) {
  return typeof(value) === 'string' && value !== '' && typeof(value) !== 'undefined'
}

function setCors(req, res) {
  const referer = req.get('Referer') || req.get('Origin') || req.get('Host')
  res.set({
    "Access-Control-Allow-Origin": new Uri(referer).toString({path: false}),
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "MIROWEB-ID",
  })
}

export default router
