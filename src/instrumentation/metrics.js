import newrelic from 'newrelic'

export const metrics = new (class {
  addTag({label, value}) {
    newrelic.addCustomAttribute(label, value)
  }

  stopwatch(metricName, func) {
    return newrelic.startSegment(metricName, true, func)
  }

  addRequestBytesMeasure({env, apiId, bytes}) {
    metrics.#addMeasure({
      name: metrics.#composeName({env, apiId, name: 'RequestBytes'}),
      value: bytes,
    })
  }

  addImageBytesMeasure({env, apiId, bytes}) {
    metrics.#addMeasure({
      name: metrics.#composeName({env, apiId, name: 'ImageBytes'}),
      value: bytes,
    })
  }

  addImageDimensionsMeasure({env, apiId, dimensions: {width, height, area, areaSqrt}}) {
    metrics.#addMeasure({
      name: metrics.#composeName({env, apiId, name: 'ImageWidth'}),
      value: width,
    })
    metrics.#addMeasure({
      name: metrics.#composeName({env, apiId, name: 'ImageHeight'}),
      value: height,
    })
    metrics.#addMeasure({
      name: metrics.#composeName({env, apiId, name: 'ImageArea'}),
      value: area,
    })
    metrics.#addMeasure({
      name: metrics.#composeName({env, apiId, name: 'ImageAreaSqrt'}),
      value: areaSqrt,
    })
  }

  #addMeasure({name, value}) {
    newrelic.recordMetric(name, value)
  }

  #composeName({apiId, env, name}) {
    return `${apiId}:${env}/${name}`
  }
})()
