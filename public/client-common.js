//
// client-common.js - Common JavaScript helpers for in-browser code
// Copyright (C) 2009 HostileFork.com
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

// The module standard being used is the "asynchronous module definition"
//     https://github.com/amdjs/amdjs-api/wiki/AMD
define(['jquery', 'underscore'], function($, _) {

    // http://stackoverflow.com/questions/1335851/
    // http://stackoverflow.com/questions/4462478/

	"use strict";

    var api = {
        // These are URLs that get exposed to end users, and as they are
        // already very long (base64 encodings of sha256) we try to keep
        // them brief as possible.  These /v/xxxx and /s/xxxx URLs are not
        // intrinsic to the Blackhighlighter widget, but are specific to the
        // demonstration sandbox (unlike the API points for commit, reveal...)

        makeVerifyUrl: function(base_url, commit_id) {
            return base_url + 'v/' + commit_id;
        },

        makeShowUrl: function(base_url, commit_id) {
            return base_url + 's/' + commit_id;
        },


		//
		// SELECTIONS
		//

		highlightAllOfElement: function(elm) {
			// http://www.codingforums.com/archive/index.php/t-105808.html

			if (window.getSelection) {
				var selection = window.getSelection();
				if (selection.setBaseAndExtent) { // for Safari
					// slight mod for 4th param needed to ensure all text in div selected
					// http://lists.apple.com/archives/dashboard-dev/2005/May/msg00212.html
					selection.setBaseAndExtent(elm, 0, elm, elm.innerText.length - 1);
				} else { // for FF, Opera, or IE with ierange W3C compatibility module
					selection.removeAllRanges();			
					try { 
						var rangeW3C = document.createRange();
						rangeW3C.selectNodeContents(elm);
						selection.addRange(rangeW3C);
					} catch(err) {
						// REVIEW: at time of writing ierange had not been patched for this issue
						// http://code.google.com/p/ierange/issues/detail?id=5
						// Hence we catch the exception and revert to the IE way of selecting
						// if the above code crashes
						var rangeWorkaround = document.body.createTextRange();
						rangeWorkaround.moveToElementText(elm);
						rangeWorkaround.select();
					}
				}
			} else { // for IE without ierange W3C compatibility module
				var rangeIE = document.body.createTextRange();
				rangeIE.moveToElementText(elm);
				rangeIE.select();
			}
		},

		// http://stackoverflow.com/a/12463110/211160
		//
		getHiddenHeightForWidth: function(element, width) {
		    var $temp = $(element).clone()
		 		.css('position','absolute')
		   		.css('height','auto').css('width', width + 'px')
		  	  	// inject right into parent element so all the css applies
		  	  	// (yes, i know, except the :first-child and other pseudo stuff
			    .appendTo($(element).parent())
			    .css('left','-10000em')
			    .show();

		    h = $temp.height();
		    $temp.remove();
		    return h;
		},

		resizeListener: function(event) {
			// We want some leading text before the boxes containing data, but we
			// want them to be the same size.  We can get their height by default
			// and then style them to have the height of the maximum of any of them.

			var $leads = $('#tabs > div.tabs-content div.leading-section');

			$leads.css('height', 'auto');

			var maxHeight = undefined;

			$leads.each(function(idx, el) {
				var $el = $(el);
				var hiddenHeight = $el.actual('height');
				if (!maxHeight) {
					maxHeight = hiddenHeight;
				} else {
					if (hiddenHeight > maxHeight) {
						maxHeight = hiddenHeight;
					}
				}
			});

	    	$leads.height(maxHeight);
	    },


	    // The blackhighlighter.org demo wraps up the Base64 of the certificate
	    // in a specific way to be even more "email friendly".  It is probably
	    // not of general enough use to include in the widget itself.

	    wrapCertificate: function(base_url, commit_id, keyCount, certificate) {
			var certString = '';					
			certString += '/* BEGIN BLACKHIGHLIGHTER CERTIFICATE' + '\n';
			certString += ' * This contains ' + keyCount;
			if (keyCount > 1) {
				certString += ' protections';
			} else {
				certString += ' protection';
			}
			certString += '\n';
			certString += ' * To use this, visit:' + '\n';
			certString += ' *' + '\n';
			certString += ' * ' + api.makeVerifyUrl(
				base_url, 
				commit_id
			) + '\n';
			certString += ' */' + '\n';

			certString += certificate + '\n';
			certString += '/* END BLACKHIGHLIGHTER CERTIFICATE */';

			return certString;
		},


		// The user is allowed to type in or paste certificates.  For reasons
		// of readability and to give users the ability to easily extract
		// individual certificates, we accept a lot of non-JSON-parser stuff
		// (like comments and arrays without commas).  This function tries to
		// reform the pseudo-JSON into valid JSON.

		tidyInputForJsonParser: function(pseudoJson) {
			if (!_.isString(pseudoJson)) {
				throw Error('Passed a non-string into tidyInputForJsonParser');
			}
			
			var tidyJson = '';

			// start by removing comments and whitespace
			var inputLength = pseudoJson.length;
			var index = 0;
			var whitespacePending = false;
			var skipNext = false;
			var last = null;
			// NOTE: Internet Explorer doesn't allow array subscript access
			// e.g. psuedoJson[0] (?)
			var current = (inputLength > 0) ? pseudoJson.charAt(0) : null;
			var next = undefined;
			function pushCharacter(ch) {
				if (ch == ' ' || ch == '\t' || ch == '\n') {
					whitespacePending = true;
				} else {
					if (whitespacePending && (tidyJson !== '')) {
						tidyJson += ' ';
						whitespacePending = false;
					}
					tidyJson += ch;
				}
			}
			function pushWhitespace() {
				// strip out all whitespace...though we could collapse it
				if (false) {
					whitespacePending = true;
				}
			}
			function skipNextCharacter() {
				skipNext = true;
			}

			var topmostBraceCount = 0;
			var braceDepth = 0;
			var commaFound = undefined;
			
			var stringType = null;
			var commentType = null;		
			while (current !== null) {
				next = (index == inputLength-1)
					? null 
					: pseudoJson.charAt(index+1);

				if (skipNext) {
				
					skipNext = false;
					
				} else if (commentType !== null) {
				
					switch (commentType) {
						case '//':
							if (current == '\n') {
								commentType = null;
							}
							break;
							
						case '/*':
							if (current == '*' && next == '/') {
								skipNextCharacter();
								commentType = null;
							}
							break;
							
						default:
							throw Error('Unknown comment type');
					}
					
				} else if (stringType !== null) {
				
					if (current == '\n') {
						throw Error('End of line in middle of quote context');
					}
					
					if (current == '\\') {
						if (next == stringType) {
							// it's an escaped quote marker, so it needs to go
							// into the output stream... go ahead and write the
							// escape and the quote end and then skip the quote
							// end so we don't see it in our next iteration and
							// think it's a real quote ending
							pushCharacter(current);
							pushCharacter(next);
							skipNextCharacter(); 
						} else {
							pushCharacter(current);
						}
					} else if (current == stringType) {
						pushCharacter(current);
						stringType = null;
					} else {
						pushCharacter(current);
					}
					
				} else {
				
					// general handling if not (yet) in a quote or in a string
					switch (current) {
						case '{':
							if (braceDepth === 0) {
								if (topmostBraceCount > 0) {
									if (!commaFound) {
										pushCharacter(',');
										pushWhitespace();
									}
									commaFound = undefined;
								}
								topmostBraceCount++;
							}
							braceDepth++;
							pushCharacter(current);
							break;

						case ',':
							if (!_.isUndefined(commaFound)) {
								commaFound = true;
							}
							pushCharacter(current);
							break;
							
						case '}':
							if (braceDepth === 0) {
								throw 'Bad brace nesting in Json input';
							} else {
								braceDepth--;
								if (braceDepth === 0) {
									commaFound = false;
								}
							}
							pushCharacter(current);
							break;
						
						case '"':
						case "'":
							stringType = current;
							pushCharacter(current);
							break;
							
						case '/':
							if (next == '*') {
								commentType = '/*';
								skipNextCharacter();
							} else if (next == '/') {
								commentType = '//';
								skipNextCharacter();
							} else {
								pushCharacter(current);
							}
							break;
							
						case '\n':
						case ' ':
						case '\t':
							pushWhitespace();
							break;
							
						default:
							pushCharacter(current);
							break;
					}
				}
				last = current;
				current = next;
				index++;
			}

			// if we have something like "{foo},{bar}", then ensure it has
			// brackets e.g. "[{foo},{bar}]"

			if (topmostBraceCount > 1) {
				if (tidyJson[0] != '[') {
					tidyJson = '[' + tidyJson;
				}
				if (tidyJson[tidyJson.length-1] != ']') {
					tidyJson = tidyJson + ']';
				}
			}

			return tidyJson;
		},


		// Because all we did was add comments, our unwrapping of certificates
		// is really just a call to the tidyJson function.  That's by design
		// currently, but there's not any real reason why it couldn't add
		// more boilerplate that wasn't a comment.

		unwrapCertificate: function(wrapped) {
			var tidyRevealText = api.tidyInputForJsonParser(wrapped);

			if (!tidyRevealText) {
				throw Error("No certificates provided.");
			}

			return tidyRevealText;
		},


	    //
	    // BANNER GRAPHIC OVERRIDE
	    //
	    // Small hack for attributing Nodejitsu in the banner graphic (if the
	    // site is being hosted on Nodejitsu under their "free for opensource"
	    // hosting program
	    //

	    plugHostingServiceIfNecessary: function(service) {
	    	if (service != "Nodejitsu")
	    		return;

	    	// 160 - 128 = 32; additional height added to header's 110px
	    	// So the padding-top is adjusted from 110 to 142px so that the
	    	// little Nodejitsu cloud and tagline is inserted

	    	$(".ui-tabs .ui-tabs-nav").css("padding-top",
	    		''
	    	);
	    	$(".ui-tabs .ui-tabs-nav").css("padding-top",
	    		"142px"
	    	);
	    	$(".ui-tabs .ui-tabs-nav").css("background-image",
	    		''
	    	);
	    	$(".ui-tabs .ui-tabs-nav").css("background-image",
	    		"url(http://blackhighlighter.org/public/blackhighlighter-header-nodejitsu.png)"
	    	);
	    }
	};

	return api;
});
