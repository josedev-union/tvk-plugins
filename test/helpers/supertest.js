import app from '../../src/app'
import request from 'supertest'

function logErrors (err, req, res, next) {
  console.error('!!! SERVER ERROR', err)
  next(err)
}

export function initSupertestApp({trustProxy=true, appSetup=(app) => null}={}) {
  app.enable('trust proxy')
  if (appSetup) appSetup(app)
  app.use(logErrors)
  return {
    request: request(app),
  }
}
