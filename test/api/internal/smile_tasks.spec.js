import { Factory } from 'rosie'
import {signer} from '../../../src/shared/signer'
import {envShared} from '../../../src/shared/envShared'
import {simpleCrypto} from '../../../src/shared/simpleCrypto'
import {Database} from '../../../src/models/database/Database'
import {security} from '../../../src/models/security'
import {SmileTask} from '../../../src/models/database/SmileTask'
import {clearRedis} from '../../../src/config/redis'
import {env} from '../../../src/config/env'

import app from '../../../src/app'
app.enable('trust proxy')
import supertest from 'supertest'
const request = supertest(app)

jest.mock('../../../src/models/storage/storageFactory', () => {
  const path = require('path')
  const fac = {
    bucket: jest.fn().mockImplementation((bucketname) => {
      fac.bucketname = bucketname
      return fac
    }),

    file: jest.fn().mockImplementation((filepath) => {
      fac.filepath = filepath
      return fac
    }),

    move: jest.fn().mockImplementation((destinyPath) => {
      return new Promise((resolve, reject) => {
        if (fac.filepath.includes('unexistent')) {
          reject({code: 404})
        } else if (fac.filepath.includes('error')) {
          reject({code: 500})
        } else {
          resolve({})
        }
      })
    }),

    getFiles: jest.fn().mockImplementation(({prefix}) => {
      return new Promise((resolve, reject) => {
        if (prefix.includes('empty')) {
          resolve([[]])
        } else if (prefix.includes('error')) {
          reject({code: 500})
        } else {
          resolve([
            [
              { name: path.join(prefix, "smile_after.jpg") },
              { name: path.join(prefix, "smile_6_face_after_0_transformed.jpg") },
              { name: path.join(prefix, "smile_6_face_after_1_0.45.jpg") },
              { name: path.join(prefix, "smile.jpg") },
              { name: path.join(prefix, "smile_6_face_after_2_0.75.jpg") },
              { name: path.join(prefix, "smile_after_0.55_predefined.jpg") },
              { name: path.join(prefix, "smile_review_pending.jpg") },
              { name: path.join(prefix, "smile_after_0.583212_auto.jpg") },
            ]
          ])
        }
      })
    }),
  }
  return {
    storageFactory: () => fac
  }
})

import {storageFactory} from '../../../src/models/storage/storageFactory'


beforeEach(async () => {
  // storageFactory.mockClear()
  await Database.instance().drop()
  await clearRedis()
})

describe(`PUT /api/67a4abe/smile-tasks/:smileTaskId/promote-uploaded`, () => {
  describe(`successful response`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded/smile.jpg",
        filepathResult: "results/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await putPromoteUploaded(smileTask.id)
    })

    test(`respond 200`, async () => {
      expect(response.status).toBe(200)
    })

    test(`rename smile image to the permanent name`, async () => {
      expect(storageFactory().file).toHaveBeenCalledWith('uploaded/smile_review_pending.jpg')
      expect(storageFactory().move).toHaveBeenCalledWith('uploaded/smile.jpg')
      expect(storageFactory().file.mock.calls.length).toBe(1)
      expect(storageFactory().move.mock.calls.length).toBe(1)
    })
  })

  describe(`smile task id doesn't exist`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      response = await putPromoteUploaded("9991237")
    })

    test(`respond 404`, async () => {
      expect(response.status).toBe(404)
    })
  })

  describe(`image file not found`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded_unexistent/smile.jpg",
        filepathResult: "results/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await putPromoteUploaded(smileTask.id)
    })

    test(`respond 404`, async () => {
      expect(response.status).toBe(404)
    })
  })

  describe(`error on google cloud storage`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded_error/smile.jpg",
        filepathResult: "results/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await putPromoteUploaded(smileTask.id)
    })

    test(`respond 500`, async () => {
      expect(response.status).toBe(500)
      expect(response.body.error).toBeTruthy()
    })
  })
})

