class Progress {
  constructor(root) {
    this.root = root
    this.percentageElement = root.querySelector('.percentage')
    this.stageElement = root.querySelector('.stage')
    this.dotsElement = root.querySelector('.loading-dots')
  }

  setup() {
    this.dotsElement.textContent = '...'
    this.scheduleDotsUpdating()
    this.root.classList.remove('hide')
  }

  hide() {
    this.root.classList.add('hide')
  }

  updateProgress(percentage) {
    this.percentageElement.textContent = percentage
  }

  updateStage(stage) {
    this.stageElement.textContent = stage
  }

  scheduleDotsUpdating() {
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
