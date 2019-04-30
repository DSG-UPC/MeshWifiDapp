FROM node:11

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . .

# Install app dependencies
RUN npm install

# Declaring the environment variables
ENV NETWORK_NAME='staging'
ENV MONGO_IP='127.0.0.1:27017'
ENV PROMETHEUS_IP='http://127.0.0.1:9090'
ENV ETH_NET='http://127.0.0.1:8545'

CMD [ "/bin/bash", "scripts/compile.sh" ]
