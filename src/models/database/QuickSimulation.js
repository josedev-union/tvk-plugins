import {Database} from '../database/Database'
import {idGenerator} from '../tools/idGenerator'
import {sanitizer} from '../tools/sanitizer'
import {normalizer} from '../tools/normalizer'
import {validator} from '../tools/validator'
import {Enum} from '../tools/Enum'
import * as path from 'path'

// Params Constants
const PARAM_KEY_STYLE_MODE = 'styleMode'
const PARAM_KEY_MIX_FACTOR = 'mixFactor'
const PARAM_KEY_MODE = 'mode'
const PARAM_KEY_BLEND = 'blend'
const PARAM_KEY_BRIGHTNESS = 'brightness'
const PARAM_KEY_WHITEN = 'whiten'
const ALL_PARAM_KEYS = [
  PARAM_KEY_STYLE_MODE,
  PARAM_KEY_MIX_FACTOR,
  PARAM_KEY_MODE, PARAM_KEY_BLEND,
  PARAM_KEY_BRIGHTNESS,
  PARAM_KEY_WHITEN,
]

const PARAM_VALUE_STYLE_MODE_AUTO = 'auto'
const PARAM_VALUE_STYLE_MODE_MIX = 'mix_manual'
const PARAM_VALUE_DEFAULT_STYLE_MODE = PARAM_VALUE_STYLE_MODE_AUTO
const STYLE_PARAM_MODE_VALUES = [
  PARAM_VALUE_STYLE_MODE_AUTO,
  PARAM_VALUE_STYLE_MODE_MIX,
]

const PARAM_VALUE_MODE_COSMETIC = 'cosmetic'
const PARAM_VALUE_MODE_ORTHO = 'ortho'
const PARAM_VALUE_DEFAULT_MODE = PARAM_VALUE_MODE_COSMETIC
const PARAM_MODE_VALUES = [
  PARAM_VALUE_MODE_COSMETIC,
  PARAM_VALUE_MODE_ORTHO,
]

const PARAM_VALUE_BLEND_POISSON = 'poisson'
const PARAM_VALUE_BLEND_REPLACE = 'replace'
const PARAM_VALUE_DEFAULT_BLEND = PARAM_VALUE_BLEND_POISSON
const PARAM_BLEND_VALUES = [
  PARAM_VALUE_BLEND_POISSON,
  PARAM_VALUE_BLEND_REPLACE,
]

const PARAM_VALUE_DEFAULT_BRIGHTNESS = 0.0
const PARAM_VALUE_DEFAULT_WHITEN = 0.0

// Metadata Constants
const MDATA_KEY_SCORE = 'feedbackScore'
const MDATA_KEY_CAPTURE = 'captureType'
const MDATA_KEY_CUSTOMER_ID = 'externalCustomerId'
const ALL_MDATA_KEYS = [
  MDATA_KEY_SCORE,
  MDATA_KEY_CAPTURE,
  MDATA_KEY_CUSTOMER_ID,
]

const MDATA_VALUE_CAPTURE_FILE = 'file'
const MDATA_VALUE_CAPTURE_CAMERA = 'camera'
const MDATA_VALUE_DEFAULT_MODE = null
const MDATA_CAPTURE_VALUES = [
  MDATA_VALUE_CAPTURE_FILE,
  MDATA_VALUE_CAPTURE_CAMERA,
]


// Attributes Whitelists
const PARAMS_WHITELIST = ALL_PARAM_KEYS
const METADATA_WHITELIST = ALL_MDATA_KEYS
const STORAGE_WHITELIST = [
  'bucket',
  'directoryPath',
  'beforePath',
  'originalPath',
  'resultPath',
]

export class QuickSimulation {
  static get COLLECTION_NAME() { return 'quick_simulations' }

  constructor({id, createdAt, clientId, storage={}, params={}, metadata={}} = {}) {
    this.id = id
    this.createdAt = createdAt
    this.clientId = clientId
    this.storage = storage
    this.params = params
    this.metadata = metadata
  }

  static build({id, createdAt, clientId, storage, params, metadata}={}) {
    const simulation = new QuickSimulation({
      id: id || QuickSimulation.newId(),
      createdAt: createdAt || Database.toTimestamp(new Date()),
      clientId,
    })
    simulation.addStorageData(storage)
    simulation.addMetadata(metadata)
    simulation.addParams(params)
    return simulation
  }

  async save({attrs, skipNormalization, skipValidation, source}={}) {
    const db = Database.instance({name: source || Database.sourceOf(this)})
    if (!skipNormalization) {
      this.normalizeData()
    }
    if (!skipValidation) {
      const errors = this.validationErrors()
      if (errors.length > 0) {
        return {errors}
      }
    }
    const result = await db.save(this, `${QuickSimulation.COLLECTION_NAME}/${this.id}`, false, attrs)
    return {result}
  }

  addMetadata(metadata) {
    if (!metadata) return
    metadata = sanitizer.onlyKeys(metadata, METADATA_WHITELIST)
    Object.assign(this.metadata, metadata)
  }

  addStorageData(storage) {
    if (!storage) return
    storage = sanitizer.onlyKeys(storage, STORAGE_WHITELIST)
    Object.assign(this.storage, storage)
  }

  addParams(params) {
    if (!params) return
    params = sanitizer.onlyKeys(params, PARAMS_WHITELIST)
    Object.assign(this.params, params)
  }

