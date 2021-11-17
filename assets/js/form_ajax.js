class FormAjax {
  static submit(form, headers={}) {
    const data = new FormData()
    form.querySelectorAll("input").forEach((input) => {
      if (input.files) {
        data[input.name] = input.files[0]
      } else {
        data[input.name] = input.value
      }
    })
    headers['Content-Type'] = 'Content-Type: multipart/form-data'
    return fetch(form.action, {
      method: form.method,
      headers: headers,
      body: data
    })
  }
}
export default FormAjax
