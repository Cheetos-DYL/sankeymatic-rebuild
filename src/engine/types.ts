export type SettingType =
  | 'whole'
  | 'half'
  | 'integer'
  | 'decimal'
  | 'contained'
  | 'breakpoint'
  | 'radio'
  | 'list'
  | 'text'
  | 'color'
  | 'yn';

export type SettingDef = [SettingType, number | string, (number | string)[]];

export interface SankeyNode {
  name: string;
  tipName?: string;
  displayName?: string;
  hideWholeLabel?: boolean;
  sourceRow: number;
  color?: string;
  opacity?: number;
  value?: number;
  x?: number;
  y?: number;
  dx?: number;
  dy?: number;
  stage?: number;
  isAShadow?: boolean;
  paintInputs?: string[];
  unknowns?: { [key: number]: Set<string> };

  // Layout-internal properties added by sankeyLayout
  index?: number;
  flows?: { [IN: number]: SankeyFlow[]; [OUT: number]: SankeyFlow[] };
  total?: { [IN: number]: number; [OUT: number]: number };
  origPos?: { x: number; y: number };
  lastPos?: { x: number; y: number };
  move?: [number, number];
  terminates?: { [IN: number]: boolean; [OUT: number]: boolean };

  // Render properties added by the renderer
  dom_id?: string;
  css_class?: string;
  tooltip?: string;
  border_color?: string;
  labelList?: TextFragment[];
  label?: LabelInfo;
  logName?: string;
}

export interface SankeyFlow {
  source: string | SankeyNode;
  target: string | SankeyNode;
  amount: string;
  sourceRow: number;
  operation: string | null;
  value?: number;
  sy?: number;
  ty?: number;
  dy?: number;
  renderAs?: string;
  color?: string;
  path?: string;
  opacity?: string;

  // Layout-internal properties
  index?: number;
  isAShadow?: boolean;
  hasAShadow?: boolean;
  shadowOf?: number;
  useForVisiblePlacing?: boolean;
  dx?: number;
  ds?: number;
  weightedValue?: number;
}

export interface DiagramConfig {
  size_w: number;
  size_h: number;
  margin_l: number;
  margin_r: number;
  margin_t: number;
  margin_b: number;
  bg_color: string;
  bg_transparent: boolean;
  node_w: number;
  node_h: number;
  node_spacing: number;
  node_border: number;
  node_theme: string;
  node_color: string;
  node_opacity: number;
  flow_curvature: number;
  flow_inheritfrom: string;
  flow_color: string;
  flow_opacity: number;
  layout_order: string;
  layout_justifyorigins: boolean;
  layout_justifyends: boolean;
  layout_reversegraph: boolean;
  layout_attachincompletesto: string;
  labels_color: string;
  labels_hide: boolean;
  labels_highlight: number;
  labels_fontface: string;
  labels_linespacing: number;
  labels_relativesize: number;
  labels_magnify: number;
  labelname_appears: boolean;
  labelname_size: number;
  labelname_weight: number;
  labelvalue_appears: boolean;
  labelvalue_fullprecision: boolean;
  labelvalue_position: string;
  labelvalue_weight: number;
  labelposition_autoalign: number;
  labelposition_scheme: string;
  labelposition_first: string;
  labelposition_breakpoint: number;
  value_format: string;
  value_prefix: string;
  value_suffix: string;
  themeoffset_a: number;
  themeoffset_b: number;
  themeoffset_c: number;
  themeoffset_d: number;
  meta_mentionsankeymatic: boolean;
  meta_listimbalances: boolean;
  internal_iterations: number;
  internal_revealshadows: boolean;
}

export const DEFAULT_CONFIG: DiagramConfig = {
  size_w: 600,
  size_h: 600,
  margin_l: 12,
  margin_r: 12,
  margin_t: 18,
  margin_b: 20,
  bg_color: '#ffffff',
  bg_transparent: false,
  node_w: 14,
  node_h: 50,
  node_spacing: 80,
  node_border: 0.5,
  node_theme: 'b',
  node_color: '#888888',
  node_opacity: 1.0,
  flow_curvature: 0.5,
  flow_inheritfrom: 'outside-in',
  flow_color: '#999999',
  flow_opacity: 0.45,
  layout_order: 'automatic',
  layout_justifyorigins: false,
  layout_justifyends: false,
  layout_reversegraph: false,
  layout_attachincompletesto: 'nearest',
  labels_color: '#333333',
  labels_hide: false,
  labels_highlight: 0.75,
  labels_fontface: 'sans-serif',
  labels_linespacing: 0.15,
  labels_relativesize: 100,
  labels_magnify: 100,
  labelname_appears: true,
  labelname_size: 14,
  labelname_weight: 600,
  labelvalue_appears: true,
  labelvalue_fullprecision: true,
  labelvalue_position: 'below',
  labelvalue_weight: 400,
  labelposition_autoalign: 0,
  labelposition_scheme: 'auto',
  labelposition_first: 'before',
  labelposition_breakpoint: 9999,
  value_format: ',.',
  value_prefix: '',
  value_suffix: '',
  themeoffset_a: 0,
  themeoffset_b: 0,
  themeoffset_c: 0,
  themeoffset_d: 0,
  meta_mentionsankeymatic: true,
  meta_listimbalances: true,
  internal_iterations: 25,
  internal_revealshadows: false,
};

export const MAXBREAKPOINT = 9999;

export interface TextFragment {
  txt: string;
  size?: number;
  weight?: number;
  newLine?: boolean;
}

export interface LabelInfo {
  dom_id: string;
  anchor: string;
  x?: number;
  y?: number;
  bb?: { w: number; h: number; line1h?: number };
}
