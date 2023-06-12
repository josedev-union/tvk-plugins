import fs from 'fs'
import {promisify} from "util"
import FormData from 'form-data'
import { Factory } from 'rosie'

import axios from 'axios'

import {redisPubsub, buffersRedis, redisSubscribe, clearRedis, redisUnsubscribeAll, quitRedis, quitBuffersRedis, quitRedisPubsub} from '../../src/config/redis'
import {QuickFullSimulationClient} from "../../src/models/clients/QuickSimulationClient"
import {QuickFullSimulation} from "../../src/models/database/QuickSimulation"
import {ApiSimulationClient} from "../helpers/ApiSimulationClient"
import {firebaseHelpers} from '../helpers/firebaseHelpers'
import {simpleCrypto} from "../../src/shared/simpleCrypto"
import querystring from 'querystring'

import {initSupertestApp} from '../helpers/supertest'
const supertestApp = initSupertestApp()

import {env} from '../../src/config/env'
jest.mock('../../src/config/env' , () => {
  const {env: originalEnv} = jest.requireActual('../../src/config/env')
  const env = {...originalEnv}
  env.quickApiRouteTimeout = 0.5
  env.quickApiMaxUploadSizeMb = 0.6
  env.quickApiMaxUploadSizeBytes = env.quickApiMaxUploadSizeMb * 1024 * 1024

  env.quickApiRateLimit_timeWindowSeconds = 120.0
  env.quickApiRateLimit_clientSimulationsPerTimeWindow = 2.0
  env.quickApiRateLimit_clientRequestsPerTimeWindow = 3.0

  env.quickApiRateLimit_ipSimulationsPerTimeWindow = 2.0
  env.quickApiRateLimit_ipRequestsPerTimeWindow = 3.0

  return {
    __esModule: true,
    env,
  }
})

import {storageFactory} from '../../src/models/storage/storageFactory'
jest.mock('../../src/models/storage/storageFactory', () => {
  const path = require('path')
  const { BufferWritable } = require('../../src/utils/BufferWritable')
  const storage = {
    publicUrls: {},
    uploads: {},
    signedUrls: {},

    bucket: jest.fn().mockImplementation((bucketname) => {
      storage.bucketname = bucketname
      storage.storageId = `${storage.projectKey}/${bucketname}`
      return storage
    }),

    file: jest.fn().mockImplementation((filepath) => {
      storage.filepath = filepath
      storage.filename = filepath.match(/[^\/]+\..*$/)
      return storage
    }),

    publicUrl: jest.fn().mockImplementation(() => {
      const url = `http://gcloud.presigned.com/public/${storage.projectKey}/${storage.bucketname}/${storage.filepath}`
      storage.publicUrls[storage.filename] = url
      return url
    }),

    createWriteStream: jest.fn().mockImplementation(() => {
      const {storageId, uploads, filepath, filename} = storage
      if (!uploads[storageId]) uploads[storageId] = {}

      const writable = new BufferWritable()
      writable.on('finish', () => {
        uploads[storageId][filepath] = writable.content
        uploads[storageId][filename] = writable.content
      })
      return writable
    }),

    getSignedUrl: jest.fn().mockImplementation((opts) => {
      const {filepath, filename, signedUrls, bucketname, projectKey} = storage
      const signedUrl = `http://gcloud.presigned.com/${projectKey}/${bucketname}/${filepath}`
      signedUrls[filename] = signedUrl
      return Promise.resolve([signedUrl])
    })
  }
  return {
    storageFactory: ({projectKey}={}) => {
      storage.projectKey = projectKey || 'default'
      return storage
    }
  }
})

jest.mock('axios', () => {
  return {
    post: jest.fn().mockImplementation(async (url) => {
      if (!url.includes('/recaptcha/')) {
        throw new Error('Axios was mocked for test and only accepts recaptcha requests')
      }

      const successMatch = url.match(/success_([0-9.]+)/)
      if (successMatch) {
        const score = parseFloat(successMatch[1])
        return {data: {success: true, score: score}}
      } else if (url.includes('error')) {
        throw new Error('Fake exception on recaptcha verify')
      } else {
        return {data: {success: false}}
      }
    })
  }
})

const readfile = promisify(fs.readFile)
const redisSetex = promisify(buffersRedis.setex).bind(buffersRedis)
const redisGet = promisify(buffersRedis.get).bind(buffersRedis)
const storage = storageFactory()

