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
          return {
            generateSignedPostPolicyV4: jest.fn().mockImplementation((opts) => {
              return Promise.resolve(['http://gcloud.presigned.com/upload'])
            }),

            getSignedUrl: jest.fn().mockImplementation((opts) => {
              if (opts.action === 'write') {
                return Promise.resolve(['http://gcloud.presigned.com/upload'])
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
      url: UPLOAD_SIGNED_URL,
      headers: {
        'Content-Type': CONTENT_TYPE,
        'Content-MD5': IMAGE_MD5,
        'x-goog-content-length-range': `0,${UPLOAD_MAX_SIZE}`
      }
    })
  })

  test(`response json has a descriptor on how to download the result`, async () => {
    const descriptor = response.body.resultDescriptorGet
    expect(descriptor.verb).toBe('get')
    expect(descriptor.url).toBe(RESULT_SIGNED_URL)
  })

  test(`response json has the websockets path to track the progress`, async () => {
    const wsPath = response.body.progressWebsocket
    const smileTaskId = wsPath.match(/.*ws\/.*smile-tasks\/([^\/]+)/)[1]
    const smileTask = await SmileTask.get(smileTaskId)

    expect(wsPath.startsWith('/ws/smile-tasks/')).toBe(true)
    expect(smileTask).toBeTruthy()
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
    .post(`/api/users/${userId}/smile-tasks/solicitation`)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Forwarded-For', ip)
    .send(json)
}
