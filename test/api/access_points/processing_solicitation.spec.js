import { Factory } from 'rosie'
import {signer} from '../../../src/shared/signer'
import {Database} from '../../../src/models/database/Database'
import {ImageProcessingSolicitation} from '../../../src/models/database/ImageProcessingSolicitation'
import {storageFactory} from '../../../src/models/storage/storageFactory'
import {clearRedis} from '../../../src/config/redis'
import {envShared} from '../../../src/shared/envShared'

import app from '../../../src/app'
app.enable('trust proxy')
import supertest from 'supertest'
const request = supertest(app)

const uploadSignedUrl = 'http://gcloud.presigned.com/upload'
const imageSignedUrl = 'http://gcloud.presigned.com/inputImage'
const processedSignedUrl = 'http://gcloud.presigned.com/afterImage'

jest.mock('../../../src/models/storage/storageFactory', () => {
  return {
    storageFactory: jest.fn().mockReturnValue({
      bucket: jest.fn().mockReturnValue({
        file: jest.fn().mockImplementation((keyName) => {
          return {
            getSignedUrl: jest.fn().mockImplementation((opts) => {
              if (opts.action === 'write') {
                return Promise.resolve(['http://gcloud.presigned.com/upload'])
              } else if (keyName.includes('after')) {
                return Promise.resolve(['http://gcloud.presigned.com/afterImage'])
              } else {
                return Promise.resolve(['http://gcloud.presigned.com/inputImage'])
              }
            })
          }
        })
      })
    })
  }
})

let access
let userId
let signatureData
let signature
const deviceId = 'deviceid123'

beforeEach(async () => {
  storageFactory.mockClear()
  await Database.instance().drop()
  await clearRedis()

  access = Factory.build('dentist_access_point')
  await access.save()
  userId = access.userId
  let pointResp = await getAccessPointByUser(userId)
  access = pointResp.body
  signatureData = [access.id, deviceId]
  signature = signer.sign(signatureData, access.secret, envShared.apiSecretToken)
})

describe(`on a successful request`, () => {
  test(`respond 200`, async () => {
    let response = await postSolicitation(access.id, signature, deviceId)
    expect(response.status).toBe(200)
    expect(typeof(response.body.solicitationId)).toBe('string')
    const solicitation = await ImageProcessingSolicitation.get(response.body.solicitationId)
    expect(solicitation).toBeTruthy()

    expect(response.body.presignedUpload).toEqual(uploadSignedUrl)
    expect(response.body.presignedDownloadOriginal).toBe(imageSignedUrl)
    expect(response.body.presignedDownloadAfter).toBe(processedSignedUrl)
  })
})

describe(`when the signature doesn't match`, () => {
  let response

  beforeEach(async () => {
    response = await postSolicitation(access.id, signature, deviceId + 'Z')
  })

  test(`respond 403`, () => {
    expect(response.status).toBe(403)
  })
})

describe(`when access point reached rate limit`, () => {
  let response, response2, resp1, resp2, resp3, resp4, resp5, resp6, resp7, resp8, resp9, resp10

  beforeEach(async () => {
    resp1  = await postSolicitation(access.id, signature, deviceId)
    resp2  = await postSolicitation(access.id, signature, deviceId)
    resp3  = await postSolicitation(access.id, signature, deviceId)
    resp4  = await postSolicitation(access.id, signature, deviceId)
    resp5  = await postSolicitation(access.id, signature, deviceId)
    resp6  = await postSolicitation(access.id, signature, deviceId)
    resp7  = await postSolicitation(access.id, signature, deviceId)
    resp8  = await postSolicitation(access.id, signature, deviceId)
    resp9  = await postSolicitation(access.id, signature, deviceId)
    resp10 = await postSolicitation(access.id, signature, deviceId)

    response = await postSolicitation(access.id, signature, deviceId)

    let access2 = Factory.build('dentist_access_point')
    await access2.save()

    let signature2 = signer.sign([access2.id, deviceId], access2.secret, envShared.apiSecretToken)
    response2 = await postSolicitation(access2.id, signature2, deviceId)
  })

  test(`the requests within rate limit respond 200`, () => {
    expect(resp1.status).toBe(200)
    expect(resp2.status).toBe(200)
    expect(resp3.status).toBe(200)
    expect(resp4.status).toBe(200)
    expect(resp5.status).toBe(200)
    expect(resp6.status).toBe(200)
    expect(resp7.status).toBe(200)
    expect(resp8.status).toBe(200)
    expect(resp9.status).toBe(200)
    expect(resp10.status).toBe(200)
  })

  test(`the first request outside rate limit respond 403`, () => {
    expect(response.status).toBe(403)
  })

  test(`if the requests are on different access points it respond 200`, () => {
    expect(response2.status).toBe(200)
  })
})

function getAccessPointByUser(userId) {
  return request
    .get(`/api/access-points/for-user/${userId}`)
    .send()
}

function postSolicitation(accessPointId, signature='', deviceId='abcd123%!@#', ip='127.0.0.0') {
  return request
    .post(`/api/access-points/${accessPointId}/image-processing-solicitations`)
    //.set('Origin', host)
    .set('Authorization', `Bearer ${signature}`)
    .set('X-Forwarded-For', ip)
    .set('X-DEVICE-ID', deviceId)
    .send()
}
