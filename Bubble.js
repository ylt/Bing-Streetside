const Promise = require('bluebird');

let Canvas = require('canvas');
let Image = Canvas.Image;

// the tile size, Bing itself returns 256x256 tiles, but the edge pixels are shared between neighbouring tiles
const tileSize = 254;

class Bubble {
    constructor(bing, id, obj) {
        this.bing = bing;
        this.id = id;
        this.obj = obj;
    }

    static leftPad(text, length) {
        if (length === 0) return '';
        if (text.length >= length) return text.substr(-length);
        return '0'.repeat(length - text.length) + text;
    }

    static toQuadPad(num, len) {
        return this.leftPad(num.toString(4), len);
    }

    static getRowLength(detail) {
        return Math.pow(2, detail);
    }

    static getNumTiles(detail) { //equivalent to getRowLength^2
        return Math.pow(4, detail);
    }

    static getPixels(detail) {
        return this.getRowLength(detail) * tileSize;
    }

    /**
     * Converts X and Y tile position coordinate into the quadtree number
     * Quadtrees are designed to encode 2d space, such that that you can lose the least significant bits and simply lose precision.
     * @param x
     * @param y
     * @param detail
     * @returns {number}
     */
    static tileToIndex(x, y, detail) {
        let result = 0;
        for (let i = detail; i >= 0; i--) {
            result |=
                ((x >> i & 0x01) << i * 2) |
                ((y >> i & 0x01) << i * 2 + 1);
        }
        return result;
    }

    /**
     * Get the Bing tile URL
     * @param side
     * @param detail Level of detail
     * @param x
     * @param y
     * @returns {string|XML}
     */
    getURL(side, detail, x, y) {
        let index = Bubble.tileToIndex(x, y, detail);
        let quadkey = Bubble.toQuadPad(this.id, 16) + Bubble.toQuadPad(side, 2) + Bubble.toQuadPad(index, detail);
        let subdomain = index % 2; //match browser behaviour, much more domains than this exist

        let url = this.bing.globalConfig.features.streetside.tileUrlFormat
            .replace("{quadkey}", quadkey)
            .replace("{subdomain}", subdomain)
            .replace("{hsgenid}", this.bing.globalConfig.dynamicProperties.streetsideImageryGenerationId);

        return url;
    }

    /**
     *
     * Fetches an individual tile
     *
     * @param side
     * @param detail
     * @param x
     * @param y
     * @returns {Promise}
     */
    fetchXY(side, detail, x, y) {
        return new Promise((resolve, reject) => {
            let url = this.getURL(side, detail, x, y);

            this.bing.pool({
                url: url,
                encoding: null,
                forever: true
            })
                .then(resolve)
                .catch(reject);
        });
    }

    /**
     * Fetches an entire side.
     *
     * Note that this can result in a huge number of requests, depending on detail.
     * 0: 1 request (254x254px)
     * 1: 4 requests (508x508px)
     * 2: 16 requests (1016x1016px)
     * 3: 64 requests (2032x2032px)
     *
     * @param side {Bubble.sides}
     * @param detail
     * @returns {Promise}
     */
    fetchSide(side, detail) {
        return new Promise((resolve, reject) => {
            let dimension = Bubble.getPixels(detail);
            let canvas = new Canvas(dimension, dimension);
            let ctx = canvas.getContext('2d');

            let rowlen = Math.pow(2, detail);
            let numtiles = Math.pow(4, detail);

            //this is used for the promise all
            let promises = [];

            for (let i = 0; i < numtiles; i++) {
                let x = i % rowlen;
                let y = Math.floor(i / rowlen);

                promises.push(new Promise((resolve, reject) => {
                    this.fetchXY(side, detail, x, y).then(res => {

                        let img = new Image;
                        img.src = res;

                        ctx.drawImage(img,
                            1,
                            1,
                            tileSize,
                            tileSize,
                            x * tileSize,
                            y * tileSize,
                            tileSize,
                            tileSize);

                        resolve(true);
                    })
                    //.catch(reject); //not sure what to do with failures, since we'll still result in an image, just missing this tile
                }));
            }

            Promise.all(promises).then(values => {
                // nothing, as this is already handled above
            }).finally(() => {
                resolve(canvas); //is canvas the best type to be returning? maybe a Buffer containing a png or raw would be better
            });

        });
    }
}

Bubble.sides = {
    FRONT: 1,
    RIGHT: 2,
    BACK: 3,
    LEFT: 4,
    TOP: 5,
    BOTTOM: 6
};

module.exports = Bubble;