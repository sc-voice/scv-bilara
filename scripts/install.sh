#!/bin/bash
DIR=`dirname $0`
${DIR}/install-nodev10.sh
npm install
mkdir -p local
cd local
if [ -e bilara-data ]; then
    echo -e "INSTALL\t: bilara-data (OK)"
else
    echo -e "INSTALL\t: installing bilara-data"
    git clone https://github.com/sc-voice/bilara-data
fi
