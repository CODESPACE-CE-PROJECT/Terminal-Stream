# Base image for development stage
FROM node:20.18.0-alpine AS development

WORKDIR /usr/src/app

# Install dependencies
COPY --chown=node:node package.json yarn.lock ./
RUN yarn install

# Copy application files
COPY --chown=node:node . .

# Set environment for development
ENV NODE_ENV=development

# Build stage
FROM node:20.18.0-alpine AS build

WORKDIR /usr/src/app

# Copy dependencies and application files from development stage
COPY --from=development /usr/src/app /usr/src/app

# Build the application
RUN yarn build

# Install only production dependencies
RUN yarn install --production --frozen-lockfile

# Production stage
FROM node:20.18.0-alpine AS production

WORKDIR /usr/src/app

# Switch to non-root user for better security
USER root
RUN groupadd docker
RUN usermod -aG docker node 

USER node 

# Copy only necessary files from build stage
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

ENV NODE_ENV=production

# Expose the application port
EXPOSE 3003

# Run the application
CMD ["node", "dist/server.js"]
