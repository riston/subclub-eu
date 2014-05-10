#!/usr/bin/env node

var fs       = require('fs'),
    _        = require('lodash'),
    inquirer = require('inquirer'),
    async    = require('async'),
    path     = require('path'),
    Subclub  = require(path.join(__dirname, '..', 'src', 'index.js')),
    subclub  = new Subclub();

// TODO: make sure to add the input validation

function getSearchQuery () {

    return {
        type: "input",
        name: "name",
        message: "Movie name"
    };
}

function getSubsList (list) {

    return {
        type: "list",
        name: "sub",
        message: "Select specific movie",
        choices: function () {
            var formatList = list.map(function (sub) {
                return sub.title + ' @' + sub.year;
            });

            formatList.push(new inquirer.Separator());

            return formatList;
        },
    };
}

function getDownloadLink (links) {

    return {
        type: "list",
        name: "file",
        message: "Select the download file",
        choices: function () {
            var formatList = links.map(function (link) {
                return link.name;
            });

            formatList.push(new inquirer.Separator());

            return formatList;
        },
    };
}

async.waterfall([

    function getMovieName (cb) {

        inquirer.prompt([ getSearchQuery() ], function (answer) {

            return subclub.search(answer.name, cb);
        });

    },

    function movieListOption (list, cb) {

        inquirer.prompt([ getSubsList(list) ], function (answer) {
            var title     = answer.sub.split(' @').shift(),
                selection = _.find(list, { 'title': title });

            return cb(null, selection);
        });
    },

    function getFileList (selection, cb) {
        var links = [];

        async.each(selection.ids,
            function (id, cb) {

                subclub.getLinks(id, function (err, res) {
                    if (err) {
                        return cb(err);
                    }

                    res.forEach(function (name) {
                        links.push({ 'name': name, 'id': id });
                    });

                    return cb();
                });

            },

            function (err, res) {
            if (err) {
                return cb(err);
            }

            return cb(null, links);
        });
    },

    function chooseSubtitle (links, cb) {

        inquirer.prompt([ getDownloadLink(links) ], function (answer) {

            return cb(null, _.find(links, { 'name': answer.file }));
        });
    },

    function downloadFile (link, cb) {

        var start      = new Date(),
            downStream = subclub.download(subclub.getDownloadUrl(link.id, link.name)),
            filePath   = path.join(process.cwd(), link.name);

        downStream.pipe(fs.createWriteStream(filePath, { encoding: 'utf-8' }));
        downStream.on('close', function () {
            return cb(start);
        });
    }

], function(err, start) {
    if (err) {
        console.log('Something went wrong !');
        return;
    }

    // Some results ?
    console.log('Download took: ', (new Date().getTime() - start.getTime()) / 1000);
});

