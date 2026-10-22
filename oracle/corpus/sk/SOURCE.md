# sk corpus

Sources:
- Wikisource (sk.wikisource.org, page "Dva dni v Chujave"), "Dva dni v Chujave", Jonáš Záborský (d. 1876), https://sk.wikisource.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=Dva%20dni%20v%20Chujave (326 sentences, stride 1)
Licence: public domain (authors died more than 70 years ago; Gutenberg text used without the Gutenberg licence header/footer, Wikisource text as plain extract).
Selection: oracle/scripts/fetch-corpus.mjs (every strideth paragraph of 150-900 chars with 3-8 sentences from 5% into each text, until the per-source sentence quota). 78 paragraphs, about 326 sentences.
Used as test input only (D-045).
