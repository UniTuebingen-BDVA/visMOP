import pandas as pd

def create_df(file_type):
    """creates dataframe from filetype object (i.e. a excel file)
    Args:
        file_type: file-type object
    Return:
        read_table: file as a pandas data frame
    """
    read_table = pd.read_excel(file_type, header = None, engine='openpyxl')
    read_table = read_table.dropna(how='all')
    read_table = read_table.rename(columns=read_table.iloc[0])
    read_table = read_table.drop(read_table.index[0])
    read_table = read_table.fillna(value = "None")
    return read_table

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
        vue_header['text'] = entry
        vue_header['value'] = entry
        vue_headers.append(vue_header)
    return vue_headers

def generate_vue_table_entries(df):
    """creates vue data table style entries from the supplied data frame
    Args:
        df: pandas dataframe
    Return:
        vue_entries: vues data table style headers
    """
    vue_entries = df.aggregate(lambda row: row.to_dict(), axis = 1)
    return list(vue_entries.values)