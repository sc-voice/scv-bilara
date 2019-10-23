#!/bin/bash
DIR=`dirname $0`
echo "$0 DIR:$DIR"
${DIR}/train-en.js
git commit -am "new Deutsch words"
git push
