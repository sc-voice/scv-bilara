#!/bin/bash
DIR=`dirname $0`
echo "$0 DIR:$DIR"
mkdir -p "local"
${DIR}/de-suttas.js
${DIR}/pull-bilara.sh
