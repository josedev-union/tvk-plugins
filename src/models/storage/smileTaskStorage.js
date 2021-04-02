import {env} from '../../config/env'
import {storageFactory} from './storageFactory'
import {logger} from '../../instrumentation/logger'
import {simpleCrypto} from '../../shared/simpleCrypto'
import * as path from 'path'

export const smileTaskStorage = new (class {
  async renameReviewedImage(smileTask) {
    const temporaryFilepath = smileTask.filepathUploadedToReview()
    const permanentFilepath = smileTask.filepathUploaded
    return await this.#move(temporaryFilepath, permanentFilepath)
  }

  async listResultCandidates(smileTask) {
    const [items] = await storageFactory()
    .bucket(env.gcloudBucket)
    .getFiles({
      prefix: smileTask.resultsDirectory(),
      delimiter: "/"
    })

    let results = []
    items.forEach((storageObj) => {
      const resultPath = storageObj.name
      const resultName = path.basename(resultPath)
      const match = resultName.match(/_after_([\d.]+)/)
      if (match) {
        const synthLuminance = Math.round(parseFloat(match[1])*100.0)/100.0
        results.push({
          id: this.#resultNameToId(resultName),
          path: resultPath,
          luminance: synthLuminance,
        })
      }
    })
    results.sort((a,b) => a.luminance - b.luminance)
    return results
  }

  async renameChosenResult(smileTask, resultId) {
    const resultName = this.#resultIdToName(resultId)
    const temporaryFilepath = path.join(smileTask.resultsDirectory(), resultName)
    const permanentFilepath = smileTask.filepathResult
    return await this.#move(temporaryFilepath, permanentFilepath)
  }

  #resultNameToId(resultName) {
    return simpleCrypto.urlSafeBase64(resultName)
  }

  #resultIdToName(resultId) {
    return simpleCrypto.urlSafeBase64Decode(resultId)
  }

  async #move(filepath, newFilepath) {
    return await new Promise((resolve, reject) => {
      storageFactory()
      .bucket(env.gcloudBucket)
      .file(filepath)
      .move(newFilepath)
      .then(() => resolve({exist: true}))
      .catch(error => {
        logger.warn(`Couldn't rename ${filepath} to ${newFilepath}. ${error}`)
        if (error.code === 404) {
          resolve({exist: false})
        } else {
          reject(error)
        }
      })
    })
  }
})()
