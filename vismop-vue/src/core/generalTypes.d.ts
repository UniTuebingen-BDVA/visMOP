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

type LayoutSettings = {
  transcriptomics: {
    attributes: { text: string; value: string }[];
    limits: number[];
  };
  proteomics: {
    attributes: { text: string; value: string }[];
    limits: number[];
  };
  metabolomics: {
    attributes: { text: string; value: string }[];
    limits: number[];
  };
  nonSpecific: {
    attributes: { text: string; value: string }[];
    limits: number[];
  };
};
