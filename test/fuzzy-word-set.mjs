import { describe, it, expect } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import PKG from '../index.js';
const { FuzzyWordSet, Unicode } = PKG;

const HELLO_STATES = {
    h: {
        'e': true,
        other: false,
    },
};

describe("fuzzy-word-set", function() {
    it("default ctor", () => {
        var fws = new FuzzyWordSet();
        expect(fws).toMatchObject({
            maxTrain: 10,
            ignoreCase: true,
        });
    });
    it("contains(word) => set membership", ()=>{
        var fws = new FuzzyWordSet();
        expect(fws.contains('hello')).toBe(false);
        expect(fws.contains('goodbye')).toBe(false);
        expect(fws.contains('howdy')).toBe(false);

        expect(fws.include('hello')).toBe(true);
        expect(fws.contains('hello')).toBe(true);
        expect(fws.contains('goodbye')).toBe(false);

        // it's a fuzzy set!
        expect(fws.contains('howdy')).toBe(true);
    });
    it("include(...) clarifies set membership", ()=>{
        var fws = new FuzzyWordSet();
        expect(fws.contains('hello')).toBe(false);
        expect(fws.contains('howdy')).toBe(false);

        expect(fws.include('hello')).toBe(true);
        expect(fws.contains('hello')).toBe(true);
        expect(fws.contains('howdy')).toBe(true);

        expect(fws.include('howdy', false)).toBe(true);
        expect(fws.contains('hello')).toBe(false); // we broke hello
        expect(fws.contains('howdy')).toBe(false);

        expect(fws.include('hello')).toBe(true); // we fixed hello
        expect(fws.contains('hello')).toBe(true);
        expect(fws.contains('howdy')).toBe(false);
    });
    it("train(...) handles prefixes", ()=>{
        var fws = new FuzzyWordSet();
        var iterations = fws.train({
            abc: true,
            a: false,
            'übung': false,
        });
        expect(fws.contains('abc')).toBe(true);
        expect(fws.contains('a')).toBe(false);
        expect(fws.contains('b')).toBe(false);
        expect(fws.contains('übung')).toBe(false);
        expect(fws.contains('ü')).toBe(false);
        expect(JSON.stringify(fws.states)).toBe(
            '{"a":{"":0,"★":0,"b":{"c":1,"★":0}}}'
        );
        expect(iterations).toBe(2);
    });
    it("trace(...) shows detail", ()=>{
        var fws = new FuzzyWordSet();
        for (var i = 0; i < 3; i++) {
            fws.train({
                "ānanda": true,
                ananda: true,
                andhakavinde: true,
                andhakar: true,
                andhakāre: true,
                andhakavinda: false,
                and: false,
                an: false,
            });
        }
        expect(fws.trace('ananda')).toEqual({
            trace: 'ana',
            member: true,
        });
        expect(fws.trace('ānanda')).toEqual({
            trace: 'ā',
            member: true,
        });
        expect(fws.trace('an')).toEqual({
            trace: 'an★',
            member: false,
        });
        expect(fws.trace('and')).toEqual({
            trace: 'and★',
            member: false,
        });
    });
    it("can be serialized", ()=>{
        var fws = new FuzzyWordSet();
        var iterations = fws.train({
            hello: true,
            howdy: false,
            hell: false,
        });

        // serialize and test deserialized copy
        var json = JSON.stringify(fws);
        var fws2 = new FuzzyWordSet(JSON.parse(json));
        expect(fws2.contains('hello')).toBe(true);
        expect(fws2.contains('hell')).toBe(false);
        expect(fws2.contains('howdy')).toBe(false);
        expect(fws2.unicode.reSymbols.test('a')).toBe(false);
    });
    it("ignores symbols", ()=>{
        var fws = new FuzzyWordSet();
        fws.include('"red"');
        expect(fws.contains('red')).toBe(true);
        expect(fws.contains('"red?"')).toBe(true);
        expect(fws.contains('red, ')).toBe(true);
        expect(fws.contains('blue!')).toBe(false);
        expect(fws.contains('blue?')).toBe(false);
    });

});
