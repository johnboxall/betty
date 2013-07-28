"use strict"

var Betty = require("..");
var Assert = require("assert");
var Path = require("path");

describe("betty.utils", function() {
    specify('.getHeaders()', function() {
        var expected = {
            "x-amz-acl": "public-read",
            "Content-Type": "text/html; charset=UTF-8",
            "Cache-Control": "public,max-age=300"
        };

        var result = Betty.utils.getHeaders("index.html");

        Assert.deepEqual(result, expected);

        var expected = {
            "x-amz-acl": "public-read",
            "Content-Type": "image/png; charset=UTF-8",
            "Cache-Control": "public,max-age=31536000"
        };

        var result = Betty.utils.getHeaders("foo.png");

        Assert.deepEqual(result, expected);
    });

    specify(".resolveKey()", function() {
        var tests = [
            ["foo", "/", "foo/bar", "/foo/bar"],
            ["foo/", "/", "foo/bar", "/bar"],
            ["foo/", "", "foo/bar", "bar"]
        ];

        tests.forEach(function(test) {
            var from = test[0];
            var to = test[1];
            var filename = test[2];
            var expected = test[3];
            var result = Betty.utils.resolveKey(from, to, filename);

            Assert.equal(result, expected);
        });
    });

    specify(".md5()", function(done) {
        var path = Path.join(__dirname, "fixtures/foo.txt");

        var expected = "4fd8cc85ca9eebd2fa3c550069ce2846";

        Betty.utils.md5(path, function(err, result) {
            Assert.equal(result, expected);
            done();
        })
    });

    specify(".walk()", function(done) {
        var dir = Path.join(__dirname, "fixtures");

        var expected = {
            "4fd8cc85ca9eebd2fa3c550069ce2846": [Path.join(dir, "foo.txt"), Path.join(dir, "dir/foo.txt")],
            "2923031cca09dee688f9dbd686d80e7b": [Path.join(dir, "dir/bar.txt")]
        };

        Betty.utils.walk(dir, function(err, result) {
            Assert.deepEqual(result, expected);
            done();
        });
    });

    // specify(".manifest()", function()});
});