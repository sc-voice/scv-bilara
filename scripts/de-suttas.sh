#!/bin/bash
DIR=`dirname $0`
echo "$0 DIR:$DIR"
mkdir -p "local"
${DIR}/de-suttas.js
cd ${DIR}/../local/bilara-data
pwd
echo "Refreshing bilara-data fork from upstream master..."
git pull -Xtheirs --no-edit https://github.com/suttacentral/bilara-data
git commit -am "SuttaCentral Update"
git push
