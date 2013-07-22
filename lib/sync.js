"use strict"

var Utils = require("./utils");

var debug = require("debug")("betty");

/**
 * Sync directory `dir` to S3 under `keyPrefix`, calling `callback` when done.
 * Builds a local and remote content map, then uses copy and put to sync the
 * delta.
 */
module.exports = function(client, dir, keyPrefix, callback) {
    // Protect against double callbacks.
    var called = false;
    var done = function() {
        if (called) return;
        called = true;
        callback.apply(null, arguments);
    }

    Utils.walk(dir, function(err, localContentMap) {
        if (err) return done(err);

        var pending = Object.keys(localContentMap).reduce(function(previous, key) {
            return previous + localContentMap[key].length
        }, 0);

        debug('syncing %d files', pending);

        Utils.manifest(client, keyPrefix, function(err, remotes) {
            if (err) return done(err);

            var remoteContentMap = {};
            var remotePathMap = {};

            var hash;
            var remote;
            var paths;
            var destination;

            while (remote = remotes.pop()) {
                remoteContentMap[remote.ETag.slice(1, -1)] = remotePathMap[remote.Key] = remote;
            }

            for (hash in localContentMap) {
                paths = localContentMap[hash];

                // Matching content exists on S3. Copy it to the paths that do
                // not exist or have changed.
                if (remoteContentMap[hash]) {
                    for (var i = 0; i < paths.length; i++) {
                        destination = Utils.resolveKey(dir, keyPrefix, paths[i]);
                        remote = remotePathMap[destination];

                        if (remote && (hash == remote.ETag.slice(1, -1))) {
                            debug('skip %s', destination);
                            if (!--pending) return done(null);
                            continue;
                        }

                        copy(client, remoteContentMap[hash].Key, destination, function(err) {
                            if (err) return done(err);
                            if (!--pending) return done(null);
                        });
                    }

                    continue;
                }

                // Matching content does not exist on S3. Upload it, then copy
                // it to the other paths.
                (function(paths) {
                    var path = paths[0];
                    var destination = Utils.resolveKey(dir, keyPrefix, path);
                    var source;

                    put(client, path, destination, function(err) {
                        if (err) return done(err);

                        source = destination;

                        for (var i = 1; i < paths.length; i++) {
                            destination = Utils.resolveKey(dir, keyPrefix, paths[i]);
                            copy(client, source, destination, function(err) {
                                if (err) return done(err);
                                if (!--pending) return done(null);
                            });
                        }

                        if (!--pending) return done(null);
                    });
                })(paths);
            }
        });
    });
};

function copy(client, source, destination, callback) {
    return client.copyFile(source, destination, Utils.getHeaders(source), function(err, res) {
        debug('copied %s', destination);
        callback(err, res);
    });
}

function put(client, path, destination, callback) {
    return client.putFile(path, destination, Utils.getHeaders(path), function(err, res) {
        debug('put %s', destination);
        callback(err, res);
    });
}