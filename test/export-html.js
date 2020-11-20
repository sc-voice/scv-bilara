(typeof describe === 'function') && describe("export-html", function() {
    const should = require("should");
    const {
        ExportHtml,
        BilaraData,
        Seeker,
    } = require("../index");
    this.timeout(5*1000);

    it("TESTTESTdefault ctor", ()=>{
        let eh = new ExportHtml();
        should(eh.bilaraData).instanceOf(BilaraData);
        should(eh.seeker).instanceOf(Seeker);
    });
    it("TESTTESTinitialize()", async()=>{
        let eh = new ExportHtml();

        // constructor does not initialize
        should(eh.bilaraData.initialized).equal(false);
        should(eh.seeker.initialized).equal(false);
        should(eh.initialized).equal(false);

        should(await eh.initialize()).equal(eh);
        should(eh.bilaraData.initialized).equal(true);
        should(eh.seeker.initialized).equal(true);
        should(eh.initialized).equal(true);

        // initialize can be called more than once
        should(await eh.initialize()).equal(eh);
        should(eh.bilaraData.initialized).equal(true);
        should(eh.seeker.initialized).equal(true);
        should(eh.initialized).equal(true);
    });
    it("TESTTESTexport(suid)", async()=>{
        let eh = await new ExportHtml().initialize();
        let lines = await eh.export('thig4.1', 2);
        let length = 45;
        should(lines.length).equal(length);
        should.deepEqual(lines.slice(-5),[
            '<div class=\"verse\" id=\"thig4.1:5.1\">\n<a href=\"https://suttacentral.net/thig4.1/en/sujato#thig4.1:5.1\">Thig4.1:5.1</a>',
            '<p class=\"pali_verse_paragraph\" lang=\"pi\" translate=\"no\">',
            '…<br/>\nBhaddā kāpilānī therī ….',
            '</p>',
            '</div>',
        ]);
    });
});