let photoAfterSimulation
let photoBefore
let photoInput
let mouthMorphed
let bigPhotoInput

beforeAll(async () => {
  await firebaseHelpers.ensureTestEnv()
  photoAfterSimulation = await readfile('./test/fixtures/photo_after_simulation.jpg')
  photoBefore = await readfile('./test/fixtures/photo.jpg')
  photoInput = await readfile('./test/fixtures/photo.jpg')
  mouthMorphed = await readfile('./test/fixtures/morphed.png')
  bigPhotoInput = await readfile('./test/fixtures/face-1.1mb.jpg')
})

const VALID_FORMAT_COMBINATIONS = [
  {isPublicCall: true , auth: 'signed-claims'        , body: 'formdata'},
  {isPublicCall: false, auth: 'signed-claims'        , body: 'formdata'},
  {isPublicCall: false, auth: 'simple-claims'        , body: 'formdata'},
  {isPublicCall: false, auth: 'querystring-client-id', body: 'formdata'},
  {clientCustomBucket: 'b-dentrino-client-test.appspot.com', clientCustomGoogleProject: 'b-dentrino'},
]

describe('POST simulations/ortho', () => {
  describeCommonErrors({mode: 'ortho'})
  describeSimulationErrors({mode: 'ortho'})
  describeSimulationSupportedFormats({mode: 'ortho'})

  describe.each(VALID_FORMAT_COMBINATIONS)(`on a successful request (format = %o)`, (formatCfg) => {
    let response
    let bucketname
    let googleProject
    let storageId

    beforeAll(async () => {
      bucketname = formatCfg.clientCustomBucket || 'dentrino-test.appspot.com'
      googleProject = formatCfg.clientCustomGoogleProject || 'default'
      storageId = `${googleProject}/${bucketname}`
      const result = await prepareAndRunSimulation({
        mode: 'ortho',
        apiClientCfg: {
          customBucket: formatCfg.clientCustomBucket,
          customGoogleProject: formatCfg.clientCustomGoogleProject,
        },
        requestCfg: {
          format: formatCfg,
        }
      })
      response = result.response
    })

    describeSimulationMetadataChanges(() => {
      return {response, googleProject}
    })
    describeSimulationStorageChanges(() => {
      return {response, bucketname, googleProject, storageId}
    })

    test(`respond 201`, async () => {
      expect(response.status).toBe(201)
      expect(response.body.success).toEqual(true)
    })

    test(`create a new simulation with the params used`, async () => {
      const simulation = await QuickFullSimulation.get(response.body.simulation.id, {source: googleProject})
      expect(simulation.params).toEqual({
        mode: 'ortho',
        blend: 'poisson',
        styleMode: 'mix_manual',
        mixFactor: 0,
        whiten: 0,
        brightness: 0,
      })
    })
  })
})

describe('POST simulations/cosmetic', () => {
  describeCommonErrors({mode: 'cosmetic'})
  describeSimulationErrors({mode: 'cosmetic'})
  describeSimulationSupportedFormats({mode: 'cosmetic'})

  describe.each(VALID_FORMAT_COMBINATIONS)(`on a successful request (format = %o)`, (formatCfg) => {
    let response
    let bucketname
    let googleProject
    let storageId

    beforeAll(async () => {
      bucketname = formatCfg.clientCustomBucket || 'dentrino-test.appspot.com'
      googleProject = formatCfg.clientCustomGoogleProject || 'default'
      storageId = `${googleProject}/${bucketname}`
      const result = await prepareAndRunSimulation({
        mode: 'cosmetic',
        apiClientCfg: {
          customBucket: formatCfg.clientCustomBucket,
          customGoogleProject: formatCfg.clientCustomGoogleProject,
        },
        requestCfg: {
          format: formatCfg,
          params: {
            data: {
              captureType: "camera",
              externalCustomerId: "customer123",
              feedbackScore: 2.75,
              ignoredField: 'ignoredvalue',
              whiten: 0.5,
              brightness: 0.6,
              styleMode: 'mix_manual',
              mixFactor: 0.7,
            },
          },
        }
      })
      response = result.response
    })

    describeSimulationMetadataChanges(() => {
      return {response, googleProject}
    })
    describeSimulationStorageChanges(() => {
      return {response, bucketname, googleProject, storageId}
    })

    test(`respond 201`, async () => {
      const err = response.body.error || {}
      expect(response.status).toBe(201)
      expect(response.body.success).toEqual(true)
    })

    test(`create a new simulation with the params used`, async () => {
      const simulation = await QuickFullSimulation.get(response.body.simulation.id, {source: googleProject})
      expect(simulation.params).toEqual({
        mode: 'cosmetic',
        blend: 'poisson',
        styleMode: 'mix_manual',
        mixFactor: 0.7,
        whiten: 0.5,
        brightness: 0.6,
      })
    })
  })


  describe('respond 422 when parameters are invalid', () => {
    const callCosmetic = async (data) => {
      const {response} = await prepareAndRunSimulation({
        mode: 'cosmetic',
        requestCfg: {
          params: {data},
        }
      })
      return response
    }

    const INVALID_PARAMETER_CASES = [
      {whiten: 1.5},
      {brightness: 1.5},
      {styleMode: 'mix_manual', mixFactor: 1.5},
      {whiten: -0.5},
      {styleMode: 'invalid-mode'},
    ]
    test.each(INVALID_PARAMETER_CASES)(`data = %o`, async (data) => {
      const response = await callCosmetic(data)
      expect(response.status).toBe(422)
      expect(response.body.error.id).toBe('bad-params')
      expect(response.body.error.subtype).toBe('body-validation-error')
    })
  })
})

