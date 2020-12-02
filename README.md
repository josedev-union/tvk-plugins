# Dentrino Web
Web user-friendly interface to the smile enhancement image service named Dentrino Smiles.

**Embeddable Web Component**: Code snippet that dentists can embed on their page to allow their potential clients to enhance a personal smile photo. (For now is the only existent component)

## Structure
```bash
.
├── Makefile          # Tasks automating docker and kubernetes operations
├── Dockerfile        # Dockerfile to run the application
├── Dockerfile.base   # Dockerfile with dependencies pre-installed to make it quicker to build new images
├── .env              # Env variables used by the project (development only)
├── .env.prod         # Env variables used by production tasks
├── package.json
├── package-lock.json
├── webpack.config.js          # Config to compile Front-End assets (Babel, SASS, minify, uglify, etc)
├── webpack.config.server.js   # Config to compile Back-end javascripts (with Babel)
├── README.md
├── assets        # Front-end assets
│   ├── css
│   └── js
├── public        # Public folder
│   └── assets    # Compiled assets (created by webpack)
│       ├── css
│       └── js
├── src           # Back-end javascript files
│   ├── app.js
│   ├── boot.js
│   ├── config.js
│   ├── models    # Models
│   ├── routes    # Routes / Controllers
│   └── views     # Handlebars templates
└── dist                 # Folder with server compiled to be deployed (created by webpack)
    ├── public
    └── src
        ├── start.js     # All back-end JS compiled
        └── views
```

## Preparing Environment

