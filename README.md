# Betty

Betty is a command line utility for uploading static websites to S3.

## Installation

Betty requires Node.js v0.10.x. Use npm to install Betty:

    $ npm install -g betty

## Usage

Betty uploads files from a folder to an S3 bucket:

    $ betty <folder> <bucket>

Let's use Betty to upload the folder "folder" with the file "index.html" to the
bucket named "bucket":

    $ betty folder/ bucket
    [betty] Uploading 1 files from folder/ to bucket/.
    [betty] PUT  index.html
    [betty] Uploaded in 230ms

Betty is smart. Try the upload again:

    $ betty folder/ bucket
    [betty] Uploading 1 files from folder/ to bucket/.
    [betty] SKIP index.html
    [betty] Uploaded in 100ms

Betty doesn't upload unchanged files!

Betty uses AWS keys from environment variables `AWS_ACCESS_KEY` and
`AWS_SECRET_ACCESS_KEY`:

    $ betty folder/ bucket
    [betty] The "AWS_ACCESS_KEY" environment variable must be set.

If you can't set them in your environment pass them directly:

    $ AWS_ACCESS_KEY=key AWS_SECRET_ACCESS_KEY=secret betty folder/ bucket

Betty assumes the content you are uploading is for a public static website and
sets approriate HTTP headers:

    $ curl -s -D - bucket.s3.amazonaws.com/index.html
    HTTP/1.1 200 OK
    ...
    Cache-Control: public,max-age=600
    Content-Type: text/html; charset=UTF-8

Optionally, you may pass Betty a "destination" to prefix upload paths:

    $ betty <folder> [destination] <bucket>

To upload our file "index.html" to "blog/index.html":

    $ betty folder/ blog bucket
    [betty] Uploading 1 files from folder/ to bucket/blog.
    [betty] PUT  blog/index.html
    [betty] Uploaded in 221ms

To see what Betty would do without making changes set the "--dry-run" flag:

    $ betty --dry-run folder/ bucket

To make Betty less chatty, pass the "--quiet" flag:

    $ betty --quiet folder/ bucket

## Features

- Sane out of the box defaults for uploading public static websites to S3.
- Parrallel operations for speedy uploads.
- Minimizes network traffic by using S3's copy functionality where possible.

## Upload details

- Betty doesn't upload dotfiles.
- Betty doesn't follow symlinks.
- Betty adds headers to uploaded files:

        # Headers added for HTML files:
        x-amz-acl: public-read
        Content-Type: text/html; charset=UTF-8
        Cache-Control: public,max-age=<5 minutes>

        # Headers added for images, CSS and JavaScript:
        x-amz-acl: public-read
        Content-Type: <content type>; charset=UTF-8
        Cache-Control: public,max-age=<1 year>

## Upload strategy

Betty minimizes network traffic to S3 by using copy where possible. Only content
that doesn't already exist on S3 is uploaded. If the same content would be
uploaded to multiple locations, Betty uploads it once and then copies it to the
other locations.

Note that Betty restricts its search for matching content to the bucket's
destination, so if matching content exists in the bucket outside of the
destination there will be no benefits.