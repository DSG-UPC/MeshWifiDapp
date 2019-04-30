#!/bin/bash

node_modules/.bin/truffle migrate --reset --network=$NETWORK_NAME
node oracle/oracle --network $NETWORK_NAME