describe(`PUT /api/67a4abe/smile-tasks/:smileTaskId/rerun`, () => {
  describe(`successful response`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded/smile.jpg",
        filepathResult: "results/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await putRerun(smileTask.id)
    })

    test(`respond 200`, async () => {
      expect(response.status).toBe(200)
    })

    test(`rename smile to temporary name and then rename it back`, async () => {
      expect(storageFactory().file).toHaveBeenCalledWith('uploaded/smile_review_pending.jpg')
      expect(storageFactory().move).toHaveBeenCalledWith('uploaded/smile.jpg')
      expect(storageFactory().file).toHaveBeenCalledWith('uploaded/smile.jpg')
      expect(storageFactory().move).toHaveBeenCalledWith('uploaded/smile_review_pending.jpg')
      expect(storageFactory().file.mock.calls.length).toBe(2)
      expect(storageFactory().move.mock.calls.length).toBe(2)
    })
  })

  describe(`smile task id doesn't exist`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      response = await putRerun("9991237")
    })

    test(`respond 404`, async () => {
      expect(response.status).toBe(404)
    })
  })

  describe(`image file not found`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded_unexistent/smile.jpg",
        filepathResult: "results/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await putRerun(smileTask.id)
    })

    test(`respond 404`, async () => {
      expect(response.status).toBe(404)
    })
  })

  describe(`error on google cloud storage`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded_error/smile.jpg",
        filepathResult: "results/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await putRerun(smileTask.id)
    })

    test(`respond 500`, async () => {
      expect(response.status).toBe(500)
      expect(response.body.error).toBeTruthy()
    })
  })
})


describe(`PUT /api/67a4abe/smile-tasks/:smileTaskId/result-candidates`, () => {
  describe(`successful response`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded/smile.jpg",
        filepathResult: "results/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await getResultCandidates(smileTask.id)
    })

    test(`respond 200`, async () => {
      expect(response.status).toBe(200)
    })

    test(`list the files named in the format .*after_.*`, async () => {
      expect(response.body.candidates).toEqual([
        {
          id: "c21pbGVfNl9mYWNlX2FmdGVyXzBfdHJhbnNmb3JtZWQuanBn",
          luminance: null,
          path: "results/smile_6_face_after_0_transformed.jpg",
        },
        {
          id: "c21pbGVfNl9mYWNlX2FmdGVyXzFfMC40NS5qcGc",
          luminance: 0.45,
          path: "results/smile_6_face_after_1_0.45.jpg",
        },
        {
          id: "c21pbGVfYWZ0ZXJfMC41NV9wcmVkZWZpbmVkLmpwZw",
          luminance: 0.55,
          path: "results/smile_after_0.55_predefined.jpg",
        },
        {
          id: "c21pbGVfYWZ0ZXJfMC41ODMyMTJfYXV0by5qcGc",
          luminance: 0.58,
          path: "results/smile_after_0.583212_auto.jpg",
        },
        {
          id: "c21pbGVfNl9mYWNlX2FmdGVyXzJfMC43NS5qcGc",
          luminance: 0.75,
          path: "results/smile_6_face_after_2_0.75.jpg",
        },
      ])
    })
  })

  describe(`smile task id doesn't exist`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      response = await getResultCandidates("9991237")
    })

    test(`respond 404`, async () => {
      expect(response.status).toBe(404)
    })
  })

  describe(`when have no candidates`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded/smile.jpg",
        filepathResult: "results_empty/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await getResultCandidates(smileTask.id)
    })

    test(`respond 200`, async () => {
      expect(response.status).toBe(200)
    })

    test(`respond an empty array of candidates`, async () => {
      expect(response.body.candidates).toEqual([])
    })
  })

  describe(`when task hasn't finished yet`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded/smile.jpg",
        filepathResult: "results/smile_after.jpg",
        status: 'pending',
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await getResultCandidates(smileTask.id)
    })

    test(`respond 423`, async () => {
      expect(response.status).toBe(423)
      expect(response.body.error).toBeTruthy()
    })
  })

  describe(`when gcloud respond an error`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded/smile.jpg",
        filepathResult: "results_error/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await getResultCandidates(smileTask.id)
    })

    test(`respond 500`, async () => {
      expect(response.status).toBe(500)
      expect(response.body.error).toBeTruthy()
    })
  })
})

