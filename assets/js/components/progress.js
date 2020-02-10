class Progress {
  constructor(root) {
    this.root = root
    this.successRoot = root.querySelector('.progress-success')

    this.percentageElement = this.successRoot.querySelector('.percentage')
    this.stageElement = this.successRoot.querySelector('.stage')
    this.dotsElement = this.successRoot.querySelector('.loading-dots')
    this.timeoutScheduled = false
  }

  setup() {
    this.dotsElement.textContent = '...'
    this.scheduleDotsUpdating()
  }

  hide() {
    this.root.classList.add('hide')
  }

  show() {
    this.root.classList.remove('hide')
  }

  hideProgress() {
    this.percentageElement.classList.add('hide')
  }

  showProgress() {
    this.percentageElement.classList.remove('hide')
  }

  updateProgress(percentage) {
    this.percentageElement.textContent = percentage
    this.show()
  }

  updateStage(stage) {
    this.stageElement.textContent = stage
    this.show()
  }

  scheduleDotsUpdating() {
    if (this.timeoutScheduled) return
    this.timeoutScheduled = true
    if (this.dotsElement.textContent.length >= 3) {
      this.dotsElement.textContent = ''
    } else {
      this.dotsElement.textContent += '.'
    }
    setTimeout(() => {
      this.scheduleDotsUpdating()
    }, 1000)
  }
}

export default Progress
