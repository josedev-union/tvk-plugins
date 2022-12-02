import * as testing from '@firebase/rules-unit-testing'
import {v4 as uuid} from 'uuid'
import {env} from '../../src/config/env'

export const firebaseHelpers = new (class {
  #testEnvs = null

  async ensureTestEnv() {
    if (!firebaseHelpers.#testEnvs) {
      const testEnvsPromises = Object.values(env.googleProjects).map(async ({projectId}) => {
        const [host, port] = env.firestoreEmulatorHost.split(':')
        return await testing.initializeTestEnvironment({
          projectId: projectId || 'dentrino-test',
          firestore: {host, port},
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
