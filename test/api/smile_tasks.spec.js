import { Factory } from 'rosie'
import {signer} from '../../src/shared/signer'
import {envShared} from '../../src/shared/envShared'
import {simpleCrypto} from '../../src/shared/simpleCrypto'
import {Database} from '../../src/models/database/Database'
import {security} from '../../src/models/security'
import {SmileTask} from '../../src/models/database/SmileTask'
import {storageFactory} from '../../src/models/storage/storageFactory'
import {clearRedis} from '../../src/config/redis'
import {env} from '../../src/config/env'

import app from '../../src/app'
app.enable('trust proxy')
import supertest from 'supertest'
const request = supertest(app)

const UPLOAD_MAX_SIZE = env.maxUploadSizeMb * 1024 * 1024
const UPLOAD_SIGNED_URL = 'http://gcloud.presigned.com/upload'
const RESULT_SIGNED_URL = 'http://gcloud.presigned.com/afterImage'
const IMAGE_MD5 = "madeup-image-md5"
const CONTENT_TYPE = "image/jpeg"

jest.mock('../../src/models/storage/storageFactory', () => {
  return {
    storageFactory: jest.fn().mockReturnValue({
      bucket: jest.fn().mockReturnValue({
        file: jest.fn().mockImplementation((keyName) => {
          const imageName = keyName.match(/[^\/]+\..*$/)
          return {
            generateSignedPostPolicyV4: jest.fn().mockImplementation((opts) => {
              return Promise.resolve([`http://gcloud.presigned.com/upload/${imageName}`])
            }),

            getSignedUrl: jest.fn().mockImplementation((opts) => {
              if (opts.action === 'write') {
                return Promise.resolve([`http://gcloud.presigned.com/upload/${imageName}`])
              } else {
                return Promise.resolve(['http://gcloud.presigned.com/afterImage'])
              }
            })
          }
        })
      })
    })
  }
})


beforeEach(async () => {
  storageFactory.mockClear()
  await Database.instance().drop()
  await clearRedis()
})

describe(`on a successful request`, () => {
  let response

  beforeEach(async () => {
    const apiClient = Factory.build('api_client')
    const user = Factory.build('user')

    await Promise.all([apiClient.save(), user.save()])

    const json = {imageMD5: IMAGE_MD5, contentType: CONTENT_TYPE}
    const signature = signer.apiSign(user.id, IMAGE_MD5, apiClient.secret)
    const token = simpleCrypto.base64(`${apiClient.id}:${signature}`)
    response = await postSolicitation(json, user.id, token)
  })

  test(`respond 200`, async () => {
    expect(response.status).toBe(200)
  })

  test(`response json has a descriptor on how to upload the image`, async () => {
    expect(response.body.uploadDescriptor).toEqual({
      verb: 'put',
      url: `${UPLOAD_SIGNED_URL}/smile.jpg`,
      headers: {
        'Content-Type': CONTENT_TYPE,
        'Content-MD5': IMAGE_MD5,
        'x-goog-content-length-range': `0,${UPLOAD_MAX_SIZE}`
      }
    })
  })

  test(`response json has smile task id`, async () => {
    const smileTaskId = response.body.smileTaskId
    const smileTask = await SmileTask.get(smileTaskId)
    expect(smileTask.id).toEqual(smileTaskId)
  })

  test(`response json has result and original images path`, async () => {
    const smileTaskId = response.body.smileTaskId
    const smileTask = await SmileTask.get(smileTaskId)
    expect(response.body.resultPath).toEqual(smileTask.filepathResult)
    expect(response.body.originalPath).toEqual(smileTask.filepathUploaded)
  })

  test(`response json has the websockets path to track the progress`, async () => {
    const wsPath = response.body.progressWebsocket
    const smileTaskId = response.body.smileTaskId
    const smileTask = await SmileTask.get(smileTaskId)

    expect(wsPath).toEqual(`/ws/smile-tasks/${smileTask.id}`)
    expect(smileTask).toBeTruthy()
  })
})


describe(`on a manual review request`, () => {
  let response

  beforeEach(async () => {
    const apiClient = Factory.build('api_client')
    const user = Factory.build('user')

    await Promise.all([apiClient.save(), user.save()])

    const json = {imageMD5: IMAGE_MD5, contentType: CONTENT_TYPE, manualReview: true}
    const signature = signer.apiSign(user.id, IMAGE_MD5, apiClient.secret)
    const token = simpleCrypto.base64(`${apiClient.id}:${signature}`)
    response = await postSolicitation(json, user.id, token)
  })

  test(`respond 200`, async () => {
    expect(response.status).toBe(200)
  })

  test(`response json has a descriptor on how to upload the pending review image`, async () => {
    expect(response.body.uploadDescriptor).toEqual({
      verb: 'put',
      url: `${UPLOAD_SIGNED_URL}/smile_review_pending.jpg`,
      headers: {
        'Content-Type': CONTENT_TYPE,
        'Content-MD5': IMAGE_MD5,
        'x-goog-content-length-range': `0,${UPLOAD_MAX_SIZE}`
      }
    })
  })

  test(`response json has smile task id`, async () => {
    const smileTaskId = response.body.smileTaskId
    const smileTask = await SmileTask.get(smileTaskId)
    expect(smileTask.id).toEqual(smileTaskId)
  })

  test(`response json has result and original images path`, async () => {
    const smileTaskId = response.body.smileTaskId
    const smileTask = await SmileTask.get(smileTaskId)
    expect(response.body.resultPath).toEqual(smileTask.filepathResult)
    expect(response.body.originalPath).toEqual(smileTask.filepathUploaded)
  })

  test(`response json haven't websockets path`, async () => {
    expect(response.body.progressWebsocket).toBeUndefined()
  })
})

