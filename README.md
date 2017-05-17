# Obsidian Asset Package File Library

[![Build Status](https://travis-ci.org/wanadev/obsidian-pack.svg?branch=master)](https://travis-ci.org/wanadev/obsidian-pack)
[![NPM Version](http://img.shields.io/npm/v/obsidian-pack.svg?style=flat)](https://www.npmjs.com/package/obsidian-pack)
[![License](http://img.shields.io/npm/l/obsidian-pack.svg?style=flat)](https://github.com/wanadev/obsidian-pack/blob/master/LICENSE)
[![Dependencies](https://img.shields.io/david/wanadev/obsidian-pack.svg?maxAge=2592000)]()
[![Dev Dependencies](https://img.shields.io/david/dev/wanadev/obsidian-pack.svg?maxAge=2592000)]()
[![Greenkeeper badge](https://badges.greenkeeper.io/wanadev/obsidian-pack.svg)](https://greenkeeper.io/)


Library and CLI tool to read and write the Obsidian Asset Package file format.


## CLI

### Get informations about the package

    obsidian-pack -d assets.opak

### Extract a package

    obsidian-pack -xf assets.opak [outputdir/]

### Create a package

    obsidian-pack -cf assets.opak [files]
    obsidian-pack -name org.example.pack.assets -cf assets.opak [files]

__NOTE:__ a file containing the `assetIndex` can be passed explicitly with the
`-i` options. It can also be listed with other files but must me named
`__assetindex__.json`.

### Help and other options

    obsidian-pack -h


## Tests

To lunch all tests, run the following command:

    npm test


## Changelog

* **1.0.1:** Updates `uuid` dependency to 3.0.0
* **1.0.0:** Initial release
