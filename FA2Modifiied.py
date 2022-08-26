def forceatlas2_layout(
    G,
    pos=None,
    n_iter=100,
    jitter_tolerance=1.0,
    scaling_ratio=2.0,
    gravity=1.0,
    distributed_action=False,
    strong_gravity=False,
    adjust_sizes=False,
    dissuade_hubs=False,
    edge_weight_influence=False,
    linlog=False,
    dim=2,
    extents=[],
):
    """Forceatlas2 layout for networkx

    See [1] for more info on the parameters

    [1]: https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0098679&type=printable
    Parameters
    ----------
    G : nx.Graph
       Netwrorkx graph
    pos: dict or None
       Optional starting positions
    n_iter: int
        Simulation steps
    jitter_tolerance : float
        Jitter  tolerance  for  adjusting  speed  of  layout
        generation
    scaling_ratio : float
        Controls  force scaling  constants k_attraction  and
        k_repulsion
    distributed_action : bool
    strong_gravity : bool
        Controls the  "pull" to  the center  of mass  of the
        plot (0,0)
    adjust_sizes: bool
        Prevent node overlapping in the layout
    dissuade_hubs : bool
        Prevent hub clustering
    edge_weight_influence : bool
        Generate layout with or without considering the edge
        weights
    linlog : bool
        Use log attraction rather than linear attraction
    dim: int,
       Sets the dimensions of the layout. This parameter is ignored if pos is given.

    Examples
    --------
    >>> import networkx as nx
    >>> G = nx.florentine_families_graph()
    >>> nx.draw(G, pos = nx.forceatlas2_layout(G))
    """
    import numpy as np

    # parse optional pos positions
    if pos is None:
        pos = nx.random_layout(G, dim=dim)
    else:
        dim = len(nx.utils.arbitrary_element(pos.values()))

    # default node positions proportional to the input dimensions
    # (if it exists)
    max_dim = 1
    min_dim = 0
    # check if we have a valid pos else just return (empty graph)
    if pos:
        max_dim = np.array([max(i) for i in pos.values()]).max()
        min_dim = np.array(([min(i) for i in pos.values()])).min()
    else:
        return pos

    if len(extents) > 0:
        pos_arr = np.zeros((len(G), 2))
        pos_arr[:, 0] = np.random.rand(len(G)) * (extents[1] - extents[0]) + extents[0]
        pos_arr[:, 1] = np.random.rand(len(G)) * (extents[3] - extents[2]) + extents[2]
    else:
        pos_arr = np.random.rand(len(G), dim) * max_dim - min_dim

    mass = np.zeros(len(G))
    size = np.zeros(len(G))
    for idx, node in enumerate(G.nodes()):
        if node in pos:
            pos_arr[idx] = pos[node].copy()
        mass[idx] = G.nodes[node].get("mass", G.degree(node) + 1)
        size[idx] = G.nodes[node].get("size", 1)

    n = len(G)
    gravities = np.zeros((n, dim))
    attraction = np.zeros((n, dim))
    repulsion = np.zeros((n, dim))
    weight = None
    if edge_weight_influence:
        weight = "weight"
    A = nx.adjacency_matrix(G, weight=weight).todense()

    speed = 1
    speed_efficiency = 1
    swing = 1
    traction = 1
    for idx in range(n_iter):
        # compute pairwise difference
        diff = pos_arr[:, None] - pos_arr[None]
        # compute pairwise distance
        distance = np.linalg.norm(diff, axis=-1)

        # linear attraction
        if linlog:
            attraction = -np.log(1 + distance) / distance
            np.fill_diagonal(attraction, 0)
            attraction = np.einsum("ij, ij -> ij", attraction, A)
            attraction = np.einsum("ijk, ij -> ik", diff, attraction)

        else:
            attraction = -np.einsum("ijk, ij -> ik", diff, A)

        if distributed_action:
            attraction /= mass[:, None]

        # repulsion
        tmp = mass[:, None] @ mass[None]
        if adjust_sizes:
            distance += -size[:, None] - size[None]
            # multiply negative distance * 100 (squared below)
            distance[distance < 0] = 1 / 10

        d2 = distance**2
        # remove self-interaction
        np.fill_diagonal(tmp, 0)
        np.fill_diagonal(d2, 0)
        factor = (tmp / d2) * scaling_ratio
        np.fill_diagonal(factor, 0)
        repulsion = np.einsum("ijk, ij -> ik", diff, factor)

        # gravity
        gravities = (
            -gravity
            * mass[:, None]
            * pos_arr
            / np.linalg.norm(pos_arr, axis=-1)[:, None]
        )
        if strong_gravity:
            gravities *= np.linalg.norm(pos_arr, axis=-1)[:, None]
        # total forces
        update = attraction + repulsion + gravities

        # compute total swing and traction
        swing += (mass * np.linalg.norm(pos_arr - update, axis=-1)).sum()
        traction += (0.5 * mass * np.linalg.norm(pos_arr + update, axis=-1)).sum()

        speed, speed_efficiency = estimate_factor(
            n,
            swing,
            traction,
            speed,
            speed_efficiency,
            jitter_tolerance,
        )

        # update pos
        if adjust_sizes:
            swinging = mass * np.linalg.norm(update, axis=-1)
            factor = 0.1 * speed / (1 + np.sqrt(speed * swinging))
            df = np.linalg.norm(update, axis=-1)
            factor = np.minimum(factor * df, 10.0 * np.ones(df.shape)) / df
        else:
            swinging = mass * np.linalg.norm(update, axis=-1)
            factor = speed / (1 + np.sqrt(speed * swinging))

        pos_arr += update * factor[:, None]
        if len(extents) > 0:
            pos_arr[:, 0] = np.clip(pos_arr[:, 0], extents[0], extents[1])
            pos_arr[:, 1] = np.clip(pos_arr[:, 1], extents[2], extents[3])

            pos_arr[:, 0] += np.random.rand(len(G)) * 0.1
            pos_arr[:, 1] += np.random.rand(len(G)) * 0.1

        if abs((update * factor[:, None]).sum()) < 1e-10:
            print(f"Breaking after {idx}")
            break
    print("Np nan", np.isnan(pos_arr).any())
    return {node: pos_arr[idx] for idx, node in enumerate(G.nodes())}
