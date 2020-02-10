import "regenerator-runtime/runtime"
import Progress from './components/progress.js'
import ProcessingForm from './components/processing_form.js'
import ErrorComponent from './components/error_component.js'
import i18n from '../../src/shared/lang'

{
  const progressElement = document.querySelector('#miroweb-component .progress-component')
  const progress = new Progress(progressElement)

  const formElement = document.querySelector('#miroweb-component .processing-form')
  const processingForm = new ProcessingForm(formElement)
  processingForm.setup()

  const errorContainerElement = document.querySelector('#miroweb-component .error-container')
  const errorComponent = new ErrorComponent(errorContainerElement)

  processingForm.onstart = (response) => {
    document.querySelectorAll('img').forEach(e => e.remove())
    progress.setup()
  }

  processingForm.oncomplete = (response) => {
    const presignedDownloadOriginal = response.presignedDownloadOriginal
    const presignedDownloadAfter = response.presignedDownloadAfter

    progress.hide()
    var imgoriginal = document.createElement('img')
    imgoriginal.height = 240
    imgoriginal.src = presignedDownloadOriginal
    var imgafter = document.createElement('img')
    imgafter.height = 240
    imgafter.src = presignedDownloadAfter

    formElement.after(imgoriginal)
    imgoriginal.after(imgafter)
  }

  processingForm.onprogress = (stage, percentage) => {
    progress.updateStage(stage)
    progress.updateProgress(percentage)
    errorComponent.hide()
  }

  processingForm.onimagepolling = (retriesCount, maxRetries) => {
    progress.updateStage(i18n('progress:polling-fallback', {count: retriesCount, max: maxRetries}))
    progress.hideProgress()
  }

  processingForm.onerror = (error) => {
    console.error("Error", error)
    progress.hide()
    if (error.error === 'validation-error') {
      errorComponent.show(error.data)
    } else if (error.error === 'solicitation-denied') {
      errorComponent.show(i18n('errors:simulations-limit'))
    } else if (error.error === 'websockets-bad-close') {
      console.error(`Unexpected closed websockets connection (code: ${error.data.code}). More information on: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes`)
    } else {
      errorComponent.show(i18n('errors:unknown-processing-error'))
    }
  }
}
