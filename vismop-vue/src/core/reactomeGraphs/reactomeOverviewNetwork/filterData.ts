import { filterValues } from '@/core/generalTypes';

export default class FilterData implements filterValues {
  limits = {
    min: 0,
    max: 0,
  };
  value = {
    min: 0,
    max: 0,
  };
  filterActive = false;
  inside = false;
  disable = true;
}