describe('PATCH simulations/:id', () => {
  describeCommonErrors({mode: 'update'})
  describeSingleSimulationErrors({mode: 'update'})

  const PATCH_FORMAT_COMBINATIONS = [
    {isPublicCall: true , auth: 'signed-claims'        , body: 'json'},
    {isPublicCall: false, auth: 'querystring-client-id', body: 'json'},
    {isPublicCall: false, auth: 'signed-claims'        , body: 'formdata'},
    {clientCustomGoogleProject: 'b-dentrino'},
  ]
  describe.each(PATCH_FORMAT_COMBINATIONS)(`on a successful request (format = %o)`, (formatCfg) => {
    let response
    let googleProject

    beforeAll(async () => {
      googleProject = formatCfg.clientCustomGoogleProject || 'default'
      const result = await prepareAndRunSimulation({
        mode: 'update',
        simulationCfg: {
          source: googleProject,
          metadata: {
            captureType: "file",
            externalCustomerId: "old-customer123",
            feedbackScore: 1.0,
          },
        },
        apiClientCfg: {
          customBucket: formatCfg.clientCustomBucket,
          customGoogleProject: formatCfg.clientCustomGoogleProject,
        },
        requestCfg: {
          format: formatCfg,
          params: {
            data: {
              captureType: "camera",
              externalCustomerId: "customer123",
              feedbackScore: 2.75,
              ignoredField: 'ignoredvalue',
            }
          }
        }
      })

      response = result.response
    })

    describeSimulationMetadataChanges(() => {
      return {response, googleProject}
    })

    test(`respond 200`, async () => {
      expect(response.status).toBe(200)
      expect(response.body.success).toEqual(true)
    })
  })
})

