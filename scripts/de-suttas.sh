#!/bin/bash
DIR=`dirname $0`
echo "$0 DIR:$DIR"
mkdir -p "local"
${DIR}/de-suttas.js
cd ${DIR}/../local/bilara-data
pwd
git push
