import { describe, it, expect } from '@sc-voice/vitest';
import PKG from '../index.js';
const { Pali } = PKG;

describe("pali", { timeout: 5*1000 }, function() {
    it("romanizePattern(pattern) should return the Pali pattern", ()=>{
        expect(Pali.romanizePattern("jhana")).toBe('jh(a|ā)(n|ṅ|ñ|ṇ)(a|ā)');
        expect(Pali.romanizePattern("abcdefghijklmn"))
        .toBe('(a|ā)bc(d|ḍ)efgh(i|ī)jk(l|ḷ)(m|ṁ|ṃ)(n|ṅ|ñ|ṇ)')
        expect(Pali.romanizePattern("nopqrstuvwxyz"))
        .toBe('(n|ṅ|ñ|ṇ)opqrs(t|ṭ)(u|ū)vwxyz');
    });
    it("recognizes Pali words", { timeout: 5*1000 }, async()=>{
        let paliWords = await Pali.wordSet();
        expect(paliWords.trace('ye')).toEqual({
            trace: 'ye',
            member: true,
        });
        expect(paliWords.trace('buddha')).toEqual({
            trace: 'buddha',
            member: true,
        });
        expect(paliWords.trace('ananda')).toEqual({
            trace: 'anand',
            member: true,
        });
        expect(paliWords.trace('analayo')).toEqual({
            trace: 'analayo',
            member: true,
        });
        expect(paliWords.trace('bhante')).toEqual({
            trace: 'bha',
            member: true,
        });
        expect(paliWords.trace('anataph')).toEqual({
            trace: 'anataph★',
            member: false,
        });
    });
    it("recognizes non-Pali words", { timeout: 5*1000 }, async()=>{
        let paliWords = await Pali.wordSet();
        expect(paliWords.trace('kloster')).toEqual({
            trace: 'klo★',
            member: false,
        });
        expect(paliWords.trace('an')).toEqual({
            trace: 'an★', // Anguttara Nikaya English abbreviation
            member: false,
        });
        expect(paliWords.trace('mn')).toEqual({
            trace: 'mn', // Majjhima Nikaya English abbreviation
            member: false,
        });
        expect(paliWords.trace('anal')).toEqual({
            trace: 'anal★',
            member: false,
        });
        expect(paliWords.trace('analyse')).toEqual({
            trace: 'analy★',
            member: false,
        });
        expect(paliWords.trace('analyze')).toEqual({
            trace: 'analy★',
            member: false,
        });
    });
    it("hyphenate(word) => handles MN142", ()=>{
        var word = [
            "abhivādanapaccuṭṭhānaañjalikammasāmīci",
            "kammacīvarapiṇḍapātasenāsanagilānappa",
            "ccayabhesajjaparikkhārānuppadānena",
        ].join('');
        var pali = new Pali();
        var hyphenated = pali.hyphenate(word);
        expect(hyphenated.split('\u00ad')).toEqual([
            `abhivā`,
            `danapac`,
            `cuṭṭhā`,
            `naañjali`,
            `kamma`,
            `sāmīci`,
            `kamma`,
            `cīvara`,
            `piṇḍa`,
            `pātasenā`,
            `sanagilā`,
            `nappacca`,
            `yabhesajja`,
            `parik`,
            `khārānup`,
            `padā`,
            `nena`,
        ]);
    });
});
