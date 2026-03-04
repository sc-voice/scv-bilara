import { describe, it, expect } from '@sc-voice/vitest';
import { logger } from 'log-instance';
import PKG from '../index.js';
const { English } = PKG;

describe("english", { timeout: 5*1000 }, function() {
    it("romanizePattern(pattern) should return the English pattern", ()=>{
        expect(English.romanizePattern("jhana")).toBe('jhana');
        expect(English.romanizePattern("abcdefghijklmnnopqrstuvwxyz"))
        .toBe('abcdefghijklmnnopqrstuvwxyz');
    });
    it("recognizes English initial characters", { timeout: 5*1000 }, async()=>{
        let enWords = await English.wordSet({source:'file'});
        expect(Object.keys(enWords.states).sort().join(''))
            .toBe(`abcdefghijklmnopqrstuvwxyzʻ`);
    });
    it("recognizes English words", { timeout: 5*1000 }, async()=>{
        let enWords = await English.wordSet({source:'file'});
        expect(enWords.trace('rather')).toEqual({
            trace: 'rather',
            member: true,
        });
        expect(enWords.trace('unbusied')).toEqual({
            trace: 'unbusi',
            member: true,
        });
        expect(enWords.trace('unburdensome')).toEqual({
            trace: 'unburd',
            member: true,
        });
        expect(enWords.trace('auger')).toEqual({
            trace: 'auger',
            member: true,
        });
        expect(enWords.trace('an')).toEqual({
            trace: 'an', // Anguttara Nikaya English abbreviation
            member: true,
        });
        expect(enWords.trace('mn')).toEqual({
            trace: 'mn', // Majjhima Nikaya English abbreviation
            member: true,
        });
        expect(enWords.trace('anal')).toEqual({
            trace: 'anal',
            member: true,
        });
        expect(enWords.trace('analyse')).toEqual({
            trace: 'analys',
            member: true,
        });
        expect(enWords.trace('analyze')).toEqual({
            trace: 'analyze',
            member: true,
        });
    });
    it("recognizes non-English words", { timeout: 5*1000 }, async()=>{
        let enWords = await English.wordSet({source:'file'});

        expect(enWords.trace('abnehmend')).toEqual({
            trace: 'abneh',
            member: false,
        });
        expect(enWords.contains('abnehmend')).toBe(false);
        expect(enWords.trace('blind')).toEqual({
            trace: 'blind★',
            member: false,
        });
        expect(enWords.trace('rat')).toEqual({
            trace: 'rat★',
            member: false,
        });
        expect(enWords.trace('食べ物を贈る')).toEqual({
            trace: '食★',
            member: false,
        });
        expect(enWords.trace('ye')).toEqual({
            trace: 'ye★',
            member: false,
        });
        expect(enWords.trace('fingerschnippen')).toEqual({
            trace: 'fingersc★',
            member: false,
        });
        expect(enWords.trace('makel')).toEqual({
            trace: 'makel',
            member: false,
        });
        expect(enWords.trace('auge')).toEqual({
            trace: 'auge',
            member: false,
        });
        expect(enWords.trace('auger')).toEqual({
            trace: 'auger',
            member: true,
        });
        expect(enWords.trace('wurzel')).toEqual({
            trace: 'wu★',
            member: false,
        });
        expect(enWords.trace('ananda')).toEqual({
            trace: 'anand★',
            member: false,
        });
        expect(enWords.trace('analayo')).toEqual({
            trace: 'anala★',
            member: false,
        });
        expect(enWords.trace('bhante')).toEqual({
            trace: 'bhan★',
            member: false,
        });
        expect(enWords.trace('anataph')).toEqual({
            trace: 'anata★',
            member: false,
        });
    });
    it("wordSet(...)=>latest word set", { timeout: 5*1000 }, async()=>{
        //logger.logLevel = 'info';
        let longWait = 1500;
        let msStart = Date.now();
        let enWords = await English.wordSet();
        let msElapsed = Date.now() - msStart;
        expect(msElapsed).toBeGreaterThanOrEqual(-1);
        expect(msElapsed).toBeLessThan(longWait);

        // cached
        msStart = Date.now();
        enWords = await English.wordSet();
        msElapsed = Date.now() - msStart;
        expect(msElapsed).toBeGreaterThanOrEqual(-1);
        expect(msElapsed).toBeLessThan(2);

        // maxAge
        let maxAge = 0.05;
        let fetch = English.FETCH;
        await new Promise(r=>setTimeout(()=>r(),100));
        msStart = Date.now();
        enWords = await English.wordSet({fetch, maxAge});
        msElapsed = Date.now() - msStart;
        expect(msElapsed).toBeGreaterThan(40);
        expect(msElapsed).toBeLessThan(longWait);

        expect(enWords.trace('unbusied')).toEqual({
            trace: 'unbusi',
            member: true,
        });
    });
    it("FETCH", { timeout: 5*1000 }, async()=>{
      const msg = "test.english@149";
      const URL = [
        "https://raw.githubusercontent.com",
        "sc-voice/scv-bilara/main",
        "package.json",
      ].join('/');
      let resFetch = await fetch(URL);
      let json = await resFetch.json();

      let { data } = await English.FETCH(URL);
      expect(data).toEqual(json);
    });
});
