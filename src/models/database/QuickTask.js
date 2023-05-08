import {Database} from './Database'
import {idGenerator} from '../tools/idGenerator'
import {sanitizer} from '../tools/sanitizer'
import {normalizer} from '../tools/normalizer'
import {validator} from '../tools/validator'

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
  PARAMS_WHITELIST() {return ['mix_factor', 'start_style_stats', 'end_style_stats'] }

  validationErrors() {
    const errors = []
    validator.validateNumber({
      fieldName: 'mix_factor',
      value: this.params['mix_factor'],
      min: 0.0,
      max: 1.0,
      addTo: errors,
    })
    return errors
  }

  normalizeData() {
    // Params
    this.params['mix_factor'] = normalizer.toFloat(this.params['mix_factor'] || 0.5 )
    this.params['start_style_stats'] = normalizer.toChoicesString(this.params['start_style_stats'] || null)
    this.params['end_style_stats'] = normalizer.toChoicesString(this.params['end_style_stats'] || null)
  }

  buildJobOptions() {
    return  {
      mix_factor: this.params['mix_factor'],
      start_style_stats: this.params['start_style_stats'],
      end_style_stats: this.params['end_style_stats'],
    }
  }
}
