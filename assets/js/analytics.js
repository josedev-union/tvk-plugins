import {fbase} from './firebase_loader'

export const dentrinoAnalytics = new (class {
  constructor() {
    this.loadStartTime = null
  }

  reportPageLoadStart() {
    console.log('Analytics: reportPageLoadStart')
    this.loadStartTime = new Date()
    //fbase.logEvent('page_view', {
    //  page_location: location.href,
    //  page_title: document.title,
    //})
  }

  reportPageLoadEnd() {
    console.log('Analytics: reportPageLoadEnd')
    fbase.logEvent('page_loaded', {
      page_location: location.href,
      page_title: document.title,
      load_time_secs: Math.round((new Date().getTime() - this.loadStartTime.getTime())/1000)
    })
  }

  reportSimulationSubmitted(photoSizeBytes, photoType) {
    const photoSizeMb = Math.round(photoSizeBytes / 1024 / 1024)
    console.log('Analytics: reportSimulationSubmitted')
    sessionStorage['tasty_simulation_start'] = new Date().getTime()
    fbase.logEvent('simulation_submitted', {
      photo_size_mb: photoSizeMb,
      photo_type: photoType,
    })
  }

  reportSimulationUploadFinished() {
    console.log('Analytics: reportSimulationUploadFinished')
    fbase.logEvent('photo_upload_finished', {
      duration_secs: Math.round((new Date().getTime() - parseFloat(sessionStorage['tasty_simulation_start']))/1000)
    })
  }

  reportSimulationSuccessful() {
    console.log('Analytics: reportSimulationSuccessful')
    fbase.logEvent('simulation_successful', {
      duration_secs: Math.round((new Date().getTime() - parseFloat(sessionStorage['tasty_simulation_start']))/1000)
    })
  }

  reportFrontendValidationError(errorCode) {
    console.log('Analytics: reportFrontendValidationError')
    fbase.logEvent('validation_error_frontend', {
      error_code: errorCode,
    })
  }

  reportBackendValidationError(errorCode) {
    console.log('Analytics: reportBackendValidationError')
    fbase.logEvent('validation_error_backend', {
      error_code: errorCode,
      duration_secs: Math.round((new Date().getTime() - parseFloat(sessionStorage['tasty_simulation_start']))/1000),
    })
  }

  reportSimulationFailed(errorCode) {
    console.log('Analytics: reportSimulationFailed')
    fbase.logEvent('simulation_failed', {
      error_code: errorCode,
      duration_secs: Math.round((new Date().getTime() - parseFloat(sessionStorage['tasty_simulation_start']))/1000),
    })
    this.reportBackendValidationError(errorCode)
  }

  reportClickStartOver() {
    console.log('Analytics: reportClickStartOver')
    fbase.logEvent('click_start_over')
  }

  reportClickDownloadOriginal() {
    console.log('Analytics: reportClickDownloadOriginal')
    fbase.logEvent('click_download_original')
  }

  reportClickDownloadResult() {
    console.log('Analytics: reportClickDownloadResult')
    fbase.logEvent('click_download_result')
  }
})()

dentrinoAnalytics.reportPageLoadStart()
window.addEventListener('load', () => dentrinoAnalytics.reportPageLoadEnd())
window.dentrinoAnalytics = dentrinoAnalytics
