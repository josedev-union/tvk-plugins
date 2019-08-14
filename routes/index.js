import express from 'express';
import AWS from 'aws-sdk'
const router = express.Router();
import Uploader from '../models/uploader.js'

/* GET presigned post */
router.post('/uploadCredentials', async function(req, res) {
  const s3 = new AWS.S3()
  const presignedJson = await new Uploader(s3).presignedPost()
  res.json(presignedJson)
});

/* GET index */
router.get('/', async function(req, res) {
  res.render('index')
});

module.exports = router;
