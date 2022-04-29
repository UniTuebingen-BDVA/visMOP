import assert from "chai";

import { getEntryAmounts } from "../src/core/reactomeUtils";
import { entityNode, eventNode, graphJSON } from "../src/core/reactomeTypes";
import * as testGraphJson from "./unitTestResources/reactomeUtils/68884_unit_test.graph.json";

interface graphJSONUnformatted {
  nodes: entityNode[];
  edges: eventNode[];
  subpathways: eventNode[];
  dbId: number;
  stId: string;
}

function format_graph_json(): graphJSON {
  testGraphJson;
  let intermediateNodeDict = {} as { [key: number]: entityNode };
  let intermediateEdgeDict = {} as { [key: number]: eventNode };
  let intermediateSubpathwayDict = {} as { [key: number]: eventNode };

  let outJSON = {} as graphJSON;
  outJSON.dbId = testGraphJson.dbId;
  outJSON.stId = testGraphJson.stId;

  try {
    for (const node of testGraphJson.nodes) {
      intermediateNodeDict[node["dbId"]] = node as unknown as entityNode;
    }
  } catch {}

  try {
    for (const edge of testGraphJson.edges) {
      intermediateEdgeDict[edge["dbId"]] = edge as unknown as eventNode;
    }
  } catch {}

  try {
    for (const subpathway of testGraphJson.subpathways) {
      intermediateSubpathwayDict[subpathway["dbId"]] =
        subpathway as unknown as eventNode;
    }
  } catch {}

  outJSON["nodes"] = intermediateNodeDict;
  outJSON["edges"] = intermediateEdgeDict;
  outJSON["subpathways"] = intermediateSubpathwayDict;
  return outJSON;
}

describe("test Reactome Utils", () => {
  const noEntryJsonFormatted = format_graph_json();
  it(" directly querying a gene should yield 1 gene/protein 0 molecules ", () => {
    const amounts = getEntryAmounts(163009, noEntryJsonFormatted);
    assert.assert.deepStrictEqual(amounts, {
      totalMolecules: 0,
      totalProteins: 1,
    });
  });
});
