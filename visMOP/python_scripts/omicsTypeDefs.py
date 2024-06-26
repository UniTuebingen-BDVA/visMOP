from typing import Dict, Union, Literal, TypedDict, Tuple, List, NotRequired


class OmicsInputVals(TypedDict):
    """
    A TypedDict that describes the input values for an omics.

    Attributes:
        amtTimesteps (int): The number of timesteps for the omics.
        received (bool): Whether the omics was received or not.
        symbol (str): The symbol for the omics.
        value (str): The value of the omics.
    """

    amtTimesteps: int
    recieved: bool
    symbol: str
    value: str


class TableHeaders(TypedDict):
    label: str
    name: str
    field: str
    sortable: bool
    classes: str
    align: Union[Literal["left", "center", "right"], None]
    style: str
    headerClasses: str
    headerStyle: str


class SliderVal(TypedDict):
    """
    A TypedDict that describes the slider values for an omics.

    Attributes:
        vals (Dict[Literal["min", "max"], float]): The minimum and maximum values for the slider.
        empties (bool): Wheter Cols with empty values should be considered.
        inside (bool): Wheter the values should be inside or outside the range.
    """

    vals: Dict[Literal["min", "max"], float]
    empties: bool
    inside: bool


sliderVals = Dict[str, SliderVal]


class AllSliderVals(TypedDict):
    """
    A TypedDict that describes the slider values for all omics.

    Attributes:
        transcriptomics (sliderVals): The slider values for the transcriptomics omics.
        proteomics (sliderVals): The slider values for the proteomics omics.
        metabolomics (sliderVals): The slider values for the metabolomics omics.
    """

    transcriptomics: sliderVals
    proteomics: sliderVals
    metabolomics: sliderVals


class OmicsIDs(TypedDict):
    """
    A TypedDict that describes the IDs for an omics.
    """

    ID: str
    table_id: str


OmicsDataTuples = Tuple[OmicsIDs, List[float]]
"""
A Tuple that describes the data for an omics.
"""


class ReactomeDBEntry(TypedDict):
    """
    A TypedDict that describes an entry in the Reactome.

    Attributes:
        reactome_id (str): The Reactome ID for the entry.
        name (str): The name of the entry.
        pathways (List[Tuple[str, str]]): A list of tuples containing the pathway ID and name for the entry.
    """

    reactome_id: str
    name: str
    pathways: List[Tuple[str, str]]
    measurement: NotRequired[List[float]]


ReactomeQueryEntry = Dict[str, ReactomeDBEntry]
"""
A dictionary that maps Reactome IDs to ReactomeDBEntry objects.
"""


ReactomeDBOrganism = Dict[str, ReactomeQueryEntry]
"""
A dictionary that maps organism IDs to ReactomeQueryEntry objects.
"""


class MeasurementData(TypedDict):
    """
    A TypedDict that describes the measurement data for an omic.
    """

    fc_values: List[float]


class LayoutSettingRecieved(TypedDict):
    """
    A TypedDict that describes the layout settings for an omic.

    Attributes:
        attributes (List[Dict[str, str]]): The attributes for the omic.
        limits (List[int]): The limits for the omic.
    """

    attributes: List[Dict[str, str]]
    limits: List[int]


LayoutSettingsRecieved = Dict[str, LayoutSettingRecieved]
"""
A TypedDict that describes the layout settings for the graph-layout.
"""


class TableRequestData(TypedDict):
    """
    A TypedDict that describes the data for a table request.

    Attributes:
        exitState (int): The exit state for the table request.
        entry_IDs (List[str]): The entry IDs for the table request.
        header (List[TableHeaders]): The headers for the table request.
        entries (List[Dict[str, str]]): The entries for the table request.
    """

    exitState: int
    entry_IDs: List[str]
    header: List[TableHeaders]
    entries: List[Dict[str, str]]
