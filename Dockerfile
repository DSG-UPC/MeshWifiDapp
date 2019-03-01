FROM node:11

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . .

# Install app dependencies
RUN npm install

# Declaring the environment variables
ENV NETWORK_NAME='staging'
ENV MONGO_IP='localhost:27017'
ENV PROMETHEUS_IP='localhost:9090'
ENV ETH_NET='localhost:8545'

CMD [ "/bin/bash", "scripts/compile.sh" ]
