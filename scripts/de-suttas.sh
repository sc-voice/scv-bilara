#!/bin/bash
DIR=`dirname $0`
echo "$0 DIR:$DIR"
mkdir -p "local"
${DIR}/de-suttas.js
cd ${DIR}/../local/bilara-data
pwd
.voice/scripts/pull-upstream.sh 
git commit -am "SuttaCentral Update"
git push
