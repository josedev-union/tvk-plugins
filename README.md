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
├── webpack.config.js          # Config to compile Front-End assets (Babel, SASS, minify, uglify, etc)
├── webpack.config.server.js   # Config to compile Back-end javascripts (with Babel)
├── public        # Public folder
└── src           # Back-end javascript files
```


## Preparing Environment

1. Run `asdf install` to install nodejs and redis via [asdf](https://github.com/asdf-vm/asdf). (see versions on .tool-versions)
2. Run `npm install` to install dependencies
3. Create your `.env` file. (use `env.dev` as base)
4. Start redis `redis-server`
5. Start firestore emulator `npm run db-up`
6. Start the server `npm run dev-start`

## Development Tasks

```bash
$ npm run dev-start # Start server with nodemon
$ npm run dev-up    # Compile assets and start server
$ npm run dev-build # Compile assets
$ npm run db-up     # Start local database
$ npm run test:run  # Run the tests (Need to start local database before)
$ npm run test      # Starts local emulators and run the tests
$ npm run test:run test/models/database/ApiClient.spec.js  # Run specific testfile
$ SCRIPT=new_user npm run script          # Create a new test user
$ SCRIPT=new_api_client npm run script    # Create a new api client
$ SCRIPT=seed_tasks npm run script        # Create smile tasks for testing

# On function/ folder
$ npm run serve  # Start functions emulator
$ npm run shell  # Start functions shell

$ npm run deploy:dent    # Deploy functions to dentrino-staging project
$ npm run deploy:bdent   # Deploy functions to b-dentrino-staging project
$ npm run deploy         # Deploy functions to all staging projects
$ npm run save_config    # Saves dentrino-staging functions config into .runtimeconfig.json
$ npm run logs           # Get logs of dentrino-staging functions

$ npm run prod:deploy:dent   # Deploy functions to dentrino-production project
$ npm run prod:logs          # Get logs of dentrino-production functions
$ npm run prod:save_config   # Saves dentrino-production functions config into .runtimeconfig.json
```


## Tasks that runs on production environment

```bash
$ npm run build          # Build assets for production
$ npm run build-backend  # Build front-end and back-end assets for production
$ npm start              # Start the server (once the backend was built)
```

## Deploy
Deploy task will build the docker image using the current commit-hash as version and deploy it to kubernetes pod.  
You need to switch kubernetes to the specific environment, read `dentrino-devops` README to know more.

```bash
$ make deploy                        # Deploy to staging
$ APP_ENV=production make deploy     # Deploy to production
$ kubectl -nproduction rollout status deploy dentrino-web # Follow deploy status
```

## Rollback
Rollback is basically deploying an old image from dockerhub.

```bash
# 1. Look for the image you want to rollback to on by using the `dentrino-devops` tasks or reading the `DEPLOYLOG.md`.

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

