import { QTableProps } from 'quasar';

type typeExtractor<TarObj> = TarObj extends (infer U)[]
  ? U extends object
    ? U
    : never
  : never;

// eslint-disable-next-line no-unused-vars
type ColType = typeExtractor<QTableProps['columns']>;

type measureData = {
  name: string;
  value: number;
  queryID: string;
};

type omicsData = {
  available: boolean;
  foldChanges: measureData[];
  meanFoldchange: number;
  nodeState: { total: number; regulated: number };
};

export type glyphData = {
  pathwayID: string;
  proteomics: omicsData;
  metabolomics: omicsData;
  transcriptomics: omicsData;
};

export type filterValues = {
  limits: {
    min: number;
    max: number;
  };
  value: {
    min: number;
    max: number;
  };
  filterActive: boolean;
  inside: boolean;
  disable: boolean;
};
