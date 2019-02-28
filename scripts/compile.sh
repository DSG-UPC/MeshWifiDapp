#!/bin/bash

./node_modules/.bin/truffle migrate --reset --network meshdapp

node oracle/oracle --network staging