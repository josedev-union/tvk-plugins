import express from 'express'
const router = express.Router()

import {smileTaskSecurity as security} from "../../middlewares/smileTaskSecurity"
import {rateLimit} from "../../middlewares/rateLimit"
import {QuickSimulationClient} from "../../models/clients/QuickSimulationClient"
import {env} from "../../config/env"
import {helpers} from '../helpers'

const userRateLimit = rateLimit({
  limit: env.userRateLimit.amount,
  expiresIn: env.userRateLimit.timeWindow,
  lookup: (_, res) => res.locals.dentUser.id,
})

const ipRateLimit = rateLimit({
  limit: env.ipRateLimit.amount,
  expiresIn: env.ipRateLimit.timeWindow,
  lookup: (req, _) => req.ip,
})

const clientRateLimit = rateLimit({
  limit: env.clientRateLimit.amount,
  expiresIn: env.clientRateLimit.timeWindow,
  lookup: (_, res) => res.locals.dentClient.id,
})

function timenowStr() {
  return new Date().toLocaleString('en-US', {hour12: false}).match(/\d{2}:\d{2}:\d{2}/)[0];
}


class Timeout {
  constructor({timeSeconds, onTimeout, startNow=true}) {
    this.timeSeconds = timeSeconds;
    this.outOfTime = false;
    this.onTimeout = onTimeout;
    if (startNow) this.start();
  }

  getExpiresAt() {
    return this.expirationTimeSinceEpoch;
  }

  start() {
    console.log(`Try Start Timeout: ${this.timeSeconds}`)
    if (this.timeSeconds <= 0) return;
    this.expirationTimeSinceEpoch = Date.now() + this.timeSeconds * 1000;
    console.log(`Start Timeout: ${this.timeSeconds} - ${this.expirationTimeSinceEpoch}`)
    setTimeout(() => {
      this.outOfTime = true;
      this.onTimeout();
    }, this.timeSeconds*1000)
  }

  isOutOfTime() {
    return this.outOfTime;
  }

  wrapCancelOnTimeout(func, timeout) {
    let obj = this;
    return function() {
      if (obj.outOfTime) return;
      let args = [];
      let numOfArgs = arguments.length;
      for (let i = 2; i < numOfArgs; i++) {
        args.push(arguments[i]);
      }
      return func.apply(null, args)
    }
  }
}

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
  res.header('Content-Type', 'image/jpeg')
  return res.send(simulation.result)
}))

export default router
