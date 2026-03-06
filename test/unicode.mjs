import { describe, it, expect } from '@sc-voice/vitest';
import PKG from '../index.js';
const { Unicode } = PKG;

describe("unicode", function() {
    it("default ctor", () => {
        var u = new Unicode();
        expect(Object.keys(u)).toEqual([]);
    });
    it("romanize(text) returns romanized text", function() {
        var u = new Unicode();
        expect(u.LSQUOTE).toBe(Unicode.LSQUOTE);
        expect(u.LSQUOTE).toBe( '\u2018' );
        expect(u.RSQUOTE).toBe( '\u2019' );
        expect(u.LDQUOTE).toBe( '\u201C' );
        expect(u.RDQUOTE).toBe( '\u201D' );
        expect(u.HYPHEN).toBe( '\u2010' );
        expect(u.APOSTROPHE).toBe( '\u02BC' );
        expect(u.ENDASH).toBe( '\u2013' );
        expect(u.EMDASH).toBe( '\u2014' );
        expect(u.ELLIPSIS).toBe( '\u2026' );
        expect(u.A_MACRON).toBe( '\u0100' );
        expect(u.a_MACRON).toBe( '\u0101' );
        expect(u.u_MACRON).toBe( '\u016d' );
    });
    it("romanize(text) returns romanized text", function() {
        var u = new Unicode();
        expect(u.romanize("abc")).toBe('abc');
        expect(u.romanize("Abc")).toBe('abc');
        expect(u.romanize("Tath\u0101gata")).toBe('tathagata');
        expect(u.romanize("Ukkaṭṭhā")).toBe('ukkattha');
        expect(u.romanize("Bhikkhū")).toBe('bhikkhu');
        expect(u.romanize("tassā'ti")).toBe("tassa'ti");
        expect(u.romanize("saññatvā")).toBe(`sannatva`);
        expect(u.romanize("pathaviṃ")).toBe(`pathavim`);
        expect(u.romanize("viññāṇañcāyatanato")).toBe(`vinnanancayatanato`);
        expect(u.romanize("diṭṭhato")).toBe(`ditthato`);
        expect(u.romanize("khīṇāsavo")).toBe(`khinasavo`);
        expect(u.romanize("pavaḍḍhanti")).toBe(`pavaddhanti`);
        expect(u.romanize("ĀḌḤĪḶḸṂṆÑṄṚṜṢŚṬŪṁ")).toBe(`adhillmnnnrrsstum`);
        expect(u.romanize("'Nandī dukkhassa mūlan'ti—"))
            .toBe("'nandi dukkhassa mulan'ti—");
    });
    it("stripSymbols(text) strips non word chars", ()=>{
        var u = new Unicode();
        expect(u.stripSymbols(`happy`)).toBe(`happy`);
        expect(u.stripSymbols(`"happy!"`)).toBe(`happy`);
    });

});
