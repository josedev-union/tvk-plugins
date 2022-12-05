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
  async upload({googleProjectKey, bucket, simulation, uploadsConfig, info, clientId, root='.api-simulations/'}) {
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
        isPublic: cfg.isPublic,
      }
      rawUploadsConfig.push(cfg.rawCfg)
    }
    await me.rawUpload({
      googleProjectKey,
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

  async rawUpload({googleProjectKey, bucket, uploads = [], folderpath}) {
    uploads.forEach((up) => {
      up.filepath = path.join(folderpath, up.filename)
    })

    const uploadTasks = uploads.map((up) => me.#upload({googleProjectKey, bucket}, up))
    await Promise.all(uploadTasks)

    const gcloudSigner = GcloudPresignedCredentialsProvider.build({bucket})
    const urlPromises = uploads.map(async (up) => {
      if (!up.getUrl) return

      let url = null
      if (up.isPublic) {
        url = this.#getPublicUrl({bucket, ...up})
      } else {
        url = await gcloudSigner
          .urlToGet(up.filepath, {expiresInSeconds: 15 * MINUTES})
          .then(({url}) => url)
      }
      up.getUrlSigned = url
    })

    await Promise.all(urlPromises)

    return uploads
  }

  async #upload({googleProjectKey, bucket}, {content, filepath, isPublic=false}) {
    await new Promise((resolve, reject) => {
      const file = this.#getFile({googleProjectKey, bucket, filepath})
      const passthroughStream = new stream.PassThrough()
      passthroughStream.write(content)
      passthroughStream.end()
      passthroughStream
      .pipe(file.createWriteStream({
        predefinedAcl: isPublic ? 'publicRead' : 'authenticatedRead',
      }))
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

  #getFile({googleProjectKey, bucket, filepath}) {
    return storageFactory({projectKey: googleProjectKey})
      .bucket(bucket)
      .file(filepath)
  }

  #getPublicUrl({bucket, filepath}) {
    return this.#getFile({bucket, filepath}).publicUrl()
  }

  #prettyJSON(info) {
    const identation = 4
    return JSON.stringify(info, null, identation)
  }
})()

export const simulationResultsUploader = me
