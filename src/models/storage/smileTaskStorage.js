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

  async renameUploadedImageToForceRerun(smileTask) {
    const temporaryFilepath = smileTask.filepathUploadedToReview()
    const permanentFilepath = smileTask.filepathUploaded
    try {
      await this.#move(permanentFilepath, temporaryFilepath)
    } catch { /* ignore */ }
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
      const match = resultName.match(/_after(_.*\.)(jpe?g|png)/)
      if (match) {
        const isTransformed = resultName.includes('_transformed')
        const brightnessMatch = match[1].match(/[_.]b(\d+\.\d+)[_.]/)
        const mixFactorMatch = match[1].match(/([_.]mf|[_.])(\d+\.\d+)[_.]/)
        const whitenMatch = match[1].match(/[_.]w(\d+\.\d+)[_.]/)
        const blendMatch = match[1].match(/[_.]blend([^_]+)[_.]/)
        const synthBrightness = brightnessMatch ? Math.round(parseFloat(brightnessMatch[1])*100.0)/100.0 : 1.0
        const synthMixFactor = mixFactorMatch ? Math.round(parseFloat(mixFactorMatch[2])*100.0)/100.0 : null
        const synthWhiten = whitenMatch ? Math.round(parseFloat(whitenMatch[1])*100.0)/100.0 : 0.0
        const blending = blendMatch ? blendMatch[1] : 'replace'
        results.push({
          id: this.#resultNameToId(resultName),
          path: resultPath,
          synthType: (isTransformed ? 'transformed' : 'interpolated'),
          brightness: synthBrightness,
          luminance: synthMixFactor,
          mixFactor: synthMixFactor,
          whiten: synthWhiten,
          blending: blending,
        })
      }
    })
    results.sort((a,b) => a.mixFactor - b.mixFactor)
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
          reject({source: `smileTaskStorage.move("${filepath}","${newFilepath}")`, error: error})
        }
      })
    })
  }
})()
