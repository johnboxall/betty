var Emitter = require("events").EventEmitter;
var Util = require("util");

var Async = require("async");
var Knox = require("knox");

var Utils = require("./utils");

/**
 * Useful for overriding `knox` client methods.
 */
var noop = function(client, name) {
    return function(source, destination, callback) {
        process.nextTick(function() {
            client.emit('progress', name, source, destination);
            callback(null, {
                resume: function() {}
            });
        });
    }
};

/**
 * Returns a rate-limited Client for `bucket`. If `dryRun` is passed,
 * return a non-client.
 */
var Client = module.exports = function(options) {
    var self = this;

    self.s3 = Knox.createClient({
        bucket: options.bucket,
        key: options.key,
        secret: options.secret,
    });

    Emitter.call(self);

    if (options.dryRun) {
        self.put = noop(self, 'put');
        self.copy = noop(self, 'copy');
        return;
    }

    // Rate limit `put` to avoid too many concurrent uploads.
    var put = self.put;

    var putQueue = Async.queue(function(task, callback) {
        var done = function(err, res) {
            callback();
            task.callback(err, res)
        };

        put.apply(self, [task.source, task.destination, done]);
    }, options.concurrency || 10);

    self.put = function(source, destination, callback) {
        putQueue.push({
            source: source,
            destination: destination,
            callback: callback
        });
    };
};
Util.inherits(Client, Emitter);

Client.prototype.copy = function(source, destination, callback) {
    var self = this;

    self.s3.copyFile(source, destination, Utils.getHeaders(source), function(err, res) {
        if (err) return callback(err);
        self.emit('progress', 'copy', source, destination);
        res.resume();
        callback(null, res);
    });
}

Client.prototype.put = function(path, destination, callback) {
    var self = this;

    self.s3.putFile(path, destination, Utils.getHeaders(path), function(err, res) {
        if (err) return callback(err);
        self.emit('progress', 'put', path, destination);
        res.resume();
        callback(null, res);
    });
}