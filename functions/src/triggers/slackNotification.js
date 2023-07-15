const functions = require('firebase-functions')
const { WebClient: SlackWeb } = require('@slack/web-api')
const {SlackSimulationsClient} = require('../helpers/SlackSimulationsClient')
const {SimulationApiResults} = require('../helpers/SimulationApiResults')
const {slackNotifierRules} = require('../helpers/slackNotifierRules')
const {defineFunctionsToWatchBuckets} = require('../helpers/functions')

// ------------------------------------
// Constants
// ------------------------------------
const SLACK_CHANNEL_STAG_ORTHO_PILOT = 'C042YDEF0BV'
const SLACK_CHANNEL_STAG_ON_DEMAND = 'C02DY7HHE8K'
const SLACK_CHANNEL_PROD_ON_DEMAND = 'C02EMRWB256'
// TODO(joseb): Add op verb in when to distinguish the match result between equal and include
//              i.e. when: [{key: bucket, value: staging.dentrio.ai, op: equal}, {key: clientId, value: testtxt, op: include}]
const SLACK_NOTIFIERS = [
  {
    when: {bucket: 'b-dentrino-staging', clientId: 'testext'},
    notifyToChannel: SLACK_CHANNEL_STAG_ORTHO_PILOT,
  },

  // TODO: Change it to work with Dentrino On Demand results
  // {
  //   when: {bucket: 'staging', onDemandResults: true},
  //   notifyToChannel: SLACK_CHANNEL_STAG_ON_DEMAND,
  // },
  // {
  //   when: {bucket: 'production', onDemandResults: true},
  //   notifyToChannel: SLACK_CHANNEL_PROD_ON_DEMAND,
  // },
]

// ------------------------------------
// Initialization
// ------------------------------------
const env = functions.config()
const apiCfg = env.simulations_api
const isLocal = !apiCfg.non_local
const slackCfg = apiCfg.slack


// Initialize Slack Client
const slackCli = new SlackSimulationsClient({
  slack: new SlackWeb(slackCfg.token),
})

// ------------------------------------
// Functions
// ------------------------------------

exports.slackNotify = defineFunctionsToWatchBuckets({
  watch: apiCfg.buckets,
  memory: '512MB',
  onFinalize: slackNotifyResults,
})

async function slackNotifyResults({bucket, name: filepath, contentType}) {
  if (!SimulationApiResults.isInfo(filepath)) {
    console.log(`Ignore: This function only runs on info.json upload: ${bucket}/${filepath}`)
    return
  }
  const apiResults = SimulationApiResults.fromPath(filepath, {bucket})
  if (!apiResults) {
    console.log(`Ignore: File isn't a simulation result: ${bucket}/${filepath}`)
    return
  }
  await apiResults.waitIsComplete({retries: 5})
  if (!apiResults.isComplete) {
    console.log(`Ignore: Simulation results weren't fully uploaded: ${bucket}/${filepath}`)
    return
  }
  await apiResults.getInfo()

  const rulesParams = {
    bucket,
    contentType,
    ...apiResults,
    ...apiResults.info,
  }

  await slackNotifierRules.applyRules({
    rules: SLACK_NOTIFIERS,
    params: rulesParams,
    onMatch: async ({channel}) => {
      await slackCli.notifyResult({apiResults, channel, isLocal})
    },
  })
}