describe('Rate Limiting', () => {
  let responses = []

  const simpleApiCall = async ({mode, ip, client, isPublicCall}) => {
    const result = await prepareAndRunSimulation({
      mode: mode,
      doClearData: false,
      forceClient: client,
      requestCfg: {
        ip,
        format: {isPublicCall},
      },
    })
    responses.push(result.response)
    return result
  }

  beforeEach(async () => {
    responses = []
    await clearData()
  })

  describe('IP Blocking', () => {
    const ipOne = '127.0.0.1'
    const ipTwo = '127.0.0.2'
    const ipThree = '127.0.0.3'

    test(`block an IP when sending too much requests on any public route`, async () => {
      await simpleApiCall({mode: 'update'  , ip: ipOne  , isPublicCall: true})
      await simpleApiCall({mode: 'update'  , ip: ipTwo  , isPublicCall: true})
      await simpleApiCall({mode: 'ortho'   , ip: ipOne  , isPublicCall: true})
      await simpleApiCall({mode: 'ortho'   , ip: ipTwo  , isPublicCall: true})
      await simpleApiCall({mode: 'cosmetic', ip: ipOne  , isPublicCall: true})
      await simpleApiCall({mode: 'cosmetic', ip: ipTwo  , isPublicCall: true})
      await simpleApiCall({mode: 'update'  , ip: ipOne  , isPublicCall: true})
      await simpleApiCall({mode: 'update'  , ip: ipTwo  , isPublicCall: true})
      await simpleApiCall({mode: 'cosmetic', ip: ipThree, isPublicCall: true})

      expect(responses[0].status).toBeLessThan(299)
      expect(responses[1].status).toBeLessThan(299)
      expect(responses[2].status).toBeLessThan(299)
      expect(responses[3].status).toBeLessThan(299)
      expect(responses[4].status).toBeLessThan(299)
      expect(responses[5].status).toBeLessThan(299)
      expect(responses[6].status).toBe(429)
      expect(responses[7].status).toBe(429)
      expect(responses[8].status).toBeLessThan(299)
    })

    test(`block an IP when sending too much simulations on any public route`, async () => {
      await simpleApiCall({mode: 'cosmetic', ip: ipOne  , isPublicCall: true})
      await simpleApiCall({mode: 'cosmetic', ip: ipTwo  , isPublicCall: true})
      await simpleApiCall({mode: 'ortho'   , ip: ipOne  , isPublicCall: true})
      await simpleApiCall({mode: 'ortho'   , ip: ipTwo  , isPublicCall: true})
      await simpleApiCall({mode: 'cosmetic', ip: ipOne  , isPublicCall: true})
      await simpleApiCall({mode: 'cosmetic', ip: ipTwo  , isPublicCall: true})
      await simpleApiCall({mode: 'ortho'   , ip: ipThree, isPublicCall: true})

      expect(responses[0].status).toBeLessThan(299)
      expect(responses[1].status).toBeLessThan(299)
      expect(responses[2].status).toBeLessThan(299)
      expect(responses[3].status).toBeLessThan(299)
      expect(responses[4].status).toBe(429)
      expect(responses[5].status).toBe(429)
      expect(responses[6].status).toBeLessThan(299)
    })

    test(`don't block IPs on backend calls`, async () => {
      await simpleApiCall({mode: 'ortho', ip: ipOne, isPublicCall: false})
      await simpleApiCall({mode: 'ortho', ip: ipTwo, isPublicCall: false})
      await simpleApiCall({mode: 'ortho', ip: ipOne, isPublicCall: false})
      await simpleApiCall({mode: 'ortho', ip: ipTwo, isPublicCall: false})
      await simpleApiCall({mode: 'ortho', ip: ipOne, isPublicCall: false})
      await simpleApiCall({mode: 'ortho', ip: ipTwo, isPublicCall: false})
      await simpleApiCall({mode: 'ortho', ip: ipOne, isPublicCall: false})
      await simpleApiCall({mode: 'ortho', ip: ipTwo, isPublicCall: false})

      expect(responses[0].status).toBeLessThan(299)
      expect(responses[1].status).toBeLessThan(299)
      expect(responses[2].status).toBeLessThan(299)
      expect(responses[3].status).toBeLessThan(299)
      expect(responses[4].status).toBeLessThan(299)
      expect(responses[5].status).toBeLessThan(299)
      expect(responses[6].status).toBeLessThan(299)
      expect(responses[7].status).toBeLessThan(299)
    }, 10000)
  })

  describe('Client Blocking', () => {
    let one = null
    let two = null
    let three = null

    beforeEach(() => {
      one = Factory.build('api_client', {})
      two = Factory.build('api_client', {})
      three = Factory.build('api_client', {})
    })

    test(`block a Client when sending too much requests on any route`, async () => {
      await simpleApiCall({mode: 'update'  , client: one  , isPublicCall: false})
      await simpleApiCall({mode: 'update'  , client: two  , isPublicCall: false})
      await simpleApiCall({mode: 'ortho'   , client: one  , isPublicCall: true})
      await simpleApiCall({mode: 'ortho'   , client: two  , isPublicCall: true})
      await simpleApiCall({mode: 'cosmetic', client: one  , isPublicCall: false})
      await simpleApiCall({mode: 'cosmetic', client: two  , isPublicCall: false})
      await simpleApiCall({mode: 'update'  , client: one  , isPublicCall: true})
      await simpleApiCall({mode: 'update'  , client: two  , isPublicCall: true})
      await simpleApiCall({mode: 'ortho'   , client: three, isPublicCall: false})

      expect(responses[0].status).toBeLessThan(299)
      expect(responses[1].status).toBeLessThan(299)
      expect(responses[2].status).toBeLessThan(299)
      expect(responses[3].status).toBeLessThan(299)
      expect(responses[4].status).toBeLessThan(299)
      expect(responses[5].status).toBeLessThan(299)
      expect(responses[6].status).toBe(429)
      expect(responses[7].status).toBe(429)
      expect(responses[8].status).toBeLessThan(299)
    })

    test(`block a Client when sending too much simulations on any route`, async () => {
      await simpleApiCall({mode: 'cosmetic', client: one  , isPublicCall: false})
      await simpleApiCall({mode: 'cosmetic', client: two  , isPublicCall: false})
      await simpleApiCall({mode: 'ortho'   , client: one  , isPublicCall: true})
      await simpleApiCall({mode: 'ortho'   , client: two  , isPublicCall: true})
      await simpleApiCall({mode: 'cosmetic', client: one  , isPublicCall: false})
      await simpleApiCall({mode: 'cosmetic', client: two  , isPublicCall: false})
      await simpleApiCall({mode: 'ortho'   , client: three, isPublicCall: true})

      expect(responses[0].status).toBeLessThan(299)
      expect(responses[1].status).toBeLessThan(299)
      expect(responses[2].status).toBeLessThan(299)
      expect(responses[3].status).toBeLessThan(299)
      expect(responses[4].status).toBe(429)
      expect(responses[5].status).toBe(429)
      expect(responses[6].status).toBeLessThan(299)
    })
  })
})

