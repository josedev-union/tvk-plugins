import express from 'express';
const router = express.Router();

import {SmileTask} from "../../models/database/SmileTask"
import {dentistMailer} from '../../mailers/dentistMailer'
import {env} from "../../config/env"

router.post('/status-update', async (req, res) => {
  const message = req.body
  const smileTask = await SmileTask.get(message.smileTaskId)
  const evt = message.event
  const tasks = []
  let newStatus = null
  if (evt === 'processing_step') {
    newStatus = message.step
  }
  else if (evt === 'error') {
    newStatus = 'error'
  }
  else if (evt === 'finished') {
    newStatus = 'finished'
    tasks.push(dentistMailer.notifyProcessingComplete(smileTask))
  }
  smileTask.status = newStatus
  tasks.push(smileTask.save())
  await Promise.all(tasks)
  return res.status(200).send('SUCCESS')
})

export default router
