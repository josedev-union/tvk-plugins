const functions = require('firebase-functions')

exports.defineFunctionsToWatchBuckets = function({watch, memory, onFinalize}) {
  const entries = Object.entries(watch).map(([bucketNick, bucket]) => {
    const func = functions
      .runWith({ memory })
      .storage
      .bucket(bucket)
      .object()
      .onFinalize(onFinalize)
    return [`watch_${bucketNick}`, func]
  })
  return Object.fromEntries(entries)
}
