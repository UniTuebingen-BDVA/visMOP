![Image](https://raw.githubusercontent.com/UniTuebingen-BDVA/visMOP/7bdba6365522c86723b90c35efeb46564e7e1d97/assets/Banner.svg)

visMOP is a tool for the visualization of multi-omics data in the context of pathways. It is designed for the use as a web-tool and is deployed using docker.
The tool heavily utilzes the Reactome database (https://reactome.org/) for the pathway data and sigma.js for the graph visualization (https://www.sigmajs.org/).

visMOP was presented at the 2023 EuroVIS conference in Leipzig, Germany. The paper can be found here: [Link to paper](https://doi.org/10.1111/cgf.14828)

# Concept

The main idea behind visMOP is to provide a tool for the integrative visualization of multi-omics data.
More specifically to find pathways in which the regulation of genes, proteins and metabolites (or any combination of one ore more of these) is altered in an experiment.

For this, all measurements are mapped to Reactome pathways and meta-measurements are calculated for each pathway.
Using clustering algorithms, the pathways are grouped into clusters of similar regulation patterns.
The user can then explore these clusters and pathways in an interactive graph visualization.

![Image](https://github.com/UniTuebingen-BDVA/visMOP/blob/readmeAssets/assets/Overview.png?raw=true)

The glyphs represent the pathways and each segment of the glyph represents a different omics data type (here two omics, gene expression and protein expression are shown).
The color of the segments represents the regulation of the respective omics data type in the pathway.

![Image](https://github.com/UniTuebingen-BDVA/visMOP/blob/readmeAssets/assets/GlyphCompare.png?raw=true)

These glyphs are also used in the graph as nodes.
Hovering over the Topics in the circle around the glyph will highlight the respective pathways in the graph.

![Image](https://github.com/UniTuebingen-BDVA/visMOP/blob/readmeAssets/assets/HoverInter.png?raw=true)

The glyphs are shown in three detail levels, the first one shows the overall regulation of the cluster (see first image), the second one shows the regulation of the individual omics data types (see previous image) and the third one shows the regulation of the individual entities in the pathway.

![Image](https://github.com/UniTuebingen-BDVA/visMOP/blob/readmeAssets/assets/HighDetail.png?raw=true)

Topics can be expanded to show subtopics, which themselves can be hovered, and if not a leaf node, expanded.

![Image](https://github.com/UniTuebingen-BDVA/visMOP/blob/readmeAssets/assets/Subtopic.png?raw=true)

Using filters the user can select types of pathways to be shown or select regulation notch and band thresholds.

![Image](https://github.com/UniTuebingen-BDVA/visMOP/blob/readmeAssets/assets/Filter.png?raw=true)

Single pathways can be selected and shown in the canonical Reactome pathway view.
Here the entiies are colored according to the regulation of the omics data types.
![Image](https://github.com/UniTuebingen-BDVA/visMOP/blob/readmeAssets/assets/detailPathway.png?raw=true)

# Installation

```bash
docker build -t vismop -f dockerfileFrontEndFlask . $(cat localSecrets.env | sed 's@^@--build-arg=@g' | paste -s -d " ")
docker compose --env-file localSecrets.env build
docker compose --env-file localSecrets.env up // -d if you want to run the tool in the background
```
