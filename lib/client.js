var Knox = require("knox");
var Async = require("async");

/**
 * Useful for overriding `knox` client methods.
 */
var noop = function(source, destination, headers, callback) {
    process.nextTick(function() {
        callback(null, {});
    });
};

/**
 * Returns a rate-limited `knox` client for `bucket`. If `dryRun` is passed,
 * return a non-client.
 */
module.exports = function(options) {
    var client = Knox.createClient({
        bucket: options.bucket,
        key: options.key,
        secret: options.secret,
    });

    // @jb: With Node v0.10.x, I've seen the 'error' event fire from `knox` requests
    //      after error handlers have been removed. Bind our own handler to
    //      to track the trouble.
    var clientRequest = client.request;
    client.request = function(method, filename, headers) {
        var req = clientRequest.apply(client, arguments);
        req.on('error', function(err) {
            console.log('ERROR: %s %s %s', method, filename, err);
        });
        return req;
    };

    if (options.dryRun) {
        client.putFile = client.copyFile = noop;
        return client;
    }

    // Limit `putFile` to avoid opening too many files.
    var clientPutFile = client.putFile;

    var putFileQueue = Async.queue(function(task, callback) {
        var done = function(err, res) {
            callback();
            task.callback(err, res)
        };

        var request = clientPutFile.apply(client, [task.src, task.filename, task.headers, done]);
    }, 2);

    client.putFile = function(src, filename, headers, callback) {
        putFileQueue.push({
            src: src,
            filename: filename,
            headers: headers,
            callback: callback
        });
    };

    return client;
};