const functions = require("firebase-functions");
const {initializeApp} = require('firebase-admin/app')

initializeApp()

exports.simulations_api = {
  ...require('./src/triggers/slackNotification'),
}
