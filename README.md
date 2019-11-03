# scv-bilara
SuttaCentral Voice adapter for Bilara

### Installation
Open a Linux terminal window and change to the directory
where you want to install `scv-bilara`. For example:

```bash
mkdir -p ~/dev
cd ~/dev
```

Now install `scv-bilara`:

```bash
git clone https://github.com/sc-voice/scv-bilara
cd scv-bilara
./scripts/install.sh
```

The installation script has been known to fail if it cannot install 
NodeJS v10.17.0. If you encounter this, install NodeJS v10.17.0 manually
and repeat the installation above.

##### bilara-data
By default, `scv-bilara` works with the `sc-voice/bilara-data` fork of 
[SuttaCentral bilara-data](https://github.com/suttacentral/bilara-data). 
To use `scv-bilara` with any other fork of `bilara-data`, simply clone
the desired repository into the `local` subdirectory before using any scripts. Notice that
any existing bilara-data must be removed.

```
rm -rf local/bilara-data
git clone https://github.com/suttacentral/bilara-data local/bilara-data
```

For those who prefer Git over SSH:

```
rm -rf local/bilara-data
git clone git@github.com:suttacentral/bilara-data local/bilara-data
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

#### bilara-auth
Scv-bilara normally clones `sc-voice/bilara-data` into `local/bilara-data` 
using HTTPS authentication. This may become annoying to enter username/password
for every scv-bilara script that authenticates with Github. You can also use
[Github SSH authentication](https://help.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh)
to painlessly avoid username/password entry. To use SSH authentication,
you'll need to use `bilara-auth ssh`. We recommend SSH authentication
unless you like typing your username/password a lot.
And if you choose SSH authentication, we recommend using an ssh-agent
so that you don't have to keep typing in the passphrase:

```
eval `ssh-agent -s`; ssh-add ~/.ssh/id_rsa
```

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
