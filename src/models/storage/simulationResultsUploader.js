import path from 'path'
import stream from 'stream'

import {storageFactory} from './storageFactory'
import {GcloudPresignedCredentialsProvider} from './GcloudPresignedCredentialsProvider'
import {idGenerator} from "../tools/idGenerator"
import {logger} from '../../instrumentation/logger'
import {env} from "../../config/env"
import {timeInSeconds, nowReadable} from '../../utils/time'
import FileType from 'file-type'
const {SECONDS, MINUTES, HOURS, DAYS} = timeInSeconds

const me = new (class {
  async upload({bucket, simulation, uploadsConfig, info, clientId, root='.api-simulations/'}) {
    const success = simulation.success
    const folderpath = path.join(root, (success ? 'success' : 'fail'), `${simulation.id}SIM_${clientId}CLI`)
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
    for (let cfgKey of Object.keys(uploadsConfig)) {
      const content = simulation[cfgKey]
      if (!content) continue
      const cfg = uploadsConfig[cfgKey]
      let {ext: extension} = (await FileType.fromBuffer(content)) || {}
      extension = extension || cfg.extensionPlaceholder || 'unknown'
      const filename = cfgKey + `.${extension}`
      cfg.rawCfg = {
        filename,
        content,
        getUrl: cfg.getUrl,
      }
      rawUploadsConfig.push(cfg.rawCfg)
    }
    await me.rawUpload({
      bucket,
      uploads: rawUploadsConfig,
      folderpath,
    })

    const results = {}
    Object.keys(uploadsConfig).forEach((cfgKey) => {
      const {rawCfg} = uploadsConfig[cfgKey]
      results[cfgKey] = rawCfg || {}
    })
    return {
      results,
      folderpath,
    }
  }

  async rawUpload({bucket, uploads = [], folderpath}) {
    uploads.forEach((up) => {
      up.filepath = path.join(folderpath, up.filename)
    })

    const uploadTasks = uploads.map((up) => me.#upload(bucket, up))
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

  async #upload(bucket, {content, filepath}) {
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
