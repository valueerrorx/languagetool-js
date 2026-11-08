// Unicode tables bundled into the browser build (package.json "imports" #unicode-tables, every condition except "node"):
// Character.js needs them while the modules evaluate, before preloadResources() can run.
import props from './props.json' with { type: 'json' };
import caseTable from './case.json' with { type: 'json' };
import normalizer from './normalizer.json' with { type: 'json' };

export const BUNDLED_TABLES = { props, case: caseTable, normalizer };
