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

## API: On-Demand Workflow
### Generate the authorization token
Before the client requests the smile-tasks routes it needs to generate an authorization token following this recipe:
```
# Recipe
message = USER_ID + ':' + IMAGE_MD5_IN_BASE64       # e.g. "4NFfruugPxYcPpuHEz8rNYAVK7y2:d147VHnubHq4bHFdV4ObPA=="
pass = clientSecret + ':' + apiSecret # e.g. "accesssecret123:apisecret123"
signature = sha256_hmac(message, pass) # e.g. "267de896bea09f55321c8c4a3e20c6b6034255ed6a029747a59483bccdcfa0fa"
token = base64(CLIENT_ID + ":" + signature)
```

Generating the token with bash:
```
# Input
IMAGE_PATH=./faceimage.jpg
USER_ID=4NFfruugPxYcPpuHEz8rNYAVK7y2
CLIENT_ID=ODM4NzA5NzYyNzcxMGltSWl7OjJoIzIjb1FlTg
CLIENT_SECRET=ODk2ODc4MTJlZGEzNzRjNjQwY2M2NjNmNzUyNWJjODUwNjZjMmI5ZWYyMTU4ZTVlYWNkNWQ4YzIxNjNlMjA2MA
API_SECRET=ff5da5e257233200e1c0a902bbce0c3f

# Generation Steps
MD5_B64=$(cat $IMAGE_PATH | openssl md5 -binary | base64 -w0)
MSG=$USER_ID:$MD5_B64
KEY=$CLIENT_SECRET:$API_SECRET
SIGNATURE=$(echo -n "$MSG" | openssl dgst -sha256 -hex -hmac $KEY  | sed 's/^.* //')
AUTHORIZATION_TOKEN=$(echo -n "$CLIENT_ID:$SIGNATURE" | base64 -w0)
```

### Request the smile-tasks
```
# > Request
POST /api/users/USER_ID/smile-tasks/solicitation
# Headers
Authorization: Bearer AUTHORIZATION_TOKEN
Content-Type: application/json
# Body
{
	"imageMD5": "IMAGE_MD5_IN_BASE64",
	"contentType": "IMAGE_CONTENT_TYPE" // e.g. "image/jpeg"
}

# > Successful Response
{
  "uploadDescriptor": {
    "verb": "put",
    "url": "https://storage.googleapis.com/dentrino-dev-us/ml-images/ODM4NzA...",
    "headers": {
      "Content-MD5": "d147VHnubHq4bHFdV4ObPA==",
      "Content-Type": "image/jpeg",
      "x-goog-content-length-range": "0,1048576"
    }
  },
  "uploadedDescriptorGet": {
    "verb": "get",
    "url": "https://storage.googleapis.com/dentrino-dev-us/ml-images/ODM4NzA...",
    "headers": {}
  },
  "resultDescriptorGet": {
    "verb": "get",
    "url": "https://storage.googleapis.com/dentrino-dev-us/ml-images/ODM4NzA...",
    "headers": {}
  },
  "progressWebsocket": "/ws/smile-tasks/ODM4NzA5NzMxNDAxM19jTnQ2dUNU"
}


# > Error Responses
# 403 Not Authorized
# When it happens:
# - Token is invalid
# - Client doesn't exist
# - Client id and secret doesn't match
{
	error: "Not Authorized"
}

# 422 Not Authorized
# When it happens:
# - imageMD5 is missing
# - contentType is missing
{
	error: "VALIDATION ERROR MESSAGE" // e.g "imageMD5 is mandatory"
}

# 404 Not Found
# When it happens:
# - User id doesn't exist
{
	error: "User not found"
}
```


```
# curl sample
curl -XPOST localhost:3000/api/users/$USER_ID/smile-tasks/solicitation \
  -H "Authorization: Bearer $AUTHORIZATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"imageMD5\":\"$MD5_B64\",\"contentType\":\"image/jpeg\"}" \
  -o tmp/outrequest.json

cat tmp/outrequest.json
```

### Upload Image
To upload the image you will need to use the `uploadDescriptor` key. You'll need to send the request to `descriptor["url"]`, the request must include all headers on `descriptor["headers"]` and need to use the HTTP Verb referred on `descriptor["verb"]`.

```
# curl sample
IMAGE_PATH=./faceimage.jpg
CONTENT_MD5="d147VHnubHq4bHFdV4ObPA=="
CONTENT_TYPE="image/jpeg"
LENGTH_RANGE="0,1048576"
URL="https://storage.googleapis.com/dentrino-dev-us/ml-images/ODM4NzA5NzMxNDAxM19jTnQ2dUNU/smile.jpg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=dentrino-staging%40appspot.gserviceaccount.com%2F20210209%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20210209T203125Z&X-Goog-Expires=601&X-Goog-SignedHeaders=content-md5%3Bcontent-type%3Bhost%3Bx-goog-content-length-range&X-Goog-Signature=5f3be8cc6fded7663f52dc5ed40bb2c69d0df59eb9cc729c740d775e4e5758af52ad13c89829c8a490008e26b37bcd7ba44e89b38e40b7f48d809b0f22c86d41c1cafb9fbb814c34367d2a183f5e8bf91aa1194903e02b8b8c947c057d0c85b41503e4ef03bffff7d043b1a9fb500b0b3b56830fe3dcbb8a4d380aa4106002c580511eea520d380a4eb47f3b8b6e06a388248c8ec7320be728a21253aa5813afd3ee3a5ca886f5725f6a3e2e48b48e7234786d2376f69e20bce3b9a78f030f9f6c08b98b60251d0a61ae4b469ba1c0e3195830dce289ef5cac12d2150067b638be2b65371261d027531aa34c11987c497b45b5bdb600d81b5a7e15e0dd974a0b"

curl -XPUT \
  --upload-file $IMAGE_PATH \
  -H "Content-Type: $CONTENT_TYPE" \
  -H "Content-MD5: $CONTENT_MD5" \
  -H "x-goog-content-length-range: $LENGTH_RANGE" \
  -o tmp/outupload.txt \
  -i \
  $URL

cat tmp/outupload.txt
```

### Track progress through websockets
To track the progress you need to connect on the path referred on response (`progressWebsocket` attribute).

```
# Events Sample:
=> {"event": "processing_step", "step" : "Step 0 Name", "inx" : 0, "maxInx" : 2}
=> {"event": "processing_step", "step" : "Step 1 Name", "inx" : 1, "maxInx" : 2}
=> {"event": "processing_step", "step" : "Step 2 Name", "inx" : 2, "maxInx" : 2}
=> {"event": "finished"}

# Error Event Sample
=> {"event": "error", "error_msg": "Error Message"}
```

Sample Bash Code

```
$ websocat "ws://localhost:3000/ws/smile-tasks/ODM4NjgzODkyMTI4N2tpLlI+Y1NT"
# Events
# {"event": "processing_step", "step": "download", "inx": 0, "maxInx": 6}
# {"event": "processing_step", "step": "preprocessing", "inx": 1, "maxInx": 6}
# {"event": "processing_step", "step": "segment", "inx": 2, "maxInx": 6}
# {"event": "processing_step", "step": "beautify", "inx": 3, "maxInx": 6}
# {"event": "processing_step", "step": "synth", "inx": 4, "maxInx": 6}
# {"event": "processing_step", "step": "postprocessing", "inx": 5, "maxInx": 6}
# {"event": "processing_step", "step": "upload", "inx": 6, "maxInx": 6}
# {"event": "finished"}
```
