import express from 'express';
import admin from 'firebase-admin'
import path from 'path'
const router = express.Router();
import UploadCredentialsProvider from '../models/upload_credentials_provider'
import GetFileCredentialsProvider from '../models/get_file_credentials_provider'

/* GET presigned post */
router.post('/sessions', async function(req, res) {
  const session = Object.assign({
    createdAt: new Date(),
    ip: req.ip,
    origin: req.get('Origin'),
  }, req.body)
  const cleanedOrigin = session.origin.match(/https?:\/\/(www\.)?([^\/]+)\/?/)[2]
  const idbase = `${uuid(8)}|${session.email}|${cleanedOrigin}`
  const sessionId = base64(idbase)
  const sessionPath = `${base64(session.ip)}/${sessionId}`
  const provider = new UploadCredentialsProvider.forImageUpload()
  const imageKey = path.join(sessionPath, 'pre')
  const imageFullPath = `${imageKey}.jpg`
  const afterFullPath = path.join(sessionPath, 'after.jpg')
  const sessionRecord = Object.assign({
    originalPath: imageFullPath,
    afterPath: afterFullPath,
  }, session)
  const encodedEmail = base64(session.email)
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

function uuid(size = 10) {
  const uuidChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.,!@#$%&*()+=[]{}/\\<>;:".split('')
  let uuid = ""
  for (let i = 0; i < size; i++) {
    uuid += uuidChars[Math.floor(Math.random()*uuidChars.length)]
  }
  return uuid
}

function base64(str) {
  return Buffer.from(str).toString('base64')
}

export default router
