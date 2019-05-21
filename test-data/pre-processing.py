# usage:
# python3 pre-processing <raw-data-directory>
# the <raw-data-directory> is the directory where there are all the files *.iwdump.
# NOTE: <raw-data-directory> sould end with '/'

import os
import sys
from os import listdir
import itertools
import json

if len(sys.argv) < 2:
    with open("pre-processing-help-text", 'r') as fin:
        print(fin.read())
    fin.close()
    exit()

dirName = sys.argv[1]
listFiles = sorted(os.listdir(dirName))
dataset = {}
numOfFiles=0

# First we read all the files and create the dataset structure which has several dimensions:
# dataset, nodeName, fileName, stationName, rx/tx

for fileName in listFiles:
    with open(dirName+fileName, 'r') as f:
#fileName=listFiles[0]
#with open(dirName + listFiles[0], 'r') as f:
        numOfFiles+=1
        nodeName = ""
        stationName = ""
        for line in f:
            if line.startswith("# start "):
                nodeName = line.split()[4][1:-1]
                #print(nodeName)
                continue
            elif line.startswith("Station "):
                if (nodeName) not in dataset:
                    dataset[nodeName] = {}
                if (numOfFiles-1) not in dataset[nodeName]:
                    dataset[nodeName][numOfFiles-1] = {}
                stationName = line.split()[1]
                #print(dataset[nodeName])
                if (stationName) not in dataset[nodeName][numOfFiles-1]:
                    dataset[nodeName][numOfFiles-1][stationName] = {}
                #print(line.split()[1])
                continue
            elif line.startswith("	rx bytes:"):
                dataset[nodeName][numOfFiles-1][stationName]["rx"] =  line.split()[2]
                continue
            elif line.startswith("	tx bytes:"):
                dataset[nodeName][numOfFiles-1][stationName]["tx"] =  line.split()[2]



# Then we get rid of the nodes that do not have data for all the timestamps.

# With this code we get the maximum number of timestamps a node have.
# maxLen = 0
# for node, timestamps in dataset.items():
#     if len(timestamps) > maxLen:
#         maxLen = len(timestamps)
#     print(len(timestamps))

dataset2 = {}

lowLenCount = 0
for node, timestamps in dataset.items():
    if len(timestamps) > 700:
        #print(len(timestamps))
        dataset2[node] = timestamps


print("Total nodes with more than 700 timestamps:", len(dataset2))
print("And we have this amount of files:",numOfFiles)
#print("Max lengh of data per nodes:",maxLen)


jsonData = {}
jsonData["monitor"] = []
jsonData["node"] = []

# Reminder of the dataset structure:
# dataset, nodeName, fileName, stationName, rx/tx


for node, timestamps in dataset2.items():
    jsonData["node"].append({"id": node})
    bytesT1 = 0
    calculatedBytes = 0
    #previousStationsValues = dataset[node][0]
    calculatedBytesList = {}
    for i in range(1,733):
        calculatedBytes = 0
        if (i-1) in dataset[node] and (i) in dataset[node]:
            previousStationsValues = dataset[node][i-1]
            nextStationsValues = dataset[node][i]
            txBytes = 0
            rxBytes = 0
            #print(nextStationsValues)
            for station in nextStationsValues:
                #print(station)
                if (station) in nextStationsValues and (station) in previousStationsValues:
                    txBytes += int(nextStationsValues[station]["tx"]) - int(previousStationsValues[station]["tx"])
                    rxBytes += int(nextStationsValues[station]["rx"]) - int(previousStationsValues[station]["rx"])
                    #print(txBytes,rxBytes)

            calculatedBytes += min(txBytes, rxBytes)
            if calculatedBytes < 0:
                calculatedBytes = 0

        calculatedBytesList[i-1] = calculatedBytes

    jsonData["monitor"].append({"id": node, "value": calculatedBytesList})



#print(json.dumps(jsonData, indent=4))

with open("db-QMPSU.json", "w") as outfile:
    json.dump(jsonData, outfile, indent=4)
outfile.close()

print("Output file: db-QMPSU.json" )