  normalizeData() {
    // Params
    this.params[PARAM_KEY_MODE] = normalizer.toChoicesString(this.params[PARAM_KEY_MODE] || PARAM_VALUE_DEFAULT_MODE)
    this.params[PARAM_KEY_BLEND] = normalizer.toChoicesString(this.params[PARAM_KEY_BLEND] || PARAM_VALUE_DEFAULT_BLEND)
    this.params[PARAM_KEY_BRIGHTNESS] = normalizer.toFloat(this.params[PARAM_KEY_BRIGHTNESS] || PARAM_VALUE_DEFAULT_BRIGHTNESS)
    this.params[PARAM_KEY_WHITEN] = normalizer.toFloat(this.params[PARAM_KEY_WHITEN] || PARAM_VALUE_DEFAULT_WHITEN)
    this.params[PARAM_KEY_STYLE_MODE] = normalizer.toChoicesString(this.params[PARAM_KEY_STYLE_MODE] || PARAM_VALUE_DEFAULT_STYLE_MODE)
    if (this.params[PARAM_KEY_STYLE_MODE] == PARAM_VALUE_STYLE_MODE_MIX) {
      this.params[PARAM_KEY_MIX_FACTOR] = normalizer.toFloat(this.params[PARAM_KEY_MIX_FACTOR])
    } else {
      this.params[PARAM_KEY_MIX_FACTOR] = null
    }

    // Metadata
    if (typeof(this.metadata[MDATA_KEY_SCORE]) !== 'undefined') {
      this.metadata[MDATA_KEY_SCORE] = normalizer.toFloat(this.metadata[MDATA_KEY_SCORE])
    }
    if (typeof(this.metadata[MDATA_KEY_CAPTURE]) !== 'undefined') {
      this.metadata[MDATA_KEY_CAPTURE] = normalizer.toChoicesString(this.metadata[MDATA_KEY_CAPTURE])
    }
  }

  validationErrors() {
    const errors = []
    validator.validateChoices({
      fieldName: PARAM_KEY_MODE,
      value: this.params[PARAM_KEY_MODE],
      choices: PARAM_MODE_VALUES,
      addTo: errors,
    })

    validator.validateChoices({
      fieldName: PARAM_KEY_BLEND,
      value: this.params[PARAM_KEY_BLEND],
      choices: PARAM_BLEND_VALUES,
      addTo: errors,
    })

    validator.validateChoices({
      fieldName: PARAM_KEY_STYLE_MODE,
      value: this.params[PARAM_KEY_STYLE_MODE],
      choices: STYLE_PARAM_MODE_VALUES,
      addTo: errors,
    })

    validator.validateNumber({
      fieldName: PARAM_KEY_BRIGHTNESS,
      value: this.params[PARAM_KEY_BRIGHTNESS],
      min: -1.0,
      max: 1.0,
      addTo: errors,
    })

    validator.validateNumber({
      fieldName: PARAM_KEY_WHITEN,
      value: this.params[PARAM_KEY_WHITEN],
      min: 0.0,
      max: 1.0,
      addTo: errors,
    })

    validator.validateNumber({
      fieldName: PARAM_KEY_MIX_FACTOR,
      value: this.params[PARAM_KEY_MIX_FACTOR],
      min: 0.0,
      max: 1.0,
      condition: () => this.params[PARAM_KEY_STYLE_MODE] == PARAM_VALUE_STYLE_MODE_MIX,
      addTo: errors,
    })

    validator.validateNumber({
      fieldName: MDATA_KEY_SCORE,
      value: this.metadata[MDATA_KEY_SCORE],
      min: 0.0,
      max: 5.0,
      optional: true,
      addTo: errors,
    })

    validator.validateChoices({
      fieldName: MDATA_KEY_CAPTURE,
      value: this.metadata[MDATA_KEY_CAPTURE],
      choices: MDATA_CAPTURE_VALUES,
      optional: true,
      addTo: errors,
    })

    return errors
  }

  buildJobOptions() {
    const options = {
      whiten: this.params[PARAM_KEY_WHITEN],
      brightness: 1.0 + this.params[PARAM_KEY_BRIGHTNESS],
      ortho: this.params[PARAM_KEY_BLEND] === PARAM_VALUE_MODE_ORTHO,
      poisson: this.params[PARAM_KEY_BLEND] === PARAM_VALUE_BLEND_POISSON,
    }
    if (this.params[PARAM_KEY_STYLE_MODE] === PARAM_VALUE_STYLE_MODE_MIX) {
      options.mix_factor = this.params[PARAM_KEY_MIX_FACTOR]
    }
    return options
  }

  static async get(id, {source}={}) {
    const db = Database.instance({name: source})
    return await db.get(QuickSimulation, id)
  }

  static async list({orderBy='id', orderAsc=false, filters={}, source}) {
    const db = Database.instance({name: source})
    let query = db.startQuery(QuickSimulation.COLLECTION_NAME)

    Object.entries(filters).forEach(([field, value]) => {
      query = query.where(field, '==', value)
    })

    query = query
      .orderBy(orderBy, (orderAsc ? 'asc' : 'desc'))
      .limit(100)
    return await db.getResults(QuickSimulation, query)
  }

  static newId(createdAt) {
    return idGenerator.newOrderedId()
  }

  static #prepareBuildAttrs({storage={}, params={}, metadata={}}) {
    const id = attrs.id || QuickSimulation.newId()
    const createdAt = attrs.createdAt || Database.toTimestamp(new Date())
    storage = sanitizer.onlyKeys(storage, STORAGE_WHITELIST)
    params = sanitizer.onlyKeys(params, PARAMS_WHITELIST)
    metadata = sanitizer.onlyKeys(metadata, METADATA_WHITELIST)
    return {
      id,
      createdAt,
      storage,
      params,
      metadata,
    }
  }
}
