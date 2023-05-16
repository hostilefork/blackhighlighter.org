//
// read.js - blackhighlighter supplemental javascript for reading/verifying letters.
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
    'expanding',
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

    // The JSON in the reveal is static and populated later
    // This just sets up a collapsible accordion to contain it, start closed

    $('#reveal-json-accordion').accordion({
        // only collapsible accordions can be closed so no panel shows

        collapsible: true,
        active: false,

        // autoHeight doesn't seem to work by itself; mumbo-jumbo needed
        // http://stackoverflow.com/a/15413662/211160

        heightStyle: "content",
        autoHeight: false,
        clearStyle: true
    });

    // jquery UI does tabs by index, not ID; using to increase readability
    // NOTE: a function as opposed to a raw map for consistency with
    // accordionIndexForId

    function tabIndexForId(id) {
        return {
            'tabs-verify': 0,
            'tabs-show': 1,
            'tabs-reveal': 2
        }[id];
    }

    // Bring tabs to life.

    $('#tabs').tabs();

    $(window).resize(clientCommon.resizeListener);

    clientCommon.resizeListener(null);

    function notifyAlertOnTab(tabname, str) {
        var $tab = $("#tabs-" + tabname);
        var message = "<span><b>" + str + "</b></span>";

        $tab.find(".error-display-msg").empty().html(message);
        $tab.find('.error-display').show();
    }

    function clearAlertOnTab(tabname) {
        var $tab = $("#tabs-" + tabname);
        $tab.find('.error-display').hide();
    }

    function updateTabEnables() {
        $('#tabs').tabs('enable', tabIndexForId('tabs-verify'));
        $('#tabs').tabs('enable', tabIndexForId('tabs-show'));

        var protections = $("#editor").blackhighlighter('option', 'protected');

        if (_.values(protections).length) {
            $('#tabs').tabs('enable', tabIndexForId('tabs-reveal'));
            $('#buttons-show-before').hide();
            $('#buttons-show-after').show();
        }
        else {
            $('#tabs').tabs('disable', tabIndexForId('tabs-reveal'));
            $('#buttons-show-after').hide();
            $('#buttons-show-before').show();
        }
    }

    $("#editor").blackhighlighter({
        mode: 'show',
        commit: PARAMS.commit,
        reveals: PARAMS.reveals,
        update: updateTabEnables
    });

    clientCommon.plugHostingServiceIfNecessary(PARAMS.HOSTING_SERVICE);

    updateTabEnables();

    // we start on verify tab, and don't get a select message

    var lastTabId = 'tabs-verify';

    // Bind function for what happens on tab select

    $('#tabs').on('tabsbeforeactivate', function(event, ui) {

        var $editor = $("#editor");

        switch(ui.newPanel.attr('id')) {
            case 'tabs-verify':
                clearAlertOnTab('verify');
                break;

            case 'tabs-show':
                clearAlertOnTab('show');
                $("#tabs-show .textarea-wrapper").append(
                    $editor.detach()
                );
                $editor.blackhighlighter('option', 'mode', 'show');
                break;

            case 'tabs-reveal':
                clearAlertOnTab('reveal');
                $("#tabs-reveal .textarea-wrapper").append(
                    $editor.detach()
                );
                $editor.blackhighlighter('option', 'mode', 'reveal');

                var protections = $("#editor").blackhighlighter(
                    "option", "protected"
                );

                // REVIEW: used to sort values in array by key (hash)
                // Does it matter?  Should there be a "canonized" ordering?

                $('#json-reveal').text(
                    JSON.stringify(_.values(protections), null, ' ')
                );
                break;

            case 'tabs-done':
                // nothing to do?
                break;

            default:
                throw 'no match for tab in read.js';
        }
        lastTabId = ui.newPanel.attr('id');
    });

    // We can only set up the expanding text area if that text area is visible
    // but it remembers after that, as long as the CSS changes don't get too
    // drastic...

    var expandingInitialized = false;

    $('#tabs').on('tabsactivate', function (event, ui) {
        if (ui.newPanel.attr('id') == 'tabs-verify') {
            if (!expandingInitialized) {
                $('#certificates').expanding();
            }

            // attempting to set focus to a hidden item also has trouble
            // sometimes so better to do this after the tab is being shown

            $('#certificates').focus();
        }
    });

    switch (PARAMS.tabstate) {
        case 'verify':
            $('#tabs').tabs('option', 'active', tabIndexForId('tabs-verify'));
            break;

        case 'show':
            $('#tabs').tabs('option', 'active', tabIndexForId('tabs-show'));
            break;

        default:
            throw 'invalid PARAMS.tabstate';
    }

    $(".previous-step").on('click', function(event) {
        $('#tabs').tabs('option', 'active', tabIndexForId(lastTabId) - 1);
    });

    $(".next-step").on('click', function(event) {
        $('#tabs').tabs('option', 'active', tabIndexForId(lastTabId) + 1);
    });

    $("#verify-button").on('click', function() {

        var finalizeVerifyUI = _.debounce(function(err) {
            updateTabEnables();

            if (err) {
                notifyAlertOnTab('verify', err.toString());
            }
            else {
                $('#certificates').val('');
                $('#tabs').tabs('option', 'active', tabIndexForId('tabs-show'));
            }

            $('#progress-verify').hide();
            $('#buttons-verify').show();
        }, 2000);

        clearAlertOnTab('verify');

        var revealInput = $('#certificates').get(0).value;
        if (blackhighlighter.trimAllWhitespace(revealInput) === '') {
            // if they haven't typed anything into the box
            $('#tabs').tabs('option', 'active', tabIndexForId('tabs-show'));
        }
        else {
            $('#tabs').tabs('disable', tabIndexForId('tabs-show'));
            $('#tabs').tabs('disable', tabIndexForId('tabs-reveal'));
            $('#progress-verify').show();
            $('#buttons-verify').hide();

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
                // do not continue to next tab

                finalizeVerifyUI(err);
            }
        }
    });

    $("#reveal-button").on('click', function(event) {

        var finalizeRevealUI = _.debounce(function (err) {
            function absoluteFromRelativeURL(url) {
                // http://objectmix.com/javascript/352627-relative-url-absolute-url.html

                return $('<a href="' + url + '"></a>').get(0).href;
            }

            if (err) {
                notifyAlertOnTab('reveal', err.toString());
                $('#buttons-reveal').show();
                $('#tabs').tabs('enable', tabIndexForId('tabs-verify'));
                $('#tabs').tabs('enable', tabIndexForId('tabs-show'));

                // we only hide the progress bar in the error case, because
                // otherwise we want the animation to stick around until the
                // redirect has completed

                $('#progress-reveal').hide();
            }
            else {
                // We want to redirect to the "show" page for this letter
                // Which means we have to reload if we were already on the
                // letter's "show" URL

                if (PARAMS.tabstate == 'show') {
                    // Reload semantics vary in JavaScript and browser versions
                    // http://grizzlyweb.com/webmaster/javascripts/refresh.asp

                    window.location.reload(true);
                }
                else {
                    // http://stackoverflow.com/a/948242/211160

                    windowlocation.href =
                        clientCommon.makeShowUrl(
                            base_url, PARAMS.commit.commit_id
                        );
                }
            }
        }, 2000);

        $('#tabs').tabs('disable', tabIndexForId('tabs-verify'));
        $('#tabs').tabs('disable', tabIndexForId('tabs-show'));

        $('#progress-reveal').show();
        $('#buttons-reveal').hide();
        $('#reveal-json-accordion').hide();

        $('#editor').blackhighlighter(
            'reveal', base_url, finalizeRevealUI
        );
    });
});
