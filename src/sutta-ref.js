(function(exports) {
  const { SuttaCentralId } = require('scv-esm');
  const assert = require('assert');
  const SUID_MAP = require('./auto/suidmap.json');
  const SUIDS = Object.keys(SUID_MAP).sort(SuttaCentralId.compareLow);

  class SuttaRef {
    constructor({sutta_uid, lang, author, segnum}) {
      assert(!!sutta_uid);
      assert(sutta_uid.length > 0);
      assert(!sutta_uid.match('/'));
      Object.assign(this, {
        sutta_uid,
        lang,
        author,
        segnum,
      });
    }

    static create(strOrObj, defaultLang='pli', suids=SUIDS) {
      if (typeof strOrObj === 'string') {
        let refLower = strOrObj.toLowerCase();
        let [ ref, segnum ] = refLower.split(':');
        let [ 
          sutta_uid, 
          lang=defaultLang, 
          author,
        ] = ref.replace(/ /ug,'').split('/');
        let { compareLow, compareHigh } = SuttaCentralId;
        let keys = suids.filter(k=>{
          return compareLow(k, sutta_uid)<=0 && compareHigh(sutta_uid, k)<=0;
        });
        if (keys.length === 1) {
          return new SuttaRef({
            sutta_uid: keys[0], 
            lang,
            author,
            segnum,
          });
        }
      } else if (strOrObj) {
        let parsed = SuttaRef.create(strOrObj.sutta_uid, strOrObj.lang||defaultLang);
        let { sutta_uid, lang, author, segnum } = parsed || {};
        return new SuttaRef({
          sutta_uid, 
          lang,
          author:author || strOrObj.author || strOrObj.translator,
          segnum:segnum || strOrObj.segnum,
        });
      }

      return null;
    }

  }

  module.exports = exports.SuttaRef = SuttaRef;

})(typeof exports === "object" ? exports : (exports = {}));
