visMOP is a tool for the visualization of multi-omics data in the context of pathways. It is designed for the use as a web-tool and is deployed using docker.
The tool heavily utilzes the Reactome database (https://reactome.org/) for the pathway data and sigma.js for the graph visualization (https://www.sigmajs.org/).

visMOP was presented at the 2023 EuroVIS conference in Leipzig, Germany. The paper can be found here: [Link to paper](https://doi.org/10.1111/cgf.14828)

# Concept

The main idea behind visMOP is to provide a tool for the integrative visualization of multi-omics data.
More specifically to find pathways in which the regulation of genes, proteins and metabolites (or any combination of one ore more of these) is altered in an experiment.

For this, all measurements are mapped to Reactome pathways and meta-measurements are calculated for each pathway.
Using clustering algorithms, the pathways are grouped into clusters of similar regulation patterns.
The user can then explore these clusters and pathways in an interactive graph visualization.
