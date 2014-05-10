var _       = require('lodash'),
    cheerio = require('cheerio'),
    request = require('request'),
    qs      = require('querystring'),
    Subclub;

Subclub = function() {
    this.baseUrl    = 'http://www.subclub.eu';
    this.subsUrl    = '/jutud.php';
    this.filesLinks = '/subtitles_archivecontent.php';
    this.downLink   = '/down.php';

    this.cheerioOptions = {
        normalizeWhitespace: true
    };
};

Subclub.prototype.getContent = function (options, cb) {

    request(options, function handle (err, response, body) {
        if (err) {
            return cb(err);
        }

        return cb(null, body.toString());
    });
};

Subclub.prototype.getSearchResults = function (name, cb) {
    var _this = this,
        options = {
        url: _this.baseUrl + _this.subsUrl,
        qs: {
            'otsing': name
        }
    };

    _this.getContent(options, cb);
};

Subclub.prototype.getSubFileLinks = function (id, cb) {
    var _this = this,
        options = {
        url: _this.baseUrl + _this.filesLinks,
        qs: {
            'id': id
        }
    };

    _this.getContent(options, cb);
};

Subclub.prototype.parse = function (body) {
    var $ = cheerio.load(body),
        table = $('#tale_list .sc_link[href^="../down"]'),
        newLineRegex = /[\r\n]/g,
        titleRegex = / ?\((\d{4})\)/,
        subId = /php\?id=(\d+)/,
        subs = [];

    table.each(function() {

        var title = $(this).first().text().replace(newLineRegex, ''),
            id = $(this).attr('href').match(subId)[1],
            year = title.match(titleRegex).pop(),
            sub;

        // Remove the year from title
        title = title.replace(titleRegex, '');

        sub = {
            'title': title,
            'year': parseInt(year, 10),
            'ids': [parseInt(id, 10)]
        };

        subs.push(sub);
    });

    return subs;
};

Subclub.prototype.parseLinks = function (body) {
    var $     = cheerio.load(body, this.cheerioOptions),
        li    = $('li a'),
        files = [];

    li.each(function () {
        files.push($(this).text().trim());
    });

    return files;
};

Subclub.prototype.getLinks = function (id, cb) {
    var _this = this;

    this.getSubFileLinks(id, function (err, res) {

        if (err) {
            return cb(err);
        }

        return cb(null, _this.parseLinks(res));
    });
};

Subclub.prototype.getDownloadUrl = function (id, filename) {

    var link = this.baseUrl + this.downLink + '?' + qs.stringify({
        'id':       id,
        'filename': new Buffer(filename).toString('base64')
    });

    return link;
};

Subclub.prototype.download = function (url) {
    return request(url);
};

Subclub.prototype.removeDuplicates = function (subs) {
    var i, j;

    for (i = subs.length - 1; i >= 0; i--) {

        for (j = 0; j < i; j++) {

            if (subs[j].title === subs[i].title) {

                subs[j].ids = _.union(subs[j].ids, subs[i].ids);
                delete subs.splice(i, 1);
            }
        }
    }

    return subs;
};

Subclub.prototype.search = function (name, cb) {
    var _this = this;

    this.getSearchResults(name, function (err, res) {
        if (err) {
            return cb(err);
        }

        return cb(null, _this.removeDuplicates(_this.parse(res)));
    });
};

module.exports = Subclub;
