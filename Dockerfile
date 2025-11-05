FROM node:18-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install --legacy-peer-deps && npm cache clean --force
COPY . /usr/src/app

# Build the application (gulp build - server + static files)
RUN npm run build

# Build webpack bundles (client JS and Privy auth)
RUN node build-webpack.js

CMD [ "npm", "run", "start:prod" ]

HEALTHCHECK  --interval=5m --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/ || exit 1

EXPOSE 8080
