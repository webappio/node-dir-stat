import React from "react";

function selectColor(number) {
    const hue = number * 137.508; // use golden angle approximation
    return `hsl(${hue},50%,75%)`;
}

function renderFileSize(sizeBytes) {
    if(sizeBytes < 2_000) {
        return sizeBytes+"B";
    }
    if(sizeBytes < 1_000_000) {
        return (sizeBytes/1_000).toFixed(1)+"kB";
    }
    if(sizeBytes < 1_000_000_000) {
        return (sizeBytes/1_000_000).toFixed(1)+"MB";
    }
    return (sizeBytes/1_000_000_000).toFixed(2)+"GB";
}

function GraphVizRow({node, i, height, width, setGraph}) {
    return <div
        className="graphbox"
        style={{
            display: "flex",
            flexWrap: "wrap",
            height: (height*95)+"vh",
            width: (width*100)+"%",
            minHeight: "2rem",
            minWidth: "8rem",
            textAlign: "center",
            background: selectColor(i),
            cursor: node.children.size > 0 ? "pointer" : "inherit",
        }}
        onClick={() => {
            if(node.children.size === 0) {
                return;
            }
            setGraph(node.children)
        }}
    >
        <h5 style={{margin: "1em"}}>{node.name} ({renderFileSize(node.size)})</h5>
    </div>
}

function GraphVizColumn({graph, setGraph}) {
    const graphList = [...graph];
    const sqrtNumNodes = Math.ceil(Math.sqrt(graphList.length));
    return <div style={{
        display: "flex",
        flexDirection: "column",
        flexWrap: "wrap",
        alignContent: "flex-start",
        minHeight: "50vh",
        maxHeight: "100vh",
    }}>
        {graphList.map((node, i) => <GraphVizRow
            key={node.name}
            node={node}
            i={i}
            setGraph={setGraph}
            height={
                node.size/graphList.slice(sqrtNumNodes*Math.floor(i/sqrtNumNodes), sqrtNumNodes*Math.floor(i/sqrtNumNodes)+sqrtNumNodes)
                    .map(({size}) => size)
                    .reduce((a, b) => a+b, 0)
            }
            width={
                graphList.slice(sqrtNumNodes*Math.floor(i/sqrtNumNodes), sqrtNumNodes*Math.floor(i/sqrtNumNodes)+sqrtNumNodes)
                    .map(({size}) => size)
                    .reduce((a, b) => a+b, 0)
                / graphList
                    .map(({size}) => size)
                    .reduce((a, b) => a+b, 0)
            }
        />)}
    </div>
}

export function GraphViz({graph}) {
    const [currGraph, setCurrGraph] = React.useState(graph);
    React.useEffect(() => {
        if(!currGraph) {
            setCurrGraph(graph);
        }
    }, [graph]);

    return <GraphVizColumn graph={currGraph} depth={0} setGraph={graph => setCurrGraph([...graph])}/>
}