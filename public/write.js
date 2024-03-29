//
// write.js - blackhighlighter supplemental javascript for composing letters.
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
    'actual'

], function($, _, blackhighlighter, clientCommon) {

    // http://stackoverflow.com/questions/1335851/
    // http://stackoverflow.com/questions/4462478/

    "use strict";

    // We used to pass in a base URL in PARAMS.base_url, but now we go off
    // of the browser's hostname and port for that...we could conceivably
    // check to make sure the server and client are in agreement of what
    // the server's base url is.

    const scheme = document.location.protocol;  // http: or https:, has colon
    var base_url = scheme + "//" + document.location.host + "/";

    // Theme all the button-type-things but not the <a href="#" ..> style

    $("input:submit, button").button();

    // Make all the indeterminate progress bars animate.  They're hidden.

    $(".indeterminate-progress").progressbar({value: false});

    // jquery UI does tabs by index, not ID.  using this to increase readability

    function tabIndexForId(id) {
        return {
            'tabs-compose': 0,
            'tabs-protect': 1,
            'tabs-commit': 2
        }[id];
    }

    function notifyAlertOnTab(tabname, str) {
        var $tab = $("#tabs-" + tabname);
        var message = "<span><b>" + str + "</b></span>";

        $tab.find('.error-display-msg').html(message);
        $tab.find('.error-display').show();
    }

    function clearAlertOnTab(tabname) {
        var $tab = $("#tabs-" + tabname);
        $tab.find('.error-display').hide();
    }

    // Makes it easier to select certificate, but impossible to partially
    // select it.  Seems a good tradeoff.

    $('#json-protected').on('click', highlightCertificateText);

    // Bring tabs to life.

    $('#tabs').tabs();

    // Disable tabs that we're not ready for

    $('#tabs').tabs('disable', tabIndexForId('tabs-commit'));

    $(window).resize(clientCommon.resizeListener);

    clientCommon.resizeListener(null);

    $('#commit-json-accordion').accordion({
        // only collapsible accordions can be closed so no panel shows

        collapsible: true,
        active: false,

        // autoHeight doesn't seem to work by itself; mumbo-jumbo needed
        // http://stackoverflow.com/a/15413662/211160

        heightStyle: "content",
        autoHeight: false,
        clearStyle: true
    });

    // For performance reasons, it isn't good to update the JSON preview of
    // the commit on every redact/unredact.  But if you have the JSON accordion
    // open, you probably want to see it changing and are willing to pay for
    // the slower performance.  If it's closed you don't pay for it.

    function updateCommitPreviewIfNecessary() {
        var mode = $("#editor").blackhighlighter('option', 'mode');

        // can't just test for false if collapsed, since 0 is false!

        if (
            (mode === 'protect')
            && ($('#commit-json-accordion').accordion('option', 'active') === 0)
        ) {
            var commit = $("#editor").blackhighlighter('option', 'commit');
            $('#json-commit').text(
                JSON.stringify(commit, null, ' ')
            );
        }

        if (mode === 'compose') {
            // not necessarily the best way to expose whether there is content
            // or not, but keeps us from having to make another API entry point

            var commit = $("#editor").blackhighlighter('option', 'commit');

            if (commit) {
                $('#tabs').tabs('enable', tabIndexForId('tabs-protect'));
            }
            else {
                $('#tabs').tabs('disable', tabIndexForId('tabs-protect'));
            }
            $("#tabs-compose button.next-step")
                .button("option", "disabled", !commit);
        }
    }

    $('#commit-json-accordion').on("accordionactivate", function(event, ui) {
        // We don't update the json commit during redactions for performance
        // reasons.  But if the user opens it, we do.  Because the check
        // for whether it is necessary checks the open state of this widget,
        // this is an "accordionactivate" not "accordionbeforeactivate"

        updateCommitPreviewIfNecessary();
    });

    $("#editor").blackhighlighter({
        mode: 'compose',
        update: updateCommitPreviewIfNecessary
    });
    $('#editor').focus();

    clientCommon.plugHostingServiceIfNecessary(PARAMS.HOSTING_SERVICE);

    // Currently the update hook fires on any textual update...

    updateCommitPreviewIfNecessary();

    // http://www.siafoo.net/article/67

    function closeEditorWarning() {
        if ($("#editor").blackhighlighter('option', 'mode') === 'show') {
            return 'You need to be *certain* you have saved the verification certificates somewhere on your computer before navigating away from this page.';
        }
        else {
            if ($("#editor").blackhighlighter('option', 'commit') !== null) {
                return 'It looks like you have been editing something -- if you leave before submitting your changes will be lost.';
            }
        }
        return null;
    }

    window.onbeforeunload = closeEditorWarning;

    $('#tabs').on('tabsshow', function(event, ui) {
        if (ui.newPanel.attr('id') == 'tabs-compose') {
            // REVIEW: If you don't set the focus to the compose editor, then
            // clicking inside of it after switching tabs causes an "Object
            // does not support property or method" error in IE.  Specifically,
            // the error is in a call to bkExtend where it receives a read-only
            // element that it attempts to copy properties to ('construct').
            // This has to happen after the tab has been shown (tabsshow event)
            // and not merely at the moment of selection (tabsselect event)

            $('editor-compose').focus();
        }
    });

    function highlightCertificateText() {
        clientCommon.highlightAllOfElement($('#json-protected').get(0));
    }

    // Bind function for what happens on tab select

    $('#tabs').on('tabsbeforeactivate', function(event, ui) {

        var $editor = $("#editor");

        switch (ui.newPanel.attr('id')) {
            case 'tabs-compose':
                $editor.blackhighlighter('option', 'mode', 'compose');
                $("#compose-wrapper").append($editor.detach());
                break;

            case 'tabs-protect':
                clearAlertOnTab("protect");
                $editor.blackhighlighter('option', 'mode', 'protect');
                updateCommitPreviewIfNecessary();
                $("#protect-wrapper").append($editor.detach());
                break;

            case 'tabs-commit':
                $('#json-protected').empty();

                // We don't clear the alert on the commit tab, because we only
                // switch to it one time in the workflow and we may have put
                // a warning up on it *prior* to showing it.

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

                    // jQuery UI tabs do something weird to the selection
                    // http://groups.google.com/group/jquery-ui/browse_thread/thread/cf272e3dbb75f201
                    // waiting is a workaround

                    window.setTimeout(highlightCertificateText, 200);
                }
                break;

            default:
                throw 'no match for tab in write.js';
        }
    });

    $('#tabs').on('tabsfocus', function(event, ui) {
        if (ui.newPanel.attr('id') == 'tabs-commit') {
            highlightCertificateText();
        }
    });

    // These can be used on anything, <a href="#"> or <button>...

    $(".previous-step").on('click', function(event) {
        var oldTabId = $('#tabs').tabs('option', 'active');
        $('#tabs').tabs('option', 'active', oldTabId - 1);
    });

    $(".next-step").on('click', function(event) {
        var oldTabId = $('#tabs').tabs('option', 'active');
        $('#tabs').tabs('option', 'active', oldTabId + 1);
    });

    var finalizeCommitUI = _.debounce(function (err) {

        $('#progress-commit').hide();
        if (err && !(err instanceof blackhighlighter.TimestampError)) {
            // Since we didn't successfully commit the letter, bring
            // back the buttons

            $('#buttons-protect').show();

            $('#tabs').tabs('enable', tabIndexForId('tabs-compose'));
            notifyAlertOnTab('protect', err.toString());
        }
        else {
            // In the demo, we're not strict about timestamp skew... but as one
            // of the premises of blackhighlighter is that you are using this
            // to prove what-you-said-when, a bad timestamp hashed into the
            // commitment is an error worth noting.

            if (err && (err instanceof blackhighlighter.TimestampError)) {
                notifyAlertOnTab('commit',
                    'Although the commitment succeeded, the server signed the'
                    + ' data using a timestamp of '
                    + err.serverDate.toUTCString()
                    + ", which is more than a minute off from your "
                    + "machine's local time setting of "
                    + err.clientDate.toUTCString()
                    + ".  Don't pass on this URL unless that is acceptable!"
                );
            }

            var commit = $("#editor").blackhighlighter('option', 'commit');

            // The JSON response tells us where the show_url is for our new letter
            var showUrl = clientCommon.makeShowUrl(
                base_url,
                commit.commit_id
            );

            $('#url-public').html(
                '<a href="' + showUrl + '" target="_blank">'
                + showUrl
                + '</a>'
            );

            $('#tabs').tabs('enable', tabIndexForId('tabs-commit'));
            $('#tabs').tabs('option', 'active', tabIndexForId('tabs-commit'));
            $('#tabs').tabs('disable', tabIndexForId('tabs-protect'));
        }
    }, 2000);

    $("#commit-button").button().on('click', function(event) {
        if ($("#editor").blackhighlighter('option', 'mode') === 'show') {
            throw "Duplicate commit attempt detected.";
        }

        clearAlertOnTab('commit');

        // Hide the buttons so the user can't navigate away or click twice

        $('#buttons-protect').hide();
        $('#commit-json-accordion').hide();

        // jquery UI does not support an indeterminate progress bar yet
        // http://docs.jquery.com/UI/API/1.7/Progressbar
        // Currently using an animated GIF from http://www.ajaxload.info/

        $('#progress-commit').show();

        // don't allow tab switching back to compose or protect during Ajax
        // request.  If request succeeds, we don't re-enable them because the
        // letter is readable at the post URL

        $('#tabs').tabs('disable', tabIndexForId('tabs-compose'));

        // This should probably be async?  Should take a server as an
        // optional parameter, maybe default to blackhighlighter.org?

        $("#editor").blackhighlighter('commit',
            base_url,
            finalizeCommitUI
        );
    });
});
