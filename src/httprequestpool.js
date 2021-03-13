export default class RequestPool {
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
