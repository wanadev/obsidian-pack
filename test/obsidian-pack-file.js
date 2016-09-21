"use strict";

var expect = require("expect.js");
var ObsidianPackFile = require("../lib/obsidian-pack-file.js");
var codecs = require("../lib/codecs.js");
var data = require("./data/data.js");

describe("ObsidianPackFile", function () {

    describe("isObsidianPackFile", function () {

        it("checks that the buffer has the right magic", function () {
            var buff = new Buffer(data.packageBuffer.length);
            data.packageBuffer.copy(buff);
            buff[0] = 0x20;

            expect(ObsidianPackFile.isObsidianPackFile(buff)).not.to.be.ok();
        });

        it("checks that the buffer size is coherent with values found in the header", function () {
            var buff = new Buffer(data.packageBuffer.length-1);
            data.packageBuffer.copy(buff);

            expect(ObsidianPackFile.isObsidianPackFile(buff)).not.to.be.ok();
            expect(ObsidianPackFile.isObsidianPackFile(data.packageBuffer)).to.be.ok();
        });

    });

    describe("ASSET MANAGEMENT", function () {

        it("addAssetFromBuffer adds asset from a Asset or Buffer object", function () {
            var p = new ObsidianPackFile();

            p.addAssetFromBuffer(data.imageBuffer, "buffer1");
            p.addAssetFromBuffer(data.imageBuffer, "buffer2", {mime: "image/png", metadata: {foo: "bar"}});

            expect(p.$data.assets.buffer1).not.to.be(undefined);
            expect(p.$data.assets.buffer1.mime).to.equal("application/octet-stream");
            expect(p.$data.assets.buffer1.metadata).to.be.empty();
            expect(p.$data.assets.buffer1._buffer).to.equal(data.imageBuffer);

            expect(p.$data.assets.buffer2).not.to.be(undefined);
            expect(p.$data.assets.buffer2.mime).to.equal("image/png");
            expect(p.$data.assets.buffer2.metadata).to.eql({foo: "bar"});
            expect(p.$data.assets.buffer2._buffer).to.equal(data.imageBuffer);
        });

        it("addAssetFromData64Url creates and adds asset from a data64 URL", function () {
            var p = new ObsidianPackFile();

            p.addAssetFromData64Url(data.imageData64, "buffer1");
            p.addAssetFromData64Url(data.imageData64, "buffer2", {mime: "application/x-test", metadata: {foo: "bar"}});

            expect(p.$data.assets.buffer1).not.to.be(undefined);
            expect(p.$data.assets.buffer1.mime).to.equal("image/png");
            expect(p.$data.assets.buffer1.metadata).to.be.empty();
            expect(p.$data.assets.buffer1._buffer).to.eql(data.imageBuffer);

            expect(p.$data.assets.buffer2).not.to.be(undefined);
            expect(p.$data.assets.buffer2.mime).to.equal("application/x-test");
            expect(p.$data.assets.buffer2.metadata).to.eql({foo: "bar"});
            expect(p.$data.assets.buffer2._buffer).to.eql(data.imageBuffer);
        });

        it("addAssetFromString creates and adds asset from a string ", function () {
            var p = new ObsidianPackFile();

            p.addAssetFromString("Hello World", "buffer1");
            p.addAssetFromString("Hello World è_é", "buffer2", {mime: "text/plain", metadata: {foo: "bar"}});

            expect(p.$data.assets.buffer1).not.to.be(undefined);
            expect(p.$data.assets.buffer1.mime).to.equal("application/octet-stream");
            expect(p.$data.assets.buffer1.metadata).to.be.empty();
            expect(p.$data.assets.buffer1._buffer.toString()).to.equal("Hello World");

            expect(p.$data.assets.buffer2).not.to.be(undefined);
            expect(p.$data.assets.buffer2.mime).to.equal("text/plain");
            expect(p.$data.assets.buffer2.metadata).to.eql({foo: "bar"});
            expect(p.$data.assets.buffer2._buffer.toString()).to.equal("Hello World è_é");
        });


        it("getAssetAsBuffer returns the requested asset as Buffer", function () {
            var p = new ObsidianPackFile();
            p.addAssetFromBuffer(data.imageBuffer, "buffer1");

            expect(p.getAssetAsBuffer("buffer1")).to.equal(data.imageBuffer);
            expect(p.getAssetAsBuffer("foo")).to.be(null);
        });

        it("getAssetAsData64Url returns the asset as data64 URI", function () {
            var p = new ObsidianPackFile();
            p.addAssetFromBuffer(data.imageBuffer, "buffer1", {mime: "image/png"});

            expect(p.getAssetAsData64Url("buffer1")).to.equal(data.imageData64);
            expect(p.getAssetAsData64Url("foo")).to.be("data:application/octet-stream;base64,");
        });

        it("getAssetAsString returns the asset as string", function () {
            var p = new ObsidianPackFile();
            p.addAssetFromString("Hello World", "buffer1");

            expect(p.getAssetAsString("buffer1")).to.equal("Hello World");
            expect(p.getAssetAsString("foo")).to.be("");
        });


        it("getAssetRecord returns inormations about a asset", function () {
            var p = new ObsidianPackFile();
            p.addAssetFromBuffer(data.imageBuffer, "buffer1", {mime: "image/png", metadata: {foo: "bar"}});

            expect(p.getAssetRecord("buffer1")).to.eql({
                offset: null,
                length: 192,
                mime: "image/png",
                metadata: {
                    foo: "bar"
                }
            });
        });

        it("removeAsset can remove a asset", function () {
            var p = new ObsidianPackFile();
            p.addAssetFromString("Hello World", "asset1");
            expect(p.$data.assets.asset1).not.to.be(undefined);
            p.removeAsset("asset1");
            expect(p.$data.assets.asset1).to.be(undefined);
        });

        it("assetExists allows to check if a asset exists", function () {
            var p = new ObsidianPackFile();
            p.addAssetFromString("Hello World", "asset1");

            expect(p.assetExists("asset1")).to.be.ok();
            expect(p.assetExists("asset2")).not.to.be.ok();
        });

        it("getAssetList returns a list of all assets", function () {
            var p = new ObsidianPackFile();
            p.addAssetFromString("Hello World", "asset1");
            p.addAssetFromString("Hello World", "asset2");

            expect(p.getAssetList()).to.eql(["asset1", "asset2"]);
        });

    });

    describe("EXPORT", function () {

        describe("_exportHeader", function () {

            var pack = null;
            var header = null;

            before(function () {
                pack = new ObsidianPackFile();
                header = pack._exportHeader({
                    assetIndexFormat: ObsidianPackFile.FORMAT_JSON_DEFLATE,
                    assetIndexLength: 30,
                    assetsLength: 40
                });
            });

            it("exports the header with the right length", function () {
                expect(header.length).to.equal(25 + pack.packName.length);
            });

            it("exports the right magic", function () {
                expect(header.toString("ascii", 0, 4)).to.equal("OPAK");
            });

            it("exports the right version", function () {
                expect(header.readUInt16BE(4)).to.equal(1);
            });


            it("exports the header with the right asset index format", function () {
                expect(header.readUInt8(6)).to.equal(1);
            });

            it("exports the header with the right asset index offset", function () {
                expect(header.readUInt32BE(7)).to.equal(25 + pack.packName.length);
            });

            it("exports the header with the right asset index length", function () {
                expect(header.readUInt32BE(11)).to.equal(30);
            });


            it("exports the header with the right asset offset", function () {
                expect(header.readUInt32BE(15)).to.equal(25 + pack.packName.length + 30);
            });

            it("exports the header with the right asset length", function () {
                expect(header.readUInt32BE(19)).to.equal(40);
            });

        });

        it("_exportAssets exports assetIndex and assets as Buffer", function () {
            var p = new ObsidianPackFile();
            p.addAssetFromBuffer(data.imageBuffer, "image.png", {mime: "image/png"}); // 192 B
            p.addAssetFromString("Hello!", "hello.txt", {mime: "text/plain"}); // 6 B

            var assets = p._exportAssets(ObsidianPackFile.FORMAT_JSON_DEFLATE);
            var index = codecs.jsonDeflateDecoder(assets[0]);

            expect(index).to.eql({
                "image.png": {
                    offset: 0,
                    length: 192,
                    mime: "image/png",
                    metadata: {}
                },
                "hello.txt": {
                    offset: 192,
                    length: 6,
                    mime: "text/plain",
                    metadata: {}
                }
            });

            expect(assets[1].length).to.equal(192 + 6);
        });

        it("exportAsAsset exports the package as Buffer", function () {
            var p = new ObsidianPackFile();
            var buffer = p.exportAsBuffer();
            expect(buffer instanceof Buffer).to.be.ok();
            expect(buffer.length).to.be.greaterThan(25);
        });

        it("exportAsData64Url exports the package as Data64 URI", function () {
            var p = new ObsidianPackFile();
            var data64 = p.exportAsData64Url();
            expect(data64.indexOf("data:application/x-obsidian-pack;base64")).to.equal(0);
        });

    });

    describe("LOAD", function () {

        it("_loadPackFromBuffer can load a package from a Buffer", function () {
            var p = new ObsidianPackFile();
            p._loadPackFromBuffer(data.packageBuffer);

            expect(p.packName).to.equal("org.example.pack.unnamed");

            expect(p.getAssetAsBuffer("test.png")).to.eql(data.imageBuffer);
        });

        it("_loadPackFromData64Url can load a package from a data64 URI", function () {
            var p = new ObsidianPackFile();
            p._loadPackFromData64Url(data.packageData64);

            expect(p.packName).to.equal("org.example.pack.unnamed");

            expect(p.getAssetAsBuffer("test.png")).to.eql(data.imageBuffer);
        });

        describe("_loadHeader", function () {

            var pack = null;
            var header = new Buffer([
                0x4f, 0x50, 0x41, 0x4b, 0x00, 0x01, 0x01, 0x00,
                0x00, 0x00, 0x31, 0x00, 0x00, 0x00, 0x5e, 0x00,
                0x00, 0x00, 0x8f, 0x00, 0x00, 0x00, 0xcc, 0x00,
                0x18, 0x6f, 0x72, 0x67, 0x2e, 0x65, 0x78, 0x61,
                0x6d, 0x70, 0x6c, 0x65, 0x2e, 0x70, 0x61, 0x63,
                0x6b, 0x2e, 0x75, 0x6e, 0x6e, 0x61, 0x6d, 0x65,
                0x64
            ]);

            before(function () {
                pack = new ObsidianPackFile();
            });

            it("can extract all fields of the header", function () {
                var headerData = pack._loadHeader(header);

                expect(headerData.magic).to.equal("OPAK");
                expect(headerData.version).to.equal(1);

                expect(headerData.assetIndexFormat).to.equal(1);
                expect(headerData.assetIndexOffset).to.equal(49);
                expect(headerData.assetIndexLength).to.equal(94);

                expect(headerData.assetsOffset).to.equal(143);
                expect(headerData.assetsLength).to.equal(204);

                expect(headerData.packNameLength).to.equal(24);
                expect(headerData.packName).to.equal("org.example.pack.unnamed");
            });

            it("raises an exception if the buffer is too small to contains the header", function () {
                expect(pack._loadHeader.bind(null, new Buffer(20))).to.throwException(/BufferTruncated/);
            });

        });

        it("_loadAssets", function () {
            var p = new ObsidianPackFile();

            var assets = p._loadAssets(data.packageBuffer, 0x31, 0x5E, ObsidianPackFile.FORMAT_JSON_DEFLATE, 0x8F, 0xCC);

            expect(assets).to.eql({
                "test.png": {
                    _buffer: data.imageBuffer,
                    mime: "image/png",
                    metadata: {}
                },
                "hello.txt": {
                    _buffer: new Buffer("Hello World!", "ascii"),
                    mime: "text/plain",
                    metadata: {}
                }
            });
        });

    });

    describe("MISC", function () {

        describe("__init__", function () {

            it("can create a new empty package", function () {
                var p = new ObsidianPackFile();
                expect(p.assetList).to.be.empty();
            });

            it("can create a package from a asset", function () {
                var p = new ObsidianPackFile(data.packageBuffer);

                expect(p.packName).to.equal("org.example.pack.unnamed");
                expect(p.getAssetAsBuffer("test.png")).to.eql(data.imageBuffer);
            });

            it("can create a package from a data64 URL", function () {
                var p = new ObsidianPackFile(data.packageData64);

                expect(p.packName).to.equal("org.example.pack.unnamed");
                expect(p.getAssetAsBuffer("test.png")).to.eql(data.imageBuffer);
            });

        });

        it("version is defined", function () {
            var p = new ObsidianPackFile();
            expect(p.version).to.equal(1);
        });

        it("packName is 'org.example.unnamed-pack' by default", function () {
            var p = new ObsidianPackFile();
            expect(p.packName).to.equal("org.example.unnamed-pack");
        });

    });

});

