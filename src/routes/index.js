import express from 'express';
const router = express.Router();
import ImageProcessingService from '../models/image_processing_service'
import ImageProcessingSolicitation from '../models/image_processing_solicitation'

/* GET presigned post */
router.post('/image_processing_solicitation', async function(req, res) {
  const solicitation = ImageProcessingSolicitation.build(Object.assign({
    ip: req.ip,
    origin: req.get('Origin')
  }, req.body))

  const credentials = ImageProcessingService.build().credentialsFor(solicitation)
  const tasks = [
    solicitation.save(),
    credentials.requestJsonToUpload,
    credentials.requestUrlToGetOriginal,
    credentials.requestUrlToGetProcessed,
  ]
  Promise.all(tasks).then(([_, uploadJson, urlToGetOriginal, urlToGetProcessed]) => {
    res.json({
      presignedUpload: uploadJson,
      presignedDownloadOriginal: urlToGetOriginal,
      presignedDownloadAfter: urlToGetProcessed,
      sessionId: solicitation.id,
      key: solicitation.imageFilepath,
    })
  })
})

/* GET index */
router.get('/', async function(req, res) {
  res.render('index')
})

export default router
