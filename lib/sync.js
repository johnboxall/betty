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

            var remote;
            var paths;
            var source;
            var path;
            var dest;
            var hash;

            while (remote = remotes.pop()) {
                remoteContentMap[remote.ETag.slice(1, -1)] = remotePathMap[remote.Key] = remote;
            }

            for (hash in localContentMap) {
                paths = localContentMap[hash];

                // Matching content exists on S3. Copy it to the paths that do
                // not exist or have changed.
                if (remoteContentMap[hash]) {
                    source = remoteContentMap[hash].Key;
                    for (var i = 0; i < paths.length; i++) {
                        path = paths[i];
                        dest = Utils.resolveKey(dir, keyPrefix, path);
                        remote = remotePathMap[dest];

                        if (remote && (hash == remote.ETag.slice(1, -1))) {
                            debug('skipped %s', dest);
                            if (!--pending) return done(null);
                            continue;
                        }

                        source = remoteContentMap[hash].Key;

                        (function(destination) {
                            client.copyFile(source, destination, Utils.getHeaders(path), function(err, res) {
                                if (err) return done(err);
                                debug('copied %s', destination);
                                if (!--pending) return done(null);
                            });
                        })(dest);
                    }
                    continue;
                }

                // Matching content does not exist on S3. Upload it, then copy
                // it to the other paths.
                path = paths[0];
                dest = Utils.resolveKey(dir, keyPrefix, path);
                client.putFile(path, dest, Utils.getHeaders(path), function(err, res) {
                    if (err) return done(err);
                    debug('put %s', dest);

                    source = dest;

                    for (var i = 1; i < paths.length; i++) {
                        path = paths[i];
                        dest = Utils.resolveKey(dir, keyPrefix, path);

                        (function(destination) {
                            client.copyFile(source, destination, Utils.getHeaders(path), function(err, res) {
                                if (err) return done(err);
                                debug('copied %s', destination);
                                if (!--pending) return done(null);
                            });
                        })(dest);
                    }

                    if (!--pending) return done(null);
                });
            }
        });
    });
};