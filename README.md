# Miro Web
Web user-friendly interface to the smile enhancement image service named Miro Smiles.

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
# Firebase
MIROWEB_FIREBASE_DATABASE_URL=https://mirosmiles-us-staging.firebaseio.com
MIROWEB_GOOGLE_APPLICATION_CREDENTIALS={"type": "service_account","project_id": "mirosmiles-us-staging", ...}

# AWS S3
AWS_ACCESS_KEY_ID=<YOUR ACCOUNT>
AWS_SECRET_ACCESS_KEY=<YOUR ACCOUNT>
MIROWEB_S3_BUCKET=miroweb.staging.us
AWS_DEFAULT_REGION=us-east-1
```

## Configuring .env.prod file (FOR PRODUCTION)
The `prod-*` tasks loads the `.env.prod` file through the `dotenv` lib. The current tasks only use those variables:

```bash
# Firebase
MIROWEB_FIREBASE_DATABASE_URL=https://mirosmiles-us-production.firebaseio.com
MIROWEB_GOOGLE_APPLICATION_CREDENTIALS={"type": "service_account","project_id": "mirosmiles-us-production", ...}
```

## Development Tasks

```bash
$ npm run dev-start # Start server with nodemon
$ npm run dev-up    # Compile assets and start server
$ npm run dev-build # Compile assets
$ npm run db-up     # Start local database
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
$ kubectl -nproduction rollout status deploy miroweb # Follow deploy status
```

## Rollback
Rollback is basically deploying an old image from dockerhub.

```bash
# 1. Look for the image you want to rollback to on: https://cloud.docker.com/u/tastytech/repository/docker/tastytech/miroweb/tags

# 2. Rollback to that image
$ COMMIT_IMAGE=tastytech/miroweb:<TAG-TO-ROLLBACK-TO> APP_ENV=production make rollback

# Wait the rollback to finish
$ kubectl -nproduction rollout status deploy miroweb
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
