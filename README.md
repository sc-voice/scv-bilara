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

### Scripts

#### search.js
Linux command-line utility that searches up to three languages (e.g., pli, en, de)
and returns bi- or tri-lingual results in human-readable, csv or JSON formats.
For more information, `./scripts/search.js --help`.

```bash
./scripts/search.js wurzel des leidens
./scripts/search.js root of suffering
./scripts/search.js nandi dukkhassa
```

