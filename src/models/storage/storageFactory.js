import {env} from '../../config/env'
import {Storage} from '@google-cloud/storage'

export const storageFactory = ({projectKey}={}) => {
  if (projectKey) {
    const {credentialPath} = env.googleProjects[projectKey] || {}
    if (credentialPath) {
      return new Storage({
        keyFilename: credentialPath,
      })
    }
  }

  return new Storage()
}
