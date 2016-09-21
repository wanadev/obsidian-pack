"use strict";

var Class = require("abitbol");

var codecs = require("./codecs.js");

var ObsidianPackFile = Class.$extend({

    __classvars__: {
        FORMAT_JSON: 0,
        FORMAT_JSON_DEFLATE: 1,
        VERSION: 1,
        MIMETYPE: "application/x-obsidian-pack",

        isObsidianPackFile: function(buffer) {
            if (buffer.length <= 25) {
                return false;
            }
            if (buffer.toString("ascii", 0, 4) !== "OPAK") {
                return false;
            }
            // Maybe this check is too strict
            if (buffer.length !== buffer.readUInt32BE(11) + buffer.readUInt32BE(19) +
                buffer.readUInt16BE(23) + 25) {
                return false;
            }
            return true;
        }
    },

    __init__: function(obsidianPackFile) {
        this.$data.version = 1;
        this.$data.packName = "org.example.unnamed-pack";
        this.$data.assets = {};

        if (typeof obsidianPackFile == "string") {
            this._loadPackFromData64Url(obsidianPackFile);
        } else if (obsidianPackFile instanceof Buffer || obsidianPackFile instanceof Uint8Array) {
            this._loadPackFromBuffer(obsidianPackFile);
        }
    },

    // Header

    getVersion: function() {
        return this.$data.version;
    },

    getPackName: function() {
        return this.$data.packName;
    },

    setPackName: function(packName) {
        this.$data.packName = packName;
    },

    // Asset

    getAssetList: function() {
        return Object.getOwnPropertyNames(this.$data.assets);
    },

    getAssetAsBuffer: function(assetId) {
        if (!this.assetExists(assetId)) {
            return null;
        }
        return this.$data.assets[assetId]._buffer;
    },

    getAssetAsData64Url: function(assetId) {
        if (!this.assetExists(assetId)) {
            return "data:application/octet-stream;base64,";
        }
        return "data:" + this.$data.assets[assetId].mime + ";base64," + this.$data.assets[assetId]._buffer.toString("base64");
    },

    getAssetAsString: function(assetId) {
        if (!this.assetExists(assetId)) {
            return "";
        }
        return this.$data.assets[assetId]._buffer.toString();
    },

    getAssetRecord: function(assetId) {
        var record = {
            offset: null,
            length: 0,
            mime: "application/octet-stream",
            metadata: {}
        };

        if (this.assetExists(assetId)) {
            record.length = this.$data.assets[assetId]._buffer.length;
            record.mime = this.$data.assets[assetId].mime;
            record.metadata = this.$data.assets[assetId].metadata;
        }

        return record;
    },

    // TODO Get Asset Index

    addAssetFromBuffer: function(buffer, assetId, options) {
        options = options || {};
        var assetRecord = {
            _buffer: buffer,
            mime: options.mime || "application/octet-stream",
            metadata: options.metadata || {}
        };

        if (this.assetExists(assetId)) {
            this.removeAsset(assetId);
        }
        this.$data.assets[assetId] = assetRecord;
    },

    addAssetFromData64Url: function(data64, assetId, options) {
        options = options || {};
        var buffer = new Buffer(data64.split(",")[1], "base64");
        if (!options.mime) {
            options.mime = data64.split(";")[0].split(":")[1];
        }
        this.addAssetFromBuffer(buffer, assetId, options);
    },

    addAssetFromString: function(string, assetId, options) {
        var buffer = new Buffer(string);
        this.addAssetFromBuffer(buffer, assetId, options);
    },

    removeAsset: function(assetId) {
        delete this.$data.assets[assetId];
    },

    assetExists: function(assetId) {
        return this.$data.assets[assetId] !== undefined;
    },

    // Package Method

    exportAsBuffer: function(options) {
        return this._export(options);
    },

    exportAsData64Url: function(options) {
        return "data:" + this.$class.MIMETYPE + ";base64," + this._export(options).toString("base64");
    },

    // Package Loading

    _loadPackFromBuffer: function(buffer) {
        if (!this.$class.isObsidianPackFile(buffer)) {
            throw new Error("NotAnObsidianPackFile");
        }

        var header = this._loadHeader(buffer);

        if (header.version !== this.$class.VERSION) {
            throw new Error("UnsupportedVersion");
        }

        this.packName = header.packName;

        this.$data.assets = this._loadAssets(
            buffer,
            header.assetIndexOffset,
            header.assetIndexLength,
            header.assetIndexFormat,
            header.assetsOffset,
            header.assetsLength
        );
    },

    _loadPackFromData64Url: function(data64) {
        this._loadPackFromBuffer(new Buffer(data64.split(",")[1], "base64"));
    },

    _loadHeader: function(buffer) {
        if (buffer.length < 25) {
            throw new Error("BufferTruncated");
        }

        var header = {
            magic: buffer.toString("ascii", 0, 4),
            version: buffer.readUInt16BE(4),

            assetIndexFormat: buffer.readUInt8(6),
            assetIndexOffset: buffer.readUInt32BE(7),
            assetIndexLength: buffer.readUInt32BE(11),

            assetsOffset: buffer.readUInt32BE(15),
            assetsLength: buffer.readUInt32BE(19),

            packNameLength: buffer.readUInt16BE(23),
            packName: ""
        };

        header.packName = buffer.toString("ascii", 25, 25 + header.packNameLength);

        return header;
    },

    _loadAssets: function(buffer, assetIndexOffset, assetIndexLength, assetIndexFormat, assetsOffset, assetsLength) {
        var assets = {};
        var assetIndex = codecs.index[assetIndexFormat].decoder(buffer.slice(assetIndexOffset, assetIndexOffset + assetIndexLength));

        for (var assetId in assetIndex) {
            assets[assetId] = {
                _buffer: buffer.slice(assetsOffset + assetIndex[assetId].offset, assetsOffset + assetIndex[assetId].offset + assetIndex[assetId].length),
                mime: assetIndex[assetId].mime || "application/octet-stream",
                metadata: assetIndex[assetId].metadata || {}
            };
        }

        return assets;
    },

    // Package export

    _export: function(options) {
        options = options || {};
        options.assetIndexFormat = (options.assetIndexFormat === undefined) ?
            this.$class.FORMAT_JSON_DEFLATE : options.assetIndexFormat;

        var assets = this._exportAssets(options.assetIndexFormat); // [assetIndex, assets]

        var header = this._exportHeader({
            assetIndexFormat: options.assetIndexFormat,
            assetIndexLength: assets[0].length, // assetIndex
            assetsLength: assets[1].length, // assets
        });

        return Buffer.concat([header, assets[0], assets[1]]);
    },

    _exportHeader: function(params) {
        var headerLength = 25 + this.packName.length;

        var header = new Buffer(headerLength);
        header.fill(0);

        // magic
        header.write("OPAK", 0);
        // version
        header.writeUInt16BE(this.version, 4);
        // assetIndex
        header.writeUInt8(params.assetIndexFormat, 6);
        header.writeUInt32BE(headerLength, 7);
        header.writeUInt32BE(params.assetIndexLength, 11);
        // assets
        header.writeUInt32BE(headerLength + params.assetIndexLength, 15);
        header.writeUInt32BE(params.assetsLength, 19);
        // packName
        header.writeUInt16BE(this.packName.length, 23);
        header.write(this.packName, 25);

        return header;
    },

    _exportAssets: function(assetIndexFormat) {
        var offset = 0;
        var index = {};
        var assets = [];
        for (var assetId in this.$data.assets) {
            index[assetId] = this.getAssetRecord(assetId);
            index[assetId].offset = offset;
            assets.push(this.$data.assets[assetId]._buffer);
            offset += this.$data.assets[assetId]._buffer.length;
        }
        return [codecs.index[assetIndexFormat].encoder(index), Buffer.concat(assets)];
    }

});

module.exports = ObsidianPackFile;
