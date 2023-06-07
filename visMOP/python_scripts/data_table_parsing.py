import json
import pandas as pd  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
from typing import BinaryIO, List, Dict
from visMOP.python_scripts.omicsTypeDefs import (
    TableHeaders,
    sliderVals,
    TableRequestData,
)
from flask import Request
from flask_caching import Cache


def create_df(data: BinaryIO, sheet_name: str) -> tuple[int, pd.DataFrame]:
    """
    Creates a pandas dataframe from the supplied excel file
    Args:
        data: excel file
        sheet_name: name of the sheet to be read
    Return:
        0 if successful, 1 if unsuccessful, pandas dataframe
    """
    try:
        read_table: pd.DataFrame = pd.read_excel(
            data, sheet_name=sheet_name, header=None, engine="openpyxl"
        )
    except ValueError:
        return 1, pd.DataFrame()
    read_table = read_table.dropna(how="all")
    read_table = read_table.rename(
        columns=read_table.iloc[0].to_dict()
    )  # NOTE check if program is broken --> this might be at fault
    read_table = read_table.drop(read_table.index[0])
    read_table = read_table.fillna(value="None")
    read_table["_reserved_sort_id"] = read_table.index
    read_table["_reserved_available"] = "No"
    read_table["_reserved_inSelected"] = "No"
    return 0, read_table


def generate_vue_table_header(df: pd.DataFrame) -> List[TableHeaders]:
    """
    creates vue data table style headers from the supplied data frame
    Args:
        df: pandas dataframe
        Return:
        vue_headers: vues data table style headers
    """
    header: List[str] = list(df.columns)
    vue_headers: List[TableHeaders] = []
    for entry in header:
        vue_header: TableHeaders = {
            "label": "In Selected?" if (entry == "_reserved_inSelected") else entry,
            "name": entry,
            "field": entry,
            "align": "left" if (entry != "inSelected") else None,
            "sortable": True,
            "classes": "ellipsis",  # NOTE check again if this is correct
            "style": (
                "max-width: 200px"
                if (entry != "_reserved_sort_id")
                else "max-width: 200px; display: none"
            ),
            "headerClasses": "bg-primary text-white",  # NOTE check again if this is correct
            "headerStyle": (
                "max-width: 200px"
                if (entry != "_reserved_sort_id")
                else "max-width: 200px; display: none"
            ),
        }
        vue_headers.append(vue_header)
    return vue_headers


def generate_vue_table_entries(df: pd.DataFrame) -> List[dict[str, str]]:
    """creates vue data table style entries from the supplied data frame
    Args:
        df: pandas dataframe
    Return:
        vue_entries: vues data table style headers
    """

    def row_to_dict(row: pd.Series) -> dict[str, str]:
        return row.to_dict()

    vue_entries: pd.Series[dict[str, str]] = df.aggregate(row_to_dict, axis=1)
    vue_entries_out: List[Dict[str, str]] = list(vue_entries.values)
    return vue_entries_out


def table_request(request: Request, cache: Cache, requestType: str) -> str:
    print("table recieve triggered")

    # recieve data-blob
    transfer_dat: BinaryIO = request.files["dataTable"].read()
    sheet_name = request.form["sheetName"]
    # create and parse data table and prepare json
    exitState, data_table = create_df(transfer_dat, sheet_name)
    if exitState == 1:
        return json.dumps(
            {
                "exitState": 1,
                "errorMsg": "Xlsx parse Error!! Is the Correct Sheet chosen?",
            }
        )
    cache.set(
        requestType,
        data_table.copy(deep=True).to_json(orient="columns"),
    )
    entry_IDs: List[str] = list(data_table.iloc[:, 0])
    out_data: TableRequestData = {
        "exitState": 0,
        "entry_IDs": entry_IDs,
        "header": generate_vue_table_header(data_table),
        "entries": generate_vue_table_entries(data_table),
    }
    json_data = json.dumps(out_data)

    return json_data


def format_omics_data(
    colname: str, filter_obj: sliderVals, cache_name: str, cache: Cache
) -> None:
    # create dict from protein dataframe
    print("colnames", colname)
    json_data = cache.get(cache_name)
    json_str: str = str(json_data) if json_data is not None else ""
    data_table = pd.read_json(json_str, orient="columns")

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
