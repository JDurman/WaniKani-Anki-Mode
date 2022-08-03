// ==UserScript==
// @name         Wanikani Anki Mode
// @namespace    wkankimode
// @version      2.2.6
// @description  Anki mode for Wanikani; DoubleCheck 2.0 Support;
// @author       JDurman
// @include     /^https://(www|preview).wanikani.com/review/session/
// @include     /^https://(www|preview).wanikani.com/extra_study/session/
// @grant        none
// @license      GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
// ==/UserScript==

//CREDITS
//Based on original Wanikani Anki Mode script by Mempo and modifications by necul and irrelephant
//Templated the script off of the doublecheck script made by Robin Findley (rfindley).
//Audio player logic based off code by Kumirei



window.ankimode = {};

(function (gobj) {
    wkof.include('Menu,Settings');
    wkof.ready('document,Menu,Settings').then(setup);

    var settings;
    var answerShown = false;
    var firstCorrectAnswer = "";
    var secondNoTriggered = false;
    var ankiModeEnabled = false;

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
            correct_hotkey: 'Digit1',
            incorrect_hotkey: 'Digit2',
            showAnswer_hotkey: 'Space',
            doublecheck_delay_period: 1.5,
            reverse_answer_btns: false,
            show_multiple_readings: false,
            type_readings: false,
            play_reading_after_showing_answer: false,
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
                                correct_hotkey: { type: 'text', label: 'Marks answer correct', default: true, placeholder: 'Please press the desired key' },
                                incorrect_hotkey: { type: 'text', label: 'Marks answer "incorrect"', default: true, placeholder: 'Please press the desired key' },
                                showAnswer_hotkey: { type: 'text', label: 'Shows answer', default: true, placeholder: 'Please press the desired key' }
                            }
                        },
                    }
                },
                genOptions: {
                    type: 'page', label: 'Options', content: {
                        gOptions: {
                            type: 'group', label: 'Options', content: {
                                reverse_answer_btns: { type: 'checkbox', label: 'Reverse Answer Buttons', default: false, hover_tip: 'Changes the order of the correct/incorrect buttons after showing an answer.' },
                                play_reading_after_showing_answer: { type: 'checkbox', label: 'Play Audio After Showing Answer', default: false, hover_tip: 'Plays the audio of the reading after you have shown the answer.' },
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
                tabExp: {
                    type: 'page', label: 'Experimental Features', content: {
                        grpDelay: {
                            type: 'group', label: 'Show Multiple Readings', content: {
                                show_multiple_readings: { type: 'checkbox', label: 'Show Multiple Readings', default: false, hover_tip: 'Spoofs the answer input(Could cause issues)' },
                                type_readings: { type: 'checkbox', label: 'Type Readings', default: false, hover_tip: 'Makes it so that you have to type readings' },
                            }
                        },
                    }
                },
            }
        });
        dialog.open();
    }

    function formatKeyCode(value) {
        return value.replace('Digit', '').replace('Key', '');
    }

    function settings_preopen(dialog) {
        dialog.dialog({ width: 525 });
        $("#ankimode_dialog #ankimode_correct_hotkey").attr("type", 'hidden');
        $("#ankimode_dialog #ankimode_correct_hotkey").after('<input id="ankimode_correct_hotkey_readonly" class="setting" type="text" placeholder="Please press the desired key" readonly="readonly" value="' + formatKeyCode(settings.correct_hotkey) + '"></input>');
        $("#ankimode_dialog #ankimode_incorrect_hotkey").attr("type", 'hidden');
        $("#ankimode_dialog #ankimode_incorrect_hotkey").after('<input id="ankimode_incorrect_hotkey_readonly" class="setting" type="text" placeholder="Please press the desired key" readonly="readonly" value="' + formatKeyCode(settings.incorrect_hotkey) + '"></input>');
        $("#ankimode_dialog #ankimode_showAnswer_hotkey").attr("type", 'hidden');
        $("#ankimode_dialog #ankimode_showAnswer_hotkey").after('<input id="ankimode_showAnswer_hotkey_readonly" class="setting" type="text" placeholder="Please press the desired key" readonly="readonly" value="' + formatKeyCode(settings.showAnswer_hotkey) + '"></input>');

        $("#ankimode_dialog #ankimode_correct_hotkey_readonly").on('click', function () {
            $(this).val('');
            $(this).on("keydown", function (event) {
                $("#ankimode_dialog #ankimode_correct_hotkey").val(event.originalEvent.code);
                $(this).val(formatKeyCode(event.originalEvent.code)).blur();
            });
        });

        $("#ankimode_dialog #ankimode_incorrect_hotkey_readonly").on('click', function () {
            $(this).val('');
            $(this).on("keydown", function (event) {
                $("#ankimode_dialog #ankimode_incorrect_hotkey").val(event.originalEvent.code);
                $(this).val(formatKeyCode(event.originalEvent.code)).blur();

            });
        });

        $("#ankimode_dialog #ankimode_showAnswer_hotkey_readonly").on('click', function () {
            $(this).val('');
            $(this).on("keydown", function (event) {
                $("#ankimode_dialog #ankimode_showAnswer_hotkey").val(event.originalEvent.code);
                $(this).val(formatKeyCode(event.originalEvent.code)).blur();

            });
        });
    }

    var first_time = true;
    function init_ui() {
        settings = wkof.settings.ankimode;

        if (first_time) {
            first_time = false;
            startup();
        } else {
            settings.correct_hotkey = $("#ankimode_dialog #ankimode_correct_hotkey").val();
            settings.incorrect_hotkey = $("#ankimode_dialog #ankimode_incorrect_hotkey").val();
            settings.showAnswer_hotkey = $("#ankimode_dialog #ankimode_showAnswer_hotkey").val();

            if ((settings.show_multiple_readings && !$("#WKANKIMODE_answer_input").length) || (!settings.show_multiple_readings && $("#WKANKIMODE_answer_input").length)) {
                if (settings.show_multiple_readings) {
                    $('#user-response').clone().attr('id', 'WKANKIMODE_answer_input').attr('name', 'WKANKIMODE_answer_input').attr('placeholder', "Your Response").removeAttr("data-wanakana-id lang").insertAfter("#user-response").hide();

                    //show spoofed input
                    $('#user-response').hide();
                    $('#WKANKIMODE_answer_input').show();
                } else {
                    $("#WKANKIMODE_answer_input").remove();
                    $('#user-response').show();
                }

                $('#user-response,#WKANKIMODE_answer_input').focus(function (e) {
                    //If type reading feature is on and the question is a reading dont blur.
                    var questionType = $.jStorage.get("questionType");
                    if (questionType === "meaning" || !settings.type_readings) {
                        $(this).blur();
                    }
                });
                $('#user-response,#WKANKIMODE_answer_input').blur();
            }

            if (settings.type_readings) {
                newQuestion();
            } else {
                if (settings.show_multiple_readings) {
                    $('#user-response').hide();
                    $('#WKANKIMODE_answer_input').show();
                } else {
                    $("#WKANKIMODE_answer_input").remove();
                    $('#user-response').show();
                }
            }

            //change button order based on what order is selected.
            $("#WKANKIMODE_anki_correct").remove();
            $("#WKANKIMODE_anki_incorrect").remove();

            if (settings.reverse_answer_btns) {
                $("<div />", {
                    id: "WKANKIMODE_anki_correct",
                    title: "Shortcut: K",
                })
                    .text("Know")
                    .addClass("WKANKIMODE_button correct")
                    .on("click", answerCorrect)
                    .prependTo("#WKANKIMODE_buttons");

                $("<div />", {
                    id: "WKANKIMODE_anki_incorrect",
                    title: "Shortcut: L",
                })
                    .text("Don't know")
                    .addClass("WKANKIMODE_button incorrect")
                    .on("click", answerIncorrect)
                    .prependTo("#WKANKIMODE_buttons");

            } else {

                $("<div />", {
                    id: "WKANKIMODE_anki_incorrect",
                    title: "Shortcut: L",
                })
                    .text("Don't know")
                    .addClass("WKANKIMODE_button incorrect")
                    .on("click", answerIncorrect)
                    .prependTo("#WKANKIMODE_buttons");

                $("<div />", {
                    id: "WKANKIMODE_anki_correct",
                    title: "Shortcut: K",
                })
                    .text("Know")
                    .addClass("WKANKIMODE_button correct")
                    .on("click", answerCorrect)
                    .prependTo("#WKANKIMODE_buttons");
            }

            newQuestion();

            wkof.Settings.save('ankimode');
        }

        // Get 'Anki Mode State' setting from localStorage.
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


        if (settings.reverse_answer_btns) {
            $("<div />", {
                id: "WKANKIMODE_anki_correct",
                title: "Shortcut: K",
            })
                .text("Know")
                .addClass("WKANKIMODE_button correct")
                .on("click", answerCorrect)
                .prependTo("#WKANKIMODE_buttons");

            $("<div />", {
                id: "WKANKIMODE_anki_incorrect",
                title: "Shortcut: L",
            })
                .text("Don't know")
                .addClass("WKANKIMODE_button incorrect")
                .on("click", answerIncorrect)
                .prependTo("#WKANKIMODE_buttons");

        } else {

            $("<div />", {
                id: "WKANKIMODE_anki_incorrect",
                title: "Shortcut: L",
            })
                .text("Don't know")
                .addClass("WKANKIMODE_button incorrect")
                .on("click", answerIncorrect)
                .prependTo("#WKANKIMODE_buttons");

            $("<div />", {
                id: "WKANKIMODE_anki_correct",
                title: "Shortcut: K",
            })
                .text("Know")
                .addClass("WKANKIMODE_button correct")
                .on("click", answerCorrect)
                .prependTo("#WKANKIMODE_buttons");
        }


        $("<div />", {
            id: "WKANKIMODE_anki_show",
            title: "Shortcut: Space",
        })
            .text("Show Answer")
            .addClass("WKANKIMODE_button show")
            .on("click", showAnswer)
            .prependTo("#WKANKIMODE_buttons");

        $("<div />", {
            id: "WKANKIMODE_anki_next"
        })
            .text("Next")
            .addClass("WKANKIMODE_button next")
            .on("click", nextAnswer)
            .prependTo("#WKANKIMODE_buttons");



        if (window.doublecheck) {
            $('body').on('click', '#option-retype', function (event) {
                if (settings.ankimode_enabled) {
                    newQuestion();
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
        ankiModeEnabled = true;

        if (settings.show_multiple_readings) {
            $('#user-response').clone().attr('id', 'WKANKIMODE_answer_input').attr('name', 'WKANKIMODE_answer_input').attr('placeholder', "Your Response").removeAttr("data-wanakana-id lang").insertAfter("#user-response").hide();

            //show spoofed input
            $('#user-response').hide();
            $('#WKANKIMODE_answer_input').show();
        }

        $.jStorage.listenKeyChange('currentItem', newQuestion)

        $('#answer-form button').hide();
        $('#user-response,#WKANKIMODE_answer_input').focus(function (e) {
            //If type reading feature is on and the question is a reading dont blur.
            var questionType = $.jStorage.get("questionType");
            if (questionType === "meaning" || !settings.type_readings) {
                $(this).blur();
            }
        });
        $('#user-response,#WKANKIMODE_answer_input').blur();

        //Trigger new question to reset and check all settings for which to start on.
        newQuestion();
    }

    function ankimode_stop() {
        ankiModeEnabled = false;

        //remove event listeners
        $("#user-response").off("focus");
        $('#answer-form button').show();

        //hide anki mode buttons
        $(".WKANKIMODE_button.correct").hide();
        $(".WKANKIMODE_button.incorrect").hide();
        $(".WKANKIMODE_button.show").hide();
        $(".WKANKIMODE_button.next").hide();

        $("#user-response").focus();

        if (!$("#answer-form form fieldset").hasClass("correct") && !$("#answer-form form fieldset").hasClass("incorrect")) {
            $("#user-response").val("");
        }

        if (settings.show_multiple_readings) {
            $("#WKANKIMODE_answer_input").remove();
            $('#user-response').show();
        }
    }


    function playAudio() {
        var questionType = $.jStorage.get("questionType");
        if (questionType !== "meaning") {
            let audio = new Audio()
            let audios = $.jStorage.get('currentItem').aud

            if ($('#lessons').length) {
                audios = $.jStorage.get('l/currentLesson').aud
                if ($.jStorage.get('l/quizActive')) audios = $.jStorage.get('l/currentQuizItem').aud
            }
            if (audios) {
                //grab first reading or typed reading.     
                let reading = $.jStorage.get('currentItem').kana[0];
                if (settings.type_readings) {
                    reading = $("#user-response").val();
                }
                let rAudio = audios.filter((a) => a.pronunciation == reading);
                let vaAudio = rAudio.filter((a) => a.voice_actor_id == window.WaniKani.default_voice_actor_id);

                if (vaAudio.length > 0) {
                    vaAudio.forEach((a) =>
                        audio.insertAdjacentHTML('beforeend', `<source src="${a.url}" type+"${a.content_type}">`),
                    )
                } else {
                    rAudio.forEach((a) =>
                        audio.insertAdjacentHTML('beforeend', `<source src="${a.url}" type+"${a.content_type}">`),
                    )
                }

                audio.play()
            }
        }
    }

    //resets the state of the forms for a new question.
    function newQuestion() {
        if (ankiModeEnabled) {
            secondNoTriggered = false;
            answerShown = false;
            hideAnswerButtons();
            $("#user-response").val('');

            if (settings.show_multiple_readings) {
                $("#WKANKIMODE_answer_input").val('');
            }

            if (settings.type_readings) {
                var questionType = $.jStorage.get("questionType");
                if (questionType === "meaning") {
                    if (settings.show_multiple_readings) {
                        $('#user-response').hide();
                        $('#WKANKIMODE_answer_input').show();
                    }
                } else {
                    if (settings.show_multiple_readings) {
                        $("#WKANKIMODE_answer_input").hide();
                        $('#user-response').show();
                    }
                    hideButtonsForTyping();
                    $('#user-response').focus();
                }
            }
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
                $("#user-response,#WKANKIMODE_answer_input").val(answer);
            } else { //READING QUESTION
                var i = 0;
                var singleAnswer = "";
                var fullAnswer = "";
                if (currentItem.voc) {
                    singleAnswer += currentItem.kana[0];
                    fullAnswer = currentItem.kana.join(", ");
                } else if (currentItem.emph == 'kunyomi') {
                    singleAnswer += currentItem.kun[0];
                    fullAnswer = currentItem.kun.join(", ");
                } else if (currentItem.emph == 'nanori') {
                    singleAnswer += currentItem.nanori[0];
                    fullAnswer = currentItem.nanori.join(", ");
                } else {
                    singleAnswer += currentItem.on[0];
                    fullAnswer = currentItem.on.join(", ");
                }
                firstCorrectAnswer = singleAnswer;
                $("#user-response").val(singleAnswer);

                if (settings.show_multiple_readings) {
                    $("#WKANKIMODE_answer_input").val(fullAnswer);
                }
            }
            answerShown = true;
            showAnswerButtons();

            if (settings.play_reading_after_showing_answer) {
                playAudio();
            }
        }
    }

    function nextAnswer() {
        if ($("#answer-form form fieldset").hasClass("correct")) {
            answerCorrect();
        } else if ($("#answer-form form fieldset").hasClass("incorrect")) {
            answerIncorrect();
        }
    }

    function answerCorrect() {
        // Fix for multiple answers in reading
        if (answerShown) {
            if (firstCorrectAnswer) {
                $("#user-response").val(firstCorrectAnswer);
                firstCorrectAnswer = "";
            }

            answerChecker.evaluate = checkerYes;
            $("#answer-form form button").click();
            answerShown = false;
            answerChecker.evaluate = originalChecker;

            //if lightning mode then move on to the next answer if not then show next button
            if ($("#lightning-mode.doublecheck-active").length == 0) {
                showNextButton();
            }

            return;
        }

        // if answer is shown, press correct hotkey one more time to go to next
        if ($("#answer-form form fieldset").hasClass("correct")) {
            $("#answer-form form button").click();
        }
    }

    function answerIncorrect() {
        if (answerShown) {
            //fix for doublecheck
            if (window.doublecheck) {
                var questionType = $.jStorage.get("questionType");
                if (questionType === 'meaning') {
                    $("#user-response,#WKANKIMODE_answer_input").val('xxxxxx');
                } else {
                    $("#user-response,#WKANKIMODE_answer_input").val('ばつっっっ');
                }
            }

            answerChecker.evaluate = checkerNo;
            $("#answer-form form button").click();
            answerShown = false;
            answerChecker.evaluate = originalChecker;
            showNextButton();

            return;
        }

        if ($("#answer-form form fieldset").hasClass("incorrect")) {
            if (window.doublecheck) {
                if (!secondNoTriggered) {
                    secondNoTriggered = true;
                    setTimeout(function () {

                        $("#answer-form form button").click();
                        secondNoTriggered = false;

                    }, settings.doublecheck_delay_period * 1000); //needs to match the doublecheck delay period. Otherwise it wont allow the question to continue.
                }
            } else {
                $("#answer-form form button").click();
            }
        }
    }

    function hideButtonsForTyping() {
        $(".WKANKIMODE_button.correct").hide();
        $(".WKANKIMODE_button.incorrect").hide();
        $(".WKANKIMODE_button.show").hide();
        $(".WKANKIMODE_button.next").hide();
    }

    function hideAnswerButtons() {
        $(".WKANKIMODE_button.correct").hide();
        $(".WKANKIMODE_button.incorrect").hide();
        $(".WKANKIMODE_button.show").show();
        $(".WKANKIMODE_button.next").hide();
    }

    function showAnswerButtons() {
        $(".WKANKIMODE_button.correct").show();
        $(".WKANKIMODE_button.incorrect").show();
        $(".WKANKIMODE_button.show").hide();
        $(".WKANKIMODE_button.next").hide();
    }

    function showNextButton() {
        $(".WKANKIMODE_button.correct").hide();
        $(".WKANKIMODE_button.incorrect").hide();
        $(".WKANKIMODE_button.show").hide();
        $(".WKANKIMODE_button.next").show();
    }

    function bindHotkeys() {
        $('body').on("keydown", function (event) {

            if ($("#reviews").is(":visible") && !$("*:focus").is("textarea, input") && settings.ankimode_enabled) {
                switch (event.keyCode) {
                    //key: enter
                    case 13:
                        if ($("#answer-form form fieldset").hasClass("correct") ||
                            $("#answer-form form fieldset").hasClass("incorrect")) {
                            hideAnswerButtons();
                        }
                        return;
                        break;
                    case 27: //key: escape (only needed when doublecheck is active)
                        if (window.doublecheck) {
                            newQuestion();
                        }

                        return;
                        break;
                    case 8: //key: backspace (only needed when doublecheck is active)
                        if (window.doublecheck) {
                            newQuestion();
                        }
                        return;
                        break;
                    default:
                        if (settings.correct_hotkey == event.originalEvent.code) {
                            event.stopPropagation();
                            event.preventDefault();

                            answerCorrect();

                            return;
                            break;
                        } else if (settings.incorrect_hotkey == event.originalEvent.code) {
                            event.stopPropagation();
                            event.preventDefault();

                            answerIncorrect();

                            return;
                            break;
                        } else if (settings.showAnswer_hotkey == event.originalEvent.code) {
                            event.stopPropagation();
                            event.preventDefault();

                            showAnswer();

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
.WKANKIMODE_buttons .next { \
    background-color: #363636; \
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

