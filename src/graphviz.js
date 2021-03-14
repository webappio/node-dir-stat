import React from "react";

function selectColor(number) {
    const hue = number * 137.508; // use golden angle approximation
    return `hsl(${hue},50%,75%)`;
}

function renderFileSize(sizeBytes) {
    if (sizeBytes < 1_000) {
        return sizeBytes + "B";
    }
    if (sizeBytes < 1_000_000) {
        return (sizeBytes / 1_000).toFixed(1) + "kB";
    }
    if (sizeBytes < 1_000_000_000) {
        return (sizeBytes / 1_000_000).toFixed(1) + "MB";
    }
    return (sizeBytes / 1_000_000_000).toFixed(2) + "GB";
}

function GraphVizRow({node, backgroundColor, height, setCurrNode}) {
    return <div
        className="graphbox"
        style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            height: (height * 95) + "vh",
            minWidth: "8rem",
            textAlign: "center",
            background: backgroundColor,
            cursor: node.children.size > 0 ? "pointer" : "inherit",
        }}
        onClick={() => {
            if (node.children.size === 0) {
                return;
            }
            setCurrNode(node)
        }}
    >
        <div>
            <h5 style={{margin: 0}}>{node.name}</h5>
            <h5 style={{marginTop: ".25rem"}}>({renderFileSize(node.totalSize) + ", " + (node.children.size > 0 ? node.children.size : "no")} children)</h5>
        </div>
    </div>
}

function GraphVizColumns({graph, setCurrNode}) {
    const graphList = [...graph];
    const sqrtNumNodes = Math.ceil(Math.sqrt(graphList.length));
    if(sqrtNumNodes === 0) {
        return <div>No nodes.</div>
    }
    const groups = new Array(sqrtNumNodes)
        .fill(null)
        .map((_, i) => graphList.slice(sqrtNumNodes * i, sqrtNumNodes * (i+1)));

    return <div style={{overflowX: "auto", display: "flex", flexDirection: "row", justifyContent: "center"}}>
        {groups.map((group, groupIndex) => <div key={groupIndex} style={{
            display: "flex",
            flexDirection: "column",
            alignContent: "flex-start",
            minHeight: "50vh",
            maxHeight: "calc(95vh + 2px)",
            width: ( group.map(({totalSize}) => totalSize).reduce((a, b) => a + b, 0) * 100
                / graphList.map(({totalSize}) => totalSize).reduce((a, b) => a + b, 0))+"%",
            maxWidth: "50%",
        }}>
            {group.map((node, i) => <GraphVizRow
                key={node.name}
                node={node}
                setCurrNode={setCurrNode}
                height={node.totalSize / group.map(({totalSize}) => totalSize).reduce((a, b) => a + b, 0)}
                backgroundColor={selectColor(groupIndex*sqrtNumNodes+i)}
            />)}
        </div>)}
    </div>
}

function Breadcrumb({elements, onClick}) {
    return <div style={{display: "flex", flexDirection: "row", margin: "1rem"}}>
        {[...elements].map((node, i) => <span key={node.name}>
            {i !== 0 ? <i className="feather icon-chevron-right" style={{margin: "0 0.5rem"}}/> : null}
            <a href="#" onClick={e => {
                e.preventDefault();
                onClick(node);
            }}>{node.name}</a>
        </span>)}
    </div>
}

export function GraphViz({graph}) {
    const [currGraph, setCurrGraph] = React.useState(graph);
    React.useEffect(() => {
        if (!currGraph) {
            setCurrGraph(graph);
        }
    }, [graph]);

    const [breadcrumbElements, setBreadcrumbElements] = React.useState([{name: "(root)", children: graph}]);

    return <div style={{display: "flex", flexDirection: "column"}}>
        <Breadcrumb
            elements={breadcrumbElements}
            onClick={node => {
                const index = breadcrumbElements.findIndex(({name}) => name === node.name);
                if (index >= 0) {
                    setBreadcrumbElements(breadcrumbElements.slice(0, index + 1));
                }
                setCurrGraph(node.children);
            }}
        />
        <GraphVizColumns graph={currGraph} setCurrNode={node => {
            setCurrGraph([...node.children]);
            breadcrumbElements.push(node);
        }}/>
    </div>
}