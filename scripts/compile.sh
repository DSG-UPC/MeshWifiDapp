#!/bin/bash

./node_modules/.bin/truffle compile --all --network $NETWORK
./node_modules/.bin/truffle migrate --reset --network $NETWORK

node oracle/oracle --network $NETWORK