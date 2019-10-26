#!/bin/bash
./scripts/de-words.js
sort src/assets/words-de.txt > /tmp/words-de.txt
mv /tmp/words-de.txt src/assets/words-de.txt
