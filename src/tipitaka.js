(function(exports) { 
    const { suidmap:SUID_MAP } = require('./auto/suidmap');
    const { logger } = require('log-instance');
    const SuttaCentralId = require('./sutta-central-id');

    class Tipitaka {
        constructor(opts={}) {
            (opts.logger || logger).logInstance(this, opts);
            let { 
                suidMap = SUID_MAP,
            } = opts;
            let suids = Object.keys(suidMap).sort(SuttaCentralId.compareLow);
            Object.assign(this, {
                suidMap,
                suids,
            });
        }

        nikayaOfSuid(suid='') {
            return suid.replace(/[-.0-9]+(\/.*)?/, '');
        }

        nextSuid(suid) {
            let { compareLow, compareHigh } = SuttaCentralId;
            let { suids } = this;
            let nikaya = this.nikayaOfSuid(suid);
            for (let i = 0; i < suids.length; i++) {
                let si = suids[i];
                let cmpL = compareHigh(suid, si);
                if (cmpL < 0) {
                    return this.nikayaOfSuid(si) === nikaya ? si : null;
                }
            }
            return null;
        }

        previousSuid(suid) {
            let { compareLow, compareHigh } = SuttaCentralId;
            let { suids } = this;
            let nikaya = this.nikayaOfSuid(suid);
            for (let i = suids.length; 0 < i--; ) {
                let si = suids[i];
                let cmpL = compareLow(si, suid);
                if (cmpL < 0) {
                    return this.nikayaOfSuid(si) === nikaya ? si : null;
                }
            }
            return null;
        }

    }

    module.exports = exports.Tipitaka = Tipitaka;
})(typeof exports === "object" ? exports : (exports = {}));
