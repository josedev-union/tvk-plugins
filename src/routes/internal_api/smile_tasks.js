import express from 'express';
const router = express.Router();

import {SmileTask} from "../../models/database/SmileTask"
import {smileTaskStorage} from "../../models/storage/smileTaskStorage"
import {helpers} from '../helpers'
import {env} from "../../config/env"

router.put('/promote-uploaded', async (req, res) => {
  const smileTask = res.locals.dentSmileTask

  const {exist} = await smileTaskStorage.renameReviewedImage(smileTask)
  if (!exist) {
    return helpers.respondError(res, 404, "Couldn't find the image to promote")
  }

  return res.status(200).json({"promoted": true})
})

router.get('/result-candidates', async (req, res) => {
  const smileTask = res.locals.dentSmileTask
  if (!smileTask.hasFinished()) {
      return helpers.respondError(res, 423, "The simulation haven't finished yet.")
  }

  const candidates = await smileTaskStorage.listResultCandidates(smileTask)

  return res.status(200).json({"candidates": candidates})
})

router.put('/result-candidates/:resultId/promote', async (req, res) => {
  const smileTask = res.locals.dentSmileTask
  if (!smileTask.hasFinished()) {
      return helpers.respondError(res, 423, "The simulation haven't finished yet.")
  }
  const resultId = req.params['resultId']

  const {exist} = await smileTaskStorage.renameChosenResult(smileTask, resultId)
  if (!exist) {
    return helpers.respondError(res, 404, "Couldn't find the result candidate")
  }


  return res.status(200).json({"promoted": true})
})

export default router
