# Betty

Betty is a command line utility for syncing static websites to S3.

## Usage

**Betty is alpha software. Don't use it to perform open heart surgery.**

Betty requires that the environment variables `AWS_ACCESS_KEY` and
`AWS_SECRET_ACCESS_KEY` are set.

    betty <source> [destination] <bucket>

To see what Betty would do without making changes, pass the `--dry-run` option:

    betty --dry-run output/ foobar-bucket

## Features

- Sane out of the box defaults for uploading static websites to S3.
- Uploads in parallel with reasonable settings for concurrency.
- Minimizes uploads by using S3's copy functionality.

## Details

- Skips dotfiles.
- Skips symlinks.
- Adds headers to synced files:

    # HTML headers:
    x-amz-acl: public-read
    Content-Type: text/html; charset=UTF-8
    Cache-Control: public,max-age=<5 minutes>

    # Non-HTML headers:
    x-amz-acl: public-read
    Content-Type: <content type>; charset=UTF-8
    Cache-Control: public,max-age=<1 year>

## Sync strategy

Betty minimizes uploads using S3's copy functionality. Only content that doesn't already
exist on S3 is uploaded. If the same content would be uploaded to multiple locations,
Betty uploads it once and then copies it to the other locations.

Note that Betty restricts it search for matching content to the bucket's destination,
so if duplicate content exists in a part of the bucket that is not being synced,
there will be no benefits.

## Things that probably won't work

- Uploading large files.
- Betty is not resistant upload errors.