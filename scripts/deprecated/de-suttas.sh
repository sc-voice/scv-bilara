#!/bin/bash
DIR=`dirname $0`
echo "$0 DIR:$DIR"
mkdir -p "local"
${DIR}/js/de-suttas.js
${DIR}/pull-bilara
pushd local/bilara-data
git push
