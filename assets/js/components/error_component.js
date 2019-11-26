class ErrorComponent {
  constructor(root) {
    this.root = root
    this.messageElement = root.querySelector('.error-message')
  }

  hide() {
    this.root.classList.add('hide')
  }

  show(msg) {
    this.messageElement.textContent = msg
    this.root.classList.remove('hide')
  }
}

export default ErrorComponent
