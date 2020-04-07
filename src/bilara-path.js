(function(exports) {
    class BilaraPath {
        constructor(bilaraPath) {
            Object.assign(this, BilaraPath.pathParts(bilaraPath));
        }

        static htmlPath(mid) {
            var lang = 'pli';
            var auth = 'ms';
            return [
                'html',
                lang,
                `${auth}/sutta`,
                `${mid}_html.json`,
            ].join('/');
        }

        static variantPath(mid) {
            var lang = 'pli';
            var auth = 'ms';
            return [
                'variant',
                lang,
                `${auth}/sutta`,
                `${mid}_variant-${lang}-${auth}.json`,
            ].join('/');
        }
        static referencePath(mid) {
            var lang = 'pli';
            var auth = 'ms';
            return [
                'reference',
                lang,
                `${auth}/sutta`,
                `${mid}_reference.json`,
            ].join('/');
        }
        static rootPath(mid) {
            var lang = 'pli';
            var auth = 'ms';
            return [
                'root',
                lang,
                `${auth}/sutta`,
                `${mid}_root-${lang}-${auth}.json`
            ].join('/');
        }
        static translationPath(mid,lang,auth) {
            return [
                'translation',
                lang,
                `${auth}/sutta`,
                `${mid}_translation-${lang}-${auth}.json`
            ].join('/');
        }
        static commentPath(mid,lang,auth) {
            return [
                'comment',
                lang,
                `${auth}/sutta`,
                `${mid}_comment-${lang}-${auth}.json`
            ].join('/');
        }

        static pathParts(bilaraPath) {
            var bpParts = bilaraPath.split('/');
            var fname = bpParts.pop();
            var type = bpParts[0];
            var lang = bpParts[1];
            var author_uid = bpParts[2];
            var category = bpParts[3];
            var collection = bpParts[4];
            var suid = fname.replace(/_.*$/,'');
            var suttaRef = `${suid}/${lang}/${author_uid}`;
            return {
                suid,
                type,
                category,
                collection,
                lang,
                author_uid,
                suttaRef,
                bilaraPath,
            };
        }

    }

    module.exports = exports.BilaraPath = BilaraPath;
})(typeof exports === "object" ? exports : (exports = {}));

