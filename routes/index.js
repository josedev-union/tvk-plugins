import express from 'express';
const router = express.Router();
import UploadCredentialsProvider from '../models/upload_credentials_provider'

/* GET presigned post */
router.post('/uploadCredentials', async function(req, res) {
  const provider = new UploadCredentialsProvider.forImage()
  const presignedJson = await provider.presignedPostFor("xpto/pre", {expiresInSeconds: 10 * 60})
  res.json(presignedJson)
});

/* GET index */
router.get('/', async function(req, res) {
  res.render('index')
});

module.exports = router;
