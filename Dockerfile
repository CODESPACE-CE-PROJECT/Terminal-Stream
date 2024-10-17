FROM node:18-alpine AS development

WORKDIR /usr/src/app

COPY --chown=node:node package.json ./

COPY --chown=node:node yarn.lock ./

RUN yarn

COPY --chown=node:mode . .

USER node

FROM node:18-alpine As Build

WORKDIR /usr/src/app

COPY --chown=node:node package.json ./

COPY --chown=node:node yarn.lock ./

COPY --chown=node:node --from=development  /usr/src/app/node_modules ./node_modules

COPY --chown=node:node . .

RUN yarn build

ENV NODE_ENV production

RUN yarn install --frozen-lockfile 

USER node

FROM node:18-alpine As production

RUN apk add --no-cache \
  build-base \
  gcc \
  g++ \
  make \
  openjdk17-jdk

COPY --chown=node:node --from=Build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=Build /usr/src/app/dist ./dist

CMD [ "node", "dist/server.js"]
