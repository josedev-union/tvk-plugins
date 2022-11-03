import { Factory } from 'rosie'
import {Database} from '../../../src/models/database/Database'
import {SmileTask} from '../../../src/models/database/SmileTask'
import {helpers} from '../../helpers'
import {firebaseHelpers} from '../../helpers/firebaseHelpers'

import app from '../../../src/app'
app.enable('trust proxy')
import supertest from 'supertest'
const request = supertest(app)

beforeAll(async () => {
  await firebaseHelpers.ensureTestEnv()
})

describe(`Webhooks Smile Tasks`, () => {
  let smileTask

  beforeEach(async () => {
    await firebaseHelpers.clearFirestore()
    const user = Factory.build('user')
    smileTask = Factory.build('smile_task', {userId: user.id})
    await Promise.all([smileTask.save(), user.save()])
  })

  describe(`on progress step event`, () => {
    let response

    beforeEach(async () => {
      response = await postWebhook({'event': 'processing_step', 'step': 'step-name', 'smileTaskId': smileTask.id})
    })

    test(`respond 200`, async () => {
      expect(response.status).toBe(200)
    })

    test(`update SmileTask.status to the step name`, async () => {
      const task = await SmileTask.get(smileTask.id)
      expect(task.status).toEqual('step-name')
    })
  })

  describe(`on error event`, () => {
    let response

    beforeEach(async () => {
      response = await postWebhook({'event': 'error', 'smileTaskId': smileTask.id})
    })

    test(`respond 200`, async () => {
      expect(response.status).toBe(200)
    })

    test(`update SmileTask.status to error`, async () => {
      const task = await SmileTask.get(smileTask.id)
      expect(task.status).toEqual('error')
    })
  })

  describe(`on finished error`, () => {
    let response

    beforeEach(async () => {
      response = await postWebhook({'event': 'finished', 'smileTaskId': smileTask.id})
    })

    test(`respond 200`, async () => {
      expect(response.status).toBe(200)
    })

    test(`update SmileTask.status to finished`, async () => {
      const task = await SmileTask.get(smileTask.id)
      expect(task.status).toEqual('finished')
    })
  })
})

function postWebhook(json={}) {
  return request
    .post(`/webhooks/828ffbc/smile-tasks/status-update`)
    .set('Content-Type', 'application/json')
    .send(json)
}
