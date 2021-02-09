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
