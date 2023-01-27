import * as d3 from 'd3';

type omicsData = {
  transcriptomics: { [key: string]: timeSeriesData };
  proteomics: { [key: string]: timeSeriesData };
  metabolomics: { [key: string]: timeSeriesData };
};
type timeSeriesData = {
  fc_values: number[];
  regression_data: regressionData;
};
type regressionData = {
  slope: number;
  intercept: number;
  r2: number;
  p_value: number;
  std_err: number;
};
