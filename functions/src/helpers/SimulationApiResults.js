const path = require('path')

const {getStorage} = require('firebase-admin/storage')
const storage = getStorage()

const DAY_IN_MILLIS = 24.0 * 60.0 * 60.0 * 1000.0
const FAIL_FILE_PATTERNS = [/info\.json/i, /original\.(jpe?g|png)/i]
const SUCCESS_FILE_PATTERNS = [/info\.json/i, /before\.jpg/i, /result\.jpg/i]

class SimulationApiResults {
  constructor({bucket, bucketRef, dirpath, isSuccess, isInstantSimulation, simulationId, clientId}) {
    this.bucket = bucket
    this.bucketRef = bucketRef
    this.dirpath = dirpath
    this.isSuccess = isSuccess
    this.isInstantSimulation = isInstantSimulation
    this.simulationId = simulationId
    this.clientId = clientId
    this.filenames = undefined
    this.isComplete = undefined
    this.info = undefined
  }

  get gsPath() {
    return path.join(this.bucket, this.dirpath)
  }

  get googleConsoleUrl() {
    return `https://console.cloud.google.com/storage/browser/${this.gsPath}`
  }

  get mainImageNames() {
    return this.isSuccess ? ['before', 'result', 'morphed'] : ['original']
  }

  static fromPath(filepath, {bucket}) {
    const dirpath = path.dirname(filepath)
    const pathParts = SimulationApiResults.destructurePath(dirpath)
    if (!SimulationApiResults.structureIsValid(pathParts)) {
      return undefined
    }
    const isSuccess = pathParts.state === 'success'
    const isInstantSimulation = pathParts.state === '.instant-simulations'
    const {simulationId, clientId} = pathParts
    return new SimulationApiResults({
      bucket,
      dirpath,
      isSuccess,
      isInstantSimulation,
      clientId,
      simulationId,
      bucketRef: storage.bucket(bucket),
    })
  }

  static isInfo(filepath) {
    return path.basename(filepath) === 'info.json'
  }

  static structureIsValid(parts) {
    if (!parts) return false
    const STATE_VALUES = ['success', 'fail']
    const {namespace, state, simulationId} = parts
    return parts.namespace && parts.simulationId && STATE_VALUES.includes(state)
  }

  static destructurePath(dirpath) {
    const parts = dirpath.split('/').filter((part) => part.trim() !== '')
    if (parts.length !== 3) {
      return {}
    }

    const [namespace, state, simulationFullId] = parts
    const [simulationId, clientId] = simulationFullId.split('SIM_')

    return {namespace, state, simulationId, clientId}
  }

  async findNames() {
    const files = await this.bucketRef.getFiles({prefix: this.dirpath})
    this.filenames = files.flat().map((file) => path.basename(file.name))
    this.isComplete = this.hasAllMandatoryFiles()
  }

  async getInfo() {
    const infoPath = path.join(this.dirpath, 'info.json')
    const [buffer] = await this.bucketRef.file(infoPath).download()
    this.info = JSON.parse(buffer)
    return this.info
  }

  async waitIsComplete({retries=5, delayMs=250}={}) {
    let tries = 0
    while (true) {
      tries += 1
      await this.findNames()
      if (this.isComplete || tries >= retries+1) {
        return
      } else {
        await new Promise(r => setTimeout(r, delayMs))
      }
    }
  }

  get imagenames() {
    return this.filenames.filter(fname => fname.match(/\.(jpe?g|png)$/i))
  }

  getImageFilesObject({onlyNames}={}) {
    let imgEntries = this.imagenames.map(filename => {
      const nameNoExt = path.parse(filename).name
      const imgObj = {
        name: nameNoExt,
        filename,
      }
      return [nameNoExt, imgObj]
    })
    if (onlyNames) {
      imgEntries = imgEntries.filter(([name,_]) => onlyNames.includes(name))
    }
    const imgObjects = Object.fromEntries(imgEntries)
    Object.values(imgObjects).forEach(imgObj => {
      const {filename} = imgObj
      const storagePath = path.join(this.dirpath, filename)
      const fileRef = this.bucketRef.file(storagePath)
      Object.assign(imgObj, {fileRef})
    })
    return imgObjects
  }

  async downloadAndAddContent({imgObjects, onlyNames}={}) {
    if (!imgObjects) imgObjects = this.getImageFilesObject({onlyNames})
    const downloadPromises = Object.values(imgObjects).map(imgObj => {
      return (async () => {
        const [content] = await imgObj
          .fileRef
          .download()
        imgObj.content = content
        return content
      })()
    })

    await Promise.all(downloadPromises)
    return imgObjects
  }

  async addImageUrls({imgObjects, onlyNames}={}) {
    if (!imgObjects) imgObjects = this.getImageFilesObject({onlyNames})
    const signedUrlPromises = Object.values(imgObjects).map(imgObj => {
      return (async () => {
        const [signedUrl] = await imgObj
          .fileRef
          .getSignedUrl({
            action: 'read',
            expires: Date.now() + 6.9*DAY_IN_MILLIS,
            version: 'v4',
          })
        imgObj.signedUrl = signedUrl
        return signedUrl
      })()
    })

    await Promise.all(signedUrlPromises)
    return imgObjects
  }

  hasAllMandatoryFiles() {
    const patterns = this.isSuccess ? SUCCESS_FILE_PATTERNS : FAIL_FILE_PATTERNS
    return patterns.every((pattern) => {
      return this.filenames.some((filename) => filename.match(pattern))
    })
  }
}

exports.SimulationApiResults = SimulationApiResults
