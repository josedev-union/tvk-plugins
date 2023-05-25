import {Database} from './Database'
import {idGenerator} from '../tools/idGenerator'
import {sanitizer} from '../tools/sanitizer'
import {normalizer} from '../tools/normalizer'
import {validator} from '../tools/validator'

const PARAM_VALUE_DEFAULT_MIX_FACTOR = 0
const PARAM_KEY_MIX_FACTOR = 'mix_factor'
const PARAM_KEY_START_STYLE_STATS = 'start_style_stats'
const PARAM_KEY_END_STYLE_STATS = 'end_style_stats'


export class QuickBase {

  STORAGE_WHITELIST() { return [] }
  PARAMS_WHITELIST() { return [] }
  METADATA_WHITELIST() { return [] }
  static get COLLECTION_NAME() { return 'quick' }

  constructor({id, createdAt, clientId, storage={}, params={}, metadata={}} = {}) {
    this.id = id
    this.createdAt = createdAt
    this.clientId = clientId
    this.storage = storage
    this.params = params
    this.metadata = metadata
  }

  static build({id, createdAt, clientId, storage, params, metadata}={}) {
    const simulation = new this({
      id: id || this.newId(),
      createdAt: createdAt || Database.toTimestamp(new Date()),
      clientId,
    })
    simulation.addStorageData(storage)
    simulation.addMetadata(metadata)
    simulation.addParams(params)
    return simulation
  }

  static newId() {
    return idGenerator.newOrderedId()
  }

  normalizeData() {
    // throw new Error("Not implemented!")
  }

  validationErrors() {
    // throw new Error("Not implemented!")
    return []
  }

  buildJobOptions() {
    return {}
  }

  addMetadata(metadata) {
    if (!metadata) return
    metadata = sanitizer.onlyKeys(metadata, this.METADATA_WHITELIST())
    Object.assign(this.metadata, metadata)
  }

  addStorageData(storage) {
    if (!storage) return
    storage = sanitizer.onlyKeys(storage, this.STORAGE_WHITELIST())
    Object.assign(this.storage, storage)
  }

  addParams(params) {
    if (!params) return
    params = sanitizer.onlyKeys(params, this.PARAMS_WHITELIST())
    Object.assign(this.params, params)
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
    const result = await db.save(this, `${this.constructor.COLLECTION_NAME}/${this.id}`, false, attrs)
    return {result}
  }

  static async get(id, {source}={}) {
    const db = Database.instance({name: source})
    return await db.get(this, id)
  }

  static async list({orderBy='id', orderAsc=false, filters={}, source}) {
    const db = Database.instance({name: source})
    let query = db.startQuery(this.COLLECTION_NAME)

    Object.entries(filters).forEach(([field, value]) => {
      query = query.where(field, '==', value)
    })

    query = query
      .orderBy(orderBy, (orderAsc ? 'asc' : 'desc'))
      .limit(100)
    return await db.getResults(this, query)
  }
}

export class QuickSegment extends QuickBase {
  static get COLLECTION_NAME() { return 'quick_segment' }
}


export class QuickSynth extends QuickBase {
  static get COLLECTION_NAME() { return 'quick_synth' }
  PARAMS_WHITELIST() {return [PARAM_KEY_MIX_FACTOR, PARAM_KEY_START_STYLE_STATS, PARAM_KEY_END_STYLE_STATS] }

  validationErrors() {
    const errors = []
    validator.validateNumber({
      fieldName: PARAM_KEY_MIX_FACTOR,
      value: this.params[PARAM_KEY_MIX_FACTOR],
      min: 0.0,
      max: 1.0,
      addTo: errors,
    })
    return errors
  }

  normalizeData() {
    // Params
    this.params[PARAM_KEY_MIX_FACTOR] = normalizer.getValue(normalizer.toFloat(this.params[PARAM_KEY_MIX_FACTOR]), normalizer.toFloat(PARAM_VALUE_DEFAULT_MIX_FACTOR))
    this.params[PARAM_KEY_START_STYLE_STATS] = normalizer.toChoicesString(this.params[PARAM_KEY_START_STYLE_STATS] || null)
    this.params[PARAM_KEY_END_STYLE_STATS] = normalizer.toChoicesString(this.params[PARAM_KEY_END_STYLE_STATS] || null)
  }

  buildJobOptions() {
    return  {
      mix_factor: this.params[PARAM_KEY_MIX_FACTOR],
      start_style_stats: this.params[PARAM_KEY_START_STYLE_STATS],
      end_style_stats: this.params[PARAM_KEY_END_STYLE_STATS],
    }
  }
}
