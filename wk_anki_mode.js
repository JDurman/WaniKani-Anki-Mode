// ==UserScript==
// @name         Wanikani Anki Mode
// @namespace    wanikani_anki_mode
// @version      2.0
// @description  Anki mode for Wanikani; DoubleCheck 2.0 Support;
// @author       JDurman
// @include     /^https://(www|preview).wanikani.com/review/session/
// @grant        none
// @license      GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
// ==/UserScript==

//CREDITS
//Based on original Wanikani Anki Mode script by Mempo and modifications by necul and irrelephant
//Templated the script off of the doublecheck script made by Robin Findley (rfindley).




window.ankimode = {};

(function (gobj) {
    wkof.include('Menu,Settings');
    wkof.ready('document,Menu,Settings').then(setup);

    var settings;

    function setup() {
        wkof.Menu.insert_script_link({ name: 'ankimode', submenu: 'Settings', title: 'Anki Mode', on_click: open_settings });

        var defaults = {
            correct_hotkey: '1',
            incorrect_hotkey: '2',
            doublecheck_delay_period: 1.5,
        }
        return wkof.Settings.load('ankimode', defaults).then(init_ui.bind(null, true /* first_time */));
    }

    function open_settings() {
        var dialog = new wkof.Settings({
            script_id: 'ankimode',
            title: 'Anki Mode Settings',
            on_save: init_ui,
            pre_open: settings_preopen,
            content: {
                tabHotkeys: {
                    type: 'page', label: 'Hotkeys', content: {
                        grpHotkeys: {
                            type: 'group', label: 'Hotkeys', content: {
                                correct_hotkey: { type: 'text', label: 'Marks answer correct', default: true, hover_tip: 'Use only a single digit number or letter.' },
                                incorrect_hotkey: { type: 'text', label: 'Marks answer "incorrect"', default: true, hover_tip: 'Use only a single digit number or letter.' },
                            }
                        },
                    }
                },
                tabDoubleCheckDelay: {
                    type: 'page', label: 'Double-Check Delay', content: {
                        grpDelay: {
                            type: 'group', label: 'Double-Check Delay', content: {
                                doublecheck_delay_period: { type: 'number', label: 'Delay period (in seconds)', default: 1.5, hover_tip: 'Number of seconds to delay before allowing\nyou to advance to the next question. This should match the value in the double-check settings.' },
                            }
                        },
                    }
                },
            }
        });
        dialog.open();
    }

    function settings_preopen(dialog) {
        dialog.dialog({ width: 525 });
    }

    var first_time = true;
    function init_ui() {
        settings = wkof.settings.ankimode;

        if (first_time) {
            first_time = false;
            startup();
        }

        // Migrate 'Anki Mode State' setting from localStorage.
        var ankimodestate = localStorage.getItem('ankimodestate');
        if (ankimodestate === 'false' || ankimodestate === 'true') {
            localStorage.removeItem('ankimodestate');
            settings.ankimode_enabled = ankimodestate;
            wkof.Settings.save('ankimode');
        }

        // Initialize the Anki Mode button.
        if (settings.ankimode_enabled) {
            $('#anki-mode').addClass('anki-active');
        } else {
            $('#anki-mode').removeClass('anki-active');
        }

    }


    function startup() {

        // Install the Anki Mode button.
        $('head').append('<style>#anki-mode.anki-active {color:#ff0; opacity:1.0;}</style>');
        $('#summary-button').append('<a id="anki-mode" href="#"><i class="fa fa-star" title="Anki Mode - This allows you to turn on or off anki mode."></i></a>');
        $('#anki-mode').on('click', ankimode_clicked);

    }

    function ankimode_clicked() {
        settings.ankimode_enabled = !settings.ankimode_enabled;
        wkof.Settings.save('ankimode');
        $('#anki-mode').toggleClass('anki-active', settings.ankimode_enabled);
        return false;
    }

})(window.ankimode);

