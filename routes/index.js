import express from 'express';
import path from 'path'
const router = express.Router();
import UploadCredentialsProvider from '../models/upload_credentials_provider'
import GetFileCredentialsProvider from '../models/get_file_credentials_provider'

/* GET presigned post */
router.post('/sessions', async function(req, res) {
  const session = Object.assign({
    ip: req.ip,
    origin: req.get('Origin'),
  }, req.body)
  const sessionId = new Buffer(JSON.stringify(session)).toString('base64')
  const sessionPath = `${session.email}/${sessionId}`
  const provider = new UploadCredentialsProvider.forImageUpload()
  const imageKey = path.join(sessionPath, 'pre')
  const presignedUploadJson = await provider.presignedPostFor(imageKey, {expiresInSeconds: 10 * 60})
  const presignedDownloadOriginalUrl = await GetFileCredentialsProvider.presignedGetFor(`${imageKey}.jpg`, {
    expiresInSeconds: 10 * 60,
  })
  const presignedDownloadAfterUrl = await GetFileCredentialsProvider.presignedGetFor(path.join(sessionPath, 'after.jpg'), {
    expiresInSeconds: 10 * 60,
  })
  res.json({
    presignedUpload: presignedUploadJson,
    presignedDownloadOriginal: presignedDownloadOriginalUrl,
    presignedDownloadAfter: presignedDownloadAfterUrl,
    sessionId: sessionId,
    key: imageKey,
  })
});

/* GET index */
router.get('/', async function(req, res) {
  res.render('index')
});

module.exports = router;
