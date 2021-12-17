import {fbase} from './firebase_loader'

export const dentrinoAnalytics = new (class {
  constructor() {
    this.loadStartTime = null
  }

  reportPageLoadStart() {
    try {
      //console.log('Analytics: reportPageLoadStart')
      this.loadStartTime = new Date()
      //fbase.logEvent('page_view', {
      //  page_location: location.href,
      //  page_title: document.title,
      //})
    } catch (err) {
      console.error("Couldn't report page load start")
      console.error(err)
    }
  }

  reportPageLoadEnd() {
    const evtName = 'page_loaded'
    try {
      //console.log('Analytics: reportPageLoadEnd')
      fbase.logEvent(evtName, {
        page_location: location.href,
        page_title: document.title,
        load_time_secs: Math.round((new Date().getTime() - this.loadStartTime.getTime())/1000)
      })
    } catch (err) {
      console.error(`Couldn't report pageLoadEnd ${evtName}`)
      console.error(err)
    }
  }

  reportSimulationSubmitted(photoSizeBytes, photoType) {
    const evtName = 'simulation_submitted'
    try {
      const photoSizeMb = Math.round(photoSizeBytes / 1024 / 1024)
      //console.log('Analytics: reportSimulationSubmitted')
      sessionStorage['tasty_simulation_start'] = new Date().getTime()
      fbase.logEvent(evtName, {
        photo_size_mb: photoSizeMb,
        photo_type: photoType,
      })
    } catch (err) {
      console.error(`Couldn't report pageLoadEnd ${evtName}`)
      console.error(err)
    }
  }

  reportSimulationUploadFinished() {
    const evtName = 'photo_upload_finished'
    try {
      //console.log('Analytics: reportSimulationUploadFinished')
      fbase.logEvent(evtName, {
        duration_secs: Math.round((new Date().getTime() - parseFloat(sessionStorage['tasty_simulation_start']))/1000)
      })
    } catch (err) {
      console.error(`Couldn't report pageLoadEnd ${evtName}`)
      console.error(err)
    }
  }

  reportSimulationSuccessful() {
    const evtName = 'simulation_successful'
    try {
      //console.log('Analytics: reportSimulationSuccessful')
      fbase.logEvent(evtName, {
        duration_secs: Math.round((new Date().getTime() - parseFloat(sessionStorage['tasty_simulation_start']))/1000)
      })
    } catch (err) {
      console.error(`Couldn't report pageLoadEnd ${evtName}`)
      console.error(err)
    }
  }

  reportFrontendValidationError(errorCode) {
    const evtName = 'error_frontend_validation'
    try {
      //console.log('Analytics: reportFrontendValidationError')
      fbase.logEvent(evtName, {
        error_code: errorCode,
      })
    } catch (err) {
      console.error(`Couldn't report pageLoadEnd ${evtName}`)
      console.error(err)
    }
  }

  reportBackendValidationError(errorCode) {
    const evtName = 'error_backend'
    try {
      //console.log('Analytics: reportBackendValidationError')
      fbase.logEvent(evtName, {
        error_code: errorCode,
        duration_secs: Math.round((new Date().getTime() - parseFloat(sessionStorage['tasty_simulation_start']))/1000),
      })
    } catch (err) {
      console.error(`Couldn't report pageLoadEnd ${evtName}`)
      console.error(err)
    }
  }

  reportSimulationFailed(errorCode) {
    const evtName = 'simulation_failed'
    try {
      //console.log('Analytics: reportSimulationFailed')
      fbase.logEvent(evtName, {
        error_code: errorCode,
        duration_secs: Math.round((new Date().getTime() - parseFloat(sessionStorage['tasty_simulation_start']))/1000),
      })
      this.reportBackendValidationError(errorCode)
    } catch (err) {
      console.error(`Couldn't report pageLoadEnd ${evtName}`)
      console.error(err)
    }
  }

  reportClickStartOver() {
    const evtName = 'click_start_over'
    try {
      //console.log('Analytics: reportClickStartOver')
      fbase.logEvent(evtName)
    } catch (err) {
      console.error(`Couldn't report pageLoadEnd ${evtName}`)
      console.error(err)
    }
  }

  reportClickDownloadOriginal() {
    const evtName = 'click_download_original'
    try {
      //console.log('Analytics: reportClickDownloadOriginal')
      fbase.logEvent(evtName)
    } catch (err) {
      console.error(`Couldn't report pageLoadEnd ${evtName}`)
      console.error(err)
    }
  }

  reportClickDownloadResult() {
    const evtName = 'click_download_result'
    try {
      //console.log('Analytics: reportClickDownloadResult')
      fbase.logEvent(evtName)
    } catch (err) {
      console.error(`Couldn't report pageLoadEnd ${evtName}`)
      console.error(err)
    }
  }
})()

dentrinoAnalytics.reportPageLoadStart()
window.addEventListener('load', () => dentrinoAnalytics.reportPageLoadEnd())
window.dentrinoAnalytics = dentrinoAnalytics
