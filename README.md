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
