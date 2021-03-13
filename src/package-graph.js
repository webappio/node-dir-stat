function iteratePackages(packages, callback) {
    Object.keys(packages).forEach(name => {
        callback(name, packages[name]);
        iteratePackages(packages[name].dependencies || {}, callback);
    })
}

function iterateChildren(node, callback, seen) {
    if(!node || !node.children) {
        return;
    }
    seen = seen || {};
    if(seen[node.name]) {
        return;
    }
    seen[node.name] = true;
    callback(node);

    node.children.forEach(child => {
        iterateChildren(child, callback, seen);
    })
}

export function ParseGraph(packages, packageSizes) {
    const packageParents = new Map();
    const nodes = {};

    iteratePackages(packages, (packageName, packageData) => {
        packageParents.set(packageName, new Set());
        nodes[packageName] = {
            name: packageName,
            version: packageData.version,
            // size: packageSizes[packageName],
            size: Math.ceil(Math.random()*10000+1),
            children: new Set(),
        };
    });

    iteratePackages(packages, (packageName, packageData) => {
        for(let childName of Object.keys(packageData.requires || {})) {
            packageParents.get(childName).add(packageName);
            nodes[packageName].children.add(nodes[childName]);
        }
        for(let childName of Object.keys(packageData.dependencies || {})) {
            packageParents.get(childName).add(packageName);
            nodes[packageName].children.add(nodes[childName]);
        }
    });

    const totalNumParents = packageName => {
        const allParents = new Set();
        const recurse = nodes => {
            for(let node of nodes) {
                if(!allParents.has(node)) {
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
    nodesList.sort((a, b) => totalNumParents(a.name)-totalNumParents(b.name));
    for(let node of nodesList) {
        node.totalSize = node.size;
        iterateChildren(node, child => node.totalSize += child.size);
    }

    const seenNodes = {};
    const result = [];
    for(let node of nodesList) {
        if(!seenNodes[node.name]) {
            result.push(node);
        }
        iterateChildren(node, child => seenNodes[child.name] = true);
    }
    return result;
}