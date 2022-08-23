import path from 'path'
import stream from 'stream'

import {storageFactory} from './storageFactory'
import {GcloudPresignedCredentialsProvider} from './GcloudPresignedCredentialsProvider'
import {idGenerator} from "../tools/idGenerator"
import {logger} from '../../instrumentation/logger'
import {env} from "../../config/env"
import {timeInSeconds, nowReadable} from '../../utils/time'
const {SECONDS, MINUTES, HOURS, DAYS} = timeInSeconds

const me = new (class {
  async upload({simulation, uploadsConfig, info, clientId}) {
    const success = simulation.success
    const folder = path.join((success ? 'success' : 'fail'), `${simulation.id}SIM_${clientId}CLI`)
    const rawUploadsConfig = [{
      filename: 'info.json',
      content: me.#prettyJSON({
        id: simulation.id,
        success: success,
        timestamp: nowReadable,
        clientId: clientId,
        ...info,
      }),
    }]
    Object.keys(uploadsConfig).forEach((cfgKey) => {
      if (!simulation[cfgKey]) return
      const cfg = uploadsConfig[cfgKey]
      cfg.rawCfg = {
        filename: cfgKey + (cfg.extension || '.jpg'),
        content: simulation[cfgKey],
        getUrl: cfg.getUrl,
      }
      rawUploadsConfig.push(cfg.rawCfg)
    })
    await me.rawUpload({
      uploads: rawUploadsConfig,
      folder: folder,
    })

    const results = {}
    Object.keys(uploadsConfig).forEach((cfgKey) => {
      const {rawCfg} = uploadsConfig[cfgKey]
      results[cfgKey] = rawCfg || {}
    })
    return results
  }

  async rawUpload({uploads = [], folder, root='.api-simulations/'}) {
    const fullfolder = path.join(root, folder)
    uploads.forEach((up) => {
      up.filepath = path.join(fullfolder, up.filename)
    })

    const uploadTasks = uploads.map((up) => me.#upload(up))
    await Promise.all(uploadTasks)

    const gcloudSigner = GcloudPresignedCredentialsProvider.build()
    const urlPromises = uploads.map((up) => {
      if (!up.getUrl) return

      return gcloudSigner
        .urlToGet(up.filepath, {expiresInSeconds: 15 * MINUTES})
        .then(({url}) => up.getUrlSigned = url)
    }).filter((promise) => !!promise)

    await Promise.all(urlPromises)

    return uploads
  }

  async #upload({content, filepath}) {
    const bucket = env.gcloudBucket
    await new Promise((resolve, reject) => {
      const file = storageFactory()
      .bucket(bucket)
      .file(filepath)
      const passthroughStream = new stream.PassThrough()
      passthroughStream.write(content)
      passthroughStream.end()
      passthroughStream
      .pipe(file.createWriteStream())
      .on('finish', function() {
        logger.verbose(`[SUCCESS] Upload: (${bucket}) ${filepath}`)
        resolve()
      })
      .on('error', function(err) {
        logger.error(`[FAILED] Upload: (${bucket}) ${filepath}`)
        reject(err)
      })
    })
  }

  #prettyJSON(info) {
    const identation = 4
    return JSON.stringify(info, null, identation)
  }
})()

export const simulationResultsUploader = me
