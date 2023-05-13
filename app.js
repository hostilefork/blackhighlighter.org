"use strict";

//
// app.js
// Server-side code for the black Highlighter demo sandbox 
// Copyright (C) 2012-2014 HostileFork.com
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
//   See http://blackhighlighter.hostilefork.com for documentation.
//

//
// This app.js file implements a simple web server, an instance of which is
// deployed on blackhighlighter.org.  It shouldn't be confused with the
// npm package 'blackhighlighter', which implements the actual server side
// logic used by the blackhighlighter widget.
//
// (One key reason why blackhighlighter's functionality is set up this way--
// as opposed to a standalone server--is to let a single Node instance
// handle blackhighlighter requests as well as serve other HTML or static
// content.)
//
// This file is a *very* small part of the demo's codebase.  Most of the
// machinery is in the client side JavaScript for performing the walkthrough,
// along with the corresponding templated html files.
//



// http://blog.hostilefork.com/underscore-use-with-node-jquery/

var _ = require('underscore')._;



//
// GET CONFIGURATION ENVIRONMENT VARIABLES OR PROVIDE DEFAULTS
//
// process.env contains the environment variables of the execution context,
// with all values forced to being strings:
//
// http://nodejs.org/api/process.html#process_process_env
//


// Default to listening on port 3000 if no 'set PORT=NNNN`

var port = process.env.PORT || 3000;


// Default to local MongoDB if no 'set MONGO_CONNECT_URI=http://...'
//
// http://docs.mongodb.org/manual/reference/default-mongodb-port/
// http://api.mongodb.org/java/current/com/mongodb/MongoURI.html

var mongoConnectURI 
    = process.env.MONGO_CONNECT_URI || 'mongodb://localhost:27017';


// To optionally give credit to your hosts, for example:
//
// http://opensource.nodejitsu.com/

var hostingService = process.env.HOSTING_SERVICE || 'anonymous';

var hostingServiceUrl
    = process.env.HOSTING_SERVICE_URL
    || 'http://en.wikipedia.org/wiki/Anonymous';


// Control Swig caching of templates; DON'T DISABLE IN PRODUCTION!
//
// http://paularmstrong.github.io/swig/docs/api/#SwigOpts

var swigCache = 'memory';
if (process.env.SWIG_NOCACHE) {
    if (process.env.SWIG_NOCACHE != "1") {
        throw Error("SWIG_NOCACHE must be 1 or unset");
    }
    swigCache = false;
}



//
// INCLUDE BLACKHIGHLIGHTER WIDGET SERVER-SIDE LOGIC
//
// https://www.npmjs.org/package/blackhighlighter
//

var blackhighlighter = require('blackhighlighter');

blackhighlighter.configure({
    mongoConnectURI: mongoConnectURI
});



//
// ERROR HANDLER
//
// Sends JSON for an error that a callback has received or has been thrown.
//
// http://blog.hostilefork.com/error-handling-internal-badrequest-node/
//

function resSendJsonForErr (res, err) {
    if (!err) {
        throw Error("resSendJsonForErr called without an error parameter");
    } 

    if (err instanceof Error) {
        console.error(err.stack);
    }
    else {
        console.warn("Non-error subclass thrown, bad style...");
    }

    if (err instanceof blackhighlighter.ClientError) {
        console.error(err.message);
        res.status(400).json({ error: err.toString() });
    }
    else {
        res.status(500).json({ error: err.toString() });
    }
}



//
// EXPRESS AND SWIG SETUP
//
// http://blog.hostilefork.com/express-swig-node-basics-2014/
//

var express = require('express');
var app = express();


// http://stackoverflow.com/a/24344756/211160 

var bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
})); 


// http://paularmstrong.github.io/swig/docs/api/#SwigOpts

var swig = require('swig');

swig.setDefaults({
    loader: swig.loaders.fs(__dirname + '/views'),
    cache: swigCache
});


// Register Swig to handle html; default 'view engine' extension is required

app.engine('html', swig.renderFile);
app.set('view engine', 'html');


// These are provided to every template context by default

app.locals.LIBS_URL = '/public/js/';
app.locals.BLACKHIGHLIGHTER_MEDIA_URL = '/public/';
app.locals.PROJECT_MEDIA_URL = '/public/';
app.locals.BLACKHIGHLIGHTER_BASE_URL = '/';
app.locals.NODE_VERSION = process.version;
app.locals.HOSTING_SERVICE = hostingService;
app.locals.HOSTING_SERVICE_URL = hostingServiceUrl;



//
// REST SERVICES USED BY BLACKHIGHLIGHTER WIDGET
//
// These operate with JSON instead of generating HTML intended for the
// browser.  Currently minimal wrappers over calls to the blackhighlighter
// NPM module.
//
//    /query/
//    /commit/
//    /get/
//
// Small DRY issue ("don't repeat yourself"), these are hardcoded in the widget
// and then repeated here in the client.  GitHub issue for addressing it:
//
// https://github.com/hostilefork/blackhighlighter/issues/57


