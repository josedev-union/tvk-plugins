# Simulations API Documentation - Ortho
## API Overview
This document describes how Simulations API's Ortho feature works.

To execute a ortho simulation the API have two routes:

* `POST /api/simulations/ortho`
* `PATCH /api/simulations/$SIMULATION_ID`

This request is meant to be done via back-end, not directly by the front-end.

## Authentication
API requests are authenticated by a bear token in the request header.
To generate a bear token, client id and client secret.
```sh
CLIENT_ID=<REPLACE_WITH_YOUR_CLIENT_ID>
CLIENT_SECRET=<REPLACE_WITH_YOUR_CLIENT_SECRET>
# Just set paramsHashed as none which is reserved for public endpoints.
CLAIMS_JSON="{\"clientId\": \"$CLIENT_ID\", \"paramsHashed\": \"none\"}"
ENCODED_CLAIMS=$(echo -n $CLAIMS_JSON|base64 -w0)
CLAIMS_SIGNATURE=$(echo -n $CLIENT_SECRET | openssl sha256 -hmac "$CLAIMS_JSON")
TOKEN="$ENCODED_CLAIMS:$CLAIMS_SIGNATURE"
```

## Executing a Simulation
### Request Structure
- POST /api/simulations/ortho
- Headers
  - `Content-Type: multipart/form-data`
  - `Authorization: Bearer $TOKEN`
- Body _(format: multipart/form-data)_
  - `imgPhoto: $PHOTO_IMAGE`
	- `data: $DATA_JSON` (Optional)


### Illustrating with cURL
```
curl -XPOST \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer $TOKEN" \
	-F "imgPhoto=@./face.jpg" \
	-F 'data={"captureType": "camera", "externalCustomerId": "customer-id"}' \
	"https://api.e91efc7.dentrino.ai/api/simulations/ortho"
```

## Updating Simulation Metadata
### Request Structure (as multipart/form-data)
- PATCH /api/simulations/$SIMULATION_ID?clientId=$CLIENT_ID
- Headers
  - `Content-Type: multipart/form-data`
  - `Authorization: Bearer $TOKEN`
- Body _(format: multipart/form-data)_
	- `data: $DATA_JSON` (Optional)

### Illustrating with cURL
```
curl -XPATCH \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer $TOKEN" \
	-F 'data={"feedbackScore": 2.75}' \
	"https://api.e91efc7.dentrino.ai/api/simulations/<SIMULATION ID>"

# This route can be called with json as well
curl -XPATCH \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"feedbackScore": 2.75}' \
  "https://api.e91efc7.dentrino.ai/api/simulations/<SIMULATION ID>?clientId=ODMzNjkxOTc4NTE5Mk9tZT4rYVJ2_testext"
```

## Metadata
All metadata fields are optional and can be submitted on `POST` or `PATCH`. The current metadata available are:
* `feedbackScore`: Float between 0.0 ~ 5.0 representing the score submitted by the customer.
* `externalCustomerId`: String representing the customer id.
* `captureType`: String "file" or "camera" representing how the image was captured.

## Response Structure
### Success

```
// Status Code: 2xx
{
  "success": true,
  "simulation": {
    "id": "ODMzMzcwNDI4MzE3MkR2Q05ZMmpL",
    "createdAt": "2022-10-20T19:55:16.828Z",
    "metadata": {
      "captureType": "camera",
      "externalCustomerId": "my-custom-id"
    },

		// "storage" is only available on POST
    "storage": {
      "beforeUrl": "https://dentrino.../before.jpg",
      "resultUrl": "https://dentrino.../result.jpg"
    }
  }
}
```

### Error

```
// Status Code: 4xx / 5xx
{
  "success": false,
  "error": {
    "id": "PUBLIC ID",
		"subtype": "ERROR SUB TYPE", // optional
    "message": "PUBLIC MESSAGE",
    "debug": {
      "__ALERT__": "THIS DEBUG OBJECT WILL NOT EXIST IN PRODUCTION",
      "debugId": "INTERNAL ID FOR DEBUGGING",
      "message": "MESSAGE FOR DEBBUGGING"
    }
  }
}
```
