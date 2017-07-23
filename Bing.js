const Promise = require('bluebird');
const request = require('request-promise');
const cheerio = require('cheerio');
const Bubble = require('./Bubble');

class Bing {

    constructor() {
        return new Promise((resolve, reject) => {

            this.pool = request.defaults({
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36'
                },
                forever: true,
                pool: {
                    maxSockets: 16
                }
            });

            this.pool({
                url: 'https://www.bing.com/maps',
                transform: body => cheerio.load(body),
            }).then($ => {
                let scripts = $('script');
                scripts.each((i, el) => {
                    let data = $(el).html();
                    if (data.indexOf('MapTypeId') > -1) { //then we've found the correct <script> tag
                        let globalConfig = (/mapsNamespace\.GlobalConfig = (\{.+\});/gm).exec(data);
                        if (globalConfig && globalConfig.length > 1) {
                            globalConfig = JSON.parse(globalConfig[1]);
                            this.globalConfig = globalConfig;
                        }
                        resolve(this);

                    }
                })
            }).catch(reject);
        });
    }

    getBubbles(options) {
        return new Promise((resolve, reject) => {
            let url = this.globalConfig.features.streetside.getBubblesByLocationRectUrlFormat

                .replace('{bubbleCount}', options.count || this.globalConfig.features.streetside.defaultNumberOfBubblesToRequest || 25)
                .replace('{north}', options.north)
                .replace('{south}', options.south)
                .replace('{east}', options.east)
                .replace('{west}', options.west)

                .replace('{key}', this.globalConfig.features.streetside.getBubblesServiceKey)
                .replace('{callback}', '')
                .replace('{jsonso}', '')
                .replace('{hsmsgenid}', this.globalConfig.dynamicProperties.streetsideMetadataGenerationId);

            this.pool({
                url: url,
                json: true
            }).then(data => {
                let out = [];
                for (let item of data) {
                    if (item['id'] !== undefined) {
                        out.push(new Bubble(this, item.id, item));
                    }
                }
                resolve(out);

            }).catch(reject);

        });
    };

    getBubble(id) {
        return new Promise((resolve, reject) => {
            let url = this.globalConfig.features.streetside.getBubblesByIdUrlFormat
                .replace('{id}', id)
                .replace('{key}', this.globalConfig.features.streetside.getBubblesServiceKey)
                .replace('{callback}', '')
                .replace('{jsonso}', '')
                .replace('{hsmsgenid}', this.globalConfig.dynamicProperties.streetsideMetadataGenerationId);

            this.pool({
                url: url,
                json: true
            }).then(data => {
                let item = data[1];
                let bubble = new Bubble(this, item.id, item);
                resolve(bubble);
            }).catch(reject);
        });
    }

}

Bing.Bubble = Bubble;
module.exports = Bing;