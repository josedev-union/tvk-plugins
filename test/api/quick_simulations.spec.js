import fs from 'fs'
import {promisify} from "util"
import FormData from 'form-data'

import {redisPubsub, buffersRedis, redisSubscribe, clearRedis} from '../../src/config/redis'
import {env} from '../../src/config/env'
import {QuickSimulationClient} from "../../src/models/clients/QuickSimulationClient"

import app from '../../src/app'
app.enable('trust proxy')
import supertest from 'supertest'
const request = supertest(app)

const readfile = promisify(fs.readFile)
const redisSetex = promisify(buffersRedis.setex).bind(buffersRedis)
const redisGet = promisify(buffersRedis.get).bind(buffersRedis)

beforeEach(async () => {
  await clearRedis()
})

describe(`on a successful request`, () => {
  let response
  let simulationRequest

  beforeEach(async () => {
    const photoPath = './test/fixtures/photo.jpg'
    //const photo = await readfile(photoPath)
    setTimeout(() => mockWorkerRequest(), 0)
    await new Promise(r => setTimeout(r, 100));
    response = await postSimulation(photoPath)
  })

  test(`respond 200`, async () => {
    console.log(response.body)
    expect(response.status).toBe(200)
  })

  //test(`response json has a descriptor on how to upload the image`, async () => {
  //  expect(response.body.uploadDescriptor).toEqual({
  //    verb: 'put',
  //    url: `${UPLOAD_SIGNED_URL}/smile.jpg`,
  //    headers: {
  //      'Content-Type': CONTENT_TYPE,
  //      'Content-MD5': IMAGE_MD5,
  //      'x-goog-content-length-range': `0,${UPLOAD_MAX_SIZE}`
  //    }
  //  })
  //})

  //test(`response json has smile task id`, async () => {
  //  const smileTaskId = response.body.smileTaskId
  //  const smileTask = await SmileTask.get(smileTaskId)
  //  expect(smileTask.id).toEqual(smileTaskId)
  //})

  //test(`response json has result and original images path`, async () => {
  //  const smileTaskId = response.body.smileTaskId
  //  const smileTask = await SmileTask.get(smileTaskId)
  //  expect(response.body.resultPath).toEqual(smileTask.filepathResult)
  //  expect(response.body.originalPath).toEqual(smileTask.filepathUploaded)
  //  expect(response.body.preprocessedPath).toEqual(smileTask.filepathPreprocessed)
  //  expect(response.body.sideBySidePath).toEqual(smileTask.filepathSideBySide)
  //  expect(response.body.sideBySideSmallPath).toEqual(smileTask.filepathSideBySideSmall)
  //})

  //test(`response json has the websockets path to track the progress`, async () => {
  //  const wsPath = response.body.progressWebsocket
  //  const smileTaskId = response.body.smileTaskId
  //  const smileTask = await SmileTask.get(smileTaskId)

  //  expect(wsPath).toEqual(`/ws/smile-tasks/${smileTask.id}`)
  //  expect(smileTask).toBeTruthy()
  //})
})

function postSimulation(photoPath, ip='127.0.0.0') {
  const form = new FormData()
  form.append('photo', fs.readFileSync(photoPath), {filename: 'photo.jpg', contentType: 'image/jpeg'})

  return request
    .post(`/api/quick-simulations`)
    .set('Content-Type', 'multipart/form-data;boundary='+form.getBoundary())
    //.set('Authorization', `Bearer ${token}`)
    .set('X-Forwarded-For', ip)
    .send(form.getBuffer())
}

async function mockWorkerRequest() {
  const simulationRequestJson = await redisSubscribe(QuickSimulationClient.pubsubRequestKey())
  const simulationRequest = JSON.parse(simulationRequestJson)
  simulationRequest.photoReaded = await redisGet(simulationRequest.params.photo_redis_key)
  const responseRedisKey = `test-simulation:response:${simulationRequest.id}`
  const photoAfterSimulation = await readfile('./test/fixtures/photo_after_simulation.jpg')
  await redisSetex(responseRedisKey, 5, Buffer.from(photoAfterSimulation, 'binary'))
  const responseChannel = QuickSimulationClient.pubsubResponseKey(simulationRequest.id)
  const responseMessage = {
    status: 'success',
    result: {
      redis_key: responseRedisKey
    }
  }
  redisPubsub.publish(responseChannel, JSON.stringify(responseMessage))
  return simulationRequest
}
