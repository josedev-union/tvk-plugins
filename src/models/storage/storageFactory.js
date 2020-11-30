import {env} from '../../config/env'
import {Storage} from '@google-cloud/storage'

export const storageFactory = () => new Storage()
