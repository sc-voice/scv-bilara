#!/bin/bash
DIR=`dirname $0`
DIR=`readlink -f $DIR`
pushd $DIR/../local/bilara-data >& /dev/null

SUID=$1
if [ "$SUID" == "" ]; then
    cat <<HELP
NAME
        de-branch.sh - work on a new de/sabbamitta sutta

DESCRIPTION
    de-branch.sh SUID
        Switch to the de_sabbamitta_SUID branch of bilara-data.
        If the branch does not exist, create it and copy
        de/sabbamitta/.../SUID_translation-de-sabbamitta.json
        from en/sujato/.../SUID_translation-en-sujato.json

EXAMPLES
    de-branch.sh an3.1
HELP
    exit 0
fi

BRANCH=de_sabbamitta_${SUID}
git checkout $BRANCH >& /dev/null
RC=$?; if [ "$RC" == "0" ]; then
    echo -e "DEBR\t: ${BRANCH} (OK)"
    exit 0
fi

echo -e "DEBR\t: Creating  ${BRANCH}..."
$DIR/branch.js de sabbamitta $SUID

