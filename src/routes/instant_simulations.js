import express from 'express';
const router = express.Router();

import {i18n} from '../shared/i18n'
import {helpers} from './helpers'
import {rateLimit} from "../middlewares/rateLimit"
import {QuickSimulationClient} from "../models/clients/QuickSimulationClient"
import {env} from "../config/env"

router.get('/', async (req, res) => {
  res.render('instant_simulations/index', {i18n: i18n}) // secret: access.secret, 
})

router.post('/',
//security.getContentType,
//security.getSignature,
//security.getImageMD5,
//getModel.client,
//security.verifySignature,
//userRateLimit,
//ipRateLimit,
//clientRateLimit,
helpers.asyncCatchError(async (req, res, next) => {
  const {files, fields} = await helpers.parseForm(req)
  const client = new QuickSimulationClient()
  const simulation = await client.requestSimulation(files.photo.path)
  const resultDataUrl = helpers.toDataUrl(simulation.result)
  const originalDataUrl = helpers.toDataUrl(simulation.original)
  return res.render('instant_simulations/index', {i18n: i18n, simulation: {result: resultDataUrl, original: originalDataUrl}}) // secret: access.secret, 
  //res.header('Content-Type', 'image/jpeg')
  //return res.send(resultDataUrl)
}))

export default router
