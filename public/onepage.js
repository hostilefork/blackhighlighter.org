//
// discussion.js - blackhighlighter demo; one page workflow, multiple widgets.
// Copyright (C) 2012 HostileFork.com
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

define([
    // libs which return exported objects to capture in the function prototype

    'jquery',
    'underscore',
    'blackhighlighter',
    'client-common',

    // these libs have no results, they just add to the environment (via shims)

    'jqueryui',
    'json2',
    'actual'

], function($, _, blackhighlighter, clientCommon) {

    // Whole-script strict mode syntax
    "use strict";

    // We used to pass in a base URL in PARAMS.base_url, but now we go off
    // of the browser's hostname and port for that...we could conceivably
    // check to make sure the server and client are in agreement of what
    // the server's base url is.

    const scheme = document.location.protocol;  // http: or https:, has colon
    var base_url = scheme + "//" + document.location.host + "/";

    // Makes it easier to select certificate, but impossible to partially
    // select it.  Seems a good tradeoff.

    function highlightCertificateText() {
        clientCommon.highlightAllOfElement($('#json-protected').get(0));
    }

    $('#json-protected').on('click', highlightCertificateText);

    // Bring tabs to life.
    $('#tabs').tabs();

    $(window).resize(clientCommon.resizeListener);

    clientCommon.resizeListener(null);

    $("#editor").blackhighlighter({
        mode: 'compose'
    });
    $('#editor').focus();

    clientCommon.plugHostingServiceIfNecessary(PARAMS.HOSTING_SERVICE);

    // http://www.siafoo.net/article/67
    function closeEditorWarning() {
        if ($("#editor").blackhighlighter('option', 'commit') !== null) {
            return 'It looks like you have been editing something -- if you leave before submitting your changes will be lost.';
        }
        return null;
    }

    window.onbeforeunload = closeEditorWarning;


    //
    // COMMIT HANDLING
    //

       var certificateDialog = $( "#certificate-form" ).dialog({
      autoOpen: false,
      height: 480,
      width: 640,
      modal: true,
      buttons: {
        "OK, I Saved It!": function() {
          certificateDialog.dialog("close");
        }
      },
      close: function() {
        /*allFields.removeClass("ui-state-error");*/
      }
    });

    var finalizeCommitUI = _.debounce(function (err) {
        if (err) {
            // Unlike the sandbox demo, we're not fancy about errors here
            alert(err.toString());
            return;
        }

        $('#json-protected').empty();

        if ($("#editor").blackhighlighter('option', 'mode') !== 'show') {
            throw "Internal error: ommit tab enabled but no commit made.";
        }

        var commit = $("#editor").blackhighlighter('option', 'commit');
        var protections = $("#editor").blackhighlighter('option', 'protected');
        var keyCount = _.keys(protections).length;

        if (keyCount === 0) {
            // no protections -- handle this specially?

            $('#json-protected').text(
                "Note: No protections made, post is viewable in full."
            );
        }
        else {
            var certificate = $("#editor").blackhighlighter(
                'certificate', 'encode',
                commit.commit_id,
                _.values(protections)
            );

            $('#json-protected').text(clientCommon.wrapCertificate(
                base_url, commit.commit_id, keyCount, certificate
            ));

            // jQuery tabs do something weird to the selection
            // http://groups.google.com/group/jquery-ui/browse_thread/thread/cf272e3dbb75f201
            // waiting is a workaround

            window.setTimeout(highlightCertificateText, 200);
        }

        $("#compose-protect-publish-toolbar").hide();
        $("#verify-reveal-toolbar").show();

        certificateDialog.dialog( "open" );
    }, 2000);

    $("#publish").button().on('click', function(event) {
        if ($("#editor").blackhighlighter('option', 'mode') === 'show') {
            throw Error("Duplicate commit attempt detected.");
        }

        $("#editor").blackhighlighter('commit',
            base_url,
            finalizeCommitUI
        );
    });



    //
    // VERIFY HANDLING
    //

    function verifyLocally() {
        var valid = true;
        /* allFields.removeClass( "ui-state-error" ); */

/*        valid = valid && checkRegexp( email, emailRegex, "eg. ui@jquery.com" ); */

         var finalizeVerifyUI = _.debounce(function(err) {
            if (err) {
                // No fancy error handling in this demo...
                alert(err.toString());
                return;
            }
            $('#certificates').val('');
              if ( valid ) {
                checkDialog.dialog( "close" );
              }
        }, 2000);


        var revealInput = $('#certificates').get(0).value;
        if (blackhighlighter.trimAllWhitespace(revealInput) === '') {
            alert('nothing entered!');
        }
        else {
            // Catch parsing errors and put them in an error message
            try {
                var certificate = $("#editor").blackhighlighter(
                    "certificate", 'decode', clientCommon.unwrapCertificate(
                        revealInput
                    )
                );

                $("#editor").blackhighlighter('verify', certificate.reveals);

                finalizeVerifyUI(null);

            } catch (err) {
                finalizeVerifyUI(err);
            }
        }
    }

       var checkDialog = $( "#check-form" ).dialog({
      autoOpen: false,
      height: 480,
      width: 640,
      modal: true,
      buttons: {
        'Verify locally': verifyLocally,
        'Cancel': function() {
          checkDialog.dialog("close");
        }
      },
      close: function() {
        /* allFields.removeClass("ui-state-error"); */
      }
    });

    $( "#check-hidden" ).button().on( "click", function() {
      checkDialog.dialog( "open" );
    });

    $( "#compose-protect" ).buttonset();

    $( "#compose" ).on('click', function (event) {
        $("#editor").blackhighlighter('option', 'mode', 'compose');
        return true;
    });

    $( "#protect" ).on('click', function (event) {
        $("#editor").blackhighlighter('option', 'mode', 'protect');
        return true;
    });

/*
      var emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      var email = $( "#certificates" );
      var allFields = $( [] ).add( email );
      var tips = $( ".validateTips" );

    function updateTips( t ) {
      tips
        .text( t )
        .addClass( "ui-state-highlight" );
      setTimeout(function() {
        tips.removeClass( "ui-state-highlight", 1500 );
      }, 500 );
    }

    function checkRegexp( o, regexp, n ) {
      if ( !( regexp.test( o.val() ) ) ) {
        o.addClass( "ui-state-error" );
        updateTips( n );
        return false;
      } else {
        return true;
      }
    }
*/



    $("#reveal").button().on('click', function (event) {
    });

});
