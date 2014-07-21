The blackhighlighter.org repository contains a Node.JS-backed demonstration sandbox and interactive website for showing how to use the [blackhighlighter npm package](https://www.npmjs.org/package/blackhighlighter).  A deployment of this demo is available for testing online at:

[http://blackhighlighter.org](http://blackhighlighter.org)

Currently it offers a step-by-step workflow of how the component works, narrated one page at a time.  Many other workflows are possible, and this demo can expand to include more.

Please see [http://blackhighlighter.hostilefork.com/](http://blackhighlighter.hostilefork.com) for philosophy, videos, and more articles about the Blackhighlighter project.

*(Note: This sandbox demo depends upon [Express](http://expressjs.com/) and [Swig](http://paularmstrong.github.io/swig/) on the server-side--and [jQuery UI](http://jqueryui.com/) on the client side.  HOWEVER those dependencies are not required for other sites that wish to use the blackhighlighter widget.  The widget actually only has one client-side dependency: jQuery.  For specifics, see the blackhighlighter's [CREDITS.md](https://github.com/hostilefork/blackhighlighter/blob/master/CREDITS.md) page.)*


# CONFIGURATION

The necessary environment settings are:

* **PORT** - the TCP port for the Blackhighlighter server to run on *(defaults to `3000`)*

* **MONGO_CONNECT_URI** - the [MongoDB Connection URI](http://api.mongodb.org/java/current/com/mongodb/MongoURI.html) for the MongoDB database to use *(defaults to `http://api.mongodb.org/java/current/com/mongodb/MongoURI.html`)*

If you wish to credit your hosting provider:

* **HOSTING_SERVICE** - A string name for the hosting service.

* **HOSTING_SERVICE_URL** - A URL to go to if someone clicks the hosting service name.


# DEPLOYMENT

When Blackhighlighter was initially ported from Django to Node.JS, the Node ecology was just beginning.  In theory you can write a Node.JS app and seamlessly switch from one host to another because the metadata for the deployment is contained in the `package.json` file.

But theory doesn't always mesh with practice, and while there is a grain of truth in the idea that the application behaviors are contained there... still there are other settings to be concerned with.  As I experiment with Blackhighlighter deployments, I'll try and note the variations in settings to be concerned with.

### Nodejitsu

In Nodejitsu, to set the environment variables you go to the control panel for your application on the website under your account and set them.


### Heroku

On Heroku, if you want to set an environment variable, you do it with the `heroku config:set` command.  For blackhighlighter to work, you 

    heroku config:set MONGO_CONNECT_URI=mongodb://whatever/your/connect/string/is
    heroku config:set HOSTING_SERVICE=Heroku
    heroku config:set HOSTING_SERVICE_URL=https://www.heroku.com/features
