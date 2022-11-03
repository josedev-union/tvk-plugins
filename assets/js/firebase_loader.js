import {initializeApp} from 'firebase/app'
import {getAnalytics, logEvent} from "firebase/analytics"
import {envShared} from '../../src/shared/envShared'

const FIREBASE_CONFIG = {
  apiKey: envShared.instSimFirebaseApiKey,
  authDomain: envShared.instSimFirebaseAuthDomain,
  projectId: envShared.instSimFirebaseProjectId,
  storageBucket: envShared.instSimFirebaseStorageBucket,
  messagingSenderId: envShared.instSimFirebaseMessagingSenderId,
  appId: envShared.instSimFirebaseAppId,
  measurementId: envShared.instSimFirebaseMeasurementId,
}

export const fbase = new (class {
  #analytics = null

  constructor() {
    this.app = initializeApp(FIREBASE_CONFIG)
    this.#analytics = getAnalytics(this.app)
  }

  logEvent(eventName, eventParams={}) {
    console.log(eventName, eventParams)
    logEvent(this.#analytics, eventName, eventParams)
  }
})()
