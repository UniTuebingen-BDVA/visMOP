import { QTableProps } from "quasar";

type typeExtractor<TarObj> = TarObj extends (infer U)[]
  ? U extends object
    ? U
    : never
  : never;

type ColType = typeExtractor<QTableProps["columns"]>;
