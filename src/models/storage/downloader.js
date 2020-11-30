import {env} from '../../config/env'
import {storageFactory} from './storageFactory'

export const downloader = new (class {
  download(key) {
    return storageFactory()
    .bucket(env.gcloudBucket)
    .file(key)
    .download()
    .then(([data]) => {
      return Promise.resolve(data)
    })
    .catch(error => {
      console.error("Error downloading from Gcloud: ", error.message)
      return Promise.reject(error)
    })
  }
})()