1. Install nodejs 12.8.0 (I suggest using [asdf](https://github.com/asdf-vm/asdf) / [asdf-nodejs](https://github.com/asdf-vm/asdf-nodejs))
2. Run `npm install`
3. Configure your `.env`
4. Start the server `npm run dev-start`

## Configuring .env file
The application loads the `.env` file through the `dotenv` lib. So you need to configure the following env vars:

```bash
# Sendgrid
SENDGRID_API_KEY=<SENDGRID KEY (same as production or staging)>

# Application
DENTRINO_REDIS_PUBSUB_DB=1
DENTRINO_GCLOUD_BUCKET=dentrino-dev-us
DENTRINO_RATE_LIMIT_DISABLED=true
DENTRINO_MAILER_DISABLED=true

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=./keys/dentrino-staging.json
DENTRINO_API_SECRET_TOKEN=ff5da5e257233200e1c0a902bbce0c3f
```


## Development Tasks

```bash
$ npm run dev-start # Start server with nodemon
$ npm run dev-up    # Compile assets and start server
$ npm run dev-build # Compile assets
$ npm run db-up     # Start local database
$ npm run seed      # Seed db with a default access point (access it on /d/dentrino)
$ npm test          # Run the tests (Need to start local database before)
```


## Production Tasks

```bash
$ npm run build          # Build assets for production
$ npm run build-backend  # Build front-end and back-end assets for production
$ npm start              # Start the server (once the backend was built)
```

## Deploy
Deploy task will build the docker image using the current commit-hash as version and deploy it to kubernetes pod.

```bash
$ make deploy                        # Deploy to staging
$ APP_ENV=production make deploy     # Deploy to production
$ kubectl -nproduction rollout status deploy dentrino-web # Follow deploy status
```

## Rollback
Rollback is basically deploying an old image from dockerhub.

```bash
# 1. Look for the image you want to rollback to on: https://cloud.docker.com/u/tastytech/repository/docker/tastytech/miroweb/tags

# 2. Rollback to that image
$ COMMIT_IMAGE=gcr.io/dentrino-production/dentrino-web:<TAG-TO-ROLLBACK-TO> APP_ENV=production make rollback

# Wait the rollback to finish
$ kubectl -nproduction rollout status deploy dentrino-web
```

## Base management
Before pushing new base versions, change the label version on `Dockerfile.base`.

```bash
$ VERSION=x.x.x make build_base   # Build the new base
$ VERSION=x.x.x make push_base    # Push the new base
```

## Add New Access Points
To add new access points run:

```bash
# Staging
$ npm run new-access-point

# Production (Need to setup .env.prod)
$ npm run prod-new-access-point
```

It will create a template access point on firebase, you have to edit it directly on [Firebase Console (/mirosmiles-us-staging/miroweb\_data/dentist\_access\_points/)](https://console.firebase.google.com/u/0/project/mirosmiles-us-staging/database/mirosmiles-us-staging/data~2Fmiroweb_data~2Fdentist_access_points).

## Deleting Access Points
To delete an access point run:

```bash
# Staging
$ npm run del-access-point <ACCESS_POINT_ID>

# Production (Need to setup .env.prod)
$ npm run prod-del-access-point <ACCESS_POINT_ID>
```
It will delete this specific access point from firebase.

## Dentist Access Point Structure
```
// Editable
hosts: List of hosts that will be allowed to access the form page.
directPage.slug: Name of the access point slug to access it directly on https://<miroweb-host.com>/d/<slug>.
directPage.disabled: If the page is disabled, the user will see a coming soon page.

// Read-only
id: Access Point id
secret: Secret key to be used on internal API communication.
userId: The related dentist id on miro-smiles database
createdAt: Creation date
updatedAt: Last update date
```

## API: Editor Workflow
### Get access point information
If the client has only the user id it'll need to request the API to get the access point data.
```
# Request
GET /api/access-points/for-user/<USER-ID>

# Response
{"id": "id123", "secret": "secret123"}
```

### Generate the signature token
Before the client request the image processing it'll generate a signature token with the following method:
```
# Recipe
str = accessPointId + ':' + deviceId       # e.g. "id123:deviceid123"
pass = accessPointSecret + ':' + apiSecret # e.g. "accesssecret123:apisecret123"

token = sha256_hmac(str, pass) # e.g. "7154d5e5d45dfed3c519fdc2c52fc5d31797ee85ec796a56adfd9fedd4d3319f"
```

Bash call to generate the signature:
```
$ echo -n "id123:deviceid123" | openssl dgst -sha256 -hex -hmac "accesssecret123:apisecret123"
```

### Request the image processing
```
# Request
POST /api/access-points/<ACCESS-POINT-ID>/image-processing-solicitations
Authorization: Bearer <signature-token>
X-DEVICE-ID: <device-id>   # Any string the client wants to use to identify the device

# Response
{
    "presignedUpload": "https://storage.googleapis.com/ODM5MzE0OTQ0MDY/smile.jpg?...",
    "presignedDownloadOriginal": "https://storage.googleapis.com/ODM5MzE0OTQ0MDY/smile.jpg?...",
    "presignedDownloadAfter": "https://storage.googleapis.com/ODM5MzE0OTQ0MDY/smile_after.jpg?...",
    "solicitationId": "sol-id123",
    "bucket": "dentrino-us-staging"
}
```

### Track progress through websockets
```
Connect WebSocket: /ws/image-processing-solicitations/<SOLICITATION-ID>
# Events Sample:
=> {"event": "processing_step", "step" : "Step 0 Name", "inx" : 0, "maxInx" : 2}
=> {"event": "processing_step", "step" : "Step 1 Name", "inx" : 1, "maxInx" : 2}
=> {"event": "processing_step", "step" : "Step 2 Name", "inx" : 2, "maxInx" : 2}
=> {"event": "finished"}

# Error Event Sample
=> {"event": "error", "error_msg": "Error Message"}
```

### Testing it all through bash
```
# Get access point data
$ curl -XGET http://35.188.12.163/api/access-points/for-user/4NFfruugPxYcPpuHEz8rNYAVK7y2
# {
#   "id": "ODM5NDk2MjU4NDExNXdOLGczTnRG",
#   "secret": "NWIzMmMyOTY0MzY5MDc1ZGEwNTY2NTUyNmFlNDYxZWEyM2QxY2Q0YjYxZWIzMzI4YjJkMmQzNjlmNjg4YzEyOQ"
# }


# Generates the signature
$ echo -n "ODM5NDk2MjU4NDExNXdOLGczTnRG:d5719fa75c166d1d7344b60e81cf45a4eb212381" | openssl dgst -sha256 -hex -hmac "NWIzMmMyOTY0MzY5MDc1ZGEwNTY2NTUyNmFlNDYxZWEyM2QxY2Q0YjYxZWIzMzI4YjJkMmQzNjlmNjg4YzEyOQ:eb6b0f71f048273a7bf60cd034a756c6df0fca60"
# device-id d5719fa75c166d1d7344b60e81cf45a4eb212381
# api-secret eb6b0f71f048273a7bf60cd034a756c6df0fca60
# => signature 8827482c5ae9fbdb98d9df8a5ffbb327d859607b83119fb8a5821b48a160e75d


# Get the solicitationId, url to upload and url to download the result
$ curl -XPOST \
  -H "X-DEVICE-ID: d5719fa75c166d1d7344b60e81cf45a4eb212381" \
  -H "Authorization: Bearer 8827482c5ae9fbdb98d9df8a5ffbb327d859607b83119fb8a5821b48a160e75d" \
  http://35.188.12.163/api/access-points/ODM5NDk2MjU4NDExNXdOLGczTnRG/image-processing-solicitations
# {
#   "presignedUpload": "https://storage.googleapis.com/dentrino-staging-us/ml-images/ODM5MzA2NTEzODQxOX1MV1FVL2NU/smile.jpg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=dentrino-staging%40appspot.gserviceaccount.com%2F20201202%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20201202T184741Z&X-Goog-Expires=601&X-Goog-SignedHeaders=content-type%3Bhost&X-Goog-Signature=8ae06d1335d6e00905e778b950d3f5a062eecec036307ef6c02248912e5e99125326f74c49775761e5ce1508224620293f45958237ca14ac0057911340a04395faed9390adf6c8180499649ea1173c4d9209116918b20c4780c85c93f45044a05f211b87919a8990b082bde9444206583ba27c7a3dfe4673be55c1601b4c6dc92b2c232fae090d3afff614d79e3f36c07ef8193c423174d9e5517a372c46ee1c165d3865e6ea1d66123c7c3c7cdae2dcb9e8e9ecb12aeca9b6c6c53263062ffc78ab8d2df3dfd6afe1e522f61ea80fb0afe4e4399b7048d04c9f2cf4458c68ff054e1137168c7708d67c3d4afbbb049a405c0d8ba3ca0fff7ec309771c5f234d",
#   "presignedDownloadOriginal": "https://storage.googleapis.com/dentrino-staging-us/ml-images/ODM5MzA2NTEzODQxOX1MV1FVL2NU/smile.jpg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=dentrino-staging%40appspot.gserviceaccount.com%2F20201202%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20201202T184741Z&X-Goog-Expires=601&X-Goog-SignedHeaders=host&X-Goog-Signature=765acc08e8e3213bbeff2a6a1e47d9d3c9e348c3f67fae411a6cfadfa39b1c654fbc174d4719f6e3e072158a16700d2028a2d4cd3339d258caa4abfa89a5215a3da14edab6da9e7962cbe971bb12e9c8287b19cf76ee36765102be831e6a6e34b5ede48fcfe8ffc9f1633e8d0c8d2b7642c05e7d5f9708ce31ebc925a689ed8da2e49dd52b6fbc74222f95881bdfd605cb2d2dfb2ff90bc48aa2cf7fa58ec22df1ef76be87a526da6b7098a636eb512ae95101ae72a173bd99b7d3ba7662513985720833391dcbb12cf9109fbc5926f7b563451c68601025157ed4b1860d36c29ed44c55ed879287994719cce0cc2705f3de8c7c0caa51c48cdec470947d1d47",
#   "presignedDownloadAfter": "https://storage.googleapis.com/dentrino-staging-us/ml-images/ODM5MzA2NTEzODQxOX1MV1FVL2NU/smile_after.jpg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=dentrino-staging%40appspot.gserviceaccount.com%2F20201202%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20201202T184741Z&X-Goog-Expires=601&X-Goog-SignedHeaders=host&X-Goog-Signature=9b70819e2b8db6271f23bb513696ddf9ffe87a16dd49ab6b3176302ae87af8a789381229fea6bb1d16df69b6bd07ba2b9d68a032ae52e2e4e31992eb7f62813b2384b2c0c4c6f9830d6298a69836dad2fba1c231ad627ba57a109c261a52759b5b05e566ac34b3767a8939415b1cb70dd1e36d13963d6e97ce570b17b158955a333cf5be7e8e39efec118416f4930cec5d0464a82e8cf7a22cddf8ca10f761628449b2919ea48e578861b1e1433fbb916cab2d2e085757e14c906a54df0f851e7b94568ccfc3effcddf90faa3a1ad20d7d4b88ec14ffc339f2b0b1e28c281c073eb452e4d5db4fabb1fb5288b8af578164c534488b39a5f5637d8f6b67c64489",
#   "solicitationId": "ODM5MzA2NTEzODQxOX1MV1FVL2NU",
#   "bucket": "dentrino-staging-us"
# }


# Upload the file to google cloud
$ curl -XPUT \
  --upload-file images/gilface.jpg \
  -H "Content-Type: application/octet-stream" \
  'https://storage.googleapis.com/dentrino-staging-us/ml-images/ODM5MzA2NjYzMjkyNmVuNXJqVHpm/smile.jpg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=dentrino-staging%40appspot.gserviceaccount.com%2F20201202%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20201202T182247Z&X-Goog-Expires=600&X-Goog-SignedHeaders=content-type%3Bhost&X-Goog-Signature=28ac8d2dc683d27819dfe6070819758bfe80f9730bbc14bd4b700d09ca74ec4fc613e82dfd17e2b47053e5b1e8a5c03d1c781b1ebde596fda79daae03db42f5c9ad991112c0ff3808f3c4b0ef7da53ddfde6da9a8c928c1185c774b94c4744a1ee0d7626db6160d3f995de4e4dfafbc2ef1668d0199ddcd99f7a1e594b635ee3aae99fc2736f7766dfae95d7d116b2f203d01ee6a5a40a3896b5831c877800b7ddbce98d9cccb636a2c4d75dafc2534178f5f295230b67644b4cb7683395f402e00bc7c4d7d3e44b8e80d6599c1068357e1c807ee5c6a141fdcef8f8d7b0c57bbabdbd56df712d11c8513ce3c2cb0d4811862dfe23ef06af616ed5055535485d'


# Track progress through websockets
# Using: https://github.com/vi/websocat
$ websocat 'ws://35.188.12.163/ws/image-processing-solicitations/ODM5MzA2NTEzODQxOX1MV1FVNU'
# {"event": "processing_step", "step": "download", "inx": 0, "maxInx": 6}
# {"event": "processing_step", "step": "preprocessing", "inx": 1, "maxInx": 6}
# {"event": "processing_step", "step": "segment", "inx": 2, "maxInx": 6}
# {"event": "processing_step", "step": "beautify", "inx": 3, "maxInx": 6}
# {"event": "processing_step", "step": "synth", "inx": 4, "maxInx": 6}
# {"event": "processing_step", "step": "postprocessing", "inx": 5, "maxInx": 6}
# {"event": "processing_step", "step": "upload", "inx": 6, "maxInx": 6}
# {"event": "finished"}
```