describe(`when rate limit is checked`, () => {
  let apiClients = []
  let users = []
  const ips = [
    '127.0.0.1',
    '127.0.0.2',
    '127.0.0.3',
    '127.0.0.4',
    '127.0.0.5',
  ]

  beforeEach(async () => {
    apiClients = []
    users = []
    let promises = []

    for (let i = 0; i < 5; i++) {
      users.push(Factory.build('user'))
      apiClients.push(Factory.build('api_client'))
      promises.push(users[i].save())
      promises.push(apiClients[i].save())
    }

    await Promise.all(promises)
  })

  test(`don't limit if all request has different client, ip and user`, async () => {
    const resp1 = await simplePostTask({user: users[0], client: apiClients[0], ip: ips[0]})
    const resp2 = await simplePostTask({user: users[1], client: apiClients[1], ip: ips[1]})
    const resp3 = await simplePostTask({user: users[2], client: apiClients[2], ip: ips[2]})
    expect(resp1.status).toBe(200)
    expect(resp2.status).toBe(200)
    expect(resp3.status).toBe(200)
  })

  test(`limits access by client`, async () => {
    const apiClient = apiClients[0]
    const resp1 = await simplePostTask({user: users[0], client: apiClient, ip: ips[0]})
    const resp2 = await simplePostTask({user: users[1], client: apiClient, ip: ips[1]})
    const resp3 = await simplePostTask({user: users[2], client: apiClient, ip: ips[2]})
    expect(resp1.status).toBe(200)
    expect(resp2.status).toBe(200)
    expect(resp3.status).toBe(429)
  })

  test(`limits access by user`, async () => {
    const user = users[0]
    const resp1 = await simplePostTask({user: user, client: apiClients[0], ip: ips[0]})
    const resp2 = await simplePostTask({user: user, client: apiClients[1], ip: ips[1]})
    const resp3 = await simplePostTask({user: user, client: apiClients[2], ip: ips[2]})
    expect(resp1.status).toBe(200)
    expect(resp2.status).toBe(200)
    expect(resp3.status).toBe(429)
  })

  test(`limits access by ip`, async () => {
    const ip = ips[0]
    const resp1 = await simplePostTask({user: users[0], client: apiClients[0], ip: ip})
    const resp2 = await simplePostTask({user: users[1], client: apiClients[1], ip: ip})
    const resp3 = await simplePostTask({user: users[2], client: apiClients[2], ip: ip})
    expect(resp1.status).toBe(200)
    expect(resp2.status).toBe(200)
    expect(resp3.status).toBe(429)
  })
})

describe(`when authorization token is invalid`, () => {
  let apiClient
  let user
  let reqJson

  beforeEach(async () => {
    reqJson = {imageMD5: IMAGE_MD5, contentType: CONTENT_TYPE}
    apiClient = Factory.build('api_client')
    user = Factory.build('user')

    await Promise.all([apiClient.save(), user.save()])
  })

  test(`respond 403 if token isn't base64 encoded`, async () => {
    const token = 'IJdiPO&&&&*#$(@)!@#KJNkln'
    const response = await postSolicitation(reqJson, user.id, token)
    expect(response.status).toBe(403)
  })

  test(`respond 403 if token hasn't clientId and signature`, async () => {
    const rawToken = 'random-characters'
    const token = simpleCrypto.base64(rawToken)
    const response = await postSolicitation(reqJson, user.id, token)
    expect(response.status).toBe(403)
  })

  test(`respond 403 if client id doesn't exist`, async () => {
    const rawToken = "non-existent-client-id:signature"
    const token = simpleCrypto.base64(rawToken)
    const response = await postSolicitation(reqJson, user.id, token)
    expect(response.status).toBe(403)
  })

  test(`respond 403 if client secret doesn't match client id`, async () => {
    const signature = signer.apiSign(user.id, IMAGE_MD5, "bad-client-secret")
    const rawToken = `${apiClient.id}:${signature}`
    const token = simpleCrypto.base64(rawToken)
    const response = await postSolicitation(reqJson, user.id, token)
    expect(response.status).toBe(403)
  })

  test(`respond 403 if image MD5 doesn't match body json`, async () => {
    const signature = signer.apiSign(user.id, "bad-image-md5", apiClient.secret)
    const rawToken = `${apiClient.id}:${signature}`
    const token = simpleCrypto.base64(rawToken)
    const response = await postSolicitation(reqJson, user.id, token)
    expect(response.status).toBe(403)
  })

  test(`respond 403 if user id doesn't match request path`, async () => {
    const signature = signer.apiSign("bad-user-id", IMAGE_MD5, apiClient.secret)
    const rawToken = `${apiClient.id}:${signature}`
    const token = simpleCrypto.base64(rawToken)
    const response = await postSolicitation(reqJson, user.id, token)
    expect(response.status).toBe(403)
  })
})

function postSolicitation(json={imageMD5, contentType}, userId, token, ip='127.0.0.0') {
  return request
    .post(`/api/users/${userId}/smile-tasks/solicitation?manual_review={manualReview}`)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Forwarded-For', ip)
    .send(json)
}

async function simplePostTask({user, client, ip='127.0.0.1'}) {
    const json = {imageMD5: IMAGE_MD5, contentType: CONTENT_TYPE}
    const signature = signer.apiSign(user.id, IMAGE_MD5, client.secret)
    const token = simpleCrypto.base64(`${client.id}:${signature}`)
    return await postSolicitation(json, user.id, token, ip)
}
