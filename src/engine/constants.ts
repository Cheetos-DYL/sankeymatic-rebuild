import type { SettingDef } from './types';
import { MAXBREAKPOINT } from './types';

export const IN = 13;
export const OUT = 17;
export const BEFORE = 19;
export const AFTER = 23;
export const NODE_OBJ = 'node';
export const colorGray60 = '#999';

export const reWholeNumber = /^\d+$/;
export const reHalfNumber = /^\d+(?:\.5)?$/;
export const reInteger = /^-?\d+$/;
export const reDecimal = /^\d(?:.\d+)?$/;
export const reCommentLine = /^(?:'|\/\/)/;
export const reYesNo = /^(?:y|yes|n|no)/i;
export const reYes = /^(?:y|yes)/i;
export const reFlowLine = /^(?<sourceNode>.+)\[(?<amount>[\d\s.+-]+|\*|\?|)\](?<targetNodePlus>.+)$/;
export const reFlowTargetWithSuffix = /^(.+)\s+(#\S+)$/;
export const reRGBColor = /^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i;
export const reBareColor = /^(?:[a-f0-9]{3}|[a-f0-9]{6})$/i;
export const reNodeLineLoose = /^:(.+) #([a-f0-9]{0,6})?(\.\d{1,4})?\s*(>>|<<)*\s*(>>|<<)*$/i;
export const reNodeLineStrict = /^node\s+([^ .]+)$/i;
export const reAttributeLine = /^\.([a-z]+)\s+(.+)$/i;
export const reSettingsValue = /^((?:\w+\s*){1,2}) (#?[\w.-]+)$/;
export const reSettingsText = /^((?:\w+\s*){1,2}) '(.*)'$/;
export const reMoveLine = /^move (.+) (-?\d(?:.\d+)?), (-?\d(?:.\d+)?)$/;
export const reColorPlusOpacity = /^#([a-f0-9]{3,6})?(\.\d{1,4})?$/i;

export const validAttributes = new Map<string, Set<string>>([
  [NODE_OBJ, new Set(['label'])],
]);

export const skmSettings = new Map<string, SettingDef>([
  ['size_w', ['whole', 600, [40]]],
  ['size_h', ['whole', 600, [40]]],
  ['margin_l', ['contained', 12, [0, 'w']]],
  ['margin_r', ['contained', 12, [0, 'w']]],
  ['margin_t', ['contained', 18, [0, 'h']]],
  ['margin_b', ['contained', 20, [0, 'h']]],
  ['bg_color', ['color', '#ffffff', []]],
  ['bg_transparent', ['yn', 'n', []]],
  ['node_w', ['contained', 9, [0, 'w']]],
  ['node_h', ['half', 50, [0, 100]]],
  ['node_spacing', ['half', 85, [0, 100]]],
  ['node_border', ['contained', 0, [0, 'w']]],
  ['node_theme', ['radio', 'none', ['a', 'b', 'c', 'd', 'none']]],
  ['node_color', ['color', '#888888', []]],
  ['node_opacity', ['decimal', 1.0, []]],
  ['flow_curvature', ['decimal', 0.5, []]],
  ['flow_inheritfrom', ['radio', 'none', ['source', 'target', 'outside-in', 'none']]],
  ['flow_color', ['color', '#999999', []]],
  ['flow_opacity', ['decimal', 0.45, []]],
  ['layout_order', ['radio', 'automatic', ['automatic', 'exact']]],
  ['layout_justifyorigins', ['yn', 'n', []]],
  ['layout_justifyends', ['yn', 'n', []]],
  ['layout_reversegraph', ['yn', 'n', []]],
  ['layout_attachincompletesto', ['radio', 'nearest', ['leading', 'nearest', 'trailing']]],
  ['labels_color', ['color', '#000000', []]],
  ['labels_hide', ['yn', 'n', []]],
  ['labels_highlight', ['decimal', 0.75, []]],
  ['labels_fontface', ['radio', 'sans-serif', ['monospace', 'sans-serif', 'serif']]],
  ['labels_linespacing', ['decimal', 0.15, []]],
  ['labels_relativesize', ['whole', 100, [50, 150]]],
  ['labels_magnify', ['whole', 100, [50, 150]]],
  ['labelname_appears', ['yn', 'y', []]],
  ['labelname_size', ['half', 16, [6]]],
  ['labelname_weight', ['whole', 400, [100, 700]]],
  ['labelvalue_appears', ['yn', 'y', []]],
  ['labelvalue_fullprecision', ['yn', 'y', []]],
  ['labelvalue_position', ['radio', 'below', ['above', 'before', 'after', 'below']]],
  ['labelvalue_weight', ['whole', 400, [100, 700]]],
  ['labelposition_autoalign', ['integer', 0, [-1, 1]]],
  ['labelposition_scheme', ['radio', 'auto', ['auto', 'per_stage']]],
  ['labelposition_first', ['radio', 'before', ['before', 'after']]],
  ['labelposition_breakpoint', ['breakpoint', MAXBREAKPOINT, [2]]],
  ['value_format', ['list', ',.', [',.', '.,', ' .', ' ,', 'X.', 'X,']]],
  ['value_prefix', ['text', '', [0, 99]]],
  ['value_suffix', ['text', '', [0, 99]]],
  ['themeoffset_a', ['whole', 9, [0, 9]]],
  ['themeoffset_b', ['whole', 0, [0, 9]]],
  ['themeoffset_c', ['whole', 0, [0, 7]]],
  ['themeoffset_d', ['whole', 0, [0, 11]]],
  ['meta_mentionsankeymatic', ['yn', 'y', []]],
  ['meta_listimbalances', ['yn', 'y', []]],
  ['internal_iterations', ['whole', 25, [0, 50]]],
  ['internal_revealshadows', ['yn', 'n', []]],
]);

export interface SampleRecipe {
  name: string;
  flows: string;
  settings: Record<string, string>;
}

export const sampleDiagramRecipes = new Map<string, SampleRecipe>([
  [
    'simple_start',
    {
      name: 'Start Simple',
      flows: `Wages [1500] Budget
Other [250] Budget
Budget [450] Taxes
Budget [420] Housing
Budget [400] Food
Budget [255] Transportation
:Budget #057
Budget [*] Savings`,
      settings: {
        size_h: '600',
        size_w: '600',
        node_w: '12',
        node_h: '50',
        node_spacing: '80',
        node_border: '0',
        node_theme: 'none',
        flow_inheritfrom: 'none',
        layout_justifyends: 'n',
        layout_order: 'automatic',
        labelname_size: '18',
        labelname_weight: '400',
        labelposition_scheme: 'auto',
        labelposition_autoalign: '0',
        labels_highlight: '0.75',
        labels_magnify: '100',
        labels_relativesize: '100',
        labelvalue_appears: 'y',
        labelvalue_position: 'after',
        value_prefix: '',
      },
    },
  ],
  [
    'financial_results',
    {
      name: 'Financial Results',
      flows: `// Sample Financial Results diagram:

DivisionA [900] Revenue
DivisionB [750] Revenue
DivisionC [150] Revenue

Revenue [800] Cost of Sales
Revenue [1000] Gross Profit

Gross Profit [10] Amortization
Gross Profit [640] Selling, General &\\
Administration
Gross Profit [350] Operating Profit

Operating Profit [90] Tax
Operating Profit [260] Net Profit

// Profit - blue
:Gross Profit #48e <<
:Operating Profit #48e <<
:Net Profit #48e <<

// Expenses - rust
:Tax #d97 <<
:Selling, General &\\
Administration #d97 <<
:Amortization #d97 <<

// Cost - gray
:Cost of Sales #bbb <<

// main Revenue node: dark grey
:Revenue #555`,
      settings: {
        size_h: '600',
        size_w: '900',
        node_w: '20',
        node_h: '75',
        node_spacing: '30',
        node_border: '2',
        node_theme: 'b',
        flow_inheritfrom: 'source',
        layout_justifyends: 'n',
        layout_order: 'automatic',
        labelname_size: '18',
        labelname_weight: '400',
        labelposition_scheme: 'auto',
        labelposition_autoalign: '0',
        labels_highlight: '0.8',
        labels_magnify: '113',
        labels_relativesize: '116',
        labelvalue_appears: 'y',
        labelvalue_position: 'below',
        themeoffset_b: '3',
        value_prefix: '$',
      },
    },
  ],
  [
    'job_search',
    {
      name: 'Job Search',
      flows: `// Sample Job Search diagram:

Applications [4] 1st Interviews
Applications [9] Rejected
Applications [4] No Answer

1st Interviews [2] 2nd Interviews
1st Interviews [2] No Offer

2nd Interviews [2] Offers

Offers [1] Accepted
Offers [1] Declined`,
      settings: {
        size_h: '600',
        size_w: '700',
        node_w: '8',
        node_h: '60',
        node_spacing: '55',
        node_border: '0',
        node_theme: 'a',
        flow_inheritfrom: 'target',
        layout_justifyends: 'n',
        layout_order: 'automatic',
        labelname_size: '17',
        labelname_weight: '400',
        labelposition_scheme: 'auto',
        labelposition_autoalign: '1',
        labels_highlight: '0.55',
        labels_magnify: '95',
        labels_relativesize: '120',
        labelvalue_appears: 'y',
        labelvalue_position: 'above',
        themeoffset_a: '6',
        value_prefix: '',
      },
    },
  ],
  [
    'journey',
    {
      name: 'Journey',
      flows: `// List each player's moves all at once
// Use one color for each player
// Use an amount of 1 for each move
// Check "Using the exact input order" below

// Experiment with reordering players!

:Player 1: #76a
Player 1: [1] 1A #76a
1A [1] 2C #76a
2C [1] 3E #76a
3E [1] Player 1 #76a
:Player 1 #76a

:Player 2: #e37
Player 2: [1] 1B #e37
1B [1] 2D #e37
2D [1] 3E #e37
3E [1] Player 2 #e37
:Player 2 #e37

:Player 3: #bb2
Player 3: [1] 1A #bb2
1A [1] 2D #bb2
2D [1] 3E #bb2
3E [1] Player 3 #bb2
:Player 3 #bb2`,
      settings: {
        size_h: '400',
        size_w: '600',
        node_w: '12',
        node_h: '23',
        node_spacing: '46',
        node_border: '0',
        node_theme: 'none',
        node_color: '#777777',
        flow_inheritfrom: 'outside-in',
        layout_justifyends: 'y',
        layout_order: 'exact',
        labelname_size: '16',
        labelname_weight: '400',
        labelposition_scheme: 'auto',
        labelposition_autoalign: '0',
        labels_highlight: '0.75',
        labels_magnify: '100',
        labels_relativesize: '100',
        labelvalue_appears: 'n',
        labelvalue_position: 'below',
        themeoffset_a: '9',
        value_prefix: '',
      },
    },
  ],
  [
    'election',
    {
      name: 'Ranked Election',
      flows: `// Sample Ranked Election diagram

GH\\nRound 1 [300000] GH\\nRound 2
EF\\nRound 1 [220000] EF\\nRound 2
CD\\nRound 1 [200000] CD\\nRound 2
AB\\nRound 1 [10000] GH\\nRound 2
AB\\nRound 1 [25000] EF\\nRound 2
AB\\nRound 1 [20000] CD\\nRound 2

GH\\nRound 2 [310000] GH\\nRound 3\\nProjected Winner
EF\\nRound 2 [245000] EF\\nRound 3
CD\\nRound 2 [50000] GH\\nRound 3\\nProjected Winner
CD\\nRound 2 [95000] EF\\nRound 3

// This line sets a custom gray color:
:No further votes #555 <<
CD\\nRound 2 [75000] No further votes
AB\\nRound 1 [20000] No further votes`,
      settings: {
        size_h: '600',
        size_w: '700',
        node_w: '10',
        node_h: '76',
        node_spacing: '85',
        node_border: '0',
        node_theme: 'a',
        flow_inheritfrom: 'source',
        layout_justifyends: 'n',
        layout_order: 'exact',
        labelname_size: '14',
        labelname_weight: '700',
        labelposition_scheme: 'auto',
        labelposition_autoalign: '0',
        labels_highlight: '0.8',
        labels_magnify: '105',
        labels_relativesize: '110',
        labelvalue_appears: 'y',
        labelvalue_position: 'below',
        themeoffset_a: '9',
        value_prefix: '',
      },
    },
  ],
  [
    'default_budget',
    {
      name: 'Basic Budget',
      flows: `// Enter Flows between Nodes, like this:
//         Source [AMOUNT] Target

Wages [1500] Budget
Other [250] Budget

Budget [450] Taxes
Budget [420] Housing
Budget [400] Food
Budget [255] Transportation

// You can set a Node's color, like this:
:Budget #057
//            ...or a color for a single Flow:
Budget [160] Other Necessities #606

// "[*]" means "Use any amount left over":
Budget [*] Savings

// Use the controls below to customize
// your diagram's appearance...`,
      settings: {
        size_h: '600',
        size_w: '600',
        node_w: '12',
        node_h: '50',
        node_spacing: '75',
        node_border: '0',
        node_color: '#777777',
        node_theme: 'a',
        flow_inheritfrom: 'outside-in',
        layout_justifyends: 'n',
        layout_order: 'automatic',
        labelname_size: '16',
        labelname_weight: '400',
        labelposition_scheme: 'auto',
        labelposition_autoalign: '0',
        labels_highlight: '0.8',
        labels_magnify: '100',
        labels_relativesize: '110',
        labelvalue_appears: 'y',
        labelvalue_position: 'below',
        themeoffset_a: '6',
        value_prefix: '',
      },
    },
  ],
]);

export const fontMetrics: Record<
  string,
  Record<
    string,
    {
      dy: number;
      top: number;
      bot: number;
      inner: number;
      outer: number;
      marginRight: number;
      marginAdjLeft: number;
    }
  >
> = {
  '*': {
    'sans-serif': {
      dy: 0.8,
      top: 0.75,
      bot: 0.25,
      inner: 0.5,
      outer: 0.05,
      marginRight: 1.2,
      marginAdjLeft: -0.7,
    },
    serif: {
      dy: 0.8,
      top: 0.75,
      bot: 0.25,
      inner: 0.5,
      outer: 0.05,
      marginRight: 1.2,
      marginAdjLeft: -0.7,
    },
    monospace: {
      dy: 0.8,
      top: 0.75,
      bot: 0.25,
      inner: 0.5,
      outer: 0.05,
      marginRight: 1.2,
      marginAdjLeft: -0.7,
    },
  },
  firefox: {
    'sans-serif': {
      dy: 0.9,
      top: 0.75,
      bot: 0.2,
      inner: 0.65,
      outer: 0.3,
      marginRight: 0.7,
      marginAdjLeft: -0.35,
    },
    serif: {
      dy: 0.9,
      top: 0.75,
      bot: 0.2,
      inner: 0.65,
      outer: 0.3,
      marginRight: 0.7,
      marginAdjLeft: -0.35,
    },
    monospace: {
      dy: 0.9,
      top: 0.75,
      bot: 0.2,
      inner: 0.65,
      outer: 0.3,
      marginRight: 0.7,
      marginAdjLeft: -0.35,
    },
  },
};

export const sourceHeaderPrefix = '// SankeyMATIC diagram inputs -';
export const sourceURLLine = '// https://sankeymatic.com/build/';
export const userDataMarker = '// === Nodes and Flows ===';
export const movesMarker = '// === Moved Nodes ===';
export const settingsMarker = '// === Settings ===';
export const settingsAppliedPrefix = '// ✓ ';
export const settingsToBackfill =
  'labelvalue position after\nlabelposition scheme per_stage\nlabels relativesize 100\n magnify 100\n';
