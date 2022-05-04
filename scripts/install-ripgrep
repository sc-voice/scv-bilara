#!/bin/bash

DIR=`dirname $0`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
mkdir -p $DIR/local; pushd $DIR/local > /dev/null

type rg >& /dev/null; RC=$?
if [ "$RC" == "0" ]; then
  echo "$SCRIPT:" `rg --version 2>&1 | head -1` "(OK)"
else
  echo "$SCRIPT: installing ripgrep 12.1.1"
  curl -LO https://github.com/BurntSushi/ripgrep/releases/download/12.1.1/ripgrep_12.1.1_amd64.deb
  sudo dpkg -i ripgrep_12.1.1_amd64.deb
fi
