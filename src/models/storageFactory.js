import * as env from './env'
import {Storage} from '@google-cloud/storage'

export const storageFactory = () => new Storage({credentials: env.gcloudCredentials})
