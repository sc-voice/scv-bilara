#!/bin/bash
DIR=`dirname $0`
${DIR}/de-suttas.js
cd ${DIR}/../local/bilara-data
pwd
git push
