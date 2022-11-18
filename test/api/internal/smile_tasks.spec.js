import { Factory } from 'rosie'
import {signer} from '../../../src/shared/signer'
import {envShared} from '../../../src/shared/envShared'
import {simpleCrypto} from '../../../src/shared/simpleCrypto'
import {Database} from '../../../src/models/database/Database'
import {security} from '../../../src/models/security'
import {SmileTask} from '../../../src/models/database/SmileTask'
import {clearRedis} from '../../../src/config/redis'
import {env} from '../../../src/config/env'
import {firebaseHelpers} from '../../helpers/firebaseHelpers'

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
              { name: path.join(prefix, "smile_06_face_after_00_transformed_b1.00.jpg") },
              { name: path.join(prefix, "smile_06_face_after_00_transformed_b0.50.jpg") },
              { name: path.join(prefix, "smile_06_face_after_01_interpolated_mf0.45_b0.50.jpg") },
              { name: path.join(prefix, "smile.jpg") },
              { name: path.join(prefix, "smile_06_face_after_02_interpolated_mf0.75_b1.50.jpg") },
              { name: path.join(prefix, "smile_after_0.55_predefined.jpg") },
              { name: path.join(prefix, "smile_review_pending.jpg") },
              { name: path.join(prefix, "smile_after_0.583212_auto.jpg") },
              { name: path.join(prefix, "smile_07_face_after_15_blendreplace_transformed_b1.50_w0.30.jpg") },
              { name: path.join(prefix, "smile_07_face_after_25_blendreplace_interpolated_mf0.75_b1.50_w0.30.jpg") },
              { name: path.join(prefix, "smile_07_face_after_00_blendpoisson_transformed_b1.50_w0.30.jpg") },
              { name: path.join(prefix, "smile_07_face_after_03_blendpoisson_interpolated_mf0.45_b1.50_w0.30.jpg") },
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

beforeAll(async () => {
  await firebaseHelpers.ensureTestEnv()
})

beforeEach(async () => {
  jest.clearAllMocks()
  await firebaseHelpers.clearFirestore()
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
          id: "c21pbGVfMDZfZmFjZV9hZnRlcl8wMF90cmFuc2Zvcm1lZF9iMS4wMC5qcGc",
          synthType: 'transformed',
          luminance: null,
          mixFactor: null,
          brightness: 1.0,
          whiten: 0.0,
          blending: 'replace',
          path: "results/smile_06_face_after_00_transformed_b1.00.jpg",
        },
        {
          id: "c21pbGVfMDZfZmFjZV9hZnRlcl8wMF90cmFuc2Zvcm1lZF9iMC41MC5qcGc",
          synthType: 'transformed',
          luminance: null,
          mixFactor: null,
          brightness: 0.5,
          whiten: 0.0,
          blending: 'replace',
          path: "results/smile_06_face_after_00_transformed_b0.50.jpg",
        },
        {
          id: "c21pbGVfMDdfZmFjZV9hZnRlcl8xNV9ibGVuZHJlcGxhY2VfdHJhbnNmb3JtZWRfYjEuNTBfdzAuMzAuanBn",
          synthType: 'transformed',
          luminance: null,
          mixFactor: null,
          brightness: 1.50,
          whiten: 0.30,
          blending: 'replace',
          path: "results/smile_07_face_after_15_blendreplace_transformed_b1.50_w0.30.jpg",
        },
        {
          id: "c21pbGVfMDdfZmFjZV9hZnRlcl8wMF9ibGVuZHBvaXNzb25fdHJhbnNmb3JtZWRfYjEuNTBfdzAuMzAuanBn",
          synthType: 'transformed',
          luminance: null,
          mixFactor: null,
          brightness: 1.50,
          whiten: 0.30,
          blending: 'poisson',
          path: "results/smile_07_face_after_00_blendpoisson_transformed_b1.50_w0.30.jpg",
        },
        {
          id: "c21pbGVfMDZfZmFjZV9hZnRlcl8wMV9pbnRlcnBvbGF0ZWRfbWYwLjQ1X2IwLjUwLmpwZw",
          synthType: 'interpolated',
          luminance: 0.45,
          mixFactor: 0.45,
          brightness: 0.5,
          whiten: 0.0,
          blending: 'replace',
          path: "results/smile_06_face_after_01_interpolated_mf0.45_b0.50.jpg",
        },
        {
          id: "c21pbGVfMDdfZmFjZV9hZnRlcl8wM19ibGVuZHBvaXNzb25faW50ZXJwb2xhdGVkX21mMC40NV9iMS41MF93MC4zMC5qcGc",
          synthType: 'interpolated',
          luminance: 0.45,
          mixFactor: 0.45,
          brightness: 1.50,
          whiten: 0.30,
          blending: 'poisson',
          path: "results/smile_07_face_after_03_blendpoisson_interpolated_mf0.45_b1.50_w0.30.jpg",
        },
        {
          id: "c21pbGVfYWZ0ZXJfMC41NV9wcmVkZWZpbmVkLmpwZw",
          synthType: 'interpolated',
          luminance: 0.55,
          mixFactor: 0.55,
          brightness: 1.00,
          whiten: 0.0,
          blending: 'replace',
          path: "results/smile_after_0.55_predefined.jpg",
        },
        {
          id: "c21pbGVfYWZ0ZXJfMC41ODMyMTJfYXV0by5qcGc",
          synthType: 'interpolated',
          luminance: 0.58,
          mixFactor: 0.58,
          brightness: 1.00,
          whiten: 0.0,
          blending: 'replace',
          path: "results/smile_after_0.583212_auto.jpg",
        },
        {
          id: "c21pbGVfMDZfZmFjZV9hZnRlcl8wMl9pbnRlcnBvbGF0ZWRfbWYwLjc1X2IxLjUwLmpwZw",
          synthType: 'interpolated',
          luminance: 0.75,
          mixFactor: 0.75,
          brightness: 1.50,
          whiten: 0.0,
          blending: 'replace',
          path: "results/smile_06_face_after_02_interpolated_mf0.75_b1.50.jpg",
        },
        {
          id: "c21pbGVfMDdfZmFjZV9hZnRlcl8yNV9ibGVuZHJlcGxhY2VfaW50ZXJwb2xhdGVkX21mMC43NV9iMS41MF93MC4zMC5qcGc",
          synthType: 'interpolated',
          luminance: 0.75,
          mixFactor: 0.75,
          brightness: 1.50,
          whiten: 0.30,
          blending: 'replace',
          path: "results/smile_07_face_after_25_blendreplace_interpolated_mf0.75_b1.50_w0.30.jpg",
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
