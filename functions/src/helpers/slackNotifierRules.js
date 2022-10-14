async function applyRules({rules, params, onMatch}) {
  const notificationPromises = rules.map(({notifyToChannel: channel, when, except}) => {
    const hasMatchedWhen = paramsMatch({params, conditions: when})
    const hasMatchedExcept = except ? paramsMatch({params, conditions: except}) : false
    const matchedNotifier = hasMatchedWhen && !hasMatchedExcept
    // console.log(`Matched:${(matchedNotifier ? 'YES' : 'NO')} channel:${channel} path:${apiResults.gsPath}`)
    if (matchedNotifier) {
      return Promise.resolve(onMatch({channel}))
    } else {
      return Promise.resolve()
    }
  })
  await Promise.all(notificationPromises)
}

function paramsMatch({params={}, conditions={}}) {
  if (!conditions) return true
  const allMatch = Object.entries(conditions).every(([key, expected]) => {
    const val = params[key]
    let matched = false
    if (val === expected) matched = true
    else if (String(val).includes(String(expected))) matched = true
    console.log("COMPARE", key, val, expected, matched)
    return matched
  })
  return allMatch
}

exports.slackNotifierRules = {
  applyRules,
}
