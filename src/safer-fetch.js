/* eslint-env browser */
/* eslint-disable no-use-before-define */

// This throttles and retries fetch() to mitigate the effect of random network errors and
// random browser errors (especially in Chrome)

let currentFetches = 0;
const queue = [];

const startNextFetch = ([resolve, url, options]) => {
    let firstError;
    let failedAttempts = 0;

    const attemptToFetch = () => fetch(url, options)
    .then(result => {
        // In a macOS WKWebView, requests from file: URLs to other file: URLs always have status: 0 and ok: false
        // even though the requests were successful. If the requested file doesn't exist, fetch() rejects instead.
        // We aren't aware of any other cases where fetch() can resolve with status 0, so this should be safe.
        if (result.ok || result.status === 0)
            return result.arrayBuffer();
        if (result.status === 404)
            return null;
        return Promise.reject(result.status);
    })
    .then(buffer => {
        currentFetches--;
        checkStartNextFetch();
        return buffer;
    })
    .catch(error => {
        if (error === 403) {
            // Retrying this request will not help, so return an error now.
            throw error;
        }

        console.warn(`Attempt to fetch ${url} failed`, error);
        if (!firstError) {
            firstError = error;
        }

        if (failedAttempts < 2) {
            failedAttempts++;
            return new Promise(cb => setTimeout(cb, (failedAttempts + Math.random() - 1) * 5000))
            .then(attemptToFetch);
        }

        currentFetches--;
        checkStartNextFetch();
        throw firstError;
    });

    return resolve(attemptToFetch());
};

const checkStartNextFetch = () => {
    if (currentFetches < 100 && queue.length > 0) {
        currentFetches++;
        startNextFetch(queue.shift());
    }
};

const saferFetchAsArrayBuffer = (url, options) => new Promise(resolve => {
    queue.push([resolve, url, options]);
    checkStartNextFetch();
});

//Gvbvdxx Mod 2: I dont think this is really nessasary, but use XHRRequest instead.

function lessSafeArrayBufferRequest(url, options) {
	return new Promise((resolve, reject) => {
		
		//If so, I think they might have used options.method which can be an
		//issue if I plan on using other methods with this.
		
		var realMethod = "GET";
		
		if (options.method) {
			realMethod = options.method;
		}
		
		var xhr = new XMLHttpRequest();
		xhr.addEventListener('error', function () {
			console.warn("[GM2 Unsafer Storage]: Unable to preform XMLHttpRequest() on url "+url+".");
			reject();
		});
		xhr.open(realMethod, url);
		xhr.responseType = 'arraybuffer';

		xhr.onload = function (e) {
			if (this.status == 200) {
				resolve(this.response); //Basically passes through the requested "array buffer".
			} else {
				console.warn("[GM2 Unsafer Storage]: Got status "+this.status+" on url "+url+".");
				reject();
			}
		};

		xhr.send();
	});
}

module.exports = lessSafeArrayBufferRequest;
