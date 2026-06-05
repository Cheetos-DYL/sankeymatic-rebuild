import type { DiagramConfig, SankeyFlow, SankeyNode } from './types';
import {
  skmSettings,
  reWholeNumber,
  reCommentLine,
  reFlowLine,
  reFlowTargetWithSuffix,
  reColorPlusOpacity,
  reBareColor,
  reNodeLineLoose,
  reNodeLineStrict,
  reAttributeLine,
  reSettingsValue,
  reSettingsText,
  NODE_OBJ,
  validAttributes,
  IN,
  OUT,
} from './constants';

export interface ParseResult {
  flows: SankeyFlow[];
  nodes: Map<string, SankeyNode>;
  settings: Record<string, string>;
  maxDecimalPlaces: number;
  errors: ParseError[];
}

export interface ParseError {
  line: string;
  message: string;
  row: number;
}

/**
 * Parse the SankeyMATIC DSL input string into flows, nodes, and settings.
 */
export function parseDiagramInput(
  rawInput: string,
  _config: DiagramConfig,
): ParseResult {
  let maxDecimalPlaces = 0;
  const uniqueNodes = new Map<string, SankeyNode>();
  const errors: ParseError[] = [];
  const parsedSettings: Record<string, string> = {};
  const goodFlows: Array<{
    source: string;
    target: string;
    amount: string;
    sourceRow: number;
    operation: string | null;
  }> = [];

  const SYM_USE_REMAINDER = '*';
  const SYM_FILL_MISSING = '?';

  function flowIsCalculated(fv: string): boolean {
    return [SYM_USE_REMAINDER, SYM_FILL_MISSING].includes(fv);
  }

  function isNumeric(n: unknown): boolean {
    return !Number.isNaN((n as number) - parseFloat(n as string));
  }

  function warnAbout(line: string, warnMsg: string, row: number): void {
    errors.push({ line, message: warnMsg, row });
  }

  /**
   * Parse node names: if wrapped in -dashes-, mark as hidden label.
   */
  function parseNodeName(rawName: string): {
    trueName: string;
    hideWholeLabel: boolean;
  } {
    const hiddenNameMatches = rawName.match(/^-(.*)-$/);
    const hideThisLabel = hiddenNameMatches !== null;
    const trueName = hideThisLabel ? hiddenNameMatches![1] : rawName;
    return { trueName, hideWholeLabel: hideThisLabel };
  }

  /**
   * Ensure a node exists in the map, with the lowest row number.
   */
  function setUpNode(
    nodeName: string,
    row: number,
  ): SankeyNode {
    const { trueName, hideWholeLabel } = parseNodeName(nodeName);
    const thisNode = uniqueNodes.get(trueName);
    if (thisNode) {
      if (thisNode.sourceRow > row) {
        thisNode.sourceRow = row;
      }
      thisNode.hideWholeLabel ||= hideWholeLabel;
      return thisNode;
    }
    const newNode: SankeyNode = {
      name: trueName,
      tipName: trueName.replaceAll('\\n', ' '),
      hideWholeLabel,
      sourceRow: row,
      paintInputs: [],
      unknowns: { [IN]: new Set(), [OUT]: new Set() },
    };
    uniqueNodes.set(trueName, newNode);
    return newNode;
  }

  /**
   * Create or update a node's attributes.
   */
  function updateNodeAttrs(nodeParams: Record<string, unknown>): void {
    const thisNode = setUpNode(
      nodeParams.name as string,
      nodeParams.sourceRow as number,
    );

    // Don't overwrite name or sourceRow
    delete nodeParams.name;
    delete nodeParams.sourceRow;

    // Fix bare color codes
    if (
      typeof nodeParams.color === 'string' &&
      reBareColor.test(nodeParams.color as string)
    ) {
      nodeParams.color = `#${nodeParams.color}`;
    }

    // Copy non-blank params to the node
    for (const [pName, pVal] of Object.entries(nodeParams)) {
      if (
        pVal !== undefined &&
        pVal !== null &&
        pVal !== '' &&
        pName !== 'paintInputs'
      ) {
        (thisNode as Record<string, unknown>)[pName] = pVal;
      }
    }
  }

  // Split input into lines, trim, strip zero-width spaces
  const sourceLines = rawInput.split('\n').map((l) =>
    l
      .trim()
      .replace(/^\u200B+/, '')
      .replace(/\u200B+$/, '')
      .trim(),
  );

  const linesWithSettings = new Set<number>();
  let currentSettingGroup = '';

  // ---- FIRST PASS: extract settings lines ----
  sourceLines.forEach((lineIn, row) => {
    // Does it look like a settings line?
    const settingParts =
      lineIn.match(reSettingsValue) ?? lineIn.match(reSettingsText);

    if (settingParts !== null) {
      let origSettingName = settingParts[1];
      let settingName = origSettingName.replace(/\s+/g, '_');

      // Skip bare 'node' lines (those are handled as node declarations)
      if (settingName === NODE_OBJ) return;

      linesWithSettings.add(row);

      // Fix long-form words (width->w, height->h, etc.)
      const longForms = ['width', 'height', 'left', 'right', 'top', 'bottom'];
      for (const long of longForms) {
        if (settingName.endsWith(long)) {
          settingName = settingName.replace(long, long[0]);
        }
      }

      // Try with prefix from prior settings row
      if (
        !skmSettings.has(settingName) &&
        !settingName.includes('_') &&
        currentSettingGroup.length > 0
      ) {
        settingName = `${currentSettingGroup}_${settingName}`;
        origSettingName = `${currentSettingGroup} ${origSettingName}`;
      }

      currentSettingGroup = settingName.split('_')[0];

      const settingData = skmSettings.get(settingName);
      if (settingData) {
        const settingValue = settingParts[2];
        // For our purposes, just store the raw value
        parsedSettings[settingName] = settingValue;
        return;
      }
    }
  });

  // ---- SECOND PASS: parse flows, nodes, and attributes ----
  let currentObject: { type: string; name: string } | null = null;

  sourceLines.forEach((lineIn, originalRow) => {
    // Skip settings lines and blank/comment lines
    if (linesWithSettings.has(originalRow)) return;
    if (lineIn === '' || reCommentLine.test(lineIn)) {
      return;
    }

    // Node line (loose): ":Name #color[.opacity]"
    let matches = lineIn.match(reNodeLineLoose);
    if (matches !== null) {
      const nodeName = matches[1].trim();
      updateNodeAttrs({
        name: nodeName,
        color: matches[2] || '',
        opacity: matches[3] || '',
        paintInputs: [matches[4] || '', matches[5] || ''],
        sourceRow: originalRow,
      });
      currentObject = { type: NODE_OBJ, name: nodeName };
      return;
    }

    // Node line (strict): "node Name"
    matches = lineIn.match(reNodeLineStrict);
    if (matches !== null) {
      const nodeName = matches[1].trim();
      updateNodeAttrs({
        name: nodeName,
        sourceRow: originalRow,
      });
      currentObject = { type: NODE_OBJ, name: nodeName };
      return;
    }

    // Flow line: "Source [amount] Target[ #color]"
    matches = lineIn.match(reFlowLine);
    if (matches !== null) {
      const amountIn = matches[2].replace(/\s/g, '');
      const isCalculated = flowIsCalculated(amountIn);
      currentObject = null;

      // Blank amount -> skip with log
      if (amountIn === '') {
        return;
      }

      // Reject non-numeric amounts
      if (!isNumeric(amountIn) && !isCalculated) {
        warnAbout(
          lineIn,
          `The [Amount] must be a number or a wildcard (* or ?)`,
          originalRow,
        );
        return;
      }

      // Reject negative amounts
      if (Number(amountIn) < 0) {
        warnAbout(lineIn, 'Amounts must not be negative', originalRow);
        return;
      }

      goodFlows.push({
        source: matches[1].trim(),
        target: matches[3].trim(),
        amount: amountIn,
        sourceRow: originalRow,
        operation: isCalculated ? amountIn : null,
      });

      // Track max decimal places
      maxDecimalPlaces = Math.max(
        maxDecimalPlaces,
        (amountIn.split('.')[1] || '').length,
      );
      return;
    }

    // Attribute line: ".label 'value'"
    matches = lineIn.match(reAttributeLine);
    if (matches !== null) {
      if (!currentObject) {
        warnAbout(
          lineIn,
          'Found an Attribute without a preceding Node declaration',
          originalRow,
        );
        return;
      }
      const [, attrName, attrValue] = matches;
      if (
        !validAttributes.get(currentObject.type)?.has(attrName)
      ) {
        warnAbout(
          lineIn,
          `Attribute type ${attrName} is not valid for Nodes`,
          originalRow,
        );
      } else if (currentObject.type === NODE_OBJ) {
        updateNodeAttrs({
          name: currentObject.name,
          [attrName]: attrValue,
        });
      }
      return;
    }

    // Unrecognized non-blank line
    warnAbout(
      lineIn,
      'Does not match the format of a Flow, Node, Attribute, or Setting',
      originalRow,
    );
  });

  // ---- Build final flow list with resolved node references ----
  const approvedFlows: SankeyFlow[] = goodFlows.map((flow) => {
    const thisFlow: SankeyFlow = {
      index: goodFlows.indexOf(flow),
      sourceRow: flow.sourceRow,
      operation: flow.operation,
      value:
        flow.operation === null ? Number(flow.amount) : undefined,
      amount: flow.amount,
      source: '',
      target: '',
      color: '',
      opacity: '',
    };

    // Parse inline flow color from target string
    let flowTarget = flow.target;
    const flowTargetPlus = flowTarget.match(reFlowTargetWithSuffix);
    if (flowTargetPlus !== null) {
      const [, possibleNodeName, possibleColor] = flowTargetPlus;
      const colorOpacity = possibleColor.match(reColorPlusOpacity);
      if (colorOpacity !== null) {
        flowTarget = possibleNodeName;
        if (colorOpacity[1]) thisFlow.color = `#${colorOpacity[1]}`;
        if (colorOpacity[2]) thisFlow.opacity = colorOpacity[2];
      }
    }

    // Link to node objects
    thisFlow.source = setUpNode(flow.source, flow.sourceRow);
    thisFlow.target = setUpNode(flowTarget, flow.sourceRow + 0.5);

    return thisFlow;
  });

  // Assign indices
  approvedFlows.forEach((f, i) => {
    f.index = i;
  });

  return {
    flows: approvedFlows,
    nodes: uniqueNodes,
    settings: parsedSettings,
    maxDecimalPlaces,
    errors,
  };
}
