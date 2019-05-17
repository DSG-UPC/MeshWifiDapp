# usage:
# python3 pre-processing <raw-data-directory>
# the <raw-data-directory> is the directory where there are all the files *.iwdump.
# NOTE: <raw-data-directory> sould end with '/'

import os
import sys
from os import listdir
import itertools

if len(sys.argv) < 2:
    print("---------- Welcome to this preprocessing script that transforms the dumps of the stations to a json file with amounts of data forwarded by nodes")
    print("Usage:")
    print("python3 pre-processing <raw-data-directory>")
    print("the <raw-data-directory> is the directory where there are all the files *.iwdump.")
    print("NOTE: <raw-data-directory> have to finish with '/'.")
    print("----------")
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
        filename = ""
        for line in f:
            if line.startswith("# start "):
                nodeName = line.split()[4][1:-1]
                #print(nodeName)
                continue
            elif line.startswith("Station "):
                if (nodeName) not in dataset:
                    dataset[nodeName] = {}
                dataset[nodeName][fileName] = {}
                stationName = line.split()[1]
                #print(dataset[nodeName])
                if (stationName) not in dataset[nodeName][fileName]:
                    dataset[nodeName][fileName][stationName] = {}
                #print(line.split()[1])
                continue
            elif line.startswith("	rx bytes:"):
                dataset[nodeName][fileName][stationName]["rx"] =  line.split()[2]
                continue
            elif line.startswith("	tx bytes:"):
                dataset[nodeName][fileName][stationName]["tx"] =  line.split()[2]



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
        print(len(timestamps))
        dataset2[node] = timestamps


print("Total nodes with more than 700 timestamps:", len(dataset2))
print("And we have this amount of files:",numOfFiles)
#print("Max lengh of data per nodes:",maxLen)


jsonData = {}
jsonData[monitor] = []
jsonData[owner] = []

for node, timestamps in dataset2.items():
    pass

jsonFile  = open("db-QMPSU.json", "w")

jsonFile.close()
