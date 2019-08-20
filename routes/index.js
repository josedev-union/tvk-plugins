import express from 'express';
const router = express.Router();
import UploadCredentialsProvider from '../models/upload_credentials_provider'
import GetFileCredentialsProvider from '../models/get_file_credentials_provider'

/* GET presigned post */
router.post('/uploadCredentials', async function(req, res) {
  const provider = new UploadCredentialsProvider.forImageUpload()
  const presignedUploadJson = await provider.presignedPostFor("xpto/xpto/pre", {expiresInSeconds: 10 * 60})
  const presignedDownloadOriginalUrl = await GetFileCredentialsProvider.presignedGetFor('xpto/xpto/pre.jpg', {
    expiresInSeconds: 10 * 60,
  })
  const presignedDownloadAfterUrl = await GetFileCredentialsProvider.presignedGetFor('xpto/xpto/after.jpg', {
    expiresInSeconds: 10 * 60,
  })
  res.json({
    presignedUpload: presignedUploadJson,
    presignedDownloadOriginal: presignedDownloadOriginalUrl,
    presignedDownloadAfter: presignedDownloadAfterUrl,
  })
});

/* GET index */
router.get('/', async function(req, res) {
  res.render('index')
});

module.exports = router;
