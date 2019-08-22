import express from 'express';
import admin from 'firebase-admin'
import path from 'path'
const router = express.Router();
import UploadCredentialsProvider from '../models/upload_credentials_provider'
import GetFileCredentialsProvider from '../models/get_file_credentials_provider'

/* GET presigned post */
router.post('/sessions', async function(req, res) {
  const session = Object.assign({
    ip: req.ip,
    origin: req.get('Origin'),
    createdAt: new Date(),
  }, req.body)
  const sessionId = Buffer.from(JSON.stringify(session)).toString('base64')
  const sessionPath = `${session.email}/${sessionId}`
  const provider = new UploadCredentialsProvider.forImageUpload()
  const imageKey = path.join(sessionPath, 'pre')
  const imageFullPath = `${imageKey}.jpg`
  const afterFullPath = path.join(sessionPath, 'after.jpg')
  const sessionRecord = Object.assign({
    originalPath: imageFullPath,
    afterPath: afterFullPath,
  }, session)
  const encodedEmail = Buffer.from(session.email).toString('base64')
  admin.database().ref(`/miroweb_data/sessions/${encodedEmail}/${sessionId}`).set(sessionRecord)
  const presignedUploadJson = await provider.presignedPostFor(imageKey, {expiresInSeconds: 10 * 60})
  const presignedDownloadOriginalUrl = await GetFileCredentialsProvider.presignedGetFor(imageFullPath, {
    expiresInSeconds: 10 * 60,
  })
  const presignedDownloadAfterUrl = await GetFileCredentialsProvider.presignedGetFor(afterFullPath, {
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