function describeSimulationErrors({mode}) {
  describe('simulation error scenarios', () => {
    test(`respond 504 on timeout`, async () => {
      const {response} = await prepareAndRunSimulation({
        mockWorker: false,
        mode,
      })

      expect(response.status).toBe(504)
    })

    test(`respond 422 when can't detect face`, async () => {
      const {response} = await prepareAndRunSimulation({
        mockWorkerError: `Generic simulation error`,
        mode,
      })

      expect(response.status).toBe(422)
      expect(response.body.error.id).toBe('simulation-error')
      expect(response.body.error.message).toBe(`Error when executing simulation`)
    })

    test(`respond 422 on no face error`, async () => {
      const {response} = await prepareAndRunSimulation({
        mockWorkerError: `Couldn't detect face`,
        mode,
      })

      expect(response.status).toBe(422)
      expect(response.body.error.id).toBe('simulation-error')
      expect(response.body.error.subtype).toBe('no-face')
      expect(response.body.error.message).toBe(`Couldn't detect face`)
    })

    test(`respond 504 when worker get the task from the queue too late`, async () => {
      const {response} = await prepareAndRunSimulation({
        mockWorkerError: `Timeout: Celery got the task too late to execute`,
        mode,
      })

      expect(response.status).toBe(504)
      expect(response.body.error.id).toBe('timeout')
    })

    test(`respond 422 when image is too big`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        requestCfg: {
          params: {imgPhoto: bigPhotoInput}
        }
      })

      expect(response.status).toBe(422)
      expect(response.body.error.id).toBe('bad-params')
      expect(response.body.error.subtype).toBe('size-limit-exceeded')
    })

    test(`respond 422 when image format is not supported`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        requestCfg: {
          params: {
            imgPhoto: {
              content: readfile('./test/fixtures/formats/face.gif'),
              filename: 'face.jpg',
              contentType: 'image/jpeg',
            }
          }
        }
      })

      expect(response.status).toBe(422)
      expect(response.body.error.id).toBe('bad-params')
      expect(response.body.error.subtype).toBe('unknown-format')
    })

    test(`respond 422 when captureType is invalid`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        requestCfg: {
          params: {
            data: {
              captureType: "invalid-capture-type",
            },
          }
        }
      })

      expect(response.status).toBe(422)
      expect(response.body.error.id).toBe('bad-params')
      expect(response.body.error.subtype).toBe('body-validation-error')
    })

    test(`respond 422 when feedbackScore is invalid`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        requestCfg: {
          params: {
            data: {
              feedbackScore: 9.5,
            },
          }
        }
      })

      expect(response.status).toBe(422)
      expect(response.body.error.id).toBe('bad-params')
      expect(response.body.error.subtype).toBe('body-validation-error')
    })
  })
}

