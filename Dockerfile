FROM gcr.io/dentrino-production/dentrino-simulations-api-base:latest
MAINTAINER support@tastytech.ca

WORKDIR /app

# Adding Files
ADD webpack.config.js ./webpack.config.js
ADD webpack.config.server.js ./webpack.config.server.js
ADD package.json ./package.json
ADD package-lock.json ./package-lock.json
ADD src ./src
ADD assets ./assets
ADD public ./public

# Preparing for distribution
RUN npm install && \
    npm run build-backend && \
    cp -rf ./dist/* ./

# Booting
CMD ["npm", "start"]
