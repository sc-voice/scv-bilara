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

### Scripts

#### de-suttas.sh
Enter the following in the `scv-bilara` terminal window. As the script
runs, you may be prompted for your Github username and/or password
unless you have previously set up an [ssh-agent](https://www.ssh.com/ssh/agent) 
authentication for Github.

```bash
./scripts/de-suttas.sh
```

#### search.js
Search bilara for Pali, English or German segments, returning all
three languages as found.

```bash
./scripts/search.js wurzel des leidens
./scripts/search.js root of suffering
./scripts/search.js nandi dukkhassa
```
