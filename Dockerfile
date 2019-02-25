FROM node:8

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

ENV NETWORK_NAME='staging'
ENV MONGO_IP='localhost:27017'
ENV PROMETHEUS_IP='localhost:9090'
ENV ETH_NET='localhost:8545'

CMD [ "/bin/bash", "scripts/compile.sh" ]
