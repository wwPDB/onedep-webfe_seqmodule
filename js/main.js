/**********************************************************************
File:		main.js
Orginal:	rshah
Date:		15-June-2010
Version:	0.0.11

This is the main js file, which loads the alignment, performs all the
edit operations and also saves the alignment.

25-Jul-2010 RPS Modified to support behavior so that DB reference sequence types are immutable except for deletions of terminal ranges
27-Jul-2010 RPS Added support for accommodating different ordering of sequence types as per user preferences
06-Aug-2010 RPS Fix for display of 'Shift/Click to edit' text in conflict table on 'undo' operations.
11-Aug-2010 RPS Modifying behavior of predefined global edits so that DB ref seq types are not altered when these are invoked
16-Aug-2010 RPS Updated to prevent global edits from impacting DB ref seq types when attempted via selected ranges in conflict table
11-Nov-2011 RPS: Some relative URL values updated to reflect consolidated deployment of all common tool front-end modules.
22-Dec-2011 RPS: More URL updates to reflect consolidated deployment of all common tool front-end modules.
26-Feb-2013 RDS: Updated and optimized code to support jquery version: 1.9.1
30-Apr-2013 jdw minor changes to the pull down list
28-Nov-2013 jdw add jsmol  --
 4-Dec-2013 jdw remove horizontal constraint from drag/drop operations
10-Mar-2014 jdw : remove ajax timeout and update ajax error handling messages
22-May-2014 jdw : cut timeouts from 5 to 2 - titles and additional table of annotations
25-May-2014 jdw : handle initialization of draggable/droppable
26-May-2014 jdw : JQuery 11.1.1
29-May-2104 jdw : bind keydown to top.document
 5-Jun-2014 jdw : unbind keydown on close
*********************************************************************/
var updateFlag;
var alignBlockList = [];
var missingAuthSeqMap = {};

function iframeCloserX() {

    //console.log("Invoking iframe close method" + top);
    top.hideAlignViewFrame(updateFlag);
}

function iframeCloser() {
    // Check if we are living within an iframe and if so try to invoke the
    // iframe close method in the parent window...
    var isInIFrame = (window.location != window.parent.location) ? true : false;
    if (isInIFrame) {
        var parentWindow = null;
        if (window.parent != window.top) {
            parentWindow = window.top;
        } else {
            parentWindow = window.parent;
        }
        if ($.isFunction(parentWindow.hideAlignViewFrame)) {
            //console.log("Invoking iframe close method");
            parentWindow.hideAlignViewFrame(updateFlag, selectIds);
        } else {
            console.log(">>>WARNING -Can't find iframe destroy method");
        }
    }
}

function handleCLoseWindow() {
    var inFormOrLink;
    $('a').on('click', function() {
        inFormOrLink = true;
    });
    $('form').on('submit', function() {
        inFormOrLink = true;
    });

    $(window).bind('beforeunload', function(eventObject) {
        var returnValue = undefined;
        if (!inFormOrLink) {
            returnValue = "Do you really want to close?";
        }
        eventObject.returnValue = returnValue;
        return returnValue;
    });
}


