import { Factory } from 'rosie'
import AWSMock from "aws-sdk-mock";
import AWS from "aws-sdk"; 
import * as signer from '../../src/shared/signer'
import Database from '../../src/models/database'

import app from '../../src/app'
app.enable('trust proxy')
import supertest from 'supertest'
const request = supertest(app)

const uploadJson = {presigned_post: ''}
const imageSignedUrl = 'http://s3.presignedget.com/image'
const processedSignedUrl = 'http://s3.presignedget.com/processed'

beforeEach(() => {
  AWSMock.setSDKInstance(AWS)
  AWSMock.mock('S3', 'createPresignedPost', (params, cb) => {
    cb(null, uploadJson)
  })
  AWSMock.mock('S3', 'getSignedUrl', (verb, params, cb) => {
    if (params.Key.includes('after')) {
      cb(null, processedSignedUrl)
    } else {
      cb(null, imageSignedUrl)
    }
  })
})

afterEach(() => {
  AWSMock.restore('S3')
})

describe(`on a successful request`, () => {
  let response

  beforeEach(async () => {
    await Database.instance.drop()
    var access = Factory.build('dentist_access_point')
    access.addHost('http://myhost.com:8080/')
    access.save()

    let json = {name: "Michael Jordan", email: "michael@fgmail.com", phone: "+5521912341234"}
    response = await request
      .post('/image_processing_solicitation')
      .set('Origin', 'https://myhost.com:8080')
      .set('Miroweb-ID', signer.sign(json, access.secret))
      .set('Content-Type', 'application/json')
      .send(json)
  })

  test(`respond 200`, () => {
    expect(response.status).toBe(200)
  })

  test(`has the presigned JSON to upload to S3`, () => {
    expect(response.body.presignedUpload).toEqual(uploadJson)
  })
    
  test(`has the presigned URL to get the original image`, () => {
    expect(response.body.presignedDownloadOriginal).toBe(imageSignedUrl)
  })

  test(`has the presigned URL to get the processed image`, () => {
    expect(response.body.presignedDownloadAfter).toBe(processedSignedUrl)
  })

  test(`has the session id`, () => {
    expect(typeof(response.body.sessionId)).toBe('string')
  })

  test(`has the key to be used on upload`, () => {
    expect(typeof(response.body.key)).toBe('string')
  })
})

describe(`when host doesn't belong to any client`, () => {
  let response

  beforeEach(async () => {
    const json = {name: "Michael Jordan", email: "michael@fgmail.com", phone: "+5521912341234"}
    response = await request
      .post('/image_processing_solicitation')
      .set('Origin', 'https://myhost.com')
      .set('Content-Type', 'application/json')
      .set('Miroweb-ID', signer.sign(json, "abcd"))
      .send(json)
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
    access.save()

    response = await request
      .post('/image_processing_solicitation')
      .set('Origin', 'http://myhost.com:8080')
      .set('Content-Type', 'application/json')
      .set('Miroweb-ID', signer.sign(json2, access.secret))
      .send(json)
  })

  test(`respond 403`, () => {
    expect(response.status).toBe(403)
  })
})

describe(`when email reached rate limit`, () => {
  let response, resp1, resp2, resp3, resp4, resp5

  beforeEach(async () => {
    await Database.instance.drop()
    const host = 'http://myhost.com:8080/'
    const json = {name: "Michael Jordan", email: "michael@fgmail.com", phone: "+5521912341234"}
    var access = Factory.build('dentist_access_point')
    access.addHost(host)
    access.save()

    let promises = []
    let signature = signer.sign(json, access.secret)
    for (let i = 0; i < 5; i++) {
      promises.push(postSolicitation(json, host, signature))
    }
    [resp1, resp2, resp3, resp4, resp5] = await Promise.all(promises)

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
    await Database.instance.drop()
    const host = 'http://myhost.com:8080/'
    const json = {name: "Michael Jordan", email: "michael@fgmail.com", phone: "+5521912341234"}
    var access = Factory.build('dentist_access_point')
    access.addHost(host)
    access.save()

    let promises = []
    let signature = signer.sign(json, access.secret)
    for (let i = 0; i < 5; i++) {
      promises.push(postSolicitation(json, host, signature))
    }
    [resp1, resp2, resp3, resp4, resp5] = await Promise.all(promises)

    json.email = "michael2@fgmail.com"
    signature = signer.sign(json, access.secret)
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
    .post('/image_processing_solicitation')
    .set('Origin', host)
    .set('Content-Type', 'application/json')
    .set('Miroweb-ID', signature)
    .set('X-Forwarded-For', ip)
    .send(json)
}