app.get('/query/$', function (req, res) {
    // We need to be able ask for multiple commit IDs in one query, since
    // if Blackhighlighter is being used for a commenting system (for instance)
    // we don't want to have a separate Ajax request for each comment.

    var commit_ids = JSON.parse(req.params.commit_ids);

    blackhighlighter.getCommitsWithReveals(commit_ids, function (err, json) {
        if (err) {
            resSendJsonForErr(res, err);
        }
        else {
            res.json(json);
        }
    });
});


app.post('/commit/$', function (req, res) {
    // Multiple blackhighlighter entries may be committed in one network
    // request, but there is currently no guarantee of atomicity
    //
    // https://github.com/hostilefork/blackhighlighter/issues/51

    var commit = JSON.parse(req.body.commit_array);

    blackhighlighter.makeCommitments(commit, function (err, json) {
        if (err) {
            resSendJsonForErr(res, err);
        }
        else {
            res.json(json);
        }
    });
});


app.post('/reveal/$', function (req, res) { 
    // Multiple blackhighlighter entries may be revealed in one network
    // request, but there is currently no guarantee of atomicity
    //
    // https://github.com/hostilefork/blackhighlighter/issues/51

    var commit_id_with_reveals_array
        = req.body.commit_id_with_reveals_array;

    blackhighlighter.revealSecrets(
        commit_id_with_reveals_array,
        function(err, json) {
            if (err) {
                resSendJsonForErr(res, err);
            }
            else {
                res.json(json);
            }
        }
    );
});



//
// HOME PAGE WITH ANIMATION OVERVIEW
//

app.get('/', function (req, res) {
    res.render('home', {
        MAIN_SCRIPT: "home"
    });
});



//
// THE COMPOSE/PROTECT/COMMIT PAGE
//
// The /write/ handler is relatively simple, as document authoring happens
// entirely in JavaScript on the client's machine.  The /commit/ HTTP POST
// handler does the actual server-side work of saving the document.
//

app.get('/write/$', function (req, res) {
    res.render('write', {
        MAIN_SCRIPT: "write"
    });
});



//
// THE SHOW/VERIFY/REVEAL PAGE
//
// There are two entry points to the page where you can show and verify and
// reveal.  Because the commit ID has to be so long for the security of the
// hash, shorthand is used and the paths are prefixed with /s/ and /v/
// instead of /show/ and /verify/
//

function showOrVerify (req, res, tabstate) {
    var commit_id = req.params.commit_id;

    blackhighlighter.getCommitsWithReveals([commit_id], function(err, json) {
        if (err) {
            // REVIEW: We weren't asked for JSON.  We were asked for HTML.
            // This is not the right thing to do in case of an error here!

            resSendJsonForErr(res, err);
        }
        else {
            // We only sent one commit_id, and Blackhighlighter module
            // indicated success--which guarantees one commit w/ reveal set

            var commit = json[0]["commit"];
            var reveals = json[0]["reveals"];

            res.render('read', {
                MAIN_SCRIPT: 'read'
                , commit_id: commit_id
                , tabstate: tabstate
                , commit: commit
                , revealed_certificates: reveals
                , public_html:
                    blackhighlighter.generateHtmlFromCommitAndReveals(
                        commit,
                        reveals
                    )
            });
        }
    });
}


app.get('/v/:commit_id([0-9A-Za-z~_\-]+)$', function (req, res) {
    showOrVerify(req, res, 'verify');
});


app.get('/s/:commit_id([0-9A-Za-z~_\-]+)$', function (req, res) {
    showOrVerify(req, res, 'show');
});



//
// DISCUSSION PAGE TEST
//
// The /discussion/ handler is new and testing a workflow in which the
// blackhighlighter process can support multiple widgets on one page,
// as might be used in a blog commenting system.  **PRE-ALPHA!**
//

app.get('/discussion/$', function (req, res) {
    res.render('discussion', {
        MAIN_SCRIPT: "discussion"
    });
});



//
// STATIC FILES TO SERVE FOR THE DEMO
//
// For convenience while developing the demo, uses Express's static serving
// instead of having to sync with a separate static service like Amazon S3.
//
// http://stackoverflow.com/questions/5924072/
//

app.use("/public/js/jquery-blackhighlighter",
    express.static(blackhighlighter.pathForJqueryBlackhighlighter())
);

app.use("/public", express.static(__dirname + '/public'));


// http://stackoverflow.com/a/15463231/211160

var favicon = require('serve-favicon');

app.use(favicon(__dirname + '/public/favicon.ico'));



//
// START LISTENING FOR SERVER REQUESTS
//
// http://blog.hostilefork.com/express-swig-node-basics-2014/
//

console.log("Listening on port " + port);
console.log("MONGO_CONNECT_URI is " + mongoConnectURI);

app.listen(port);
