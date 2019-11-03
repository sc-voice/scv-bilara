#!/bin/bash
DIR=`dirname $0`
echo "$0 DIR:$DIR"
cd ${DIR}/../local/bilara-data
echo "Refreshing bilara-data fork from upstream master..."
git pull -Xtheirs --no-edit https://github.com/suttacentral/bilara-data
git commit -am "SuttaCentral Update"
git push
