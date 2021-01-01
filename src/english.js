(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const { logger } = require('log-instance');
    const Axios = require('axios');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const FWS_URL_BASE = "https://raw.githubusercontent.com/sc-voice/scv-bilara";
    const FWS_URL = `${FWS_URL_BASE}/master/src/assets/fws-en.json`;

    var FWS_ENGLISH = {lastFetch:0};

    class English {
        static romanizePattern(pattern) {
            return pattern;
        }

        static async wordSet(opts={}) {
            let { 
                source = 'https', 
                fetch = url=>Axios.get(url),
                maxAge = 3600,
            } = opts;
            if (source==='https') {
                let msElapsed = Date.now() - FWS_ENGLISH.lastFetch;
                if (msElapsed/1000 > maxAge) {
                    FWS_ENGLISH.https = new Promise((resolve, reject)=>{
                        (async()=>{ try {
                            let { data:json }  = await fetch(FWS_URL);
                            logger.info(`English.wordSet() fetch`, FWS_URL);
                            FWS_ENGLISH.https = new FuzzyWordSet(json);
                            resolve(FWS_ENGLISH.https);
                        } catch (e) {
                            logger.warn(
                              `English.wordSet()`,
                              `fetch ${FWS_URL} => ${e.message}.`,
                              `Loading fallback English.wordSet from file`,
                              );
                            resolve(await English.wordSet({source:'file'}));
                        }})();
                    });
                    FWS_ENGLISH.lastFetch = Date.now();
                } 
                return await FWS_ENGLISH.https;
            } else {
                if (FWS_ENGLISH.file == null) {
                    let fwsPath = path.join(__dirname, 'assets/fws-en.json');
                    let json = JSON.parse(fs.readFileSync(fwsPath));
                    FWS_ENGLISH.file = new FuzzyWordSet(json);
                }
                return FWS_ENGLISH.file; 
            }
        }
    }

    module.exports = exports.English = English;
})(typeof exports === "object" ? exports : (exports = {}));

