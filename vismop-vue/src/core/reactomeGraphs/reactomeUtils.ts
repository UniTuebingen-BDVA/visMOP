import { graphJSON, entityNode } from './reactomeTypes';

export function getEntryAmounts(entryID: number, graphJson: graphJSON) {
  const molecules: number[] = [];
  const proteins: number[] = [];
  const tar = graphJson.nodes[entryID];
  if (tar !== undefined) {
    getComplexEntryAmountsRecursion(tar, molecules, proteins, graphJson);
  } else {
    console.log(`Tar: ${entryID}, PATHWAY ${graphJson.stId}`);
  }
  return {
    totalMolecules: new Set(molecules).size,
    totalProteins: new Set(proteins).size,
  };
}

function getComplexEntryAmountsRecursion(
  tar: entityNode,
  molecules: number[],
  proteins: number[],
  graphJson: graphJSON
) {
  if (tar.schemaClass === 'EntityWithAccessionedSequence') {
    proteins.push(tar.dbId);
  } else if (tar.schemaClass === 'SimpleEntity') {
    molecules.push(tar.dbId);
  } else {
    if (tar.schemaClass !== 'Pathway') {
      if ('children' in tar) {
        for (const newTar of tar.children) {
          const newTarNode = graphJson.nodes[newTar];
          if (newTarNode !== undefined) {
            getComplexEntryAmountsRecursion(
              newTarNode,
              molecules,
              proteins,
              graphJson
            );
          } else {
            console.log(
              `Old Tar: ${tar}, New Tar: ${newTar}, PATHWAY ${graphJson.stId}`
            );
          }
        }
      } else {
        console.log('Unknown Target:', tar);
      }
    }
  }
}