$(document).ready(function() {
    var debugFlag = false;
    var ajaxTimeout = 0;
    // var adminContact = 'Send comments to: <a href="mailto:help@wwpdb-dev.rutgers.edu">help@wwpdb-dev.rutgers.edu</a>';
    var adminContact = '';
    var errStyle = '<span class="ui-icon ui-icon-alert fltlft"></span> ';
    var infoStyle = '<span class="ui-icon ui-icon-info fltlft"></span> ';
    var seqStartURL = "/service/sequence_editor/store_alignment/start";
    var seqCheckURL = "/service/sequence_editor/store_alignment/check";
    var seqLoadURL = "/service/sequence_editor/store_alignment";
    var seqEditURL = "/service/sequence_editor/edit";
    var undoEditURL = "/service/sequence_editor/undo_edit";
    var seqDelURL = "/service/sequence_editor/delete";
    var seqMovURL = "/service/sequence_editor/move";
    var jmolURL = "/service/sequence_editor/molviewer/jmol";
    var astexURL = "/service/sequence_editor/molviewer/astexviewer";
    var globalmenuURL = "/service/sequence_editor/global_edit_menu";
    var globaleditURL = "/service/sequence_editor/global_edit";
    var globalAuthSeqEditURL = "/service/sequence_editor/global_auth_seq_edit";
    var seqEditOpId = 0;
    var seqEditType = 0;
    var alignTagVal = "";
    var semaphoreVal = "";
    var currentDeleteList = "";
    var retval = "";
    var currentSelection;
    //
    // Globals for JSmol
    //
    var jsmolAppOpen = {};
    var jsmolAppDict = {};
    var jsmolAppName = "myApp1";
    jsmolAppOpen[jsmolAppName] = false;
    //
    var viewerURL = jmolURL;
    var useApplet = false;

    var globalSelectedIds = "";
    var priorValue = "initial";
    var detailList = {
        'engineered mutation': 'engineered mutation',
        'cloning artifact': 'cloning artifact',
        'variant': 'variant',
        'expression tag': 'expression tag',
        'insertion': 'insertion',
        'deletion': 'deletion',
        'chromophore': 'chromophore',
        'linker': 'linker',
        'conflict': 'conflict',
        'acetylation': 'acetylation',
        'amidation': 'amidation',
        'initiating methionine': 'initiating methionine',
        'modified residue': 'modified residue',
        'microheterogeneity': 'microheterogeneity',
        'microheterogeneity/modified residue': 'microheterogeneity/modified residue',
    };
    var toolTipConfig = {
        fill: '#FFF',
        cornerRadius: 10,
        strokeWidth: 0,
        shadow: true,
        shadowOffsetX: 3,
        shadowOffsetY: 3,
        shadowBlur: 8,
        shadowColor: 'rgba(0,0,0,.9)',
        shadowOverlap: false,
        noShadowOpts: {
            strokeStyle: '#999',
            strokeWidth: 2
        },
        positions: ['top', 'left']
    };
    $.ajaxSetup({
        type: 'POST',
        dataType: 'JSON',
        async: true,
        timeout: ajaxTimeout,
        cache: false
    });
    $(document)
        //  .ajaxStart(function() {$('.loading').show()})
        //  .ajaxComplete(function() {$('.loading').hide()})
        .ajaxError(function(e, x, settings, exception) {
            try {
                if (x.status == 0) {
                    $('.errmsg').html(errStyle + 'Possible action timeout<br />or network connection issue.').show();
                } else if (x.status == 404) {
                    $('.errmsg').html(errStyle + 'Requested URL "' + settings.url + '" not found.<br />' + adminContact).show();
                } else if (x.status == 500) {
                    $('.errmsg').html(errStyle + 'Internel Server Error.<br />' + adminContact).show();
                } else if (e == 'parsererror') {
                    $('.errmsg').html(errStyle + 'Error parsing JSON response.<br />' + adminContact).show();
                } else if (e == 'timeout') {
                    $('.errmsg').html(errStyle + 'Request time out expired.<br />' + adminContact).show();
                } else {
                    $('.errmsg').html(errStyle + x.status + ' : ' + exception + '<br />\n' + adminContact).show();
                }
            } catch (err) {
                var errtxt = 'There was an error while processing your request.\n';
                errtxt += 'Error description: ' + err.description + '\n';
                errtxt += 'Click OK to continue.\n';
                alert(errtxt);
            }
        });
    progressStart();
    $.when(
        //$.getScript('/seqmodule/js/jquery/plugins/jquery.bgiframe.min.js'),
        $.getScript('/assets/js/jquery-11/plugins/jquery.bgiframe.js'),
        //$.getScript('/seqmodule/js/jquery/plugins/jquery.scrollto.min.js'),
        $.getScript('/assets/js/jquery-11/plugins/jquery.scrollTo.min.js'),
        // $.getScript('/seqmodule/js/av.min.js'),
        $.getScript('/seqmodule/js/json.js'),

        //$.getScript('/seqmodule/js/jquery/plugins/jquery.form.min.js'),
        $.getScript('/assets/js/jquery-11/plugins/jquery.form.js'),
        //$.getScript('/seqmodule/js/jquery/plugins/jquery.bt.my.js'),
        $.getScript('/assets/js/jquery-11/plugins/jquery.bt.min.js'),
        //$.getScript('/seqmodule/js/jquery-x/plugins-src/jquery.jeditable.js')
        $.getScript('/assets/js/jquery-11/plugins/jquery.jeditable.my.js')
    ).done(function() {
        $('#warningmessage').dialog({bgiframe: true, autoOpen: false, modal: false, height: 300, width: 700, dialogClass: 'warningTitleClass',
                                     position: {my: "center top", at: "center top", of: "#annotationview"},
             close: function(event, ui) {
             	     $('#warningmessage').empty();
             }
        });
        $('#help').bt({
            positions: ['left', 'bottom'],
            ajaxPath: '/seqmodule/help.html div#alignment',
            ajaxOpts: {
                dataType: 'html'
            },
            trigger: 'click',
            width: 600,
            centerPointX: .9,
            spikeLength: 20,
            spikeGirth: 10,
            padding: 15,
            cornerRadius: 25,
            fill: '#FFF',
            strokeStyle: '#ABABAB',
            strokeWidth: 1
        });
        $("#gedittype").hide();
        $('#molviewer').dialog({
            autoOpen: false
        });
        loadReload('load');
    });

    //    $(document).keydown(function(e) {
    $(top.document).keydown(function(e) {
        if ($("form").length == 0 && e.keyCode == 77) {
            e.preventDefault();
            e.stopPropagation();
            clearSelection();
            $('.pickable').selectable('disable').removeClass('ui-state-disabled');
            $('.draggable').draggable('enable').removeClass('ui-draggable-disabled ui-state-disabled').addClass('cureresize');
            //alert("move mode now from keydown");
        }
    });

    $("#activate_shift").on( "click", function() {
        clearSelection();
        $('.pickable').selectable('disable').removeClass('ui-state-disabled');
        $('.draggable').draggable('enable').removeClass('ui-draggable-disabled ui-state-disabled').addClass('cureresize');
    });

    function loadReload(lR) {
        var dataToSend = "";

        if (lR == "re-load") {
            dataToSend = {
                "seqview": seqView,
                "sessionid": sessionID,
                "operation": lR,
                "alignids": alignIds,
                "aligntag": alignTagVal,
                "viewalign_order": viewAlignOrderVal,
                "selectids": selectIds,
                "activegroupid": activeGroupId,
                "BIGBUGS": "MYBUGS"
            };
            $("#go, #deleteselect, #clearselect, #view3d, #viewer, #makeblockedit, #repopulate_deletions, #closewindow, " +
              "#globalpopulatefrm, #undo, #feedback, #predefgedit, #activate_shift, #gedittype, .errmsg .warnmsg").hide();
            $('#result, #tableview').html('');
            updateFlag = 'yes';
        } else {
            updateFlag = 'no';
            dataToSend = {
                "seqview": seqView,
                "sessionid": sessionID,
                "operation": lR,
                "alignids": alignIds,
                "viewalign_order": viewAlignOrderVal,
                "selectids": selectIds,
                "activegroupid": activeGroupId,
                "BIGBUGS": "MYBUGS"
            };
        }

        $.ajax({
            url: seqStartURL,
            data: dataToSend,
            success: function(jsonOBJ) {
                checkStatus(jsonOBJ, lR);
            }
        });
    }

    function checkStatus(jsonOBJ, lR) {
        try {
            var procStatus = jsonOBJ.statuscode;
            semaphoreVal = jsonOBJ.semaphore;
            if ($('#molviewer').dialog('isOpen')) {
                $('#molviewer').dialog('close').empty();
            }
            do {
                $.ajax({
                    url: seqCheckURL,
                    async: false,
                    data: {
                        "semaphore": semaphoreVal,
                        "sessionid": sessionID,
                        "delay": 2,
                        "aligntag": jsonOBJ.aligntag
                    },
                    success: function(resOBJ) {
                        procStatus = resOBJ.statuscode;
                        if (procStatus == 'completed') {
                            $('#gedittype').val(resOBJ.gedittype);
                            $('#gedittype').attr('class', $('#gedittype option:selected').attr('class'));

                            if (resOBJ.warningflag) {
                                $('#warningmessage').html(resOBJ.warningtext).dialog("open");
                            }

                            $('#identifier-sect').html("<b>Data set:</b>&nbsp; " + resOBJ.identifier + "<br /><b>Title:</b>&nbsp; " + resOBJ.title).removeClass('displaynone');
                            if ("alignids" in resOBJ) alignIds = resOBJ.alignids;
                            if ("selectids" in resOBJ) selectIds = resOBJ.selectids;
                            if ("alignmentblocklist" in resOBJ) alignBlockList = resOBJ.alignmentblocklist.split(",");
                            if ("missingauthseqmap" in resOBJ) missingAuthSeqMap = resOBJ.missingauthseqmap;
                            if (resOBJ.conflictreportflag) {
                                $('#tableview').load(resOBJ.conflictreportpath);
                            } else {
                                $('#tableview').html('<p></p>');
                            }

                            if (resOBJ.annotationreportflag) {
                                $('#annotationview').load(resOBJ.annotationreportpath);
                            } else {
                                $('#annotationview').html('<p></p>');
                            }

                            if ("blockedithtml" in resOBJ) {
                                $('#blockeditdialog').html(resOBJ.blockedithtml);
                                $('#makeblockedit').show();
                            }

                            if ("repdelhtml" in resOBJ) {
                                $('#globalpopulatedialog').html(resOBJ.repdelhtml);
                                $('#repopulate_deletions').show();
                            }

                            $('.submit_populatefrm').click(function() {
                                submit_globalpopulatefrm($(this).attr("id"));
                            });

                            if ("htmlcontentpath" in resOBJ) {
                                $('#result').load(resOBJ.htmlcontentpath, function() {
                                    $.getScript('/seqmodule/js/seqtt.js');
                                    $('#molviewer').dialog({
                                        bgiframe: true,
                                        autoOpen: false,
                                        modal: false,
                                        height: 700,
                                        width: 700,
                                        close: function(event, ui) {
                                            $("#view3d, #viewer").attr("disabled", false);
                                            $("#molviewer").empty();
                                        }
                                    });
                                    loadEditable();
                                    loadSortable();
                                    loadSelectable();
                                });
                            } else {
                                $('#result').html('<p></p>');
                            }
                            alignTagVal = resOBJ.aligntag;
                            $('#go, #view3d, #viewer, #predefgedit, #activate_shift, #gedittype, #closewindow').show();
                            $('#view3d, #viewer').attr("disabled", false);
                            $('#undo').hide();
                            if (debugFlag) {
                                if (lR == "re-load") {
                                    $('.errmsg').html(infoStyle + 'Alignment Saved.<br />Either continue making more changes<br />' +
                                        '<b>OR</b><br />' + 'Click on the close button to go back to the summary' +
                                        ' and then click on Re-load.').show().delay(5000).fadeOut(100);
                                } else {
                                    $('.errmsg').html(infoStyle + 'Content Loaded. Ready for use.').show().delay(5000).fadeOut(100);
                                }
                            }
                            if (debugFlag) {
                                alert(resOBJ.debug);
                            }
                            progressEnd();
                        } else if (procStatus == 'failed') {
                            if (resOBJ.warningflag) {
                                $('#warningmessage').html(resOBJ.warningtext).dialog("open");
                            }

                            $('#identifier-sect').html("<b>Data set:</b>&nbsp; " + resOBJ.identifier + "<br /><b>Title:</b>&nbsp; " + resOBJ.title).removeClass('displaynone');

                            $('#tableview').html('<p></p>');
                            $('#result').html('<p></p>');

                            if (resOBJ.annotationreportflag) {
                                $('#annotationview').load(resOBJ.annotationreportpath);
                            } else {
                                $('#annotationview').html('<p></p>');
                            }
                            $('#closewindow').show();
                            progressEnd();
                        }
                    }
                });
            } while (procStatus == 'running');
            if (procStatus != 'completed') {
            $('#closewindow').show();
                progressEnd();
                $('.errmsg').html(errStyle + 'Failed to load alignment and conflict table. Current status is ' +
                    procStatus + '<br />\n' + adminContact).show().delay(30000).slideUp(800);
            }
        } catch (err) {
            $('#closewindow').show();
            progressEnd();
            console.log(err);
            $('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) + '<br />\n' +
                adminContact).show().delay(30000).slideUp(800);
        }
    }

    function progressStart() {
        console.log("Starting spinner");
        $("#progress-dialog").fadeIn('slow').spin("large", "black");
    }

    function progressEnd() {
        console.log("Killing spinner");
        $("#progress-dialog").fadeOut('fast').spin(false);
    }

    function clearSelection() {
        $('.ui-selected, .ui-selectee').each(function() {
            $(this).removeClass("ui-selected ui-selectee");
        });
        $('#deleteselect, #clearselect').hide();
    }

    function loadEditable() {
        $('.dblclick').bind("dblclick", function(e) {
            //$('.dblclick').bind("dblclick", function(e) {
            //if (e.shiftKey) {
            if ($(this).is('li')) {
                $(this).width("50px");
            } else {
                $(this).width("90%");
            }
            // }
        }).editable(seqEditURL, {
            indicator: '<img src="/images/loading.gif" width="10" height="10" alt="*" />',
            style: "inherit",
            type: 'text',
            event: 'dblclick',
            width: '40px',
            height: '15px',
            cssclass: 'greybg',
            data: function(value, settings) {
                if (debugFlag) {
                    alert($(this).attr('id') + " : " + value);
                }
                if (value == 'X') {
                    var idArr = $(this).attr('id').split("_");
                    if ($(this).attr('rel') && $(this).attr('rel') == idArr[4]) {
                        retval = "(" + idArr[4] + ")";
                        priorValue = idArr[4];
                    } else if ($(this).attr('rel')) {
                        retval = "(" + idArr[4] + ")";
                        priorValue = $(this).attr('rel');
                    } else {
                        retval = "(" + idArr[4] + ")";
                        priorValue = idArr[4];
                    }
                } else {
                    if ($(this).attr('rel') && $(this).attr('rel') == value) {
                        retval = value;
                        priorValue = value;
                    } else if ($(this).attr('rel')) {
                        retval = value;
                        priorValue = $(this).attr('rel');
                    } else {
                        var idArr = $(this).attr('id').split("_");
                        if ((value == '.') && (idArr[0] == 'auth') && (idArr[7] in missingAuthSeqMap))
                             retval = missingAuthSeqMap[idArr[7]];
                        else retval = value;
                        priorValue = value;
                    }
                }
                if ($(this).is('li')) {
                    settings.resetWidth = "8px";
                } else {
                    settings.resetWidth = "100%";
                }
                if (debugFlag) {
                    alert($(this).attr('id') + " : " + value + " " + value.length);
                }
                return retval;
            },
            submitdata: function(value, settings) {
                return {
                    "sessionid": sessionID,
                    "identifier": identifier,
                    "priorvalue": priorValue,
                    "aligntag": alignTagVal,
                    "classes": $(this).attr('class')
                };
            },
            ajaxoptions: {
                dataType: "json"
            },
            callback: function(jsonOBJ, settings) {
                try {
                    if (debugFlag) {
                        alert(jsonOBJ.debug);
                    }
                    $('.errmsg').hide();
                    $('.warnmsg').hide();
                    if (!jsonOBJ.errorflag) {
                        if (jsonOBJ.val == priorValue) {
                            $(this).html((priorValue.indexOf(')') > 0) ? 'X' : priorValue);
                        } else {
                            $(this).attr('rel', jsonOBJ.val3);
                            $(this).html(jsonOBJ.val).removeClass(jsonOBJ.classRemove).addClass(jsonOBJ.classAdd).bt(jsonOBJ.tooltip, toolTipConfig);
                            seqEditOpId = jsonOBJ.editopid;
                            seqEditType = jsonOBJ.edittype;
                            if (seqEditOpId != 0) {
                                $('#undo').show();
                            }
                        }
                    } else {
                        $(this).html(priorValue);
                        $('.errmsg').html(errStyle + jsonOBJ.errortext).show().delay(30000).slideUp(800);
                    }
                } catch (err) {
                    $('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) + '<br />\n' +
                        adminContact).show().delay(30000).slideUp(800);
                }
            }
        });
        $('.dblclickselect').editable(seqEditURL, {
            indicator: '<img src="/images/loading.gif" width="10" height="10" alt="*" />',
            placeholder: "Shift/Click to edit",
            style: "inherit",
            data: detailList,
            type: 'select',
            submit: 'OK',
            cancel: 'Cancel',
            submitdata: function(value, settings) {
                priorValue = value;
                return {
                    "sessionid": sessionID,
                    "priorvalue": priorValue,
                    "aligntag": alignTagVal,
                    "viewalign_order": viewAlignOrderVal,
                    "classes": $(this).attr('class')
                };
            },
            ajaxoptions: {
                dataType: "json"
            },
            callback: function(jsonOBJ, settings) {
                try {
                    if (debugFlag) {
                        alert(jsonOBJ.debug);
                    }
                    $('.errmsg').hide();
                    $('.warnmsg').hide();
                    if (!jsonOBJ.errorflag) {
                        if (jsonOBJ.val == priorValue) {
                            $(this).html(jsonOBJ.val).removeClass(jsonOBJ.classRemove).addClass(jsonOBJ.classAdd);
                        } else {
                            $(this).html(jsonOBJ.val).removeClass(jsonOBJ.classRemove).addClass(jsonOBJ.classAdd).bt(jsonOBJ.tooltip, toolTipConfig);
                            seqEditOpId = jsonOBJ.editopid;
                            seqEditType = jsonOBJ.edittype;
                            if (seqEditOpId != 0) {
                                $('#undo').show();
                            }
                        }
                    } else {
                        $(this).html(priorValue);
                        $('.errmsg').html(errStyle + jsonOBJ.errortext).show().delay(30000).slideUp(800);
                    }
                } catch (err) {
                    $('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) + '<br />\n' +
                        adminContact).show().delay(30000).slideUp(800);
                }
            }
        });
    }

    function loadSelectable() {
        $('.pickable').selectable({
            delay: 2,
            start: function() {
                $("#deleteselect, #clearselect").hide();
                clearSelection();
            },
            stop: function() {
                if (currentSelection != null) {
                    currentSelection.each(function() {
                        $(this).removeClass("ui-selected ui-selectee");
                    });
                }
                currentSelection = $('.ui-selected', this);
                var result = "";
                var idArr = [];
                var jmolLabel = [];
                var astexList = [];
                var displayList = [];
                var chainId = "";
                var seqType = $(this).attr("id").split("_")[0];
                currentDeleteList = "";
                var deleteArr = [];
                var aTrmnlRsdueIsSlctd = false;
                currentSelection.each(function(i) {
                    idArr = $(this).attr('id').split("_");
                    jmolLabel.push("[" + idArr[4] + "]" + idArr[5] + ":" + idArr[1]);
                    astexList.push("( chain " + idArr[1] + " and name " + idArr[4] + " and residue " + idArr[5] + ") ");
                    if (i == 0) {
                        displayList.push("chain " + idArr[1]);
                    }
                    displayList.push(" " + idArr[4] + " " + idArr[5]);
                    //deleteArr.push($(this).attr('id') + '|' + $(this).html());
                    if ($(this).hasClass('trmnlrsdue')) {
                        aTrmnlRsdueIsSlctd = true;
                    }
                    var gotoId = '#' + $(this).attr('id') + '_R';
                    var $target = $('#tableview').find(gotoId);
                    if ($target.length) {
                        $('#tableview').stop().scrollTo($target, 800);
                        $(gotoId).addClass("ui-selected");
                    }
                });
                // if ((seqType != "ref") || (seqType == "ref" && aTrmnlRsdueIsSlctd == true)) {
                if ((seqType == "auth") || (seqType == "ref" && aTrmnlRsdueIsSlctd == true)) {
                    currentSelection.each(function(i) {
                        deleteArr.push($(this).attr('id') + '|' + $(this).html());
                    });
                }
                var viewerSelect = "";
                var viewerCmd = "";
                var displaySelect = displayList.join(" ");
                currentDeleteList = deleteArr.join(",");
                if (deleteArr.length > 0) {
                    $('#deleteselect').attr("disabled", false).show();
                } else {
                    $('#deleteselect').attr("disabled", true).hide();
                }
                if (displaySelect.length > 0) {
                    $('#clearselect').attr("disabled", false).show();
                } else {
                    $('#clearselect').attr("disabled", true).hide();
                }
                if (seqType == "xyz") {
                    if (jsmolAppOpen[jsmolAppName] == true) {
                        viewerSelect = jmolLabel.join(",");
                        viewerCmd = "display all; zoomto 1.0 (" + viewerSelect + ") 0 ; " + " display (" +
                            viewerSelect + "); label off; " + " select ( (*.CA or *.P) and (" + viewerSelect + ")); label '%n%R';";
                        Jmol.script(jsmolAppDict[jsmolAppName], viewerCmd);
                    } else if ($('#jmolApplet0').size() > 0) {
                        viewerSelect = jmolLabel.join(",");
                        viewerCmd = "display all; zoomto 1.0 (" + viewerSelect + ") 0 ; " + " display (" +
                            viewerSelect + "); label off; " + " select ( (*.CA or *.P) and (" + viewerSelect + ")); label '%n%R';";
                        document.jmolApplet0.script(viewerCmd);
                    } else if ($('#astexviewer').size() > 0) {
                        viewerSelect = astexList.join(" or ");
                        viewerCmd = "center sphere 3.0 around ( " + viewerSelect + " ) ; ";
                        labelCmd = " label clear all; label '<color=yellow>%R%r' ( ((atom *CA) or (atom *P)) and (" + viewerSelect + " ) ); ";
                        viewerCmd += labelCmd;
                        document.astexviewer.execute(viewerCmd);
                    }
                }
                if (debugFlag) {
                    alert("DELETE LIST " + currentDeleteList);
                }
            }
        });
        $('#conflicttable').selectable({
            delay: 2,
            filter: 'tr',
            start: function() {
                $('#deleteselect, #clearselect').hide();
                clearSelection();
            },
            stop: function() {
                if (currentSelection != null) {
                    currentSelection.each(function() {
                        $(this).removeClass("ui-selected ui-selectee");
                    })
                }
                currentSelection = $('.ui-selected', this);
                var bTargetsFound = false;
                currentSelection.each(function() {
                    var gotoId = '';
                    $(this).find('span').each(function(i) {
                        if (i != 2) {
                            gotoId = '#' + $(this).attr("id").substr(0, $(this).attr("id").length - 2);
                        }
                        var $target = $('#result').find(gotoId);
                        if ($target.length) {
                            $('#result').stop().scrollTo($target, 800);
                            $(gotoId).addClass("ui-selected");
                            bTargetsFound = true;
                        }
                    });
                });
                selectionForGlobalEdit = $('tr.ui-selected:not(:has(span[id^=ref]))', this);
                globalSelectedIds = "";
                selectionForGlobalEdit.each(function() {
                    var glblSlctId = '';
                    var spanIds = "";
                    $(this).find('span').each(function(j) {
                        glblSlctId = $(this).attr('id') + "~" + $(this).html();
                        if (glblSlctId.length > 0) {
                            spanIds += ((spanIds.length > 0) ? "|" : "") + glblSlctId;
                        }
                    });
                    globalSelectedIds += ((globalSelectedIds.length > 0) ? "," : "") + spanIds;
                });
                if (bTargetsFound) {
                    $('#clearselect').show().attr("disabled", false);
                }
                if (globalSelectedIds.length > 0) {
                    $('#makeblockedit').show().attr("disabled", false);
                }
            }
        });
    }

    function getLiIdList(seqType, seqInstId) {
        var liIdList = [];
        for (var i = 0; i < alignBlockList.length; i++) {
             $('#' + seqType + '_' + seqInstId + '_' + alignBlockList[i] + ' li').each(function() {
                  liIdList.push($(this).attr('id'));
             });
        }
        return liIdList;
    }

    function isMoveCompatible(sourceTag, targetTag) {
        if (targetTag.html() != '.') return false;
        var sourceArr = sourceTag.attr('id').split('_');
        var targetArr = targetTag.attr('id').split('_');
        if ((sourceArr[0] != targetArr[0]) || (sourceArr[1] != targetArr[1]) || (sourceArr[9] != targetArr[9])) return false;
        if (sourceArr[7] == targetArr[7]) return false;

        var liIdList = getLiIdList(sourceArr[0], sourceArr[1]);

        var sourceIndex = parseInt(sourceArr[7]);
        var targetIndex = parseInt(targetArr[7]);
        var startIndex = sourceIndex;
        var endIndex = targetIndex;
        if (startIndex > endIndex) {
             startIndex = targetIndex;
             endIndex = sourceIndex;
        }

        for (var i = startIndex + 1; i < endIndex; i++) {
             if ($('#' + liIdList[i]).html() != '.') return false;
        }

        return true;
    }

    function loadSortable() {
        //  $('.dblclick').draggable({disabled: true, addClasses: false, axis:'x', revert: true, start: function(event, ui) {
        //      $(this).siblings('.cf-gap-test').droppable({addClasses: false, drop: function(event, ui) {
        $('.draggable').draggable({
            disabled: true,
            addClasses: false,
            axis: false,
            revert: true,
            start: function(event, ui) {
                //$('#result li.cf-gap-test').droppable({addClasses: false, drop: function(event, ui) {
                $('#result li.cf-gap-test').droppable().droppable({
                    addClasses: false,
                    drop: function(event, ui) {
                        var $this = $(this);
                        if (!isMoveCompatible(ui.draggable, $this)) return false;
                        $.ajax({
                            url: seqMovURL,
                            data: {
                                "sessionid": sessionID,
                                "identifier": identifier,
                                "operation": "move",
                                "aligntag": alignTagVal,
                                "source": ui.draggable.attr('id'),
                                "sourceval": ui.draggable.html(),
                                "destination": $this.attr('id'),
                                "destinationval": $this.html()
                            },
                            success: function(jsonOBJ) {
                                try {
                                    if (debugFlag) {
                                        alert(jsonOBJ.debug);
                                    }
                                    if (!jsonOBJ.errorflag) {
                                        $.each(jsonOBJ.editlist, function(i, key) {
                                            $('#' + i).html(key.val).removeClass(key.classRemove).addClass(key.classAdd)
                                                .bt(key.tooltip, toolTipConfig).attr('id', key.newid).attr('rel', key.val3);
                                            seqEditOpId = key.editopid;
                                            seqEditType = key.edittype;
                                            if (seqEditOpId != 0) {
                                                $('#undo').show();
                                            } else {
                                                $('#undo').hide();
                                            }
                                        });
                                        $('#feedback').html(infoStyle + 'You moved: ' + $this.html() +
                                            ' from position: ' + ui.draggable.attr('id').split('_')[7] +
                                            ' to position: ' + $this.attr('id').split('_')[7]).show().delay(30000).slideUp(800);
                                    }
                                } catch (err) {
                                    $('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) + '<br />\n' + adminContact)
                                        .show().delay(3000).slideUp(800);
                                }
                            }
                        });
                    }
                });
            },
            stop: function(event, ui) {
                // $(this).siblings('.cf-gap-test').droppable('destroy').removeClass('ui-draggable-disabled ui-state-disabled');
                //$('#result li.cf-gap-test').droppable('destroy').removeClass('ui-draggable-disabled ui-state-disabled');
                $('#result li.cf-gap-test').droppable().droppable('destroy').removeClass('ui-draggable-disabled ui-state-disabled');
                $(this).removeClass('ui-draggable-disabled ui-state-disabled');
                setTimeout(function() {
                    $('.draggable').draggable('disable').removeClass('cureresize ui-draggable-disabled ui-state-disabled');
                    $('.pickable').selectable('enable');
                }, 10);
            }
        });
    }
    //
    //
    //
    // jdw add methods for JSmol
    //

    function initJsmolApp(appName, id, buttonId) {
        var xSize = 700;
        var ySize = 700;
        Jmol._binaryTypes = [".map", ".omap", ".gz", ".jpg", ".png", ".zip", ".jmol", ".bin", ".smol", ".spartan", ".mrc", ".pse"];
        Info = {
            j2sPath: "/assets/applets/jmol-dev/jsmol/j2s",
            serverURL: "/assets/applets/jmol-dev/jsmol/php/jsmol.php",
            width: xSize,
            height: ySize,
            debug: false,
            color: "0xC0C0C0",
            disableJ2SLoadMonitor: true,
            disableInitialConsole: true,
            addSelectionOptions: false,
            use: "HTML5",
            readyFunction: null,
            script: ""
        };
        Jmol.setDocument(0);
        jsmolAppDict[appName] = Jmol.getApplet(appName, Info);

        $(id).html(Jmol.getAppletHtml(jsmolAppDict[appName])).dialog({
            bgiframe: true,
            autoOpen: true,
            modal: false,
            height: xSize,
            width: ySize,
            close: function(event, ui) {
                $(id).attr("disabled", false);
                if (buttonId.length > 0) {
                    $(buttonId).attr("disabled", false);
                }
                jsmolAppOpen[appName] = false;
            }
        });
        jsmolAppOpen[appName] = true;
    }

    function loadFileJsmol(appName, id, filePath, jmolMode) {
        if (!jsmolAppOpen[appName]) {
            initJsmolApp(appName, id, '')
        }
        var setupCmds = '';
        if (jmolMode == 'wireframe') {
            setupCmds = "background black; wireframe only; wireframe 0.05; labels off; slab 100; depth 40; slab on;";
        } else if (jmolMode == 'cpk') {
            setupCmds = "background white; wireframe off; spacefill on; color chain; labels off; slab 100; depth 40; slab on";
        } else {
            setupCmds = "";
        }
        var jmolCmds = "load " + filePath + "; " + setupCmds;
        Jmol.script(jsmolAppDict[appName], jmolCmds);
    }


    function loadFileWithMapJsmol(appName, id, xyzFilePath, mapFilePath, jmolMode) {
        if (!jsmolAppOpen[appName]) {
            initJsmolApp(appName, id, '')
        }
        var setupCmds = '';
        if (jmolMode == 'map-style-1') {
            mapCmds = "background black; wireframe only; wireframe 0.05; labels off; slab 50;  depth 20; slab on; isosurface surf_15 color [x3050F8] sigma 1.5 within 2.0 {*} '" + mapFilePath + "' mesh nofill;"
        } else if (jmolMode == 'map-style-2') {
            mapCmds = "background black; wireframe only; wireframe 0.05; labels off; slab 50; depth 20; slab on; refresh; isosurface downsample 2 cutoff 0.5 boundbox '" + mapFilePath + "'  mesh nofill; isosurface display within 2.0 {*};"
        } else {
            mapCmds = "";
        }
        var jmolCmds = "load " + xyzFilePath + "; " + mapCmds;
        Jmol.script(jsmolAppDict[appName], jmolCmds);
    }

    //$('#view').val($('option:first', this).val());  OBSOLETE PLS REMOVE
    $('#gedittype').change(function() {
        $('#gedittype').attr('class', $('#gedittype option:selected').attr('class'));
    });
    $('#viewer').change(function() {
        if ($('#viewer option:selected').val() == "jsmol") {
            useApplet = false;
            viewerURL = '';
        } else if ($('#viewer option:selected').val() == "jmol") {
            useApplet = true;
            viewerURL = jmolURL;
        } else {
            useApplet = true;
            viewerURL = jmolURL;
        }
    });

    $('#go').click(function() {
        progressStart();
        loadReload('re-load');
    });
    $('#clearselect').click(function() {
        clearSelection();
    });

    $('#deleteselect').click(function() {
        $.ajax({
            url: seqDelURL,
            data: {
                "deleteselect": currentDeleteList,
                "operation": "delete",
                "sessionid": sessionID,
                "aligntag": alignTagVal
            },
            success: function(jsonOBJ) {
                try {
                    if (debugFlag) {
                        alert(jsonOBJ.debug);
                    }
                    currentSelection.each(function() {
                        idArr = $(this).attr('id').split("_");
                        var lbl = "Marked for deletion: " + idArr[4] + " " + idArr[5];
                        $(this).removeClass(jsonOBJ.classRemove).addClass(jsonOBJ.classAdd).bt(lbl, toolTipConfig);
                    });
                    $('.errmsg').hide();
                    $('.warnmsg').hide();
                    $('#deleteselect').attr("disabled", true);
                    seqEditOpId = jsonOBJ.editopid;
                    seqEditType = jsonOBJ.edittype;
                    if (seqEditOpId != 0) {
                        $('#undo').show();
                    }
                    clearSelection();
                } catch (err) {
                    $('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) + '<br />\n' +
                        adminContact).show().delay(3000).slideUp(800);
                }
            }
        });
    });
    $('#view3d').click(function() {
        console.log("modelFileName= " + modelFileName + " useApplet= " + useApplet);
        if (useApplet) {
            $.ajax({
                url: viewerURL,
                data: {
                    "sessionid": sessionID,
                    "aligntag": alignTagVal
                },
                success: function(jsonOBJ) {
                    try {
                        $('#molviewer').html(jsonOBJ.htmlcontent).dialog("open");
                        $('.errmsg').hide();
                        $('#view3d, #viewer').attr("disabled", true);
                    } catch (err) {
                        $('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) + '<br />\n' +
                            adminContact).show().delay(3000).slideUp(800);
                    }
                }
            });
        } else {
            //jsmol
            //var filePath = "/sessions/" + sessionID + "/" + modelFileName;
            var filePath = "/sessions/" + sessionID + "/" + identifier + ".cif";
            jsmolAppOpen[jsmolAppName] = false;
            initJsmolApp(jsmolAppName, '#molviewer', '#view3d');
            loadFileJsmol(jsmolAppName, "#molviewer", filePath, 'wireframe');
            $('#view3d').attr("disabled", true);
        }
    });

    function checkGlobalEditingFormValue() {
        clearSelection();
        var foundValue = false;
        var errorMessage = '';
        var chainIdList = $('#chainids').val().split(',');
        for (var i = 0; i < chainIdList.length; i++) {
             var start_position = $('#start_position_' + chainIdList[i]).val().trim();
             var end_position = $('#end_position_' + chainIdList[i]).val().trim();
             var move_to_position = $('#move_to_' + chainIdList[i]).val().trim();
             if ((start_position == '') && (end_position == '') && (move_to_position == '')) continue;

             foundValue = true;

             if (start_position == '') errorMessage += "Missing 'start position' for chain '" + chainIdList[i] + "'.<br/>\n";
             if (end_position == '') errorMessage += "Missing 'end position' for chain '" + chainIdList[i] + "'.<br/>\n";
             if (move_to_position == '') errorMessage += "Missing 'move to position' for chain '" + chainIdList[i] + "'.<br/>\n";
             if ((start_position == '') || (end_position == '') || (move_to_position == '')) continue;

             var liIdList = getLiIdList("xyz", chainIdList[i]);

             var foundError = false;
             var start = parseInt(start_position);
             if (start.toString() != start_position) {
                  errorMessage += "The 'start position " + start_position + "' is not an integer.<br/>\n";
                  foundError = true;
             } else if ((start < 1) || (start > liIdList.length)) {
                  errorMessage += "The 'start position " + start_position + "' is out of range.<br/>\n";
                  foundError = true;
             }

             var end = parseInt(end_position);
             if (end.toString() != end_position) {
                  errorMessage += "The 'end position " + end_position + "' is not an integer.<br/>\n";
                  foundError = true;
             } else if ((end < 1) || (end > liIdList.length)) {
                  errorMessage += "The 'end position " + end_position + "' is out of range.<br/>\n";
                  foundError = true;
             }

             var target = parseInt(move_to_position);
             if (target.toString() != move_to_position) {
                  errorMessage += "The 'move to position " + move_to_position + "' is not an integer.<br/>\n";
                  foundError = true;
             } else if ((target < 1) || (target > liIdList.length)) {
                  errorMessage += "The 'move to position " + move_to_position + "' is out of range.<br/>\n";
                  foundError = true;
             }
             if (foundError) continue;

             if (start > end) {
                  start = parseInt(end_position);
                  end = parseInt(start_position);
             }

             for (var j = start; j <= end; j++) $('#' + liIdList[j - 1]).addClass("ui-selected");
             $('#' + liIdList[target - 1]).addClass("ui-selected");
             $('#clearselect').attr("disabled", false).show();

             var foundResidue = false;
             if (target < start) {
                  for (var j = target + 1; j < start - 1; j++) {
                       if ($('#' + liIdList[j - 1]).html() != '.') {
                            foundResidue = true;
                            break;
                       }
                  }
             } else if (target > end) {
                  for (var j = end + 1; j < target - 1; j++) {
                       if ($('#' + liIdList[j - 1]).html() != '.') {
                            foundResidue = true;
                            break;
                       }
                  }
             } else {
                  errorMessage += "The 'move to position " + move_to_position + "' is in middle of 'start position " + start_position
                                + "' and 'end position " + end_position + "' for chain '" + chainIdList[i] + "'.<br/>\n";
             }
             if (foundResidue) {
                  errorMessage += "The fragment between positions ( " + start.toString() + ", " + end.toString() + " ) can not be moved to position '"
                                + target.toString() + "' for chain '" + chainIdList[i] + "'.<br/>\n";
             }
        }
        if (errorMessage != '') {
             $('#warningmessage').html(errorMessage).dialog("open");
             return false;
        } else if (!foundValue) {
             $('#warningmessage').html("No input values.<br/>\n").dialog("open");
             return false;
        }

        return true;
    }

    $('#makeblockedit').click(function() {
        $('#globalfrm').toggle("slow");
    });

    $("#globalfrm_display").click(function() {
        checkGlobalEditingFormValue();
    });

    $("#globalfrm_submit").click(function() {
        if (!checkGlobalEditingFormValue()) return false;

        $("#globalfrm").ajaxSubmit({
            url: globaleditURL,
            dataType: 'json',
            beforeSubmit: function (arr, $form, options) {
                progressStart();
            },
            success: function (jsonObj) {
                progressEnd();
                if (!jsonObj.errorflag) {
                    $.each(jsonObj.editlist, function(i, key) {
                        $('#' + i).removeClass("ui-selected ui-selectee");
                        $('#' + i).html(key.val).removeClass(key.classRemove).addClass(key.classAdd)
                            .bt(key.tooltip, toolTipConfig).attr('id', key.newid).attr('rel', key.val3);
                        seqEditOpId = key.editopid;
                        seqEditType = key.edittype;
                        if (seqEditOpId != 0) {
                            $('#undo').show();
                        } else {
                            $('#undo').hide();
                        }
                    });
                } else {
                     $('#warningmessage').html(jsonObj.errortext).dialog("open");
                }
            },
            error: function (data, status, e) {
                progressEnd();
                alert(e);
                return false;
            }
        });
    });

    $('#repopulate_deletions').click(function() {
        $('#globalpopulatefrm').toggle("slow");
    });

    function checkGlobalPopulateFormValue(blockId) {
        var blockList = [];

        if (blockId == "all") {
            var repblocknum = parseInt($("#repblocknum").val());
            for (var i = 0; i < repblocknum; ++i) {
                blockList.push(i);
            }
        } else blockList.push(parseInt(blockId));

        var errmsg = "";
        for (var i = 0; i < blockList.length; ++i) {
             var start = $("#repstartposition_" + blockList[i]).val();
             var end = $("#rependposition_" + blockList[i]).val();

             var block_errmsg = "";
             if ((start == "") && (end == "")) block_errmsg = "missing start & end position values.";
             else if (start == "") block_errmsg = "missing start position value.";
             else if (end == "") block_errmsg = "missing end position value.";
             if (block_errmsg != "") {
                 if (errmsg != "") errmsg += "\n";
                 errmsg += "Block="+(blockList[i]+1) + ": " + block_errmsg;
                 continue;
             }
             if (parseInt(start) > parseInt(end)) {
                 if (errmsg != "") errmsg += "\n";
                 errmsg += "Block="+(blockList[i]+1) + ": start position value '" + start + "' > end position value '" + end + "'.";
                 continue;
             }
             var lower_boundary = $("#actual_repstartposition_" + blockList[i]).val();
             var upper_boundary = $("#actual_rependposition_" + blockList[i]).val();
             var boundary_errmsg = "";
             if (((parseInt(start) < parseInt(lower_boundary)) || (parseInt(start) > parseInt(upper_boundary))) &&
                 ((parseInt(end) < parseInt(lower_boundary)) || (parseInt(end) > parseInt(upper_boundary))))
                 boundary_errmsg = "start position value '" + start + "' & end position value '" + end + "' are out of the range [ " 
                                 + lower_boundary + ", " + upper_boundary + " ].";
             else if ((parseInt(start) < parseInt(lower_boundary)) || (parseInt(start) > parseInt(upper_boundary)))
                 boundary_errmsg = "start position value '" + start + "' is out of the range [ " + lower_boundary + ", " + upper_boundary + " ].";
             else if ((parseInt(end) < parseInt(lower_boundary)) || (parseInt(end) > parseInt(upper_boundary)))
                 boundary_errmsg = "end position value '" + end + "' is out of the range [ " + lower_boundary + ", " + upper_boundary + " ].";
             if (boundary_errmsg != "") {
                 if (errmsg != "") errmsg += "\n";
                 errmsg += "Block="+(blockList[i]+1) + ": " + boundary_errmsg;
             }
        }
        if (errmsg != "") {
            alert(errmsg);
            return false;
        }
        return true;
    }

    function submit_globalpopulatefrm(button_id) {
        var tmpArray = button_id.split("_");
        if (!checkGlobalPopulateFormValue(tmpArray[1])) return false;

        $("#globalpopulatefrm").ajaxSubmit({
            url: globalAuthSeqEditURL,
            dataType: "json",
            beforeSubmit: function (formData, $form, options) {
                formData.push({name:"blockid",value:tmpArray[1]});
                progressStart();
            },
            success: function (jsonObj) {
                progressEnd();
                if (!jsonObj.errorflag) {
                    $.each(jsonObj.editlist, function(i, key) {
                        $("#" + i).removeClass("ui-selected ui-selectee");
                        $("#" + i).html(key.val).removeClass(key.classRemove).addClass(key.classAdd)
                            .bt(key.tooltip, toolTipConfig).attr("id", key.newid).attr("rel", key.val3);
                        seqEditOpId = key.editopid;
                        seqEditType = key.edittype;
                        if (seqEditOpId != 0) {
                            $("#undo").show();
                        } else {
                            $("#undo").hide();
                        }
                    });
                } else {
                     $("#warningmessage").html(jsonObj.errortext).dialog("open");
                }
            },
            error: function (data, status, e) {
                progressEnd();
                alert(e);
                return false;
            }
        });
    }

    $('#predefgedit').click(function() {
        if ($('#gedittype option:selected').val() == 'no-mismatch') {
            $('.errmsg').html(errStyle + "Please select 'MisMatch' type.<br />\n").show().delay(5000).slideUp(800);
            return false;
        }
        var predefEditIds = '';
        $('.' + $('#gedittype option:selected').val()).each(function(i) {
            console.log("Global edit top selection is " + $(this).attr('id'));
            if ($('#gedittype option:selected').val() == "cf-ala-unk") {
                predefEditIds += ((predefEditIds.length > 0) ? "," : "") + $(this).attr('id') + '|' + $(this).html() + '|(UNK)|'+ $(this).attr('class');
            } else if ($(this).attr('id').substr(0, 3) != 'aaa') {
                var thisClass = $(this).attr('class').substr($(this).attr('class').indexOf('cf-rep-'), 10);
                console.log("thisClass is " + thisClass);
                predefEditIds += ((predefEditIds.length > 0) ? "," : "") + $(this).attr('id') + '|' +
                    $(this).html() + '|(' + thisClass.split('-')[2] + ")|" + $(this).attr('class');
            }
        });
        if (predefEditIds.length > 0) {
            $.ajax({
                url: globalmenuURL,
                data: {
                    "sessionid": sessionID,
                    "operation": "global_edit_menu",
                    "editopid": seqEditOpId,
                    "aligntag": alignTagVal,
                    "selectedids": predefEditIds
                },
                success: function(jsonOBJ) {
                    try {
                        if (debugFlag) {
                            alert(jsonOBJ.debug);
                        }
                        $.each(jsonOBJ.editlist, function(i, key) {
                            $('#' + i).html(key.val).removeClass(key.classRemove).addClass(key.classAdd).bt(key.tooltip, toolTipConfig);
                            seqEditOpId = key.editopid;
                            seqEditType = key.edittype;
                        });
                        if (seqEditOpId != 0) {
                            $('#undo').show();
                        } else {
                            $('#undo').hide();
                        }
                    } catch (err) {
                        $('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) + '<br />\n' +
                            adminContact).show().delay(3000).slideUp(800);
                    }
                }
            });
        } else {
            $('.errmsg').html(errStyle + 'No editable instances of ' + $('#gedittype option:selected').text() + ' found.<br />\n' +
                adminContact).show().delay(5000).slideUp(800);
        }
    });

    $('#undo').click(function() {
        $.ajax({
            url: undoEditURL,
            data: {
                "sessionid": sessionID,
                "operation": "undo",
                "editopid": seqEditOpId,
                "aligntag": alignTagVal
            },
            success: function(jsonOBJ) {
                try {
                    if (debugFlag) {
                        alert(jsonOBJ.debug);
                    }
                    $.each(jsonOBJ.editlist, function(i, key) {
                        var thisVal = key.val;
                        if (thisVal == '') {
                            thisVal = 'Shift/Click to edit';
                        }
                        $('#' + i).html(thisVal).removeClass(key.classRemove).addClass(key.classAdd).bt(key.tooltip, toolTipConfig);
                        if (key.newid) {
                            $('#' + i).attr('id', key.newid);
                        }
                        if (key.val3) {
                            $('#' + i).attr('rel', key.val3);
                        }
                        seqEditOpId = key.editopid;
                        seqEditType = key.edittype;
                        if (seqEditOpId != 0) {
                            $('#undo').show();
                        } else {
                            $('#undo').hide();
                        }
                    });
                } catch (err) {
                    $('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) + '<br />\n' +
                        adminContact).show().delay(3000).slideUp(800);
                }
            }
        });
    });
    $(".loading").hide();
    //    $('#closewindow').show();
    $('#closewindow').click(function() {
        //self.close();
        $(window).unbind('beforeunload');
        $(top.document).off('keydown');
        iframeCloser();
    });
    $('#identifier-sect').html("Data set identifier: " + identifier).removeClass('displaynone');
    $('title').html("Alignment View: " + identifier);
    $('#identifier-sect').show();

    handleCLoseWindow();

});
