# de corpus

Sources:
- Project Gutenberg #7205, "Also sprach Zarathustra", Friedrich Nietzsche (d. 1900), https://www.gutenberg.org/cache/epub/7205/pg7205.txt (90 sentences, stride 2)
- Project Gutenberg #40739, "Die Traumdeutung", Sigmund Freud (d. 1939), https://www.gutenberg.org/cache/epub/40739/pg40739.txt (101 sentences, stride 2)
- Project Gutenberg #5323, "Effi Briest", Theodor Fontane (d. 1898), https://www.gutenberg.org/cache/epub/5323/pg5323.txt (81 sentences, stride 2)
- Project Gutenberg #22367, "Die Verwandlung", Franz Kafka (d. 1924), https://www.gutenberg.org/cache/epub/22367/pg22367.txt (50 sentences, stride 1)
Licence: public domain (authors died more than 70 years ago; Gutenberg text used without the Gutenberg licence header/footer).
Selection: oracle/scripts/fetch-corpus.mjs (every strideth paragraph of 150-900 chars with 3-8 sentences from 5% into each text, until the per-source sentence quota). 81 paragraphs, about 322 sentences.
Used as test input only (D-045).
