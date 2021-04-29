#!/bin/bash
DIR=`dirname $0`
pushd $DIR/..
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`

PUBVER=`npm view | grep latest | sed s/^.*:.//`
PKGVER=`grep version package.json | head -1 | sed s/[^0-9.]//g`
if [ "$PUBVER" == "PKGVER" ]; then
  echo "$SCRIPT: $PKGVER no change"
elif [ "$NODE_AUTH_TOKEN" != "" ]; then
  echo "$SCRIPT: npm publish $PUBVER => $PKGVER (NODE_AUTH_TOKEN ok)"
  npm publish
else 
  echo "$SCRIPT: npm publish v$PKGVER (requires npm login)"
  npm publish
fi