[TODO] Better to use commit hash on the base builds instead of having to set the version manually. See the teethmlserver makefiles to understand how it could be.
```

## API: Quick Simulations
### Routes
```
POST /api/simulations/ortho
POST /api/simulations/cosmetic
PATCH /api/simulations/:SIMULATION_ID
POST /public-api/simulations/ortho
POST /public-api/simulations/cosmetic
PATCH /public-api/simulations/:SIMULATION_ID
```

### Overview
That API is used on bpilot (and should be used by freesmiles in the future).


Quick simulations is an API that receives an image and simulation params as `multipart/form-data`. And it also can receive PATCH requests updating data in a simulation, this request can be made via `multipart/form-data` or `application/json`.


The `/public-api/` routes are intended to be requested directly by front-end applications (from browser or mobile devices), since it's more exposed it has more validations like CORS, Rate Limiting by ip and recaptcha validation. Also it uses a different secret key, named on the api client of `exposedSecret`.

```
List of what it does...
- Validates the ApiClient
- Validates RateLimiting
- Validates CORS, Recaptcha (on front-end calls only)
- Parses the body (image and the simulation params)
- Validates the security token (on front-end calls only)
- Invoke the worker via `Redis Pub/Sub`
- Upload the results to google storage
- Saves QuickSimulation to Firestore
- Respond urls
```

### Ortho Simulation
To see more about the ortho simulation read the docs made for the bpilot:
- `docs/quickapi/ortho-for-clients/README-backend-calls.md`
- `docs/quickapi/ortho-for-clients/README-public-calls.md`
- `docs/quickapi/ortho-for-clients/README-errors.md`

### Cosmetic Simulation
The cosmetic routes is very similar to the ortho routes, but the cosmetic simulation accepts the following parameters:
```
styleMode  # mix_manual / auto
mixFactor  # 0.0 ~ 1.0
whiten     # 0.0 ~ 1.0
brightness # 0.0 ~ 1.0
```

To understand better the interface, read the ortho calls docs made for bpilot:
- `docs/quickapi/ortho-for-clients/README-backend-calls.md`
- `docs/quickapi/ortho-for-clients/README-public-calls.md`
- `docs/quickapi/ortho-for-clients/README-errors.md`

Also there's a script to make requests to this api which is the `docs/quickapi/simulation.py`.


## Webapp: Instant Simulations (Freesmiles)
This webapp was made in a worry, but it should be removed from here once the [FreeSmileSimulationWebsite](https://bitbucket.org/tastytech/freesmilesimulationwebsite/src/master/) is finished. There're many advantages in removing this code from here as soon as possible:
```
- Thanks to this code now the API has to handle assets compiling HTML/CSS/JS and assets serving. Which makes starting the pod taking too long, that's why the API takes soo long to start. Once this is removed from here, the deployment of the dentrino-simulations-api can be optimized so the container can get ready quicker.
- The code also gets confusing on `app.js` since part of the routes are handled by the instant-simulations and part is handled by dentrino-simulations-api. Removing that complexity would be awesome.
```

## API: On-Demand Workflow (That's used by dentrino-on-demand website)
### Routes
```
POST /api/users/:userId/smile-tasks/solicitation
WEBSOCKETS /ws/smile-tasks/:SMILE_TASK_ID
```
### Overview
**Introduction**

An important point is that `Dentrino Simulations API` **doesn't receive the images**, the images will be uploaded directly to google cloud storage (although it's interface could work with any other storage service), the upload will fire events that will trigger the simulation workers automatically. What the API does is acting like a gateway by describing what request the authorized client shall do to upload it's image.

Besides that, there's also a WebSockets interface so the client can track the simulation progress and show it to the final user.


**Authorization Token**

The client will need to generate a Digest Token using:
- `Client ID` & `Client Secret`: Pair keys generated specifically for your application.
- `API Secret`: Secret key shared between API and Client.
- `User ID`: Dentist firebase user id requesting the simulation
- `Image MD5`: Image MD5 encoded in base64, only the image that matches this MD5 will be authorized to be uploaded.


**Response**

The API generates a request descriptor that will allow the application to upload to the storage service a specific image.
```
# Request Descriptor Sample
{
    "verb": "put",
    "url": "https://storage.googleapis.com/dentrino-dev-us/ml-images/ODM4NzA...",
    "headers": {
      "Content-MD5": "d147VHnubHq4bHFdV4ObPA==",
      "Content-Type": "image/jpeg",
      "x-goog-content-length-range": "0,1048576"
    }
  }
}
```

Only applications who were authorized by the API will be able to upload to it. Here's a few verifications the API does:
- Check if the user exist (the dentist firebase user)
- Check if the Client ID and Secret match
- Do Rate Limiting (although it'll be disabled on staging)
- Limit the maximum size of the image
- Limit the image that can be uploaded (via Content-MD5)


Read below exactly how to implement the full workflow.

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
	"originalPath": "4NFfruugPxYcPpuHEz8rNYAVK7y2/on_demand/ODM4MTY2MTE0MTQ3MC1ENExVPH1a/smile.jpg",
	"resultPath": "4NFfruugPxYcPpuHEz8rNYAVK7y2/on_demand/ODM4MTY2MTE0MTQ3MC1ENExVPH1a/smile_after.jpg",
	"preprocessedPath": "4NFfruugPxYcPpuHEz8rNYAVK7y2/on_demand/ODM4MTY2MTE0MTQ3MC1ENExVPH1a/smile_before.jpg",
	"smileTaskId": "ODM4MTY2MTE0MTQ3MC1ENExVPH1a",
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

## Api Client Configuration
The ApiClient model is very flexible so we can optimize the client experience to its own use case. To configure it you must do it directly via Firestore interface. The data of a ApiClient is like that:
```
{
	"apisConfig": {
		"default": {
			"enabled": false,
			"rateLimit": {}, // [Not Used] It's not being used, but it can be used later to control the rate limit by client. For example a client that has a contract of 4 simulations per second could have a lower rate limit than a client with a contract of 1 simulation per second.
			"allowedHosts": ["http://localhost:3000", "http://localhost:8080"], // [Optional] Used by CORS (don't validates CORS if it's empty)
			"recaptcha": { // [Optional] Configures recaptcha (don't validates recaptcha if it's empty)
				minScore: 0.5, // min score the user need to have access
				secret: "6LchqJohAAAAABXoO8iwjL6X-uUz_oCzptFjLre4" // identify the google account that will validate the recaptcha
			},
			"customBucket": "custom-bucket.appspot.com", // [Optional] Set a custom bucket to deploy
			"customGoogleProject": "other-project", // [Optional] Set a custom google project to use when saving QuickSimulations, that google project must be configured via the env var `DENTRINO_GOOGLE_PROJECTS`.
		},
		"ortho-simulations": {
			"enabled": true
		},
		"public-cosmetic-simulations": {
			"enabled": true,
			"customBucket": "public-bucket.appspot.com"
		},
		"patch-simulation": {
			"enabled": true
		},
	},
	createdAt: 22/03/2023 10:30:00 UTC,
	updatedAt: 22/03/2023 10:30:00 UTC,
	exposedSecret: "1939bab1f861a44227d9588cf2ae56c767b6e6cd83461d86ba5e4ef2812c28c9", // Used on front-end/public routes
	secret: "eb462befc6c8676ac1fc9aa1b6911ec9dd194dc8f4e82a289bf27d5057d86e58" // Used  on back-end routes
}
```

The `apisConfig` can configure the following routes:
```
* default
* ortho-simulations
* cosmetic-simulations
* patch-simulations
* public-ortho-simulations
* public-cosmetic-simulations
* public-patch-simulations
```

All routes have the same set of options available, the only one mandatory is the `default` which is applied by default. So we can set the default options on `default` key and overwrite it's values for specific routes.
