"use strict"

var SSS = require("..");
var Assert = require("assert");


describe("sss.utils", function() {
    specify('.getHeaders()', function() {
        var expected = {
            "x-amz-acl": "public-read",
            "Content-Type": "text/html; charset=UTF-8",
            "Cache-Control": "public,max-age=300"
        };

        var result = SSS.utils.getHeaders("index.html");

        Assert.deepEqual(result, expected);

        var expected = {
            "x-amz-acl": "public-read",
            "Content-Type": "image/png; charset=UTF-8",
            "Cache-Control": "public,max-age=31536000"
        };

        var result = SSS.utils.getHeaders("foo.png");

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
            var result = SSS.utils.resolveKey(from, to, filename);

            Assert.equal(result, expected);
        });
    });

    // specify(".md5()", function() {});
    // specify(".walk()", function() {});
    // specify(".manifest()", function()});
});