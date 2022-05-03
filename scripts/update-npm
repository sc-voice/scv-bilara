#!/bin/bash

DIR=`dirname $0`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`

RQDVER=8
NPMVER=`npm --version | sed -e 's/\..*//'`
if [ "$NPMVER" == "${RQDVER}" ]; then
    echo -e "${SCRIPT}: npm ${NPMVER} found (OK)"
    exit 0
fi

echo -e "${SCRIPT}: npm version expected:${RQDVER} actual:${NPMVER} not found (ERROR)"
exit -1
