var program = require("commander");

var Betty = require("./index");


program.version('0.0.1');
program.usage('<source> [destination] <bucket>');
program.option('-d, --dry-run', 'no changes');
program.option('-q, --quiet', 'shhh');


function log() {
    arguments[0] = '[betty] ' + arguments[0]
    console.log.apply(console, arguments);
}

function error(err) {
    console.error('[betty] ' + err);
    process.exit(1);
}

module.exports = function(argv) {
    program.parse(argv);
    if (program.args.length < 2) {
        program.help();
    }

    if (!program.args[2]) {
        program.args.splice(1, 0, "");
    }

    var source = program.args[0];
    var destination = program.args[1];
    var bucket = program.args[2];

    var key = process.env.AWS_ACCESS_KEY;
    var secret = process.env.AWS_SECRET_ACCESS_KEY;

    if (!key) return error('The "AWS_ACCESS_KEY" environment variable must be set.');
    if (!secret) return error('The "AWS_SECRET_ACCESS_KEY" environment variable must be set.');

    var options = {
        key: key,
        secret: secret,
        bucket: bucket,
        dryRun: program.dryRun
    };

    var client = new Betty.Client(options);

    if (!program.quiet) {
        client.on('sync', function(pending) {
            log('Uploading %d files from %s to %s/%s.', pending, source, bucket, destination)
        });

        client.on('progress', function(action, source, destination) {
            log((action.toUpperCase() + ' ').slice(0, 4), destination);
        });
    }

    var start = +new Date;

    Betty.upload(client, source, destination, function(err) {
        if (err) return error(err);

        if (!program.quiet) log('Finished in %dms.', +new Date - start);

        process.exit(0);
    });
}