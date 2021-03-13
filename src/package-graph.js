import RequestPool from "./httprequestpool";

function iteratePackages(packages, callback) {
    Object.keys(packages).forEach(name => {
        callback(name, packages[name]);
        iteratePackages(packages[name].dependencies || {}, callback);
    })
}

function iterateChildren(node, callback, seen) {
    if (!node || !node.children) {
        return;
    }
    seen = seen || {};
    if (seen[node.name]) {
        return;
    }
    seen[node.name] = true;
    callback(node);

    node.children.forEach(child => {
        iterateChildren(child, callback, seen);
    })
}

const totalDirSize = (files) => {
    if (!files) {
        return 0;
    }
    return files.map(({size, files}) => (size || 0) + totalDirSize(files)).reduce((a, b) => a + b, 0);
}

function setSizes(nodes, statusCallback) {
    const requestPool = new RequestPool({capacity: 10, retries: 2});
    let numProcessed = 0;

    return new Promise((resolve) => {
        for (let node of Object.values(nodes)) {
            // node.size = Math.ceil(Math.random()*10000+1); statusCallback(100); continue;

            requestPool.fetch("https://unpkg.com/" + node.name + "@" + node.version + "/?meta")
                .then(res =>  res.json())
                .catch(err => {
                    console.error("Error for " + node.name + ": " + err);
                })
                .then(meta => {
                    if(!meta) {
                        node.size = 1_000_000; //1mb arbitrarily
                    } else {
                        node.size = totalDirSize(meta.files);
                    }

                    numProcessed += 1;
                    statusCallback(numProcessed * 100/Object.values(nodes).length);
                    if(numProcessed === Object.values(nodes).length) {
                        resolve(null);
                    }
                })
        }
    });
}

export async function ParseGraph(packages, statusCallback) {
    const packageParents = new Map();
    const nodes = {};

    iteratePackages(packages, (packageName, packageData) => {
        packageParents.set(packageName, new Set());
        nodes[packageName] = {
            name: packageName,
            version: packageData.version,
            children: new Set(),
        };
    });

    iteratePackages(packages, (packageName, packageData) => {
        for (let childName of Object.keys(packageData.requires || {})) {
            packageParents.get(childName).add(packageName);
            nodes[packageName].children.add(nodes[childName]);
        }
        for (let childName of Object.keys(packageData.dependencies || {})) {
            packageParents.get(childName).add(packageName);
            nodes[packageName].children.add(nodes[childName]);
        }
    });

    await setSizes(nodes, statusCallback);

    const totalNumParents = packageName => {
        const allParents = new Set();
        const recurse = nodes => {
            for (let node of nodes) {
                if (!allParents.has(node)) {
                    allParents.add(node);
                    recurse(packageParents.get(node));
                }
            }
        }
        recurse(packageParents.get(packageName));
        return allParents.size;
    }

    //sort by closure size - there might be loops so can't do a topological sort
    const nodesList = Object.values(nodes);
    nodesList.sort((a, b) => totalNumParents(a.name) - totalNumParents(b.name));
    for (let node of nodesList) {
        node.totalSize = 0;
        iterateChildren(node, child => node.totalSize += child.size);
    }

    const seenNodes = {};
    const result = [];
    for (let node of nodesList) {
        if (!seenNodes[node.name]) {
            result.push(node);
        }
        iterateChildren(node, child => seenNodes[child.name] = true);
    }
    return result;
}