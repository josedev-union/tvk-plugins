import jQuery from '../vendor/js/jquery-3.6.0.min.js'
import imagesLoaded from '../vendor/js/imagesloaded.v4.1.4.js'
import '../vendor/js/twentytwenty/jquery.twentytwenty.js'

import {i18n} from '../../src/shared/i18n'
import {envShared} from '../../src/shared/envShared'
import {otp} from '../../src/shared/otp'
import 'whatwg-fetch'

(function($) {
  $(function() {
    const dentrinoAnalytics = window.dentrinoAnalytics
    const $htmlbody = $('body,html')
    const $form = $('form.upload-form')
    const $photo = $form.find('[name="photo"]')
    const $secret = $form.find('[name="secret"]')
    const $recaptchaToken = $form.find('[name="recaptchaToken"]')
    const $errorContainer = $('.error')
    const $errorMessage = $errorContainer.find('.error-message')
    const $noSimulationContainer = $('.no-simulation-container')
    const $simulationContainer = $('.simulation-container')
    const $imagesContainer = $simulationContainer.find('.simulation-images')
    const $uploadFeedback = $('.upload-feedback')
    const $errorNotification = $('#error-notification')
    const $simulationLoadingPlaceholder = $('.loading-simulation-placeholder')

    function setupErrorNotification() {
      const errorMessage = $errorMessage.text().trim()
      const errorCode = $errorMessage.data('error-code').trim()
      const isSimulationError = $errorMessage.data('is-simulation-error')
      if (errorMessage) {
        errorAppear({errorMessage, errorCode, isSimulationError, backend: true})
      }
    }
    setupErrorNotification()

    function setupScrollOnPageStart() {
      function scrollToUpload() {
        if (location.hash === '#upload') {
          $('html, body').scrollTop($('#upload').offset().top)
        }
      }
      scrollToUpload()

      $(window).on('load', () => setTimeout(scrollToUpload, 10))
      $('html, body').on('load', () => setTimeout(scrollToUpload, 10))
    }
    setupScrollOnPageStart()

    function reportSuccessfulSimulation() {
      if ($simulationContainer.length && $simulationContainer.is(':visible')) {
        dentrinoAnalytics.reportSimulationSuccessful()
      }
    }
    reportSuccessfulSimulation()

    $('.link-force-reload').on('click', function() {
      linkForceReload({anchor: this})
      event.preventDefault()
    })

    $('.link-start-over').on('click contextmenu', function() {
      event.preventDefault()
      dentrinoAnalytics.reportClickStartOver()
      setTimeout(() => {
        linkForceReload({anchor: this})
      }, 350)
    })

    $('.link-download-original').on('click contextmenu', function() {
      dentrinoAnalytics.reportClickDownloadOriginal()
    })

    $('.link-download-result').on('click contextmenu', function() {
      dentrinoAnalytics.reportClickDownloadResult()
    })

    setupTwentyTwenty($("#container1"))
    setupTwentyTwenty($imagesContainer, () => {
      $simulationLoadingPlaceholder.addClass('is-hidden')
    })

    $photo.on('change', (event) => {
      const file = getUploadedFile()
      dentrinoAnalytics.reportSimulationSubmitted(file.size, file.type)
      $errorContainer.addClass('hidden')
      showLoading()
      let {errorMessage, errorCode} = validate()
      if (errorCode) {
        showErrorDelayed({errorMessage, errorCode})
        return
      }
      window.grecaptcha.execute(
        envShared.instSimRecaptchaClientKey,
        {action: 'simulate'},
      ).then((token) => {
        submit({recaptchaToken: token})
      }).catch(() => {
        const errorCode = 'errors:invalid-recaptcha'
        const errorMessage = i18n(errorCode)
        showErrorDelayed({errorMessage, errorCode})
      })
    })

    function submit({recaptchaToken=null}) {
      fetch('epoch')
      .then(response => response.json())
      .then(data => {
        const epoch = data.epoch
        const token = otp.create(epoch, envShared.instSimSecretToken)
        $secret.val(token)
        $recaptchaToken.val(recaptchaToken)

        $form.submit()
      })
    }

    function validate() {
      const file = getUploadedFile()
      let errorMessage = null
      let errorCode = null
      if (!file) {
        errorCode = 'errors:upload:no-file'
        errorMessage = i18n(errorCode)
      } else if (!file.name.match(/\.(jpe?g|png)$/i)) {
        errorCode = 'errors:upload:wrong-image-format'
        errorMessage = i18n(errorCode)
      } else if (file.size > envShared.maxUploadSizeBytes) {
        errorCode = 'errors:upload:image-size-limit'
        errorMessage = i18n(errorCode, {maxSize: envShared.maxUploadSizeMb})
      }
      return {errorCode, errorMessage}
    }

    function getUploadedFile() {
      return $photo.prop('files')[0]
    }

    function showErrorDelayed(errorData={}) {
      const {errorMessage, errorCode} = errorData
      showLoading()
      $errorContainer.addClass('hidden')
      $noSimulationContainer.removeClass('hidden')
      $noSimulationContainer.addClass('is-hidden-mobile')
      $simulationContainer.addClass('hidden')
      setTimeout(() => {
        errorAppear(errorData)
      }, 350)
    }

    let hideTimeout
    function errorAppear({errorMessage, errorCode, backend=false, isSimulationError=false}) {
      if (backend) {
        console.log('BackendReport', errorCode)
        if (isSimulationError) {
          dentrinoAnalytics.reportSimulationFailed(errorCode)
        } else {
          dentrinoAnalytics.reportBackendValidationError(errorCode)
        }
      } else {
        console.log('FrontendReport', errorCode)
        dentrinoAnalytics.reportFrontendValidationError(errorCode)
      }
      hideLoading()
      $errorContainer.removeClass('hidden')
      $noSimulationContainer.addClass('is-hidden-mobile')
      $errorMessage.text(errorMessage)
      $errorNotification.find('span').text(errorMessage)
      $errorNotification.fadeIn()
      $errorNotification.removeClass('hidden')
      clearTimeout(hideTimeout)
      hideTimeout = setTimeout(() => $errorNotification.fadeOut(), 2500)
      //imagesContainer.classList.add('hidden')
    }

    function showLoading() {
      $uploadFeedback.removeClass('hidden')
      lockScrollOnTop()
    }

    function hideLoading() {
      $uploadFeedback.addClass('hidden')
      unlockScroll()
    }

    function lockScrollOnTop() {
      $htmlbody.addClass('stop-scrolling')
      window.scrollTo(0, 0)
      $htmlbody.bind('touchmove.lockscroll', function(e){e.preventDefault()})
      $htmlbody.bind('scroll.lockscroll', function(e){e.preventDefault()})
    }

    function setupTwentyTwenty($container, onLoad) {
      const callback = function() {
        if (onLoad) onLoad()
        $container.twentytwenty({
          no_overlay: true,
        })
      }
      imagesLoaded($container).on('always', callback)
      setTimeout(callback, 5000)
    }

    function unlockScroll() {
      $htmlbody.removeClass('stop-scrolling')
      $htmlbody.unbind('touchmove.lockscroll')
      $htmlbody.unbind('scroll.lockscroll')
    }

    function linkForceReload({anchor}) {
      const originalHref = location.pathname
      const href = $(anchor).attr('href')
      let [url, hash] = href.split('#')
      let originalUrl = originalHref.split('#')[0] || '/'
      if (!url) url = '/'
      location.hash = hash
      location.href = href
      originalUrl = originalUrl.replace(/\/$/, '').toLowerCase()
      url = url.replace(/\/$/, '').toLowerCase()
      if (originalUrl === url) {
        location.reload()
      }
    }
  })
})(jQuery)
