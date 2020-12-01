import { Factory } from 'rosie'
import {signer} from '../../src/shared/signer'
import {Database} from '../../src/models/database/Database'
import {ImageProcessingSolicitation} from '../../src/models/database/ImageProcessingSolicitation'
import {storageFactory} from '../../src/models/storage/storageFactory'
import {clearRedis} from '../../src/config/redis'

import app from '../../src/app'
app.enable('trust proxy')
import supertest from 'supertest'
const request = supertest(app)

const uploadSignedUrl = 'http://gcloud.presigned.com/upload'
const imageSignedUrl = 'http://gcloud.presigned.com/inputImage'
const processedSignedUrl = 'http://gcloud.presigned.com/afterImage'

jest.mock('../../src/models/storage/storageFactory', () => {
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

beforeEach(async () => {
  storageFactory.mockClear()
  await Database.instance().drop()
  await clearRedis()
})

describe(`on a successful request`, () => {
  let response

  beforeEach(async () => {
    var access = Factory.build('dentist_access_point')
    access.addHost('http://myhost.com:8080/')
    await access.save()

    let json = {name: "Michael Jordan", email: "michael@fgmail.com", phone: "+5521912341234"}
    let signature = signer.apiSign(json, access.secret)
    response = await postSolicitation(json, 'https://myhost.com:8080', signature)
  })

  test(`respond 200`, async () => {
    expect(response.status).toBe(200)
    expect(typeof(response.body.solicitationId)).toBe('string')
    const solicitation = await ImageProcessingSolicitation.get(response.body.solicitationId)
    expect(solicitation).toBeTruthy()

    expect(response.body.presignedUpload).toEqual(uploadSignedUrl)
    expect(response.body.presignedDownloadOriginal).toBe(imageSignedUrl)
    expect(response.body.presignedDownloadAfter).toBe(processedSignedUrl)
    // expect(typeof(response.body.bucket)).toBe('string')
  })
})

describe(`when host doesn't belong to any client`, () => {
  let response

  beforeEach(async () => {
    const json = {name: "Michael Jordan", email: "michael@fgmail.com", phone: "+5521912341234"}
    response = await postSolicitation(json, 'https://myhost.com', signer.sign(json, "abcd"))
  })

  test(`respond 403`, () => {
    expect(response.status).toBe(403)
  })
})

describe(`when the body doesn't match the signature`, () => {
  let response

  beforeEach(async () => {
    const json = {name: "Michael Jordan", email: "michael@fgmail.com", phone: "+5521912341234"}
    const json2 = {name: "Michael Jackson", email: "michael@fgmail.com", phone: "+5521912341234"}
    var access = Factory.build('dentist_access_point')
    access.addHost('http://myhost.com:8080/')
    await access.save()

    const signature = signer.apiSign(json2, access.secret)
    response = await postSolicitation(json, 'http://myhost.com:8080', signature)
  })

  test(`respond 403`, () => {
    expect(response.status).toBe(403)
  })
})

describe(`when email reached rate limit`, () => {
  let response, resp1, resp2, resp3, resp4, resp5

  beforeEach(async () => {
    const host = 'http://myhost.com:8080/'
    const json = {name: "Michael Jordan", email: "michael@fgmail.com", phone: "+5521912341234"}
    var access = Factory.build('dentist_access_point')
    access.addHost(host)
    await access.save()

    let signature = signer.apiSign(json, access.secret)
    resp1 = await postSolicitation(json, host, signature)
    resp2 = await postSolicitation(json, host, signature)
    resp3 = await postSolicitation(json, host, signature)
    resp4 = await postSolicitation(json, host, signature)
    resp5 = await postSolicitation(json, host, signature)

    response = await postSolicitation(json, host, signature, '192.168.9.9')
  })

  test(`respond 403`, () => {
    expect(resp1.status).toBe(200)
    expect(resp2.status).toBe(200)
    expect(resp3.status).toBe(200)
    expect(resp4.status).toBe(200)
    expect(resp5.status).toBe(200)
    expect(response.status).toBe(403)
  })
})

describe(`when ip reached rate limit`, () => {
  let response, resp1, resp2, resp3, resp4, resp5

  beforeEach(async () => {
    const host = 'http://myhost.com:8080/'
    const json = {name: "Michael Jordan", email: "michael@fgmail.com", phone: "+5521912341234"}
    var access = Factory.build('dentist_access_point')
    access.addHost(host)
    await access.save()

    let signature = signer.apiSign(json, access.secret)
    resp1 = await postSolicitation(json, host, signature)
    resp2 = await postSolicitation(json, host, signature)
    resp3 = await postSolicitation(json, host, signature)
    resp4 = await postSolicitation(json, host, signature)
    resp5 = await postSolicitation(json, host, signature)

    json.email = "michael2@fgmail.com"
    signature = signer.apiSign(json, access.secret)
    response = await postSolicitation(json, host, signature)
  })

  test(`respond 403`, () => {
    expect(resp1.status).toBe(200)
    expect(resp2.status).toBe(200)
    expect(resp3.status).toBe(200)
    expect(resp4.status).toBe(200)
    expect(resp5.status).toBe(200)
    expect(response.status).toBe(403)
  })
})

function postSolicitation(json={name:"Michael Jordan", email:"michael@fgmail.com", phone:"+5521912341234"}, host="localhost:3000", signature='', ip='127.0.0.0') {
  return request
    .post('/api/image-processing-solicitations/by-patient')
    .set('Origin', host)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${signature}`)
    .set('X-Forwarded-For', ip)
    .send(json)
}
