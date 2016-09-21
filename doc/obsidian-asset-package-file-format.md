# Obsidian Asset Package File Format

This document describe the Obsidian Asset Package file format.


## Header

The `Header` is a binary section containing the following fields:

| Offset | Field            | Length | Type     | Description                                                             |
|--------|------------------|--------|----------|-------------------------------------------------------------------------|
|      0 | magic            |      4 | ASCII    | Magic number (`"OPAK"`)                                                 |
|      4 | version          |      2 | Integer¹ | Version of the file format                                              |
|      6 | assetIndexFormat |      1 | Integer¹ | Format of the `AssetIndex` section (`0x00`: JSON, `0x01`: JSON+deflate) |
|      7 | assetIndexOffset |      4 | Integer¹ | Offset of the `AssetIndex` section (from the beginning of the file)     |
|     11 | assetIndexLength |      4 | Integer¹ | Length of the `AssetIndex` section                                      |
|     15 | assetsOffset     |      4 | Integer¹ | Offset of the `Assets` section (from the beginning of the file)         |
|     19 | assetsLength     |      4 | Integer¹ | Length of the `Assets` section                                          |
|     23 | packNameLength   |      2 | Integer¹ | Length of the `packName` string                                         |
|     25 | packName         |   PNL² | ASCII    | Name of the asset package (used as unique identifier)                   |

__¹Integer:__ Integer fields are unsigned and stored as bigendian.
__²PNL:__ `packNameLength`.


## AssetIndex

The `AssetIndex` section lists the assets availavle in the package. The asset list is encoded in the JSON format and can be compressed using the *deflate* algorithm.

Example of `AssetIndex` structure:

    {
        "assetId": {
            "offset": 0,
            "length": 1024,
            "mime": "image/png",
            "metadata": {}
        },
        ...
    }

* `offset`: offset of the asset's data (relative to the `Assets` section)
* `length`: length of the asset's data
* `mime`: the mime type of the asset (interpreted as `"application/octet-stream"` if not defined)
* `metadata`: any metadata about the asset


## Assets

The `Assets` section contains a concatenation of all packaged assets described in the `BlobIndex` section.

