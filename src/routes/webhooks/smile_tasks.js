import express from 'express';
const router = express.Router();

import {SmileTask} from "../../models/database/SmileTask"
import {env} from "../../config/env"

router.post('/status-update', async (req, res) => {
  const message = req.body
  const smileTask = await SmileTask.get(message.smileTaskId)
  smileTask.status = statusFromMessage(message)
  await smileTask.save()
  return res.status(200).send('SUCCESS')
})

function statusFromMessage(message) {
  const evt = message.event
  if (evt === 'processing_step') {
    return message.step
  }
  else if (evt === 'error') {
    return 'error'
  }
  else if (evt === 'finished') {
    return 'finished'
  }
}

export default router