function describeSimulationSupportedFormats({mode}) {
  describe('input supported formats', () => {
    test.each(['jpg', 'png', 'heic', 'heif', 'heic', 'avif'])(`respond 200 on image format %s`, async (extension) => {
      const {response} = await prepareAndRunSimulation({
        mode,
        requestCfg: {
          params: {
            imgPhoto: {
              content: readfile(`./test/fixtures/formats/face.${extension}`),
              filename: 'face.gif', // should be ignored
              contentType: 'image/gif', // should be ignored
            }
          }
        }
      })

      expect(response.status).toBe(201)
    })
  })
}

function describeCommonErrors({mode}) {
  describe('common error scenarios', () => {
    test(`respond 403 on recaptcha fails`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        requestCfg: {
          recaptchaToken: 'fails',
        }
      })

      expect(response.status).toBe(403)
    })

    test(`respond 403 on recaptcha low score`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        apiClientCfg: {
          recaptchaMinScore: 0.85,
        },
        requestCfg: {
          recaptchaToken: 'success_0.8',
        }
      })

      expect(response.status).toBe(403)
    })

    test(`ignores recaptcha failing when secret wasn't configured`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        apiClientCfg: {
          recaptchaSecret: null,
        },
        requestCfg: {
          recaptchaToken: 'fails',
        }
      })

      expect(response.status).toBeLessThan(299)
    })

    test(`respond 403 on not allowed origin`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        apiClientCfg: {
          allowedHosts: ['http://localhost:8080'],
        },
        requestCfg: {
          origin: 'http://localhost:3000',
        },
      })

      expect(response.status).toBe(403)
    })

    test(`respond 403 when origin is mandatory`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        apiClientCfg: {
          allowedHosts: ['http://localhost:8080'],
        },
        requestCfg: {
          origin: null,
        },
      })

      expect(response.status).toBe(403)
    })

    test(`ignores origin (CORS) validation when allowedHosts wasn't configured`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        apiClientCfg: {
          allowedHosts: [],
        },
        requestCfg: {
          origin: 'http://localhost:3000',
        }
      })

      expect(response.status).toBeLessThan(299)
    })

    test(`ignores CORS and recaptcha on backend call`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        apiClientCfg: {
          recaptchaSecret: 'recaptcha-secret',
          allowedHosts: ['http://localhost:8080'],
        },
        requestCfg: {
          origin: 'http://localhost:3000',
          recaptchaToken: 'fails',
          format: {isPublicCall: false}
        },
      })

      expect(response.status).toBeLessThan(299)
    })

    test(`respond 403 on frontend call with simple claims auth format`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        requestCfg: {
          format: {
            isPublicCall: true,
            auth: 'simple-claims',
          }
        },
      })

      expect(response.status).toBe(403)
    })

    test(`respond 403 on frontend call with query string client_id auth format`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        requestCfg: {
          format: {
            isPublicCall: true,
            auth: 'querystring-client-id',
          }
        },
      })

      expect(response.status).toBe(403)
    })

    test(`respond 403 on bad client id`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        requestCfg: {
          clientId: 'no-client',
          format: {
            isPublicCall: false,
            auth: 'querystring-client-id',
          }
        },
      })

      expect(response.status).toBe(403)
    })

    test(`respond 403 on bad client secret`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        requestCfg: {
          clientSecret: 'bad-secret',
          format: {
            isPublicCall: true,
            auth: 'signed-claims',
          }
        },
      })

      expect(response.status).toBe(403)
    })
  })
}

function describeSingleSimulationErrors({mode}) {
  describe('single simulation error scenarios', () => {
    test(`respond 404 when simulation doesn't exist`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        requestCfg: {
          simulationId: 'inexistent-simulation-id',
        }
      })

      expect(response.status).toBe(404)
    })

    test(`respond 404 when simulation belongs to other client`, async () => {
      const {response} = await prepareAndRunSimulation({
        mode,
        simulationCfg: {
          clientId: 'inexistent-client-id',
        },
        formatCfg: {
          isPublicCall: false,
          auth: 'querystring-client-id',
        },
      })

      expect(response.status).toBe(404)
    })
  })
}


