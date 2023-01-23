import { QTableProps } from 'quasar';

type typeExtractor<TarObj> = TarObj extends (infer U)[]
  ? U extends object
    ? U
    : never
  : never;

/**
 * Type for QTable column
 */
// eslint-disable-next-line no-unused-vars
type ColType = typeExtractor<QTableProps['columns']>;

/**
 * Type correspoinding to a single entity in one specific omics measurment
 */
type measureData = {
  name: string;
  value: number;
  queryID: string;
};

/**
 *  Type corresponding to a single pathway and one type of omics
 */
type omicsData = {
  available: boolean;
  foldChanges: measureData[];
  meanFoldchange: number;
  nodeState: { total: number; regulated: number };
};

/**
 * Type corresponding to all the information needed for the construction of a single pathway glyph
 */
export type glyphData = {
  pathwayID: string;
  proteomics: omicsData;
  metabolomics: omicsData;
  transcriptomics: omicsData;
};
