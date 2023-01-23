import pandas as pd
import json


def format_omics_data(colname, filter_obj, cache_name, cache):
    # create dict from protein dataframe
    print("colnames", colname)
    data_table = pd.read_json(cache.get(cache_name), orient="columns")

    id_col = colname
    data_table = data_table.drop_duplicates(subset=id_col).set_index(id_col)
    for k, v in filter_obj.items():
        is_empty = v["empties"] & (data_table[k] == "None")
        is_numeric = pd.to_numeric(data_table[k], errors="coerce").notnull()
        df_numeric = data_table.loc[is_numeric]
        if v["inside"]:
            df_is_in_range = df_numeric.loc[
                (df_numeric[k] >= v["vals"]["min"])
                & (df_numeric[k] <= v["vals"]["max"])
            ]
        else:
            df_is_in_range = df_numeric.loc[
                (df_numeric[k] <= v["vals"]["min"])
                | (df_numeric[k] >= v["vals"]["max"])
            ]
        df_is_empty = data_table.loc[is_empty]

        data_table = data_table.loc[
            data_table.index.isin(df_is_in_range.index)
            | data_table.index.isin(df_is_empty.index)
        ]
    data_dict = data_table.to_dict("index")

    # set cache for structures
    cache.set(cache_name, json.dumps(data_dict))
