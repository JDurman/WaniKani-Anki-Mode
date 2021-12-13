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
    var activated = false;
    var answerShown = false;
    var firstCorrectAnswer = "";
    var secondNoTriggered = false;

    // Save the original evaluator
    var originalChecker = answerChecker.evaluate;

    var checkerYes = function (itemType, correctValue) {
        return { accurate: !0, passed: !0 };
    }

    var checkerNo = function (itemType, correctValue) {
        return { accurate: !0, passed: 0 };
    }


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
                                correct_hotkey: { type: 'text', label: 'Marks answer correct', default: true, hover_tip: 'Use only a single digit number or letter.', validate: validateHotkey, on_change: function (name, value, config) { settings.correct_hotkey = value.toUpperCase(); } },
                                incorrect_hotkey: { type: 'text', label: 'Marks answer "incorrect"', default: true, hover_tip: 'Use only a single digit number or letter.', validate: validateHotkey, on_change: function (name, value, config) { settings.incorrect_hotkey = value.toUpperCase(); } },
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

    function validateHotkey(value, config) {
        if ((/^[A-Za-z0-9]{1}$/).test(value)) {
            return true;
        } else {
            return {
                valid: false,
                msg: 'Must be a letter or single digit number'
            }
        }
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
        if (window.doublecheck) {
            $('head').append('<style>' + doubleCheckCssModification + '</style>');
        } else {
            $('head').append('<style>' + css + '</style>');
        }


        // Add the Anki Mode button.
        $('head').append('<style>#anki-mode.anki-active {color:#ff0; opacity:1.0;}</style>');
        $('#summary-button').append('<a id="anki-mode" href="#"><i class="fa fa-star" title="Anki Mode - This allows you to turn on or off anki mode."></i></a>');
        $('#anki-mode').on('click', ankimode_clicked);

        //Add the Correct, Incorrect, and Show Answer buttons
        $("<div />", {
            id: "WKANKIMODE_buttons"
        })
            .addClass("WKANKIMODE_buttons")
            .prependTo("#additional-content");

        $("<div />", {
            id: "WKANKIMODE_anki_incorrect",
            title: "Shortcut: L",
        })
            .text("Don't know")
            .addClass("WKANKIMODE_button incorrect")
            .on("click", answerIncorrect)
            .prependTo("#WKANKIMODE_buttons");

        $("<div />", {
            id: "WKANKIMODE_anki_show",
            title: "Shortcut: Space",
        })
            .text("Show Answer")
            .addClass("WKANKIMODE_button show")
            .on("click", showAnswer)
            .prependTo("#WKANKIMODE_buttons");

        $("<div />", {
            id: "WKANKIMODE_anki_correct",
            title: "Shortcut: K",
        })
            .text("Know")
            .addClass("WKANKIMODE_button correct")
            .on("click", answerCorrect)
            .prependTo("#WKANKIMODE_buttons");

        if (window.doublecheck) {
            $('body').on('click', '#option-retype', function (event) {
                if (activated) {
                    $("#user-response").val('');
                    answerShown = false;
                    hideAnswerButtons();
                }
            });
        }

        //bind the hotkeys
        bindHotkeys();

        //Start ankimode events
        settings.ankimode_enabled ? ankimode_start() : ankimode_stop();

    }

    function ankimode_clicked() {
        settings.ankimode_enabled = !settings.ankimode_enabled;
        wkof.Settings.save('ankimode');
        $('#anki-mode').toggleClass('anki-active', settings.ankimode_enabled);

        settings.ankimode_enabled ? ankimode_start() : ankimode_stop();

        return false;
    }

    function ankimode_start() {
        activated = true;
        $('#user-response').focus(function (e) {
            $(this).blur();
        });
        $('#user-response').blur();

        //show anki mode buttons
        $(".WKANKIMODE_button.correct").hide();
        $(".WKANKIMODE_button.incorrect").hide();
        $(".WKANKIMODE_button.show").show();
    }

    function ankimode_stop() {
        activated = false;
        //remove event listeners
        $("#user-response").off("focus");

        //hide anki mode buttons
        $(".WKANKIMODE_button.correct").hide();
        $(".WKANKIMODE_button.incorrect").hide();
        $(".WKANKIMODE_button.show").hide();

        $("#user-response").focus();

        if (!$("#answer-form form fieldset").hasClass("correct") && !$("#answer-form form fieldset").hasClass("incorrect")) {
            $("#user-response").val("");
        }
    }

    function showAnswer() {
        if (!$("#answer-form form fieldset").hasClass("correct") &&
            !$("#answer-form form fieldset").hasClass("incorrect") &&
            !answerShown) {
            firstCorrectAnswer = "";
            var currentItem = $.jStorage.get("currentItem");
            var questionType = $.jStorage.get("questionType");
            if (questionType === "meaning") {
                var answer = currentItem.en.join(", ");
                if (currentItem.syn.length) {
                    answer += " (" + currentItem.syn.join(", ") + ")";
                }
                firstCorrectAnswer = currentItem.en[0];
                $("#user-response").val(answer);
            } else { //READING QUESTION
                var i = 0;
                var answer = "";
                if (currentItem.voc) {
                    answer += currentItem.kana[0];
                } else if (currentItem.emph == 'kunyomi') {
                    answer += currentItem.kun[0];
                } else if (currentItem.emph == 'nanori') {
                    answer += currentItem.nanori[0];
                } else {
                    answer += currentItem.on[0];
                }
                firstCorrectAnswer = answer;
                $("#user-response").val(answer);
            }
            answerShown = true;
            showAnswerButtons();
        }
    }

    function answerCorrect() {
        // Fix for multiple answers in reading
        if (firstCorrectAnswer) {
            $("#user-response").val(firstCorrectAnswer);
            firstCorrectAnswer = "";
        }

        if (answerShown) {
            answerChecker.evaluate = checkerYes;
            $("#answer-form form button").click();
            answerShown = false;
            answerChecker.evaluate = originalChecker;
            return;
        }

        // if answer is shown, press '1' one more time to go to next
        if ($("#answer-form form fieldset").hasClass("correct") ||
            $("#answer-form form fieldset").hasClass("incorrect")) {
            $("#answer-form form button").click();
            hideAnswerButtons();
        }
    }

    function answerIncorrect() {
        if (answerShown) {
            //fix for doublecheck
            if (window.doublecheck) {
                var questionType = $.jStorage.get("questionType");
                if (questionType === 'meaning') {
                    $("#user-response").val('xxxxxx');
                } else {
                    $("#user-response").val('ばつっっっ');
                }
            }

            answerChecker.evaluate = checkerNo;
            $("#answer-form form button").click();
            answerShown = false;
            answerChecker.evaluate = originalChecker;
            return;
        }

        if ($("#answer-form form fieldset").hasClass("correct") ||
            $("#answer-form form fieldset").hasClass("incorrect")) {
            if (window.doublecheck) {
                if (!secondNoTriggered) {
                    secondNoTriggered = true;
                    setTimeout(function () {
                        $("#answer-form form button").click();
                        hideAnswerButtons();
                        secondNoTriggered = false;
                    }, settings.doublecheck_delay_period * 1000); //doublecheck default delay for wrong answers before you can submit
                }
            } else {
                $("#answer-form form button").click();
                hideAnswerButtons();
            }
        }
    }

    function hideAnswerButtons() {
        $(".WKANKIMODE_button.correct").hide();
        $(".WKANKIMODE_button.incorrect").hide();
        $(".WKANKIMODE_button.show").show();
    }

    function showAnswerButtons() {
        $(".WKANKIMODE_button.correct").show();
        $(".WKANKIMODE_button.incorrect").show();
        $(".WKANKIMODE_button.show").hide();
    }

    function bindHotkeys() {
        $('body').on("keydown", function (event) {

            if ($("#reviews").is(":visible") && !$("*:focus").is("textarea, input")) {
                switch (event.keyCode) {
                    //key: enter
                    case 13:
                        if ($("#answer-form form fieldset").hasClass("correct") ||
                            $("#answer-form form fieldset").hasClass("incorrect")) {
                            hideAnswerButtons();
                        }
                        return;
                        break;
                    //key: Space
                    case 32:
                        event.stopPropagation();
                        event.preventDefault();

                        if (activated)
                            showAnswer();

                        return;
                        break;
                    case 27: //key: escape (only needed when doublecheck is active)
                        if (activated) {
                            if (window.doublecheck) {
                                $("#user-response").val('');
                                answerShown = false;
                                hideAnswerButtons();
                            }

                        }

                        return;
                        break;
                    case 8: //key: backspace (only needed when doublecheck is active)
                        if (activated) {
                            if (window.doublecheck) {
                                $("#user-response").val('');
                                answerShown = false;
                                hideAnswerButtons();
                            }
                        }
                        return;
                        break;
                    default:
                        if (settings.correct_hotkey.charCodeAt(0) == event.keyCode) {
                            event.stopPropagation();
                            event.preventDefault();

                            if (activated)
                                answerCorrect();

                            return;
                            break;
                        } else if (settings.incorrect_hotkey.charCodeAt(0) == event.keyCode) {
                            event.stopPropagation();
                            event.preventDefault();

                            if (activated)
                                answerIncorrect();

                            return;
                            break;
                        }

                        return;
                        break;
                }
            }
        });
    };

    var css = "\
#WKANKIMODE_anki { \
    background-color: #e1e1e1; \
    color: #3c3c3c; \
    margin: 0 5px; \
    width: auto; \
    padding: 6px; \
} \
#WKANKIMODE_yes { \
    background-color: #009900; \
    margin: 0 0 0 5px; \
} \
#WKANKIMODE_no { \
    background-color: #990000; \
} \
.WKANKIMODE_button { \
    width: 50%; \
    display: inline-block; \
    text-align:center; \
    font-size: 0.8125em; \
    color: #FFFFFF; \
    cursor: pointer; \
    padding: 10px 0; \
    margin-bottom: 5px; \
    border: 1px solid transparent \
} \
 .WKANKIMODE_buttons { \
    display: flex; \
    position: relative; \
    width: 100%; \
} \
.WKANKIMODE_buttons .incorrect { \
    background-color: #f03; \
} \
.WKANKIMODE_buttons .correct { \
    background-color: #88cc00; \
} \
.WKANKIMODE_buttons .show { \
background-color: #0af; \
width:100%;\
} \
#WKANKIMODE_anki.hidden { \
display: none; \
} ";


    var doubleCheckCssModification = css + "\
#answer-exception { \
top:5.9em \
} ";
})(window.ankimode);

