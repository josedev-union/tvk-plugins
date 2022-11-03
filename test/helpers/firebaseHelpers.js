import * as testing from '@firebase/rules-unit-testing'
import {v4 as uuid} from 'uuid'

export const firebaseHelpers = new (class {
  #testEnv = null

  async ensureTestEnv() {
    if (!firebaseHelpers.#testEnv) {
      firebaseHelpers.#testEnv = await testing.initializeTestEnvironment({
        projectId: 'dentrino-test-us',
        firestore: {host: 'localhost', port: 8080},
      })
    }
  }

  async clearFirestore() {
    await firebaseHelpers.#testEnv.clearFirestore()
  }
})()
