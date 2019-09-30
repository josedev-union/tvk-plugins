import { Factory } from 'rosie'
import AWSMock from "aws-sdk-mock";
import AWS from "aws-sdk"; 
import * as signer from '../../src/shared/signer'
import Database from '../../src/models/database'

import app from '../../src/app'
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