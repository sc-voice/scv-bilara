#!/bin/bash
DIR=`dirname $0`
EDITOR=$1
if [ "$EDITOR" == "" ]; then
    EDITOR=vi
fi
bash -c "$EDITOR `cat $DIR/../local/bilara_edit.${EDITOR}`" 
