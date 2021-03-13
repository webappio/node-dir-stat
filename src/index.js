import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import {ParseGraph} from "./package-graph";
import {GraphViz} from "./graphviz";

const totalDirSize = (files) => {
    if (!files) {
        return 0;
    }
    return files.map(({size, files}) => (size || 0) + totalDirSize(files)).reduce((a, b) => a + b, 0);
}

class RequestPool {
    constructor({capacity, retries}) {
        this.size = 0;
        this.capacity = capacity || 5;
        this.retries = retries || 5;
        this.jobs = [];
        this.doneListeners = [];
        this.progressListeners = [];
    }

    async _fetchWithRetry(url, options) {
        for (let i = 0; i < this.retries; i++) {
            try {
                return await fetch(url, options);
            } catch (e) {
                if (i === this.retries - 1) {
                    throw e;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1) * (i + 1))); //n^2 backoff
            }
        }
    }

    _onJobDone() {
        this.size -= 1;
        if (this.size === 0) {
            for (let listener of this.doneListeners) {
                listener();
            }
            this.doneListeners = [];
        } else {
            this._tryDequeue();
        }
        for (let listener of this.progressListeners) {
            listener();
        }
    }

    _tryDequeue() {
        if (this.size >= this.capacity) {
            return;
        }
        if (this.jobs.length === 0) {
            return;
        }
        const {url, options, resolve, reject} = this.jobs.pop();
        this.size += 1;
        this._fetchWithRetry(url, options).catch(e => {
            reject(e);
            this._onJobDone();
        }).then(res => {
            resolve(res);
            this._onJobDone();
        });
    }

    fetch(url, options) {
        return new Promise((resolve, reject) => {
            this.jobs.push({url, options, resolve, reject});
            this._tryDequeue();
        });
    }

    on(event, listener) {
        if (event === 'progress') {
            this.progressListeners.push(listener);
        }
    }

    wait() {
        return new Promise(resolve => {
            this.doneListeners.push(resolve);
        });
    }
}

const requestPool = new RequestPool({capacity: 10, retries: 5});

const App = () => {
    const [inputRef, setInputRef] = React.useState(null);
    const [packageLockJson, setPackageLockJson] = React.useState(null);
    const [packageSizes, setPackageSizes] = React.useState({});
    const [error, setError] = React.useState(null);
    const [numPackages, setNumPackages] = React.useState(0);
    const [numProcessing, setNumProcessing] = React.useState(0);

    const [graph, setGraph] = React.useState(null);
    const [displayingGraph, setDisplayingGraph] = React.useState(false);

    requestPool.on('progress', () => {
        setNumProcessing(requestPool.jobs.length);
    })

    React.useEffect(() => {
        if (packageLockJson && packageLockJson.lockfileVersion !== 1) {
            setError("Invalid lockfile - we expect 'lockfileVersion=1' from package-lock-old.json");
            return;
        }

        if (packageLockJson && packageLockJson.dependencies) {
            setNumPackages(Object.keys(packageLockJson.dependencies).length);
            for (let packageName of Object.keys(packageLockJson.dependencies)) {
                let packageData = packageLockJson.dependencies[packageName];
                if (!packageSizes[packageName + "@" + packageData.version]) {
                    requestPool.fetch("https://unpkg.com/"+packageName+"@"+packageData.version+"/?meta").catch(err => {
                        setError("Error for "+packageName+": "+err);
                    }).then(res => res.json())
                        .then(meta => {
                            setPackageSizes(packageSizes => ({...packageSizes, [packageName+"@"+packageData.version]: totalDirSize(meta.files)}));
                        });
                }
            }
        }
    }, [packageLockJson]);

    React.useEffect(() => {
        if (numProcessing === 0 && packageLockJson && numPackages > 0) {
            setGraph(ParseGraph(packageLockJson.dependencies, packageSizes));
            setDisplayingGraph(true);
        }
    }, [numProcessing, packageLockJson])

    return <main style={{display: "flex", flexDirection: "column"}}>
        {packageLockJson ? null : <>
            <div>
                <button className="upload-file-button" onClick={() => inputRef.click()}>
                    <i className="feather icon-play-circle" style={{fontSize: "0.85rem", display: "inline-block"}}/> Upload a package-lock.json file
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
        {numPackages > 0 && !displayingGraph
            ? <div style={{minHeight: "10rem", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column"}}>
                <h5>Pulling package size data from unpkg.com...</h5>
                <div>
                    {((numPackages - numProcessing) * 100 / (numPackages || 1)).toFixed(1) + "% complete..."}
                </div>
            </div>
            : null
        }
        {error ? <div className="error">Error: {error}</div> : null}
        {displayingGraph ? <GraphViz graph={graph}/> : null}
    </main>
}

ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById('root')
);
