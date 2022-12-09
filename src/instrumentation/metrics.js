import newrelic from 'newrelic'

export const metrics = new (class {
  addTag({label, value}) {
    newrelic.addCustomAttribute(label, value)
  }

  stopwatch(metricName, func) {
    return newrelic.startSegment(metricName, true, func)
  }
})()
