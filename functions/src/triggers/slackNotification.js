// simulations_api.slackNotify.watch_staging({bucket: 'dentrino-staging.appspot.com', name: '.api-simulations/success/ODMzNjM5MjEyNTI5NStDQVhQQVN7SIM_ODMzNjkxMTQ4NTY2OXo+bzk2MUdm_default_testCLI/info.json', contentType: 'image/jpeg'})
// simulations_api.slackNotify.watch_staging({bucket: 'dentrino-staging.appspot.com', name: '.api-simulations/success/ODMzNjM5NDU0Mzk0N1pMPVJPI3BcSIM_ODMzNjkxOTc4NTE5Mk9tZT4rYVJ2_testextCLI/info.json', contentType: 'image/jpeg'})
// simulations_api.slackNotify.watch_staging({bucket: 'dentrino-staging.appspot.com', name: '.api-simulations/fail/ODMzNjM5MjA2MzM2MSwhPjN7NG5GSIM_ODMzNjkxMTQ4NTY2OXo+bzk2MUdm_default_testCLI/info.json', contentType: 'image/jpeg'})
// GOOGLE_APPLICATION_CREDENTIALS="../keys/dentrino-staging.json" npm run shell

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
const SLACK_CHANNEL_STAG_GENERAL = 'C02DY7HHE8K'
const SLACK_CHANNEL_PROD_GENERAL = 'C02EMRWB256'
const SLACK_NOTIFIERS = [
  {
    when: {bucket: 'staging', clientId: 'testext'},
    notifyToChannel: SLACK_CHANNEL_STAG_ORTHO_PILOT,
  },
  {
    when: {bucket: 'staging'},
    notifyToChannel: SLACK_CHANNEL_STAG_GENERAL,
    except: {clientId: 'testext'},
  },
  {
    when: {bucket: 'production'},
    notifyToChannel: SLACK_CHANNEL_PROD_GENERAL,
  },
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
