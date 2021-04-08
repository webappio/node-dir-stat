import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import {ParseGraph} from "./package-graph";
import {GraphViz} from "./graphviz";

const App = () => {
    const [inputRef, setInputRef] = React.useState(null);
    const [packageLockJson, setPackageLockJson] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [graph, setGraph] = React.useState(null);
    const [status, setStatus] = React.useState("Initializing...");

    React.useEffect(() => {
        if (packageLockJson && packageLockJson.lockfileVersion !== 1) {
            setError("Invalid lockfile - we expect 'lockfileVersion=1' from package-lock-old.json");
            return;
        }
        if(packageLockJson) {
            ParseGraph(packageLockJson.dependencies, percent => {
                setStatus("Getting size info (" + percent.toFixed(1) + "%)");
            }).catch(e => setError("" + e))
                .then(res => {
                    if (res) {
                        setGraph(res);
                    }
                })
        }
    }, [packageLockJson]);

    return <main style={{display: "flex", flexDirection: "column"}}>
        {packageLockJson ? null : <>
            <div style={{display: "flex", justifyContent: "center"}}>
                <button className="upload-file-button" onClick={() => inputRef.click()}>
                    <i className="feather icon-play-circle"
                       style={{fontSize: "0.85rem", display: "inline-block"}}/> Upload a package-lock.json file
                </button>
                <button className="upload-file-button" onClick={() => {
                    fetch("https://raw.githubusercontent.com/layer-devops/node-dir-stat/master/package-lock.json")
                        .then(res => res.json())
                        .then(res => setPackageLockJson(res));
                }}>
                    <i className="feather icon-play-circle"
                       style={{fontSize: "0.85rem", display: "inline-block"}}/> See example
                </button>
            </div>
            <input type="file" accept=".json" style={{visibility: "hidden"}} ref={setInputRef} onChange={e => {
                if (e.target && e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = e => {
                        try {
                            setPackageLockJson(JSON.parse(e.target.result));
                        } catch (e) {
                            setError("Could not load package lock json: " + e);
                        }
                    }
                    reader.readAsBinaryString(e.target.files[0]);
                }
            }}/>
        </>}
        {packageLockJson && !graph
            ? <div style={{
                minHeight: "10rem",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column"
            }}>
                <h5>Pulling package size data from unpkg.com...</h5>
                <div>
                    {status}
                </div>
            </div>
            : null
        }
        {error ? <div className="error">Error: {error}</div> : null}
        {graph ? <GraphViz graph={graph}/> : null}
    </main>
}

ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById('root')
);
