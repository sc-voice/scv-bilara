#!/bin/bash
DIR=`dirname $0`
EDITOR=$1
if [ "$EDITOR" == "" ]; then
    cat <<HELP
NAME
        bilara_edit.sh - edit results of previous search

SYNOPSIS
        bilara-edit.sh vi
        bilara-edit.sh vim
        bilara-edit.sh subl

DESCRIPTION
        Opens specified editor (vi, vim, subl) on files matching
        last search pattern.

HELP
exit 0
fi

if [ "$EDITOR" == "vim" ]; then
    SUFFIX=vi
else
    SUFFIX=$EDITOR
fi
bash -c "$EDITOR `cat $DIR/../local/bilara_edit.${SUFFIX}`" 
