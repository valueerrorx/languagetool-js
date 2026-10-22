# it corpus

Sources:
- Project Gutenberg #52484, "Le avventure di Pinocchio", Carlo Collodi (d. 1890), https://www.gutenberg.org/cache/epub/52484/pg52484.txt (90 sentences, stride 1)
- Project Gutenberg #45334, "I promessi sposi, vol. 1", Alessandro Manzoni (d. 1873), https://www.gutenberg.org/cache/epub/45334/pg45334.txt (124 sentences, stride 3)
- Project Gutenberg #25179, "La carità del prossimo", Vittorio Bersezio (d. 1900), https://www.gutenberg.org/cache/epub/25179/pg25179.txt (111 sentences, stride 2)
Licence: public domain (authors died more than 70 years ago; Gutenberg text used without the Gutenberg licence header/footer, Wikisource text as plain extract).
Selection: oracle/scripts/fetch-corpus.mjs (every strideth paragraph of 150-900 chars with 3-8 sentences from 5% into each text, until the per-source sentence quota). 79 paragraphs, about 325 sentences.
Used as test input only (D-045).
