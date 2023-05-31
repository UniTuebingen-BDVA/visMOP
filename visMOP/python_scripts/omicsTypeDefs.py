from typing import Dict, Literal, TypedDict, Tuple, List


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


class SliderVal(TypedDict):
    vals: Dict[Literal["min", "max"], float]
    empties: bool
    inside: bool


class SliderVals(TypedDict):
    transcriptomics: SliderVal
    proteomics: SliderVal
    metabolomics: SliderVal


class OmicsIDs(TypedDict):
    ID: str
    table_id: str


class OmicsDataTuples(Tuple[OmicsIDs, List[float]]):
    pass
