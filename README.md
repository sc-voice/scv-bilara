# scv-bilara
SuttaCentral Voice adapter for Bilara

### Installation
Open a Linux terminal window and change to the directory
where you want to install `scv-bilara`. For example:

```bash
mkdir -p ~/dev
cd ~/dev
```
If you haven't installed git yet on your computer, follow this instruction: https://github.com/git-guides/install-git.

Now install `scv-bilara`:

```bash
git clone https://github.com/sc-voice/scv-bilara
cd scv-bilara
./scripts/install
```

### Get the latest content
Once your software has been installed, you'll want the latest content. 
You can run this as frequently as you wish, 
since SuttaCentral has an ongoing review process that
results in frequent updates to existing translations.
In addition, new translations are constantly being 
added for multiple languages.

```
scripts/get-content
```

For low-bandwidth users, the initial content transfer will take a long time since it is almost 1GB of data.  Subsequent updates are incremental.


### Verify your installation:
```
scripts/env-info
```

You should see something like this:
```
ENVIRONMENT VERSION INFORMATION
===============================
   npm --version        => EXPECTED:8.x.x ACTUAL:8.6.0
   node --version       => EXPECTED:v16.x.x ACTUAL:v16.15.0
   rg --version         => EXPECTED:ripgrep 12.x.x ... ACTUAL:ripgrep 12.1.1 (rev 7cb211378a) -SIMD -AVX (compiled) +SIMD +AVX (runtime)                               
   sudo lsb_release -r  => EXPECTED:Release: 10 ACTUAL:Release: 10

SEARCH TIMES FOR "root of suffering"
====================================
Checking grep...

real    0m2.358s
user    0m0.879s
sys     0m1.073s

Checking ripgrep...

real    0m0.039s
user    0m0.025s
sys     0m0.031s
```


### Scripts

#### search
Scriptable linux command-line utility that 
searches for suttas by id, phrase or keyword in multiple languages
(e.g., pli, en, de). Output result formats include: human-readable, 
CSV, or JSON. Search patterns can be:

* **SuttaCentral ids** search by sutta and/or segment id. E.g.: "mn1", "an1.2-15", "mn1,mn3", "mn1:1.1"
* **phrase search** looks for matching phrase. E.g: "nandi dukkha"
* **keyword search** looks for matching keywords. E.g.: "blue red white"
* **romanized search** ignores Pali diacriticals. E.g., "ananda"

Example:

```bash
./scripts/search nandi dukk
```

<a href="https://raw.githubusercontent.com/sc-voice/scv-bilara/master/src/assets/search-nandi.png">
<img src="https://raw.githubusercontent.com/sc-voice/scv-bilara/master/src/assets/search-nandi.png" height=400px></a>

For more information, `./scripts/search --help`.

#### branch SUTTA LANG TRANSLATOR
Create a Github bilara-data branch for working on an unpublished translation.

For more information, './scripts/bilara-auth --help'

#### publish SUTTA _(DEPRECATED)_
Merge the contents of the unpublished SUTTA branch into `master`. 
Upon success, delete the merged SUTTA branch, which will be empty of changes.

### API
The `scv-bilara` library has Javascript classes for

* **BilaraData** abstraction for the *bilara-data* container itself
* **BilaraPath** utility for parsing file paths local to *bilara-data*
* **DETranslation** wrapper for Anagarika Sabbamitta's German translations
* **English** FuzzyWordSet that recognizes English words
* **ExecGit** Simple Javascript Git wrapper
* **FuzzyWordSet** Determines set membership by prefix matching
* **MLDoc** Multilingual segmented document
* **Pali** FuzzyWordSet that recognizes Pali words
* **Seeker** Search engine. See `scripts/search`
* **SegDoc** Single-language segmented document
* **SuttaCentralId** utility for matching and parsing SuttaCentral Ids
* **Unicode** multilingual helper