function describeSimulationMetadataChanges(getParams) {
  describe(`common metadata changes`, () => {
    let response
    let googleProject

    beforeEach(() => {
      const params = getParams()
      response = params.response
      googleProject = params.googleProject
    })

    test(`create a new simulation`, async () => {
      const simulation = await QuickFullSimulation.get(response.body.simulation.id, {source: googleProject})
      expect(simulation).toBeTruthy()
    })

    test(`simulation has metadata`, async () => {
      const simResponded = response.body.simulation
      const simulation = await QuickFullSimulation.get(simResponded.id, {source: googleProject})
      expect(simulation.id).toEqual(simResponded.id)
      expect(simulation.metadata).toEqual({
        captureType: 'camera',
        externalCustomerId: 'customer123',
        feedbackScore: 2.75,
      })
    })

    test(`respond simulation metadata`, async () => {
      const simResponded = response.body.simulation
      const simulation = await QuickFullSimulation.get(simResponded.id, {source: googleProject})
      expect(simResponded.metadata).toEqual(simulation.metadata)
    })
  })
}

function describeSimulationStorageChanges(getParams) {
  describe(`storage data`, () => {
    let response
    let bucketname
    let googleProject
    let storageId

    beforeEach(() => {
      const params = getParams()
      response = params.response
      bucketname = params.bucketname
      googleProject = params.googleProject
      storageId = params.storageId
    })

    test(`simulation has storage data`, async () => {
      const simulation = await QuickFullSimulation.get(response.body.simulation.id, {source: googleProject})
      expect(simulation.storage.bucket).toEqual(bucketname)
      expect(simulation.storage.directoryPath).toBeDefined()
      expect(simulation.storage.originalPath).toBeDefined()
      expect(simulation.storage.resultPath).toBeDefined()
      expect(simulation.storage.beforePath).toBeDefined()
    })

    test(`manipulates only the client's bucket`, async () => {
      const bucketCalls = storage.bucket.mock.calls.flat()
      expect(bucketCalls.length).toBeGreaterThan(0)

      const expectedClientBucketsCalls = [...bucketCalls].fill(bucketname)
      expect(bucketCalls).toEqual(expectedClientBucketsCalls)
    })

    test(`respond get signed urls`, async () => {
      const simResponded = response.body.simulation
      expect(simResponded.storage.resultUrl).toEqual(storage.publicUrls['result.jpg'])
      expect(simResponded.storage.beforeUrl).toEqual(storage.publicUrls['before.jpg'])
      expect(simResponded.storage.resultUrl).not.toBeFalsy()
      expect(simResponded.storage.beforeUrl).not.toBeFalsy()
    })

    test(`uploads original image`, async () => {
      const uploaded = storage.uploads[storageId]['original.jpg']
      expect(uploaded).toEqual(photoInput)
    })

    test(`uploads result image`, async () => {
      const uploaded = storage.uploads[storageId]['result.jpg']
      expect(uploaded).toEqual(photoAfterSimulation)
    })

    test(`uploads preprocessed image`, async () => {
      const uploaded = storage.uploads[storageId]['before.jpg']
      expect(uploaded).toEqual(photoBefore)
    })

    test(`uploads morphed image`, async () => {
      const uploaded = storage.uploads[storageId]['morphed.png']
      expect(uploaded).toEqual(mouthMorphed)
    })
  })
}

