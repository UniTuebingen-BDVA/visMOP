from typing import TypedDict


class UmapClusterSettings(TypedDict):
    """
    A TypedDict that describes the settings for the UMAP clustering.

    Attributes:
        cluster_min_size_quotient (int): The minimum size of a cluster as a quotient of the number of nodes in the graph.
        use_umap (bool): Whether to use UMAP before clustering or not.
        automatic_cluster_target_dimensions (bool): Whether to automatically determine the target dimensions for the UMAP clustering or not.
        cluster_target_dimensions (int): The target dimensions for the UMAP clustering.
        umap_distance_metric (str): The distance metric to use for the UMAP clustering.

    """

    cluster_min_size_quotient: int
    use_umap: bool
    automatic_cluster_target_dimensions: bool
    cluster_target_dimensions: int
    umap_distance_metric: str
