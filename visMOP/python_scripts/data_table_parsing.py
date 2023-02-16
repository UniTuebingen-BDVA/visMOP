import json
import pandas as pd


def create_df(file_type, sheet_name):
    """creates dataframe from filetype object (i.e. a excel file)
    Args:
        file_type: file-type object
    Return:
        read_table: file as a pandas data frame
    """
    try:
        read_table = pd.read_excel(
            file_type, sheet_name=sheet_name, header=None, engine="openpyxl"
        )
    except ValueError as e:
        return 1, "Xlsx parse Error!! Is the Correct Sheet chosen?"
    read_table = read_table.dropna(how="all")
    read_table = read_table.rename(columns=read_table.iloc[0])
    read_table = read_table.drop(read_table.index[0])
    read_table = read_table.fillna(value="None")
    read_table["_reserved_sort_id"] = read_table.index
    read_table["_reserved_available"] = "No"
    read_table["_reserved_inSelected"] = "No"
    return 0, read_table


def generate_vue_table_header(df):
    """creates vue data table style headers from the supplied data frame
    Args:
        df: pandas dataframe
    Return:
        vue_headers: vues data table style headers
    """
    header = df.columns
    vue_headers = []
    for entry in header:
        vue_header = {}
        vue_header["label"] = (
            "In Selected?" if (entry == "_reserved_inSelected") else entry
        )
        vue_header["name"] = entry
        vue_header["field"] = entry
        vue_header["align"] = "none" if (entry == "inSelected") else "left"
        vue_header["sortable"] = True
        vue_header["classes"] = ("ellipsis",)
        vue_header["style"] = (
            "max-width: 200px"
            if (entry != "_reserved_sort_id")
            else "max-width: 200px; display: none"
        )
        vue_header["headerClasses"] = ("bg-primary text-white",)
        vue_header["headerStyle"] = (
            "max-width: 200px"
            if (entry != "_reserved_sort_id")
            else "max-width: 200px; display: none"
        )
        vue_headers.append(vue_header)
    return vue_headers


def generate_vue_table_entries(df):
    """creates vue data table style entries from the supplied data frame
    Args:
        df: pandas dataframe
    Return:
        vue_entries: vues data table style headers
    """
    vue_entries = df.aggregate(lambda row: row.to_dict(), axis=1)
    print(vue_entries)
    return list(vue_entries.values)


def table_request(request, cache, requestType):
    print("table recieve triggered")

    # recieve data-blob
    transfer_dat = request.files["dataTable"]
    sheet_name = request.form["sheetName"]
    # create and parse data table and prepare json
    exitState, data_table = create_df(transfer_dat, sheet_name)
    if exitState == 1:
        return json.dumps({"exitState": 1, "errorMsg": data_table})
    cache.set(
        requestType,
        data_table.copy(deep=True).to_json(orient="columns"),
    )
    entry_IDs = list(data_table.iloc[:, 0])
    out_data = {"exitState": 0}
    out_data["entry_IDs"] = entry_IDs
    out_data["header"] = generate_vue_table_header(data_table)
    out_data["entries"] = generate_vue_table_entries(data_table)

    json_data = json.dumps(out_data)

    return json_data


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
    cache.set(cache_name + "_filtered", json.dumps(data_dict))
