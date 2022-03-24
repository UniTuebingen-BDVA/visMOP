import { graphJSON, entityNode } from '../core/reactomeTypes'

export function getEntryAmounts (entryID: number, graphJson: graphJSON) {
  const molecules: number[] = []
  const proteins: number[] = []
  const tar = graphJson.nodes[entryID]
  getComplexEntryAmountsRecursion(tar, molecules, proteins, graphJson)
  return { totalMolecules: new Set(molecules).size, totalProteins: new Set(proteins).size }
}

function getComplexEntryAmountsRecursion (tar: entityNode, molecules: number[], proteins: number[], graphJson: graphJSON) {
  if (tar.schemaClass === 'EntityWithAccessionedSequence') {
    proteins.push(tar.dbId)
  } else if (tar.schemaClass === 'SimpleEntity') {
    molecules.push(tar.dbId)
  } else {
    if ('children' in tar) {
      for (const newTar of tar.children) {
        getComplexEntryAmountsRecursion(graphJson.nodes[newTar], molecules, proteins, graphJson)
      }
    } else {
      console.log('Unknown Target:', tar)
    }
  }
}