describe(`PUT /api/67a4abe/smile-tasks/:smileTaskId/result-candidates/:resultId/promote`, () => {
  describe(`successful response`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded/smile.jpg",
        filepathResult: "results/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await putPromoteResult(smileTask.id, "c21pbGVfYWZ0ZXJfMC41NV9wcmVkZWZpbmVkLmpwZw")
    })

    test(`respond 200`, async () => {
      expect(response.status).toBe(200)
    })

    test(`rename the selected result candidate to smile_after.jpg`, async () => {
      expect(storageFactory().file).toHaveBeenCalledWith('results/smile_after_0.55_predefined.jpg')
      expect(storageFactory().move).toHaveBeenCalledWith('results/smile_after.jpg')
      expect(storageFactory().file.mock.calls.length).toBe(1)
      expect(storageFactory().move.mock.calls.length).toBe(1)
    })
  })

  describe(`smile task id doesn't exist`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      response = await putPromoteResult("9991237", "c21pbGVfYWZ0ZXJfMC41NV9wcmVkZWZpbmVkLmpwZw")
    })

    test(`respond 404`, async () => {
      expect(response.status).toBe(404)
    })
  })

  describe(`result id doesn't exist`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded/smile.jpg",
        filepathResult: "results/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await putPromoteResult(smileTask.id, "cmVzdWx0c191bmV4aXN0ZW50L3NtaWxlX2FmdGVyXzAuNTVfcHJlZGVmaW5lZC5qcGc")
    })

    test(`respond 404`, async () => {
      expect(response.status).toBe(404)
    })
  })

  describe(`error parsing result id`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded/smile.jpg",
        filepathResult: "results/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await putPromoteResult(smileTask.id, "$$%==@#--$!@__#!@$!@#")
    })

    test(`respond 404`, async () => {
      expect(response.status).toBe(404)
    })
  })

  describe(`when task hasn't finished yet`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded/smile.jpg",
        filepathResult: "results/smile_after.jpg",
        status: 'pending',
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await putPromoteResult(smileTask.id, "c21pbGVfYWZ0ZXJfMC42Ml9wcmVkZWZpbmVkLmpwZw")
    })

    test(`respond 423`, async () => {
      expect(response.status).toBe(423)
      expect(response.body.error).toBeTruthy()
    })
  })

  describe(`when gcloud respond an error`, () => {
    let response
    let smileTask

    beforeEach(async () => {
      smileTask = Factory.build('smile_task', {
        filepathUploaded: "uploaded/smile.jpg",
        filepathResult: "results_error/smile_after.jpg",
      })
      await Promise.all([smileTask.save()])
      smileTask = await SmileTask.get(smileTask.id)

      response = await putPromoteResult(smileTask.id, "c21pbGVfYWZ0ZXJfMC42Ml9wcmVkZWZpbmVkLmpwZw")
    })

    test(`respond 500`, async () => {
      expect(response.status).toBe(500)
      expect(response.body.error).toBeTruthy()
    })
  })
})

function putPromoteUploaded(smileTaskId) {
  return request
    .put(`/api/67a4abe/smile-tasks/${smileTaskId}/promote-uploaded`)
    .send()
}

function putRerun(smileTaskId) {
  return request
    .put(`/api/67a4abe/smile-tasks/${smileTaskId}/rerun`)
    .send()
}

function getResultCandidates(smileTaskId) {
  return request
    .get(`/api/67a4abe/smile-tasks/${smileTaskId}/result-candidates`)
    .send()
}

function putPromoteResult(smileTaskId, resultId) {
  return request
    .put(`/api/67a4abe/smile-tasks/${smileTaskId}/result-candidates/${resultId}/promote`)
    .send()
}

async function simplePostTask({user, client, ip='127.0.0.1'}) {
    const json = {imageMD5: IMAGE_MD5, contentType: CONTENT_TYPE}
    const signature = signer.apiSign(user.id, IMAGE_MD5, client.secret)
    const token = simpleCrypto.base64(`${client.id}:${signature}`)
    return await postSolicitation(json, user.id, token, ip)
}
