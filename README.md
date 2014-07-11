![Blackhighlighter logo](https://raw.github.com/hostilefork/blackhighlighter/master/blackhighlighter-logo.png)

The blackhighlighter.org site is a demonstration sandbox and interactive documentation for the Node.JS-based [Blackhighlighter](http://blackhighlighter.hostilefork.com/) system.  It offers a step-by-step workflow of seeing how the widget works one page at a time; though many other workflows are possible.

Please see [http://blackhighlighter.hostilefork.com/](http://blackhighlighter.hostilefork.com) for philosophy, videos, and more articles about this project.


# LICENSE

I'm a pretty strong believer in the Stallman-style of "Software Freedom".  It would be a better world if those who adapted free software (and then deployed it to users) would share their adaptations back with the community.  His arguments have always seemed pretty solid to me:

http://www.gnu.org/philosophy/shouldbefree.html

When this project was first started in 2009, I tended to err on the side of conservatism in using GPL-style licenses.  The AGPL closes the "hole" in the GPL so that giving access to a program running GPL code on a server requires provision of any source adaptations made in that case.

Yet at the same time, being able to borrow and recombine code without worrying about where it comes from is empowering to programmers.  Black Highlighter owes its existence to code from which copying and pasting could be done.  So being "unfriendly" about the license, in the sense of imposing concerns on people trying to solve a problem... is not my intention.  I just would like to be a little bit of a social agitator, so my own contributions are AGPL; for the moment.

But I'll back off if anyone writes me about it.  I don't have a legal department, and I don't sue anyone anyway.  So if you are interested in applying Blackhighlighter in your project--and the license is too restrictive and a barrier to doing so, please contact me.  I'd loosen it if there was a good reason to.  Note that as people like Jack Slocum have learned, it's better to relax a license than tighten it after you've set expectations in your community:

http://blog.hostilefork.com/extjs-licensing-fiasco/


# DEPLOYMENT

When Blackhighlighter was initially ported from Django to Node.JS, the Node ecology was just beginning.  In theory you can write a Node.JS app and seamlessly switch from one host to another because the metadata for the deployment is contained in the `package.json` file.

But theory doesn't always mesh with practice, and while there is a grain of truth in the idea that the application behaviors are contained there... still there are other settings to be concerned with.  As I experiment with Blackhighlighter deployments, I'll try and note the variations in settings to be concerned with.


### Nodejitsu

In Nodejitsu, to set the environment variables you go to the control panel for your application on the website under your account and set them.

### Heroku

On Heroku, if you want to set an environment variable, you do it with the `heroku config:set` command.  For blackhighlighter to work, it must know these variables:

heroku config:set MONGO_CONNECT_URI=mongodb://whatever/your/connect/string/is
heroku config:set HOSTING_SERVICE=Heroku
heroku config:set HOSTING_SERVICE_URL=https://www.heroku.com/features


# CONVENTIONS

Node.js directory structure chosen to follow this suggestion:

http://stackoverflow.com/questions/5178334/folder-structure-for-a-nodejs-project

Where I am given a choice, filenames use dashes for spaces:

http://www.codinghorror.com/blog/2006/04/of-spaces-underscores-and-dashes.html

JSON properties use underscores, consistent with the majority of popular APIs:

http://elasticsearch-users.115913.n3.nabble.com/JSON-API-CamelCase-or-td695216.html

At the moment I'm working on the Node.JS side with using the "comma first" convention.  To me, programs should be semantic graphs...and if they're textual then I think better ideas than commas exist (e.g. Rebol and Red).  But due to reasonings given here, I'm trying it out:

https://gist.github.com/isaacs/357981
