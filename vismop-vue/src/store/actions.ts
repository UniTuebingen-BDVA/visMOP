export default {
    addClickedNode ({ dispatch, state }, val: {queryID: string, name: string}) {
      // TODO atm uniprot IDs will be used when no transcriptomics id is saved
      // TODO multiIDs will not work at the moment
      const keggIDs = val.queryID.split(';')
      const enteredKeys = state.clickedNodes.map(row => { return row.id })
      keggIDs.forEach(element => {
        try {
          if (!enteredKeys.includes(element)) {
            dispatch('appendClickedNode', val)
          }
        } catch (error) {
        }
      })
    },
    addClickedNodeFromTable ({ dispatch, state }, val: {[key: string]: string}) {
      let id = val[state.usedSymbolCols.proteomics]
      if (state.targetDatabase === 'kegg') {
        id = state.proteomicsSymbolDict[id]
      }
      console.log(state.targetDatabase)
      const enteredKeys = state.clickedNodes.map(row => { return row.id })
      try {
        if (!enteredKeys.includes(id)) {
          dispatch('appendClickedNode', { queryID: id, name: '' })
        }
      } catch (error) {
      }
    },
    appendClickedNode ({ commit, state }, val: {queryID: string, name: string}) {
      let tableEntry = {}
      if (state.targetDatabase === 'kegg') {
        const symbolProt = state.proteomicsKeggIDDict[val.queryID]
        const symbolTrans = state.transcriptomicsKeggIDDict[val.queryID]
        tableEntry = { id: val, name: `${symbolTrans}/${symbolProt}`, fcTranscript: state.fcs[val.queryID].transcriptomics, fcProt: state.fcs[val.queryID].proteomics, delete: val }
      }
      if (state.targetDatabase === 'reactome') {
        console.log('test', state.fcs)
        tableEntry = { id: val.queryID, name: `${val.name}`, fcTranscript: -1, fcProt: state.fcsReactome.proteomics[val.queryID], delete: val }
      }
      commit('APPEND_CLICKEDNODE', tableEntry)
    },
    queryEgoGraps ({ commit, state }, val) {
      let ids: string[] = []
      if (state.targetDatabase === 'kegg') {
        ids = state.clickedNodes.map((elem) => { return state.proteomicsKeggIDDict[elem.id] })
      }
      if (state.targetDatabase === 'reactome') {
        ids = state.clickedNodes.map((elem) => { return elem.id })
      }
      fetch('/interaction_graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: ids, threshold: val })
      })
        .then((response) => response.json()).then((content) => commit('SET_INTERACTIONGRAPHDATA', content.interaction_graph))
    },
    removeClickedNode ({ commit, state }, val) {
      console.log('removedNode', val)

      const indexNode = state.clickedNodes.map(row => { return row.id }).indexOf(val)
      console.log('removedNode', indexNode)
      if (indexNode > -1) {
        commit('REMOVE_CLICKEDNODE', indexNode)
      }
    },
    setTargetDatabase ({ commit }, val) {
      commit('SET_TARTGETDATABASE', val)
    },
    setKeggIDGeneSymbolDict ({ commit }, val) {
      commit('SET_KEGGIDGENESYMBOLDICT', val)
    },
    setSideBarExpand ({ commit }, val) {
      commit('SET_SIDEBAREXPAND', val)
    },
    setOverviewData ({ commit }, val) {
      commit('SET_OVERVIEWDATA', val)
    },
    setTranscriptomicsTableHeaders ({ commit }, val) {
      commit('SET_TRANSCRIPTOMICSTABLEHEADERS', val)
    },
    setTranscriptomicsTableData ({ commit }, val) {
      commit('SET_TRANSCRIPTOMICSTABLEDATA', val)
    },
    setTranscriptomicsData ({ commit }, val) {
      commit('SET_TRANSCRIPTOMICSDATA', val)
    },
    setTranscriptomicsSymbolDict ({ commit }, val) {
      commit('SET_TRANSCRIPTOMICSSYMBOLDICT', val)
      commit('SET_TRANSCRIPTOMICSKEGGIDDICT', _.invert(val))
    },
    setProteomicsTableHeaders ({ commit }, val) {
      commit('SET_PROTEOMICSTABLEHEADER', val)
    },
    setProteomicsTableData ({ commit }, val) {
      commit('SET_PROTEOMICSTABLEDATA', val)
    },
    setProteomicsData ({ commit }, val) {
      commit('SET_PROTEOMICSDATA', val)
    },
    setProteomicsSymbolDict ({ commit }, val) {
      commit('SET_PROTEOMICSSYMBOLDICT', val)
      commit('SET_PROTEOMICSKEGGIDDICT', _.invert(val))
    },
    setMetabolomicsTableHeaders ({ commit }, val) {
      commit('SET_METABOLOMICSTABLEHEADER', val)
    },
    setMetabolomicsTableData ({ commit }, val) {
      commit('SET_METABOLOMICSTABLEDATA', val)
    },
    setMetabolomicsData ({ commit }, val) {
      commit('SET_METABOLOMICSDATA', val)
    },
    setUsedSymbolCols ({ commit }, val) {
      commit('SET_USEDSYMBOLS', val)
    },
    setOverlay ({ commit }, val) {
      commit('SET_OVERLAY', val)
    },
    setGraphData ({ commit }, val) {
      commit('SET_GRAPHDATA', val)
    },
    setFCS ({ commit }, val) {
      commit('SET_FCS', val)
      console.log('fcs', val)
      const fcsTranscriptomics: number[] = []
      const fcsProteomics: number[] = []
      const fcsMetabolomics: number[] = []

      for (const key in val) {
        const entry: { transcriptomics: (string | number), proteomics: (string | number), metabolomics: (string | number) } = val[key]
        if (!(typeof entry.transcriptomics === 'string')) {
          fcsTranscriptomics.push(entry.transcriptomics)
        }
        if (!(typeof entry.proteomics === 'string')) {
          fcsProteomics.push(entry.proteomics)
        }
        if (!(typeof entry.metabolomics === 'string')) {
          fcsMetabolomics.push(entry.metabolomics)
        }
      }
      const fcsTranscriptomicsAsc = fcsTranscriptomics.sort((a, b) => a - b)
      const fcsProteomicsAsc = fcsProteomics.sort((a, b) => a - b)
      const fcsMetabolomicsAsc = fcsMetabolomics.sort((a, b) => a - b)

      // https://stackoverflow.com/a/55297611
      const quantile = (arr: number[], q: number) => {
        const pos = (arr.length - 1) * q
        const base = Math.floor(pos)
        const rest = pos - base
        if (arr[base + 1] !== undefined) {
          return arr[base] + rest * (arr[base + 1] - arr[base])
        } else {
          return arr[base]
        }
      }
      const quantTranscriptomics = [quantile(fcsTranscriptomicsAsc, 0.05), quantile(fcsTranscriptomicsAsc, 0.95)]
      const quantProteomics = [quantile(fcsProteomicsAsc, 0.05), quantile(fcsProteomicsAsc, 0.95)]
      const quantMetabolomics = [quantile(fcsMetabolomicsAsc, 0.05), quantile(fcsMetabolomicsAsc, 0.95)]

      const colorScaleTranscriptomics = d3.scaleDiverging(d => d3.interpolateRdBu(1 - d)).domain([quantTranscriptomics[0], quantTranscriptomics[0] < 0.0 ? 0.0 : 1.0, quantTranscriptomics[1]])
      const colorScaleProteomics = d3.scaleDiverging(d => d3.interpolateRdBu(1 - d)).domain([quantProteomics[0], quantProteomics[0] < 0.0 ? 0.0 : 1.0, quantProteomics[1]])
      const colorScaleMetabolomics = d3.scaleDiverging(d3.interpolatePRGn).domain([quantMetabolomics[0], quantProteomics[0] < 0.0 ? 0.0 : 1.0, quantMetabolomics[1]])

      commit('SET_FCQUANTILES', { transcriptomics: quantTranscriptomics, proteomics: quantProteomics, metabolomics: quantMetabolomics })
      commit('SET_FCSCALES', { transcriptomics: colorScaleTranscriptomics, proteomics: colorScaleProteomics, metabolomics: colorScaleMetabolomics })
    },
    setFCSReactome ({ commit }, val: {transcriptomics: {[key: string]: number}, proteomics: {[key: string]: number}, metabolomics: {[key: string]: number}}) {
      commit('SET_FCSREACTOME', val)
      console.log('fcs', val)
      const fcsTranscriptomicsAsc = Object.values(val.transcriptomics).sort((a, b) => a - b)
      const fcsProteomicsAsc = Object.values(val.proteomics).sort((a, b) => a - b)
      const fcsMetabolomicsAsc = Object.values(val.metabolomics).sort((a, b) => a - b)
      console.log('metafc', fcsMetabolomicsAsc)
      // https://stackoverflow.com/a/55297611
      const quantile = (arr: number[], q: number) => {
        const pos = (arr.length - 1) * q
        const base = Math.floor(pos)
        const rest = pos - base
        if (arr[base + 1] !== undefined) {
          return arr[base] + rest * (arr[base + 1] - arr[base])
        } else {
          return arr[base]
        }
      }
      const quantTranscriptomics = [quantile(fcsTranscriptomicsAsc, 0.05), quantile(fcsTranscriptomicsAsc, 0.95)]
      const quantProteomics = [quantile(fcsProteomicsAsc, 0.05), quantile(fcsProteomicsAsc, 0.95)]
      const quantMetabolomics = [quantile(fcsMetabolomicsAsc, 0.05), quantile(fcsMetabolomicsAsc, 0.95)]

      const colorScaleTranscriptomics = d3.scaleDiverging(d3.interpolateRdBu).domain([quantTranscriptomics[1], quantTranscriptomics[0] < 0.0 ? 0.0 : 1.0, quantTranscriptomics[0]])
      const colorScaleProteomics = d3.scaleDiverging(d3.interpolateRdBu).domain([quantProteomics[1], quantProteomics[0] < 0.0 ? 0.0 : 1.0, quantProteomics[0]])
      const colorScaleMetabolomics = d3.scaleDiverging(d3.interpolatePRGn).domain([quantMetabolomics[0], quantProteomics[0] < 0.0 ? 0.0 : 1.0, quantMetabolomics[1]])

      commit('SET_FCQUANTILES', { transcriptomics: quantTranscriptomics, proteomics: quantProteomics, metabolomics: quantMetabolomics })
      commit('SET_FCSCALES', { transcriptomics: colorScaleTranscriptomics, proteomics: colorScaleProteomics, metabolomics: colorScaleMetabolomics })
    },
    setPathwayLayoutingKegg ({ commit }, val: {pathwayList: string[], pathwayNodeDictionary: { [key: string]: string[]} }) {
      const nodePathwayDict: {[key: string]: string[]} = {}
      const pathwayNodeDictClean: {[key: string]: string[]} = {}
      Object.keys(val.pathwayNodeDictionary).forEach(pathwayID => {
        val.pathwayNodeDictionary[pathwayID].forEach(nodeIDstr => {
          const nodeIDs = nodeIDstr.split(';')
          nodeIDs.forEach(nodeID => {
            const nodeIDreplace = nodeID.replace('cpd:', '').replace('gl:', '')
            // for nodePathwayDict
            if (Object.keys(nodePathwayDict).includes(nodeIDreplace)) {
              nodePathwayDict[nodeIDreplace].push(pathwayID)
            } else {
              nodePathwayDict[nodeIDreplace] = [pathwayID]
            }
            // for pathwayNodeDictClean
            if (Object.keys(pathwayNodeDictClean).includes(pathwayID)) {
              pathwayNodeDictClean[pathwayID].push(nodeIDreplace)
            } else {
              pathwayNodeDictClean[pathwayID] = [nodeIDreplace]
            }
          })
        })
      })
      commit('SET_PATHWAYLAYOUTING', { ...val, nodePathwayDictionary: nodePathwayDict, pathwayNodeDictionaryClean: pathwayNodeDictClean })
    },
    setPathwayLayoutingReactome ({ commit }, val: {pathwayList: string[], pathwayNodeDictionary: { [key: string]: string[]} }) {
      console.log('TESTEST', val.pathwayNodeDictionary)
      commit('SET_PATHWAYLAYOUTING', { ...val, nodePathwayDictionary: val.pathwayNodeDictionary, pathwayNodeDictionaryClean: val.pathwayNodeDictionary })
    },
    focusPathwayViaOverview ({ commit }, val) {
      const valClean = val.replace('path:', '')
      commit('SET_PATHWAYDROPDOWN', valClean)
    },
    focusPathwayViaDropdown ({ commit }, val) {
      commit('SET_PATHWAYDROPDOWN', val)
    },
    selectPathwayCompare ({ commit, state }, val: string[]) {
      val.forEach(element => {
        const valClean = element.replace('path:', '')
        if (!state.pathwayCompare.includes(valClean)) commit('APPEND_PATHWAYCOMPARE', valClean)
      })
    },
    removePathwayCompare ({ commit, state }, val) {
      const idx = state.pathwayCompare.indexOf(val)
      commit('REMOVE_PATHWAYCOMPARE', idx)
    },
    setOmicsRecieved ({ commit }, val) {
      commit('SET_OMICSRECIEVED', val)
    },
    setPathayAmountDict ({ commit }, val) {
      commit('SET_PATHWAYAMOUNTDICT', val)
    },
    setGlyphData ({ commit }, val) {
      commit('SET_GLYPHDATA', val)
    },
    setGlyphs ({ commit }, val) {
      commit('SET_GLYPHS', val)
    }

  }