async function prepareAndRunSimulation({mode='ortho', apiClientCfg={}, requestCfg={}, simulationCfg={}, forceClient, mockWorker=true, mockWorkerError, doClearData=true, doClearMocks=true}) {
  const willRunSimulation = mode === 'ortho' || mode === 'cosmetic'
  let {
    ip = newIp(),
    simulationId,
    clientId,
    clientSecret,
    recaptchaToken = 'success_1.0',
    origin = 'http://localhost:8080',
    params = {},
    format = {
      isPublicCall: true,
      auth: 'signed-claims',
      body: 'formdata',
    },
  } = requestCfg
  params = Object.assign({
    imgPhoto: photoInput,
    data: {
      captureType: "camera",
      externalCustomerId: "customer123",
      feedbackScore: 2.75,
      ignoredField: 'ignoredvalue',
    },
  }, params)

  if (doClearData) {
    await clearData()
  }

  if (doClearMocks) {
    jest.clearAllMocks()
  }

  if (mockWorker && willRunSimulation) {
    mockWorkerRequest({error: mockWorkerError})
  } else {
    resetWorkerRequestMock()
  }

  const {
    recaptchaSecret = 'recaptcha-secret',
    recaptchaMinScore = 0.75,
    allowedHosts = ['http://localhost:8080'],
    customBucket: apiCustomBucket,
    customGoogleProject: apiCustomGoogleProject,
  } = apiClientCfg
  const recaptchaAttrs = {}
  if (recaptchaSecret) recaptchaAttrs.secret = recaptchaSecret
  if (recaptchaMinScore) recaptchaAttrs.minScore = recaptchaMinScore

  const client = forceClient ? forceClient : Factory.build('api_client', {}, {
    defaultConfig: {
      recaptcha: recaptchaAttrs,
      customBucket: apiCustomBucket,
      customGoogleProject: apiCustomGoogleProject,
      allowedHosts,
    }
  })
  await client.save()

  let simulation = null
  if (mode === 'update') {
    if (!simulationCfg.clientId) simulationCfg.clientId = client.id
    const {source} = simulationCfg
    delete simulationCfg.source
    simulation = Factory.build('quick_simulation', simulationCfg)
    await simulation.save({source})
  }

  const simulationClient = new ApiSimulationClient({
    sendRequest: sendSimulation,
  })

  if (!simulationId && simulation) {
    simulationId = simulation.id
  }
  const response = await simulationClient.doRequest({
    id: simulationId,
    mode,
    params,
    origin,
    format,
    ip,
    credentials: {
      recaptchaToken,
      clientId: clientId || client.id,
      clientSecret: clientSecret || client.exposedSecret,
    },
  })
  await new Promise(r => setTimeout(r, 200))
  return {apiClient: client, response}
}

async function sendSimulation({method, url: path, query, headers={}, data, ip}) {
  if (Object.keys(query).length > 0) {
    path += '?' + querystring.encode(query)
  }
  let req = supertestApp.request[method](path)
  if (ip) {
    req = req.set('X-Forwarded-For', ip)
  }
  Object.entries(headers).forEach(([header, value]) => {
    req = req.set(header, value)
  })

  req = req.send(data)
  return await new Promise((resolve, reject) => {
    req.end((err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
  })
}

function resetWorkerRequestMock() {
  const channel = QuickFullSimulationClient.pubsubRequestKey()
  redisUnsubscribeAll({channel})
}

async function mockWorkerRequest({error}) {
  resetWorkerRequestMock()
  const channel = QuickFullSimulationClient.pubsubRequestKey()
  const simulationRequestJson = await redisSubscribe(channel)
  const simulationRequest = JSON.parse(simulationRequestJson)
  simulationRequest.photoReaded = decrypt(await redisGet(simulationRequest.params.photo_redis_key))
  const resultRedisKey = `test-simulation:response:${simulationRequest.id}`
  const beforeRedisKey = `test-simulation:before:${simulationRequest.id}`
  const morphedRedisKey = `test-simulation:morphed:${simulationRequest.id}`
  if (error === 'no-result-on-redis') {
    error = null
  } else {
    await redisSetex(resultRedisKey, 5, encrypt(Buffer.from(photoAfterSimulation, 'binary')))
    await redisSetex(beforeRedisKey, 5, encrypt(Buffer.from(photoBefore, 'binary')))
    await redisSetex(morphedRedisKey, 5, encrypt(Buffer.from(mouthMorphed, 'binary')))
  }
  const responseChannel = QuickFullSimulationClient.pubsubResponseKey(simulationRequest.id)
  const responseMessage = error ? {
    status: 'error',
    data: {
      error: error,
    },
  } : {
    status: 'success',
    data: {
      result_redis_key: resultRedisKey,
      before_redis_key: beforeRedisKey,
      morphed_redis_key: morphedRedisKey,
    }
  }
  redisPubsub.publish(responseChannel, JSON.stringify(responseMessage))
  return simulationRequest
}

function encrypt(content) {
  return simpleCrypto.encrypt(content, env.workerContentEncryptionSecret)
}

function decrypt(encrypted) {
  return simpleCrypto.decrypt(encrypted, env.workerContentEncryptionSecret)
}

async function clearData() {
  await firebaseHelpers.clearFirestore()
  await clearRedis()
}

let ipCount = 1
function newIp() {
  return intToIp({inx: ++ipCount})
}
function intToIp({inx}) {
  let part1 = inx % 256
  inx = Math.floor(inx / 256)
  let part2 = inx % 256
  inx = Math.floor(inx / 256)
  return `192.0.${part2}.${part1}`
}

afterAll(async () => {
  await quitRedis()
  await quitBuffersRedis()
  await quitRedisPubsub()
})