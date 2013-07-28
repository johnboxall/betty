"use strict"

var Crypto = require("crypto");
var FS = require("fs");
var Path = require("path");
var Util = require("util");

var Async = require("async");
var Filewalker = require('filewalker');
var Mime = require("mime");
var S3Lister = require("s3-lister");


var FIVE_MINUTES = 5 * 60;
var ONE_YEAR = 365 * 24 * 60 * 60;

/**
 * Returns a headers object for the file at `path`.
 */
exports.getHeaders = function(path) {
    var contentType = Mime.lookup(path)
    var cacheSeconds = contentType == "text/html" ? FIVE_MINUTES : ONE_YEAR;
    var cacheControl = Util.format("public,max-age=%d", cacheSeconds);
    var headers = {
        // Public Read
        "x-amz-acl": "public-read",
        // UTF-8 FTW.
        "Content-Type": contentType + "; charset=UTF-8",
        // CDNs, hold onto that file!
        "Cache-Control": cacheControl
    };
    return headers;
};

/**
 * Returns a S3 key. Works sort of like `cp`:
 *  resolve("out", "/", "out/file") → "/out/file"
 *  resolve("out/", "/", "out/file") → "/file"
 */
exports.resolveKey = function(from, to, filename) {
    if (from.slice(-1) == "/") filename = filename.slice(from.length);
    var resolved = Path.join(to, filename);
    return resolved;
}

/**
 * Call `callback` with the MD5 hex-digest of the contents of the file at `path`.
 */
var md5 = exports.md5 = function(path, callback) {
    var hash = Crypto.createHash("md5");
    var stream = FS.createReadStream(path);

    stream.on("data", function(chunk) {
        hash.update(chunk);
    });

    stream.on("end", function() {
        callback(null, hash.digest("hex"));
    });

    stream.on("error", function(err) {
        callback(err);
    });
};

/**
 * Walk files in `dir` calling `callback` with an map of content to paths.
 */
exports.walk = function(dir, callback) {
    var walker = Filewalker(dir, {maxPending: 10});
    var pending = 1;
    var contentMap = {}

    // Throttle `md5` to prevent too many files open errors.
    var queue = Async.queue(function(path, callback) {
        md5(path, callback);
    }, 2);

    walker.on('error', function(err) {
        return callback(err);
    });

    walker.on('file', function(path, stat) {
        // Ignore dotfiles.
        if (/(^\.|\/\.)/.test(path)) return;

        // Ignore symlinks (for now)
        if (stat.isSymbolicLink()) return;

        pending++;

        path = Path.join(dir, path);
        queue.push(path, function(err, hash) {
            if (err) return callback(err);
            (contentMap[hash] || (contentMap[hash] = [])).push(path);
            if (!--pending) callback(null, contentMap);
        });
    });

    walker.on('done', function() {
        if (!--pending) callback(null, contentMap);
    });

    walker.walk();

    return walker;
};

/**
 * Read `dir` from S3 and call `callback` with a list of S3 objects.
 */
exports.manifest = function(client, dir, callback) {
    var results = [];
    var lister = new S3Lister(client, {prefix: dir});

    lister.on('data', function(data) {
        results.push(data);
    });

    lister.on('error', function(err) {
        callback(err);
    });

    lister.on('end', function() {
        callback(null, results);;
    });

    return lister
};