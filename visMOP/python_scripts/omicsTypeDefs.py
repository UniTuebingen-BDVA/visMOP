from typing import Dict, Literal, TypedDict


class OmicsInputVals(TypedDict):
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
