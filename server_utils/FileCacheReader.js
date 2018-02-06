var fs = require('fs');
var http = require('http');
var https = require('https');


var cache_data = {
    '/path/to/cache': {
        timeStramp: 0,
        data: {}
    }
};


var FileCacheReader = {

    readFile: function (file_path) {
        return new Promise(function (resolve, reject) {
            fs.readFile(file_path, 'utf-8', function (err, data) {
                if (err) {
                    reject();
                    return;
                }
                try {
                    var cc = data;
                    resolve(cc);
                } catch (e) {
                    reject(e);
                }
            });
        });
    },

    readJsonFile: function (file_path) {
        return FileCacheReader.readFile(file_path).then(function (d) {
            return JSON.parse(d);
        });
    },


    sendGetRequest: function (url) {
        return new Promise(function (resolve, reject) {

            var http_protocol = http;
            if (url.indexOf("https") === 0) {
                http_protocol = https;
            }

            http_protocol.get(url, function (http_res) {
                http_res.setEncoding('utf8');
                var rawData = '';
                http_res.on('data', function (chunk) {
                    rawData += chunk;
                });
                http_res.on('end', function () {
                    try {
                        resolve(rawData);
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', function (e) {
                reject(e);
            });
        });

    },

    sendGetJsonRequest: function (url) {
        return FileCacheReader.sendGetRequest(url).then(function (d) {
            return JSON.parse(d);
        });
    },

    _makeCacheable: async function (funcName, request_url, cache_second) {
        var timeStramp_now = new Date().getTime();

        //1.如果需要缓存,并且缓存没有过期
        if (cache_second) {
            var cache_data_f = cache_data[request_url];
            if (cache_data_f && cache_data_f.timeStramp && (cache_data_f.timeStramp + cache_second * 1000 >= timeStramp_now)) {
                return cache_data_f.data;
            }
        }

        var data = null;

        try {
            if (funcName === "sendGetJsonRequest") {
                data = await FileCacheReader.sendGetJsonRequest(request_url);
            } else if (funcName === "sendGetRequest") {
                data = await FileCacheReader.sendGetRequest(request_url);
            } else if (funcName === "readFile") {
                data = await FileCacheReader.readFile(request_url);
            } else if (funcName === "readJsonFile") {
                data = await FileCacheReader.readJsonFile(request_url);
            }
        } catch (e) {
            console.log("[ERROR]FileCacheReader." + funcName, e);
            return null;
        }

        //2.如果需要缓存,缓存一下
        if (cache_second) {
            cache_data[request_url] = {
                timeStramp: timeStramp_now,
                data: data
            };
        }

        return data;
    },



    httpRequestJSONCache: async function (request_url, cache_second) {
        return FileCacheReader._makeCacheable("sendGetJsonRequest", request_url, cache_second);
    },
    httpRequestCache: async function (request_url, cache_second) {
        return FileCacheReader._makeCacheable("sendGetRequest", request_url, cache_second);
    },
    readFileCache: async function (request_url, cache_second) {
        return FileCacheReader._makeCacheable("readFile", request_url, cache_second);
    },
    readJSONFileCache: async function (request_url, cache_second) {
        return FileCacheReader._makeCacheable("readJsonFile", request_url, cache_second);
    }

};




module.exports = FileCacheReader;