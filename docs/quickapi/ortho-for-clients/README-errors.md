# Simulations API Errors Documentation
This document will give an overview of the main errors the API can respond.

## Authorization Errors
Any problem with the authorization token, will respond with:

```
HTTP CODE: 403
{
  "success": false,
  "error": {
    "id": "not-authorized",
    "message": "Not Authorized",
  }
}
```

That includes missing token, invalid token, recaptcha check, origin check, no access to route, revoked token, and others.

## Rate Limiting
In case the server receives an excessive amount of requests, it'll respond some of them with:

```
HTTP CODE: 429
{
  "success": false,
  "error": {
    "id": "too-many-requests",
    "subtype": "rate-limit",
    "message": "Too many requests",
  }
}
```

## Errors on body data
On errors in the body data it'l respond with `422`, the JSON will have `id: "bad-params"`, and the `subtype`/`message` will vary based on the validation error.

### Sample

```
HTTP CODE: 422
{
  "success": false,
  "error": {
    "id": "bad-params",
    "subtype": "body-validation-error",
    "message": "feedbackScore must be between 0 and 5 (received 9.5)",
  }
}
```

### List of validation errors

```
# Didn't receive photo
Subtype: "no-photo"
Message: "imgPhoto is mandatory"

# Image type isn't supported (Uploading a .txt for example)
Subtype: "unknown-format"
Message: "imgPhoto format is unknown"

# Image size is above the allowed size
Subtype: "size-limit-exceeded"
Message: "imgPhoto is too big"

# CaptureType is invalid
Subtype: "body-validation-error"
Message: "captureType must be one of the options: file, camera (received invalid-capture-type)"

# feedbackScore is invalid
Subtype: "body-validation-error"
Message: "feedbackScore must be between 0 and 5 (received 9.5)"
```

## Simulation Errors
```
# Face wasn't detected
{
	id: 'simulation-error',
	subtype: 'no-face',
	message: "Couldn't detect face"
}

# Other errors
{
	id: 'simulation-error',
	message: 'Error when executing simulation'
}
```
