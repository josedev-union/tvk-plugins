FROM tastytech/miroweb-base:latest
MAINTAINER support@tastytech.ca

ARG BUILD_DIR=/build
WORKDIR $BUILD_DIR

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
    npm prune --production && \
    cp -rf $BUILD_DIR/dist/ /app/ && \
    cp -rf $BUILD_DIR/package.json /app/ && \
    cp -rf $BUILD_DIR/node_modules /app/ && \
    rm -rf $BUILD_DIR

# Booting
WORKDIR /app
CMD ["npm", "start"]