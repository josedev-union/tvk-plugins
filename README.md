# Miro Web
Web user-friendly interface to the smile enhancement image service named Miro Smiles.

**Embeddable Web Component**: Code snippet that dentists can embed on their page to allow their potential clients to enhance a personal smile photo. (For now is the only existent component)

## Structure
```bash
.
├── app.js                  # Configure the server
├── bin/
│   └── www                 # JS that boots the server
├── routes/                 # Map the application routes
├── views/                  # All the view templates
├── assets/                 # Assets to be compiled
│   ├── css
│   ├── img
│   └── js
├── public/                 # Files that will be exposed
|   └── assets/             # Compiled assets
│       ├── bundle.js
│       ├── bundle.js.map
│       ├── css
│       └── img
├── webpack.config.js
```

## Preparing Environment

1. Install nodejs 12.8.0 (I suggest using [asdf](https://github.com/asdf-vm/asdf) / [asdf-nodejs](https://github.com/asdf-vm/asdf-nodejs))
2. Run `npm install`

## Tasks

```bash
$ npm start     # Start server with nodemon
$ npm run up    # Compile assets and start server
$ npm run build # Compile assets
```