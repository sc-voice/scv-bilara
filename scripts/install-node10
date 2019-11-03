#!/bin/bash
RQDVER=10.17.0
if [ ! -x /usr/bin/curl ]; then
    echo -e "NODE\t: apt-get install curl"
    sudo apt-get install -y curl
fi
if [ -e /usr/bin/node ]; then
    NODEVER=`/usr/bin/node --version`
    if [ "$NODEVER" == "v${RQDVER}" ]; then
        echo -e "NODE\t: node ${NODEVER} found (OK)"
        exit 0
    fi
    echo -e "NODE\t: apt-get remove nodejs@${NODEVER} "
    sudo apt-get remove -y nodejs
    echo -e "NODE\t: apt autoremove ... "
    sudo apt autoremove -y
    echo -e "NODE\t: apt-get install nodejs@${RQDVER} "
    curl -sL https://deb.nodesource.com/setup_10.x | sudo bash -
    sudo apt-get install -y nodejs
    exit 0;
fi

. ~/.nvm/nvm.sh  
type node > /dev/null
RC=$?; if [ "$RC" == "0" ]; then
    NODEVER=`node --version`
    if [ "$NODEVER" == "v${RQDVER}" ]; then
        echo -e "NODE\t: node ${NODEVER} found (OK)"
    else
        echo -e "NODE\t: node ${NODEVER} found. Expected node v${RQDVER}"
        . ~/.nvm/nvm.sh  
        RC=$?; if [ "$RC" == "0" ]; then
            echo -e "NODE\t: installing node ${RQDVER} with nvm"
            nvm install ${RQDVER}
            nvm alias default ${RQDVER}
            echo -e "NODE\t: TYPE THE FOLLOWING NOW"
            echo
            echo -e "     nvm use default"
            echo
        fi
    fi
else 
    echo -e "NODE\t: node v${NODEVER} not found. "
fi
