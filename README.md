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

### Get the latest data
Once your software has been installed, you'll want the latest data. 
You can run this as frequently as you wish, 
since SuttaCentral has an ongoing review process that
results in frequent updates to existing translations.
In addition, new translations are constantly being added for multiple languages.

```
scripts/get-data
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

#### publish SUTTA
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

