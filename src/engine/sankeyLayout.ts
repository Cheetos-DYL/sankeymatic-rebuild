import * as d3 from 'd3';
import type { SankeyNode, SankeyFlow } from './types';
import { IN, OUT } from './constants';

const SOURCES = 2;
const TARGETS = 3;
const TOP = 5;
const BOTTOM = 7;
const NEAREST = 11;

interface Size {
  w: number;
  h: number;
}

export type SankeyLayout = ReturnType<typeof sankeyLayout>;

export function sankeyLayout() {
  let nodeWidth = 9;
  let nodeHeightFactor = 0.5;
  let nodeSpacingFactor = 0.85;
  let size: Size = { w: 1, h: 1 };
  let nodes: SankeyNode[] = [];
  let flows: SankeyFlow[] = [];
  let rightJustifyEndpoints = false;
  let leftJustifyOrigins = false;
  let autoLayout = true;
  let attachIncompletesTo = NEAREST;

  let stagesArr: SankeyNode[][] = [];
  let maximumNodeSpacing = 0;
  let actualNodeSpacing = 0;
  let maxStage = -1;

  // ---- ACCESSORS ----

  const api = {
    nodeWidth: function (x?: number) {
      if (arguments.length) {
        nodeWidth = +x!;
        return api;
      }
      return nodeWidth;
    },

    nodeHeightFactor: function (x?: number) {
      if (arguments.length) {
        nodeHeightFactor = +x!;
        return api;
      }
      return nodeHeightFactor;
    },

    nodeSpacingFactor: function (x?: number) {
      if (arguments.length) {
        nodeSpacingFactor = +x!;
        return api;
      }
      return nodeSpacingFactor;
    },

    nodes: function (x?: SankeyNode[]) {
      if (arguments.length) {
        nodes = x!;
        return api;
      }
      return nodes;
    },

    flows: function (x?: SankeyFlow[]) {
      if (arguments.length) {
        flows = x!;
        return api;
      }
      return flows;
    },

    size: function (x?: Size) {
      if (arguments.length) {
        size = x!;
        return api;
      }
      return size;
    },

    rightJustifyEndpoints: function (x?: boolean) {
      if (arguments.length) {
        rightJustifyEndpoints = x!;
        return api;
      }
      return rightJustifyEndpoints;
    },

    leftJustifyOrigins: function (x?: boolean) {
      if (arguments.length) {
        leftJustifyOrigins = x!;
        return api;
      }
      return leftJustifyOrigins;
    },

    autoLayout: function (x?: boolean) {
      if (arguments.length) {
        autoLayout = x!;
        return api;
      }
      return autoLayout;
    },

    attachIncompletesTo: function (x?: string) {
      if (arguments.length) {
        switch (x!.toLowerCase()) {
          case 'leading':
            attachIncompletesTo = TOP;
            break;
          case 'trailing':
            attachIncompletesTo = BOTTOM;
            break;
          case 'nearest':
            attachIncompletesTo = NEAREST;
            break;
        }
        return api;
      }
      return attachIncompletesTo;
    },

    stages: () => stagesArr,

    // ---- FUNCTIONS ----

    setup: () => {
      connectFlowsToNodes();
      computeNodeValues();
      assignNodesToStages();
      updateStagesArray();
      return api;
    },

    layout: (iterations: number) => {
      updateStagesArray();
      placeNodes(iterations);
      return api;
    },

    relayout: () => {
      placeFlowsInsideNodes(nodes);
      return api;
    },
  };

  // ---- INTERNAL FUNCTIONS ----

  function valueSum(list: Array<{ value?: number }>): number {
    return d3.sum(list, (d) => d.value ?? 0);
  }

  function divide(a: number, b: number): number {
    return a / (b || Number.MIN_VALUE);
  }

  function yCenter(n: SankeyNode): number {
    return (n.y ?? 0) + (n.dy ?? 0) / 2;
  }

  function yBottom(n: SankeyNode): number {
    return (n.y ?? 0) + (n.dy ?? 0);
  }

  function sourceTop(f: SankeyFlow): number {
    const s = f.source as SankeyNode;
    return (s.y ?? 0) + (f.sy ?? 0);
  }

  function targetTop(f: SankeyFlow): number {
    const t = f.target as SankeyNode;
    return (t.y ?? 0) + (f.ty ?? 0);
  }

  function sourceCenter(f: SankeyFlow): number {
    const s = f.source as SankeyNode;
    return (s.y ?? 0) + (f.sy ?? 0) + (f.dy ?? 0) / 2;
  }

  function targetCenter(f: SankeyFlow): number {
    const t = f.target as SankeyNode;
    return (t.y ?? 0) + (f.ty ?? 0) + (f.dy ?? 0) / 2;
  }

  function sourceBottom(f: SankeyFlow): number {
    const s = f.source as SankeyNode;
    return (s.y ?? 0) + (f.sy ?? 0) + (f.dy ?? 0);
  }

  function targetBottom(f: SankeyFlow): number {
    const t = f.target as SankeyNode;
    return (t.y ?? 0) + (f.ty ?? 0) + (f.dy ?? 0);
  }

  function leastY(nodeList: SankeyNode[]): number {
    return d3.min(nodeList, (n) => n.y ?? 0) ?? 0;
  }

  function greatestY(nodeList: SankeyNode[]): number {
    return d3.max(nodeList, (n) => yBottom(n)) ?? 0;
  }

  function bySourceOrder(a: SankeyNode | SankeyFlow, b: SankeyNode | SankeyFlow): number {
    return a.sourceRow - b.sourceRow;
  }

  function byTopEdges(a: SankeyNode, b: SankeyNode): number {
    return (a.y ?? 0) - (b.y ?? 0);
  }

  function connectFlowsToNodes(): void {
    nodes.forEach((n, i) => {
      n.index = i;
      n.flows = { [IN]: [], [OUT]: [] };
      n.isAShadow = false;
    });

    flows.forEach((f, i) => {
      f.index = i;
      if (typeof f.source === 'number') {
        f.source = nodes[f.source as number];
      }
      if (typeof f.target === 'number') {
        f.target = nodes[f.target as number];
      }
      const s = f.source as SankeyNode;
      const t = f.target as SankeyNode;
      s.flows![OUT].push(f);
      t.flows![IN].push(f);
      f.useForVisiblePlacing = true;
      f.isAShadow = false;
      f.hasAShadow = false;
    });
  }

  function computeNodeValues(): void {
    nodes.forEach((n) => {
      const f = n.flows!;
      n.total = {
        [IN]: valueSum(f[IN]),
        [OUT]: valueSum(f[OUT]),
      };
      n.value = Math.max(n.total[IN], n.total[OUT], Number.MIN_VALUE);
    });
  }

  function allFlowStats(nodeList: SankeyNode[]) {
    function flowSetStats(whichFlows: number) {
      const flowList = nodeList
        .filter((n) => n.flows)
        .map((n) => n.flows![whichFlows])
        .flat()
        .filter((f) => (f.weightedValue ?? 0) > 0);

      if (flowList.length === 0) {
        return {
          value: 0,
          sources: { weight: 0, maxSourceStage: 0 },
          targets: { weight: 0, minTargetStage: 0 },
        };
      }

      return {
        value: d3.sum(flowList, (f) => f.weightedValue ?? 0),
        sources: {
          weight: d3.sum(
            flowList,
            (f) => sourceCenter(f) * (f.weightedValue ?? 0),
          ),
          maxSourceStage: d3.max(flowList, (f) => (f.source as SankeyNode).stage ?? 0) ?? 0,
        },
        targets: {
          weight: d3.sum(
            flowList,
            (f) => targetCenter(f) * (f.weightedValue ?? 0),
          ),
          minTargetStage: d3.min(flowList, (f) => (f.target as SankeyNode).stage ?? 0) ?? 0,
        },
      };
    }

    return { [IN]: flowSetStats(IN), [OUT]: flowSetStats(OUT) };
  }

  function placeFlowsInsideNodes(nodeList: SankeyNode[]): void {
    function sortFlows(n: SankeyNode, placing: number): void {
      const dir = placing === TARGETS ? IN : OUT;
      const fStats = allFlowStats([n]);
      const flowsToSort = n.flows![dir];
      const totalFlowValue = n.total![dir];

      const totalFlowWeight =
        dir === IN
          ? fStats[IN].sources.weight
          : fStats[OUT].targets.weight;

      const flowsRemaining = new Set(flowsToSort.map((f) => f.index!));

      const totalFlowSpan = d3.sum(
        flowsToSort.filter((f) => !f.isAShadow || n.isAShadow),
        (f) => f.dy ?? 0,
      );

      const flowPosition =
        totalFlowValue < (n.value ?? 0) &&
        (attachIncompletesTo === BOTTOM ||
          (attachIncompletesTo === NEAREST &&
            divide(totalFlowWeight, totalFlowValue) > yCenter(n)))
          ? BOTTOM
          : TOP;

      const bounds =
        flowPosition === TOP
          ? { upper: n.y ?? 0, lower: (n.y ?? 0) + totalFlowSpan }
          : {
              upper: yBottom(n) - totalFlowSpan,
              lower: yBottom(n),
            };

      function placeFlow(f: SankeyFlow, newTopY: number): void {
        if (!flowsRemaining.has(f.index!)) return;
        if (placing === TARGETS) {
          f.ty = newTopY - (f.target as SankeyNode).y!;
        } else {
          f.sy = newTopY - (f.source as SankeyNode).y!;
        }
        flowsRemaining.delete(f.index!);
      }

      function placeFlowAt(edge: number, fIndex: number): void {
        const f = flows[fIndex];
        let newY = 0;
        if (edge === TOP) {
          newY = bounds.upper;
          if (f.useForVisiblePlacing || n.isAShadow) {
            bounds.upper += f.dy ?? 0;
          }
        } else {
          newY = bounds.lower - (f.dy ?? 0);
          if (f.useForVisiblePlacing || n.isAShadow) {
            bounds.lower = newY;
          }
        }

        placeFlow(f, newY);

        if (f.useForVisiblePlacing && f.isAShadow) {
          placeFlow(flows[f.shadowOf!], newY);
        }
      }

      const slopeData: Record<number, { f: (f: SankeyFlow) => number; dir: number }> = {
        [TOP * TARGETS]: {
          f: (f) => (bounds.upper - sourceTop(f)) / (f.dx ?? 1),
          dir: -1,
        },
        [TOP * SOURCES]: {
          f: (f) => (targetTop(f) - bounds.upper) / (f.dx ?? 1),
          dir: 1,
        },
        [BOTTOM * TARGETS]: {
          f: (f) => (bounds.lower - sourceBottom(f)) / (f.dx ?? 1),
          dir: 1,
        },
        [BOTTOM * SOURCES]: {
          f: (f) => (targetBottom(f) - bounds.lower) / (f.dx ?? 1),
          dir: -1,
        },
      };

      function placeUnhappiestFlowAt(edge: number): void {
        if (!flowsRemaining.size) return;
        const sKey = edge * placing;
        const slopeOf = slopeData[sKey].f;

        const candidates = Array.from(flowsRemaining)
          .filter((i) => !flows[i].hasAShadow)
          .sort((a, b) => {
            if (autoLayout) {
              const slopeDiff =
                slopeData[sKey].dir *
                (slopeOf(flows[a]) - slopeOf(flows[b]));
              if (slopeDiff !== 0) return slopeDiff;
              const dxDiff = (flows[a].dx ?? 0) - (flows[b].dx ?? 0);
              if (dxDiff !== 0) return dxDiff;
            }
            return flows[a].sourceRow - flows[b].sourceRow;
          });

        if (candidates[0] !== undefined) {
          placeFlowAt(edge, candidates[0]);
        }
      }

      while (flowsRemaining.size > 1) {
        placeUnhappiestFlowAt(TOP);
        if (autoLayout) {
          placeUnhappiestFlowAt(BOTTOM);
        }
      }

      flowsRemaining.forEach((i) => placeFlowAt(TOP, i));
    }

    // Update dx values
    flows.forEach((f) => {
      f.dx =
        Math.abs(
          (f.target as SankeyNode).x! - (f.source as SankeyNode).x!,
        ) || Number.MIN_VALUE;
    });

    // Gather flow batches
    const flowBatches: Array<{ i: number; len: number; placing: number }> = [
      ...nodeList
        .filter((n) => n.flows![IN].length > 0)
        .map((n) => ({
          i: n.index!,
          len: n.flows![IN].length,
          placing: TARGETS,
        })),
      ...nodeList
        .filter((n) => n.flows![OUT].length > 0)
        .map((n) => ({
          i: n.index!,
          len: n.flows![OUT].length,
          placing: SOURCES,
        })),
    ];

    flowBatches
      .sort((a, b) => a.len - b.len)
      .forEach((fBatch) => {
        sortFlows(nodes[fBatch.i], fBatch.placing);
      });
  }

  function assignNodesToStages(): void {
    const nodesToCheckAgain = new Set<SankeyNode>();

    function updateNode(n: SankeyNode): void {
      n.stage = maxStage;
      n.flows![OUT].forEach((f) => {
        nodesToCheckAgain.add(f.target as SankeyNode);
      });
    }

    let nodesToPlace = nodes;
    while (nodesToPlace.length > 0 && maxStage < nodes.length - 1) {
      maxStage += 1;
      nodesToPlace.forEach((n) => updateNode(n));
      nodesToPlace = Array.from(nodesToCheckAgain);
      nodesToCheckAgain.clear();
    }

    // Pull source nodes rightward where possible
    nodes
      .filter((n) => n.flows![OUT].length > 0)
      .slice()
      .sort((a, b) => (b.stage ?? 0) - (a.stage ?? 0))
      .forEach((n) => {
        const maxNewStage =
          d3.min(n.flows![OUT], (f) => (f.target as SankeyNode).stage ?? 0)! - 1;
        if ((n.stage ?? 0) < maxNewStage) {
          n.stage = maxNewStage;
        }
      });

    function setStageWhenNoFlows(direction: number, newStage: number): void {
      nodes
        .filter((n) => !n.flows![direction].length)
        .forEach((n) => {
          n.stage = newStage;
        });
    }

    if (leftJustifyOrigins) setStageWhenNoFlows(IN, 0);
    if (rightJustifyEndpoints) setStageWhenNoFlows(OUT, maxStage);

    // Handle shadow nodes/flows for flows crossing multiple stages
    flows.forEach((f) => {
      f.ds = ((f.target as SankeyNode).stage ?? 0) - ((f.source as SankeyNode).stage ?? 0);
    });

    const shadowNodeNames = new Map<string, number>();
    flows
      .filter((f) => Math.abs(f.ds ?? 0) > 1)
      .forEach((f) => {
        const nodesForThisFlow: SankeyNode[] = [f.source as SankeyNode];
        const sourceNode = f.source as SankeyNode;

        for (let i = 1; i < (f.ds ?? 0); i += 1) {
          const shadowStage = (sourceNode.stage ?? 0) + i;
          const newNodeName = `sh_${sourceNode.index}_${(f.target as SankeyNode).index}_s${shadowStage}`;
          const fVal = Number(f.value);

          let shadowNode: SankeyNode;
          if (shadowNodeNames.has(newNodeName)) {
            shadowNode = nodes[shadowNodeNames.get(newNodeName)!];
            shadowNode.value = (shadowNode.value ?? 0) + fVal;
            shadowNode.total![IN] += fVal;
            shadowNode.total![OUT] += fVal;
          } else {
            shadowNode = {
              name: newNodeName,
              tipName: '(shadow)',
              sourceRow: f.sourceRow,
              index: nodes.length,
              stage: shadowStage,
              isAShadow: true,
              flows: { [IN]: [], [OUT]: [] },
              total: { [IN]: fVal, [OUT]: fVal },
              value: fVal,
              unknowns: {},
            };
            nodes.push(shadowNode);
            shadowNodeNames.set(newNodeName, shadowNode.index!);
          }
          nodesForThisFlow.push(shadowNode);
        }
        nodesForThisFlow.push(f.target as SankeyNode);

        for (let i = 1; i < nodesForThisFlow.length; i += 1) {
          const sNode = nodesForThisFlow[i - 1];
          const tNode = nodesForThisFlow[i];
          const newFlow: SankeyFlow = {
            ...f,
            source: sNode,
            target: tNode,
            amount: String(f.value ?? 0),
            index: flows.length,
            shadowOf: f.index,
            isAShadow: true,
            hasAShadow: false,
            sourceRow: Number(f.sourceRow) + i / ((f.ds ?? 1) + 1),
            useForVisiblePlacing:
              (sNode.stage === (f.source as SankeyNode).stage) ||
              (tNode.stage === (f.target as SankeyNode).stage),
          };
          flows.push(newFlow);
          sNode.flows![OUT].push(newFlow);
          tNode.flows![IN].push(newFlow);
        }

        f.useForVisiblePlacing = false;
        f.hasAShadow = true;
      });
  }

  function updateStagesArray(): void {
    stagesArr = d3
      .groups(nodes, (d) => d.stage ?? 0)
      .sort((a, b) => a[0] - b[0])
      .map((d) => d[1].sort(bySourceOrder));
  }

  function placeNodes(iterations: number): void {
    function nodeSetStats(nodeList: SankeyNode[]) {
      const weight = d3.sum(nodeList, (n) => yCenter(n) * (n.value ?? 0));
      const value = valueSum(nodeList);
      return {
        stage: nodeList[0].stage ?? 0,
        weight,
        value,
        center: divide(weight, value),
      };
    }

    function initializeNodePositions(): void {
      const greatestNodeCount = d3.max(stagesArr, (s) => s.length) ?? 1;

      let ky = 0;
      if (greatestNodeCount === 1) {
        maximumNodeSpacing = 0;
        actualNodeSpacing = 0;
        ky =
          nodeHeightFactor *
          (d3.min(stagesArr, (s) => divide(size.h, valueSum(s))) ?? 0);
      } else {
        const allAvailablePadding = Math.max(2, size.h - greatestNodeCount);
        maximumNodeSpacing =
          ((1 - nodeHeightFactor) * allAvailablePadding) /
          (greatestNodeCount - 1);
        actualNodeSpacing = maximumNodeSpacing * nodeSpacingFactor;
        ky =
          d3.min(
            stagesArr,
            (s) =>
              divide(
                size.h - (s.length - 1) * maximumNodeSpacing,
                valueSum(s),
              ),
          ) ?? 0;
      }
      if (ky === Infinity) ky = 1;

      flows.forEach((f) => {
        f.dy = (f.value ?? 0) * ky;
        f.weightedValue = f.hasAShadow ? 0 : f.value;
      });

      nodes.forEach((n) => {
        n.dy = Math.max((n.value ?? 0) * ky, Number.MIN_VALUE);
      });

      stagesArr.forEach((s, stageIndex) => {
        const stageSize =
          valueSum(s) * ky + actualNodeSpacing * (s.length - 1);
        let targetY = size.h / 2;

        const allFlowsIn = s.map((n) => n.flows![IN]).flat();
        if (allFlowsIn.length > 0) {
          const uniqueSourceNodes = new Set(
            allFlowsIn
              .map((f) => f.source as SankeyNode)
              .filter(
                (n) => (n.stage ?? 0) >= stageIndex - 1,
              ),
          );
          targetY = nodeSetStats(Array.from(uniqueSourceNodes)).center;
        }

        let nextNodePos = Math.max(
          0,
          Math.min(targetY - stageSize / 2, size.h - stageSize),
        );
        s.forEach((n) => {
          n.y = nextNodePos;
          nextNodePos = yBottom(n) + actualNodeSpacing;
        });
      });

      // x positions
      const widthPerStage =
        maxStage > 0 ? (size.w - nodeWidth) / maxStage : 0;
      nodes.forEach((n) => {
        n.x = widthPerStage * (n.stage ?? 0);
        n.dx = nodeWidth;
      });

      // Initial flow placement
      nodes.forEach((n) => {
        let sy = 0;
        let ty = 0;
        n.flows![OUT].forEach((f) => {
          if (f.isAShadow && !n.isAShadow) {
            f.sy = flows[f.shadowOf!].sy;
          } else {
            f.sy = sy;
            sy += f.dy ?? 0;
          }
        });
        n.flows![IN].forEach((f) => {
          if (f.isAShadow && !n.isAShadow) {
            f.ty = flows[f.shadowOf!].ty;
          } else {
            f.ty = ty;
            ty += f.dy ?? 0;
          }
        });
      });
    }

    function findNodeGroupOffset(nodeList: SankeyNode[]): number {
      const fStats = allFlowStats(nodeList);
      const totalIn = fStats[IN].value;
      const totalOut = fStats[OUT].value;
      if (totalIn === 0 && totalOut === 0) return 0;

      const nStats = nodeSetStats(nodeList);

      const projectedSourceCenter = divide(
        nStats.weight -
          fStats[IN].targets.weight +
          fStats[IN].sources.weight,
        nStats.value,
      );

      const projectedTargetCenter = divide(
        nStats.weight -
          fStats[OUT].sources.weight +
          fStats[OUT].targets.weight,
        nStats.value,
      );

      let goalY = 0;
      if (totalOut === 0) {
        goalY = projectedSourceCenter;
      } else if (totalIn === 0) {
        goalY = projectedTargetCenter;
      } else {
        const startStage = fStats[IN].sources.maxSourceStage;
        const endStage = fStats[OUT].targets.minTargetStage;
        const stageDistance = endStage - startStage;
        const slopeBetweenCenters =
          stageDistance !== 0
            ? (projectedTargetCenter - projectedSourceCenter) / stageDistance
            : 0;
        goalY =
          projectedSourceCenter +
          (nStats.stage - startStage) * slopeBetweenCenters;
      }

      return goalY - nStats.center;
    }

    function updateStageCentering(s: SankeyNode[]): void {
      function enforceValidNodePositions(): void {
        let yPos = 0;
        s.forEach((n) => {
          if ((n.y ?? 0) < yPos) n.y = yPos;
          yPos = yBottom(n) + actualNodeSpacing;
        });

        yPos = size.h;
        s.slice()
          .reverse()
          .forEach((n) => {
            if (yBottom(n) > yPos) n.y = yPos - (n.dy ?? 0);
            yPos = (n.y ?? 0) - actualNodeSpacing;
          });
      }

      function nodesAreAdjacent(n1: SankeyNode, n2: SankeyNode): boolean {
        return (n2.y ?? 0) - actualNodeSpacing - yBottom(n1) < 0.1;
      }

      function centerNeighborGroups(): void {
        const neighborGroups: SankeyNode[][] = [];
        s.forEach((n, i) => {
          if (i > 0 && nodesAreAdjacent(s[i - 1], n)) {
            neighborGroups[neighborGroups.length - 1].push(n);
          } else {
            neighborGroups.push([n]);
          }
        });

        neighborGroups
          .filter((g) => g.length > 1)
          .forEach((nodeGroup) => {
            const yOffset = findNodeGroupOffset(nodeGroup);
            nodeGroup.forEach((n) => {
              n.y = (n.y ?? 0) + yOffset;
            });
          });
      }

      s.sort(autoLayout ? byTopEdges : bySourceOrder);
      enforceValidNodePositions();
      centerNeighborGroups();
      enforceValidNodePositions();
      centerNeighborGroups();
      enforceValidNodePositions();
    }

    function processStages(stageList: SankeyNode[][], factor: number): void {
      stageList.forEach((s) => {
        s.forEach((n) => {
          n.y = (n.y ?? 0) + findNodeGroupOffset([n]) * factor;
        });
        updateStageCentering(s);
        placeFlowsInsideNodes(s);
      });
      placeFlowsInsideNodes(nodes);
    }

    function reCenterDiagram(): void {
      const minY = leastY(nodes);
      const yH = greatestY(nodes) - minY;
      if (yH < size.h) {
        const yOffset = size.h / 2 - (minY + yH / 2);
        nodes.forEach((n) => {
          n.y = (n.y ?? 0) + yOffset;
        });
      }
    }

    initializeNodePositions();
    stagesArr.forEach((s) => updateStageCentering(s));
    placeFlowsInsideNodes(nodes);

    let alpha = 1;
    let counter = 0;
    while (counter < iterations) {
      counter += 1;
      alpha *= 0.99;
      processStages(stagesArr, alpha);
      processStages(stagesArr.slice().reverse(), alpha);
      reCenterDiagram();
    }

    nodes.forEach((n) => {
      n.origPos = { x: n.x ?? 0, y: n.y ?? 0 };
      n.lastPos = { x: n.x ?? 0, y: n.y ?? 0 };
      n.move = [0, 0];
    });
  }

  return api;
}
