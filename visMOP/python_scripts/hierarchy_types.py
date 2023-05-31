from typing import Dict, List, Literal, TypedDict, Union
from pathlib import Path


class FormEntry(TypedDict):
    """
    A TypedDict that describes a form entry.

    Attributes:
        name (str): The name of the form entry.
        toplevelId (List[str]): A list of IDs for the top-level elements.
    """

    name: str
    toplevelId: List[str]


class RegressionData(TypedDict):
    """
    A TypedDict that describes the regression data for an omic measurement.

    Attributes:
        slope (float): The slope of the regression line.
        intercept (float): The y-intercept of the regression line.
        r2 (float): The coefficient of determination (R^2) for the regression line.
        p_value (float): The p-value for the regression line.
        std_err (float): The standard error of the regression line.
    """

    slope: float
    intercept: float
    r2: float
    p_value: float
    std_err: float


class OmicMeasurement(TypedDict):
    """
    A TypedDict that describes an omic measurement.

    Attributes:
        measurement (Union[float, List[float]]): The measurement value(s) for the omic.
        regressionData (Union[RegressionData, None]): The regression data for the omic, if available.
        forms
    """

    measurement: Union[float, List[float]]
    regressionData: Union[RegressionData, None]
    forms: Dict[str, FormEntry]


class SubdiagramOmicEntry(TypedDict):
    """
    A TypedDict that describes a subdiagram for a given omic.

    Attributes:
        stableID (str): The stable ID of the subdiagram.
        nodes (List[str]): A list of node IDs associated with the subdiagram.
    """

    stableID: str
    nodes: List[str]


class HierarchyMetadata(TypedDict):
    """
    A TypedDict that describes the metadata for a hierarchy.

    Attributes:
        amt_timesteps (int): The number of timesteps for the hierarchy.
        omics_recieved (List[bool]): Whether the hierarchy received omics the specific or not.
        relational_data_path (Path): The path to the relational data for the hierarchy.
        target_organism (str): The target organism for the hierarchy.
        json_data_path (Path): The path to the JSON data for the hierarchy.
    """

    amt_timesteps: int
    omics_recieved: List[bool]
    relational_data_path: Path
    target_organism: str
    json_data_path: Path


class GraphNode(TypedDict):
    """
    A TypedDict that describes a graph node.

    Attributes:
        schemaClass (str): The schema class of the graph node.
        dbId (int): The database ID of the graph node.
        stId (str): The stable ID of the graph node.
        speciesID (int): The species ID of the graph node.
        displayName (str): The display name of the graph node.
    """

    schemaClass: str
    dbId: int
    stId: str
    speciesID: int
    displayName: str


class EntityNode(GraphNode):
    """
    A TypedDict that describes an entity node.

    Attributes:
        identifier (str): The identifier of the entity node.
        parents (List[int]): A list of parent IDs for the entity node.
        children (List[int]): A list of child IDs for the entity node.
        geneNames (List[str]): A list of gene names associated with the entity node.
        diagramIds (List[int]): A list of diagram IDs associated with the entity node.
    """

    identifier: str
    parents: List[int]
    children: List[int]
    geneNames: List[str]
    diagramIds: List[int]


class EventNode(GraphNode):
    """
    A TypedDict that describes an event node.

    Attributes:
        catalysts (List[int]): A list of catalyst IDs for the event node.
        inhibitors (List[int]): A list of inhibitor IDs for the event node.
        activators (List[int]): A list of activator IDs for the event node.
        inputs (List[int]): A list of input IDs for the event node.
        outputs (List[int]): A list of output IDs for the event node.
        diagramIds (List[int]): A list of diagram IDs associated with the event node.
        preceding (List[int]): A list of preceding IDs for the event node.
        following (List[int]): A list of following IDs for the event node.
        requirements (List[int]): A list of requirement IDs for the event node.
    """

    catalysts: List[int]
    inhibitors: List[int]
    activators: List[int]
    inputs: List[int]
    outputs: List[int]
    diagramIds: List[int]
    preceding: List[int]
    following: List[int]
    requirements: List[int]


class SubpathwayNode(TypedDict):
    """
    A TypedDict that describes a subpathway node.

    Attributes:
        dbId (int): The database ID of the subpathway node.
        stId (str): The stable ID of the subpathway node.
    """

    dbId: int
    stId: str
    events: List[int]
    displayName: str


class ReactomeGraphJSON(TypedDict):
    """
    A TypedDict that describes a ReactomeGraphJSON.

    Attributes:
        nodes (List[EntityNode]): A list of entity nodes in the graph.
        edges (List[EventNode]): A list of event nodes in the graph.
        dbId (int): The database ID of the graph.
        stId (str): The stable ID of the graph.
        subpathways (List[SubpathwayNode]): A list of subpathway nodes in the graph.
    """

    nodes: List[EntityNode]
    edges: List[EventNode]
    subpathways: List[SubpathwayNode]
    dbId: int
    stId: str


class ModifiedReactomeGraphJSON(TypedDict):
    """
    A TypedDict that describes a ReactomeGraphJSON.
    NOTE: This is a modified version of the ReactomeGraphJSON that is used for the hierarchy.
    Attributes:
        nodes (Dict[int, EntityNode]): A dictionary of entity nodes in the graph.
        edges (Dict[int, EventNode]): A dictionary of event nodes in the graph.
        dbId (int): The database ID of the graph.
        stId (str): The stable ID of the graph.
        subpathways (Dict[int, SubpathwayNode]): A dictionary of subpathway nodes in the graph.
    """

    nodes: Dict[int, EntityNode]
    edges: Dict[int, EventNode]
    subpathways: Dict[int, SubpathwayNode]
    dbId: int
    stId: str


class EntityOccurrence(TypedDict):
    """
    A TypedDict that describes an occurrence.
    Attributes:
        dbId (int): The database ID of the occurrence.
        stId (str): The stable ID of the occurrence.
    """

    internalID: int
    stableID: str
