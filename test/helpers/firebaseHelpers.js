import * as testing from '@firebase/rules-unit-testing'
import {v4 as uuid} from 'uuid'
import {env} from '../../src/config/env'

export const firebaseHelpers = new (class {
  #testEnvs = null

  async ensureTestEnv() {
    if (!firebaseHelpers.#testEnvs) {
      const testEnvsPromises = env.firebaseProjects.map(async ({name, config}) => {
        return await testing.initializeTestEnvironment({
          projectId: config.projectId,
          firestore: {host: 'localhost', port: 8080},
        })
      })
      firebaseHelpers.#testEnvs = await Promise.all(testEnvsPromises)
    }
  }

  async clearFirestore() {
    for (const testEnv of firebaseHelpers.#testEnvs) {
      await testEnv.clearFirestore()
    }
  }
})()
