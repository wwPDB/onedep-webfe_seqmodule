/**********************************************************************
File:		summary_full.js
Original:	rshah
Date:		15-June-2010
Version:	0.0.12

This is the summary js file, which loads the summary, either taking
the RCSB ID or by uploading the file.

27-Jul-2010 RPS: Added support for accommodating different ordering of sequence types as per user preferences
02-Aug-2010 RPS: Accommodating decoupling of "Save/Done" button/functionality into separate "Save" and "Return to Workflow Manager" actions
04-Aug-2010 RPS: Added support for providing sorting ability for "Chain ID" and "Version" columns of Coordinate sequence(s) table
06-Aug-2010 RPS: Corrected bug regarding #showmore functionality (removed problematic reference to "tablesorter_xyz")
				 Also, improved message displayed to user after selecting "Save" button.
12-Aug-2010 RPS: Updated to accommodate new strategy for Save vs. Back to WFM buttons.
11-Nov-2011 RPS: Some relative URL values updated to reflect consolidated deployment of all common tool front-end modules.
22-Dec-2011 RPS: More URL updates to reflect consolidated deployment of all common tool front-end modules.
26-Feb-2013 RDS: Updated and optimized code to support jquery version: 1.9.1
#
12-Nov-2013 JDW : Add entity review form support -
12-Nov-2013 JDW : Consolidate stand-alone and wf versions --
22-Nov-2013 JDW : Reload summary on change of reference.  add selectids to callbacks
30-Nov-2013 JDW : maintain continuity in the current entity/group selected ...
12-Dec-2013 JDW : reload only on reference reselection.
21-Feb-2014 jdw : make the entity review dialog modal - leave the form in place -- add close button --
22-Feb-2014 jdw : handle blank form elements in ief forms
10-Mar-2014 jdw : remove ajax timeout and update ajax error handling messages
22-Mar-2014 jdw : update ief plugin to latest in assets and add monospace textarea for sequence updates
23-Mar-2013 jdw : add modal confirm for before close functions and detect window close events --
15-May-2014 jdw : selection of all coordinates sequences will pick the latest versions.
26-May-2014 jdw : change protocol for updating parameters when alignment is launched.
26-May-2014 jdw : Jquery 1.11.1 upgrade --
08-Jul-2014 jdw : add groupid tracking -
01-Feb-2015 jdw : shrink taxonomy form -
03-May-2016 ep  : Move "more sequences" button after the search results
17-May-2016 ep  : showmore button changed from id to class to handle multiple entities
13-Sep-2017 zf  : add UpdateSeqType(), ValidateFormTaxonomy()
29-Apr-2023 ep  : add postJSON() method and use in place of getJSON for taxonomy load due to URI limits 
#
#
*********************************************************************/
//var ajaxTimeout = 600000;
var ajaxTimeout = 0;
var adminContact = 'Send comments to: <a href="mailto:help@wwpdb-dev.rutgers.edu">help@wwpdb-dev.rutgers.edu</a>';
var errStyle = '<span class="ui-icon ui-icon-alert fltlft"></span> ';
var infoStyle = '<span class="ui-icon ui-icon-info fltlft"></span> ';
var sessionURL = '/service/sequence_editor/new_session';
var loadStartURL = '/service/sequence_editor/load_data/start/wf';
var loadCheckURL = '/service/sequence_editor/load_data/check/wf';
var loadStartSAURL = '/service/sequence_editor/load_data/start/rcsb';
var loadCheckSAURL = '/service/sequence_editor/load_data/check/rcsb';
var rerunBlastURL = '/service/sequence_editor/rerun_blast/start';
var loadSummaryURL = '/service/sequence_editor/load_summary';
var alignViewURL = '/service/sequence_editor/align_view';
var reLoadURL        = '/service/sequence_editor/reload_data/start';
var reLoadSummaryURL = '/service/sequence_editor/reload_summary';
var reLoadCheckURL = '/service/sequence_editor/reload_data/check';
var polymerURL = '/service/sequence_editor/polymer_linkage_table';
var saveURL = '/service/sequence_editor/save';
var closeCompletedURL = '/service/sequence_editor/close_completed';
var closeUnfinishedURL = '/service/sequence_editor/close_unfinished';
var savePartialAssignmentURL = '/service/sequence_editor/save_partial_assignment';
var removePartialAssignmentURL = '/service/sequence_editor/remove_partial_assignment';
var loadNewDbRef = '/service/sequence_editor/load_form/seqdbref';
var loadNewTaxonomy = '/service/sequence_editor/load_form/taxonomy';
var loadEntityReview = '/service/sequence_editor/load_form/entityreview';
var downloadUrl = '/service/sequence_editor/download';
//
var placeholderVal = "click-to-edit";
var alignIds = '';
var selectIds = '';
var allAlignIds = '';
var activeGroupID = 1;
var debUG = false;
var checked = false;
var allchecked = {};
var t=null;
var progressWaiting=false;
var doneFlag=false;
// #JDW NEW
var groupIdList = [];
var groupIdListFlag=false;
var entityIdList = [];
var entryIdentifier = '';

function hideAlignViewFrame(doUpdate, updatedSelectIds) {
    $('#alignview-frame').addClass('displaynone');
    $('#container').show();
    //console.log("Returning with updateFlag=" + doUpdate);
    if (doUpdate == 'yes') {
	doReloadSummary(updatedSelectIds);
    }
}

function doReloadSummary(updatedSelectIds) {
    resetBtns();
    $('.errmsg').empty().hide();
    $('.warnmsg').empty().hide();
    $('.summary_control').hide();
    $('.summary_display').hide();
    $('#res').empty();
    $('#saveselect, #savepartial, #closecompleted, #closeunfinished,  #viewalignframebutton, #viewalign_ordering, #downloadlink').hide();
    $('#rerun, #reload, #polymerlinkage').hide();
    $.ajax({url: reLoadSummaryURL,
            data: {'sessionid': sessionID, 'allalignids': allAlignIds, 'selectids': selectIds, 'updatedids': updatedSelectIds, 'activegroupid': activeGroupID},
	    success: function (jsonOBJ) {
                resetOnLoad(jsonOBJ);
	    }
           });
    $('.srchdiv').addClass('displaynone');

}
function progressStart(customValue) {
    if (!progressWaiting) {
        var defaultValue = 'Creating alignment summary ...';
        if (customValue != '')
            $("#loadingspinner").html(customValue);
        else $("#loadingspinner").html(defaultValue);
	$("#progress-dialog").fadeIn('slow').spin("large", "black");
	progressWaiting=true;
    }
}

function progressEnd() {
    $("#progress-dialog").fadeOut('fast').spin(false);
    progressWaiting=false;
}


function resetBtns() {
    selectIds = '';
    alignIds = '';
    allAlignIds = '';
    $('#reset').hide();
    $('#res .saveeles:checked').each(function() {
        selectIds += ((selectIds.length > 0) ? ',' : '') + $(this).parent().parent().attr('id');
    });
    if (selectIds.length > 0) {
            $('#saveselect, #savepartial, #closecompleted, #closeunfinished, #reset').show();
    } else {
            $('#saveselect, #savepartial, #close').hide();
    }
    $('#res .aligneles:checked').each(function() {
        allAlignIds += ((allAlignIds.length > 0) ? ',' : '') + $(this).parent().parent().attr('id');
    });
    //
    var alignCount = 0;
    $('#res ._current .aligneles:checked').each(function() {
        alignCount++;
        alignIds += ((alignIds.length > 0) ? ',' : '') + $(this).parent().parent().attr('id');
    });
    if (alignIds.length > 0 && alignCount > 1) {
        $('#viewalign_grp').show();
        $('#viewalignframebutton').show();
        $('#viewalign_ordering').show();
    } else if (alignIds.length > 0) {
        $('#reset').show();
        $('#viewalign_grp').hide();
        $('#viewalignframebutton').hide();
        $('#viewalign_ordering').hide();
    } else {
        $('#viewalign_grp').hide();
        $('#viewalignframebutton').hide();
        $('#viewalign_ordering').hide();
    }
}

function closeWindow() {
    if (navigator.userAgent.match(/firefox/i) ){
	window.open('','_parent','');
	window.close();
    } else  {
	//
	//console.log("Closing window non-firefox");
	var win=window.open('','_self');
	window.close();
	win.close(); return false;
    }
}

function UpdateSeqType(seqtype_id, value, selected) {
    var label = placeholderVal;
    var selectvalues = '';
    $.each($('#' + seqtype_id).data('ief-selectvalues'), function(i, item) {
        if (item.value == value) {
            item.selected = selected;
            if (selected) {
                label = item.label;
                $("select[name='" + seqtype_id + "'] option[value='" + value + "']").attr('selected','selected');
                $("select[name='" + seqtype_id + "'] option[value='" + value + "']").prop('selected',true);
            } else {
                $("select[name='" + seqtype_id + "'] option[value='" + value + "']").removeAttr('selected');
                $("select[name='" + seqtype_id + "'] option[value='" + value + "']").prop('selected', false);
            }
        }
        if (selectvalues != '') selectvalues += ',';
        var selected_value = 'false';
        if (item.selected) selected_value = 'true';
        selectvalues += '{"value":"' + item.value + '","label":"' + item.label + '","selected":' + selected_value + '}';
    });
    $('#' + seqtype_id).attr('data-ief-selectvalues', '[' + selectvalues + ']');
    $('#' + seqtype_id).html(label);
    if (selected)
        $('#' + seqtype_id).removeClass('greyedout');
    else $('#' + seqtype_id).addClass('greyedout');
}

function ValidateFormTaxonomy() {
    var seq = $('#formtaxonomy #entity_seq_1').text().toUpperCase().trim();
    var seqArray = [];
    var incorrectSeqs = '';
    var missing_open = false;
    var missing_close = false;
    for (var i = 0; i < seq.length; i++) {
         var letter = seq.charAt(i);
         var code = seq.charCodeAt(i);
         if (letter == ' ' || letter == '\t' || letter == '\n') continue;
         if (letter != '(') {
             if (letter == ')') {
                 missing_open = true;
                 continue;
             }
             if (code < 65 || code > 90) {
                 if (incorrectSeqs != '') incorrectSeqs += ' ';
                 incorrectSeqs += letter;
                 continue;
             }
             seqArray.push(letter);
         } else {
             if (i == (seq.length - 1)) {
                 missing_close = true;
                 continue;
             }
             var cs = '';
             var incorrectSeqFlag = false;
             ++i;
             letter = seq.charAt(i);
             code = seq.charCodeAt(i);
             while (letter != ')') {
                  if (i == (seq.length - 1)) {
                      missing_close = true;
                      break;
                  } else if (letter == '(') {
                      missing_close = true;
                  }
                  if (letter != ' ' && letter != '\t' && letter != '\n' && letter != '(') {
                      cs += letter;
                      if ((code < 48) || ((code > 57) && (code < 65)) || (code > 90)) incorrectSeqFlag = true;
                  }
                  ++i;
                  letter = seq.charAt(i);
                  code = seq.charCodeAt(i);
             }
             if (incorrectSeqFlag) {
                 if (incorrectSeqs != '') incorrectSeqs += ' ';
                 incorrectSeqs += cs;
             } else seqArray.push(cs);
         }
    }

    var error = '';
    if (incorrectSeqs != "") error += "Incorrect sequence: " + incorrectSeqs + "\n";
    if (missing_open && missing_close)
         error += "Missing open parenthesis '(' and close parenthesis ')'\n";
    else if (missing_open)
         error += "Missing open parenthesis '('\n";
    else if (missing_close)
         error += "Missing close parenthesis ')'\n";
    if (error != "") return error;

    // var length = parseInt($('#formtaxonomy #seq_length').val());
    var length = seqArray.length;
    var parts = parseInt($('#formtaxonomy #total_numparts').val());

    var maximum_selected_part_id = 0;
    var selectedPartDict = {};
    var selectedPartArray = [];
    for (var i = 1; i <= parts; i++) {
         var beginVal = $('#p_' + String(i) + '_seqbegin').text();
         var endVal = $('#p_' + String(i) + '_seqend').text();
         if (beginVal == placeholderVal && endVal == placeholderVal) continue;

         if (beginVal == placeholderVal) {
             error += "Missing 'SEQ BEGIN' value for 'PART ID=" + i + "'\n";
             continue;
         } else if (endVal == placeholderVal) {
             error += "Missing 'SEQ END' value for 'PART ID=" + i + "'\n";
             continue;
         } else if (parseInt(endVal) < parseInt(beginVal)) {
             error += "'SEQ END' value '" + endVal + "' is smaller than 'SEQ BEGIN' value '" + beginVal + "' for 'PART ID=" + i + "'\n";
             continue;
         }
 
         var rangeError = false;
         if (parseInt(beginVal) < 1) {
             error += "'SEQ BEGIN' value '" + beginVal + "' is smaller than 1 for 'PART ID=" + i + "'\n";
             rangeError = true;
         }
         if (parseInt(endVal) > length) {
             error += "'SEQ END' value '" + endVal + "' is larger than sequence length '" + length + "' for 'PART ID=" + i + "'\n";
             rangeError = true;
         }
         if (rangeError) continue;

         maximum_selected_part_id = i;
         selectedPartDict[i] = 'yes';
         selectedPartArray.push([ String(i), beginVal, endVal ]);
    }
    if (error != "") return error;

    var found_part_ids = '';
    var missing_part_ids = '';
    for (var i = 1; i <= maximum_selected_part_id; i++) {
         if (selectedPartDict.hasOwnProperty(i)) {
             if (found_part_ids != '') found_part_ids += ',';
             found_part_ids += String(i);
         } else {
             if (missing_part_ids != '') missing_part_ids += ',';
             missing_part_ids += String(i);
         }
    }
    if (missing_part_ids != '') {
         error += "Found '" + found_part_ids + "' PART IDs.\n" + "Missing '" + missing_part_ids + "' PART IDs.\n";
         error += "PART ID must be sequential.\n";
         return error;
    }

    for (var i = 1; i < selectedPartArray.length; i++) {
         if (parseInt(selectedPartArray[i-1][2]) >= parseInt(selectedPartArray[i][1])) {
             error += "PART IDs '" + selectedPartArray[i-1][0] + "' and '" + selectedPartArray[i][0] + "' are overlapped.\n";
         }
    }

    return error;
}

    function closeWindowX() {
	$("body").html("");
    }

    function lRSession() {
        $.ajax({url: sessionURL,async: false,success: function (jsonOBJ) {
            try {
		sessionID = jsonOBJ.sessionid;
		$('.errmsg').empty().hide();
                $('.warnmsg').empty().hide();
		$('.summary_control').hide();
		$('.summary_display').hide();
		if (debUG) {alert(sessionID);}
		$('#go').val('Go').prop('disabled', false);
	    } catch(err) {
		$('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) ).show();
	    }
        }
               });
    }


    function resetOnLoad(jsonOBJ) {
	try {
            $('#removepartial').hide();
            if (('haspartialassignment' in jsonOBJ) &&  jsonOBJ.haspartialassignment) {
                $('#removepartial').show();
            }
            if ('entrywarningmessage' in jsonOBJ) {
                $('.errmsg').html(infoStyle + jsonOBJ.entrywarningmessage).show();
            }
            if ('summaryinfo' in jsonOBJ) {
                $('.summary_display').html(jsonOBJ.summaryinfo);
            }
            $('.summary_control').show();
            var elecontrol = $('#summary_toggle').find('span.ui-icon');
            if (elecontrol.hasClass('ui-icon-circle-arrow-s')) {
                $('.summary_display').show();
            }
            $('.page_control').click(function() {
                var id = $(this).attr('id');
                var page = id.substring(5);
                $('._current').removeClass('_current').slideUp('slow');
                $('#p'+page).addClass('_current').slideDown('slow');
                activeGroupID = page;
                if (groupIdListFlag) {
                    groupIdList.splice($.inArray(activeGroupID, groupIdList),1);
                }
                resetBtns();
/*
                var ele1 = $('.toggle_summary').find('span.ui-icon');
                ele1.removeClass('ui-icon-circle-arrow-s');
                ele1.addClass('ui-icon-circle-arrow-e');
                $('.summary_display').hide();
*/
            });
            entryIdentifier = jsonOBJ.identifier;
	    //
	    $('#identifier-sect').html("<b>Data set:</b> " + jsonOBJ.identifier + '<br/><b>Title:</b> ' + jsonOBJ.title).removeClass('displaynone');
	    $('title').html("Seq: " + jsonOBJ.pdbid + "/" + jsonOBJ.identifier);

            if (jsonOBJ.warningflag) {
	        $('#warningmessage').html(jsonOBJ.warningtext).dialog("open");
            }

	    if ('groupids' in jsonOBJ &&  ! groupIdListFlag) {
		groupIdList=jsonOBJ.groupids.split(",");
                entityIdList=jsonOBJ.groupids.split(",");
		groupIdListFlag=true;
		groupIdList.splice($.inArray(groupIdList[0], groupIdList),1);
            }


	    //
	    $('#res').load(jsonOBJ.htmlcontentpath, function() {
		$('#pagi').paginate({count: $('.tabscount').size(),
				     start: activeGroupID,
				     activegroupid: activeGroupID,
				     display:30,
				     border:true,
				     border_color:'#BEF8B8',
				     text_color:'#68BA64',
				     background_color:'#E3F2E1',
				     border_hover_color:'#68BA64',
				     text_hover_color:'black',
				     background_hover_color:'#CAE6C6',
				     images:false,
				     mouse:'press',
				     onChange:function(page){
					 $('._current').removeClass('_current').slideUp('slow');
					 $('#p'+page).addClass('_current').slideDown('slow');
					 activeGroupID = page;
					 if (groupIdListFlag) {
					     groupIdList.splice($.inArray(activeGroupID, groupIdList),1);
					 }
					 resetBtns();
				     }
				    });
		$(".tablesorter_ref").tablesorter({headers: {0: {sorter: false}, 1: {sorter: false}, 2: {sorter: false},
							     3: {sorter: false}, 4: {sorter: false}, 8: {sorter: false}}, widgets: ['zebra']
						  });
		$(".tablesorter_xyz").tablesorter({headers: {0: {sorter: false}, 1: {sorter: false}, 4: {sorter: false},
							     5: {sorter: false}}, widgets: ['zebra']
						  });
		$('.checkall').click(function() {
		    $(this).parents('div:eq(0)').find('.aligneles:visible').prop('checked', this.checked);
		    resetBtns();
		});
		$('.selectall').click(function() {
		    //$(this).parents('div:eq(0)').find('.saveeles:visible').prop('checked', this.checked);
		    //$(this).parents('div:last').find('.saveeles:visible').prop('checked', this.checked);
		    if ($(this).prop('checked') == true ) {
			$(this).parents('div:eq(0)').find('.selectablexyz:visible.maxver').prop('checked', this.checked);
		    } else {
			$(this).parents('div:eq(0)').find('.selectablexyz:visible').prop('checked', this.checked);
		    }
		});
		$('.toggle').click(function() {
		    var ele = $(this).find('span.ui-icon');
		    ele.toggleClass('ui-icon-circle-arrow-s ui-icon-circle-arrow-e');
		    $(this).parents('.head').next().toggle('slow');
		    return false;
		});
		$('#polymertable').dialog({bgiframe: true,autoOpen: false,modal: false, height: 700,width: 700,
					   close: function (event, ui) {
					       $("#polymerlinkage").attr("disabled", false);
					       $("#polymertable").empty();
					   }
					  });
		$('#dialogloadnewform').dialog({bgiframe: true,autoOpen: false,modal: false,height: 700,width: $(window).width()*0.9,
						close: function (event, ui) {
						    $('#dialogloadnewform').empty();
						}
					       });

		$('.loadseqdbref').click(function(){
		    var refId=$(this).parent().prev().find('a').attr('id');
		    $.postJSON(loadNewDbRef,{"sessionid":sessionID,"identifier":entryIdentifier,activegroupid:activeGroupID,"ref_id":refId,'selectids':selectIds},function(jsonOBJ){
			$('#dialogloadnewform').html(jsonOBJ.htmlcontent).dialog("open");
			$('.ief').ief({
			    onstart:function(){
				if ($(this).hasClass('greyedout')) {
				    $(this).data('placeholder',$(this).html()).empty();
				}
			    },
			    oncommit:function(){
				// New filtering blank form elements --
				if ($.trim($(this).html()).length == 0) {
				    $(this).data('placeholder',$(this).html()).empty();
				    $(this).html(placeholderVal).addClass('greyedout');
				} else if ($(this).hasClass('greyedout') && !$(this).is(":empty")){
				    $(this).removeClass('greyedout');
				} else if ($(this).hasClass('greyedout')) {
				    $(this).html($(this).data('placeholder')).addClass('greyedout');
				}
			    },
			    oncancel:function(){
				if ($(this).is(":empty")){
				    $(this).html($(this).data('placeholder')).addClass('greyedout');
				}
			    }
			});
			$('.auth_ajaxform').ajaxForm({beforeSubmit: function (formData, jqForm, options) {
			    formData.push({name:'auth_id',value:refId});
			}, success: function (jsonOBJ) {
                            if (jsonOBJ.errorflag) {
                                alert(jsonOBJ.errortext);
			    } else if (jsonOBJ.statuscode=='ok') {
				$('#dialogloadnewform').dialog("close");
				$('#reload').trigger('click');
			    } else {
				$('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) ).show();
			    }
			}
						     });

		    });
		});

		$('#dialogtaxonomyform').dialog({bgiframe: true,autoOpen: false,modal: false,height: 400,width: $(window).width()*0.9,
						close: function (event, ui) {
						    $('#dialogloadnewform').empty();
						}
					       });


		$('.loadtaxonomy').click(function(){
		    var authId=$(this).parent().prev().find('a').attr('id');
		    $.postJSON(loadNewTaxonomy,{"sessionid":sessionID,activegroupid:activeGroupID,"auth_id":authId,'selectids':selectIds},function(jsonOBJ){
			    // jdw$('#dialogloadnewform').html(jsonOBJ.htmlcontent).dialog("open");
			    $('#dialogtaxonomyform').html(jsonOBJ.htmlcontent).dialog("open");
			$('.ief').ief({
			    onstart:function(){
				if ($(this).hasClass('greyedout')){
				    $(this).data('placeholder',$(this).html()).empty();
				}
			    },
			    oncommit:function(){
				var id = $(this).attr('id');
				var idsplit = id.split('_');
				var checkid = '';
				if (idsplit[2] == 'seqbegin') checkid = idsplit[0] + '_' + idsplit[1] + '_seqend';
				else if (idsplit[2] == 'seqend') checkid = idsplit[0] + '_' + idsplit[1] + '_seqbegin';
                                if (checkid != '') {
                                    var check_val = $('#' + checkid).text();
                                    var seqtype_id = idsplit[0] + '_' + idsplit[1] + '_seqtype';
				    if (!$(this).is(":empty") && check_val != '' && check_val != "click-to-edit") {
                                        UpdateSeqType(seqtype_id, "Biological sequence", true);
				    } else if ($(this).is(":empty") && ((check_val == '') || (check_val == "click-to-edit"))) {
                                        UpdateSeqType(seqtype_id, "Biological sequence", false);
                                        var taxid = idsplit[0] + '_' + idsplit[1] + '_taxid';
                                        $('#' + taxid).data('placeholder',$('#' + taxid).html()).empty();
                                        $('#' + taxid).html(placeholderVal).addClass('greyedout');
                                    }
                                }
				// New filtering blank form elements --
				if ($.trim($(this).html()).length == 0) {
				    $(this).data('placeholder',$(this).html()).empty();
				    $(this).html(placeholderVal).addClass('greyedout');
				} else if ($(this).hasClass('greyedout') && !$(this).is(":empty")){
				    $(this).removeClass('greyedout');
				} else if ($(this).hasClass('greyedout')) {
				    $(this).html($(this).data('placeholder')).addClass('greyedout');
				}
			    },
			    oncancel:function(){
				if ($(this).is(":empty")){
				    $(this).html($(this).data('placeholder')).addClass('greyedout');
				}
			    }
			});
			$('.taxonomy_ajaxform').ajaxForm({
			    beforeSubmit: function (formData, jqForm, options) {
			        progressStart('Saving Edits ...');
                                var error = ValidateFormTaxonomy();
                                if (error != '') {
				    progressEnd();
                                    alert(error);
                                    return false;
                                }
				formData.push({name:'ref_id',value:authId});
				formData.push({name:'selectids',value:selectIds});
				//$('#dialogloadnewform').dialog("close");
				$('#dialogtaxonomyform').dialog("close");
			    },
			    success: function (jsonOBJ) {
				if (jsonOBJ.statuscode=='ok') {
				    //$('#dialogloadnewform').dialog("close");
				    $('#dialogtaxonomyform').dialog("close");
				    resetBtns();
				    $('#res').empty();
				    $('#saveselect, #savepartial, #closecompleted, #closeunfinished,  #viewalign_grp,  #viewalignframebutton, #viewalign_ordering, #downloadlink').hide();
				    $('#rerun, #reload, #polymerlinkage, #reset').hide();
				    $.ajax({url:reLoadURL,data:{"sessionid":sessionID,"activegroupid":activeGroupID}, success:function(jsonOBJ) {
				       checkSummaryStatus(jsonOBJ, reLoadCheckURL); }
				    });
				    $('.srchdiv').addClass('displaynone');
				} else {
				    $('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) ).show();
				}
			    }
			});
                        $('#add_row_button').click(function() {
                            var selectvalues = '[{"value":"","label":"","selected":false},{"value":"Biological sequence","label":"Biological sequence","selected":false}]';
                            var int_total_numparts = parseInt($('#total_numparts').val());

                            var additional_row_text = "";
                            var tagIdList = [];
                            for (var i = 0; i < 5; ++i) {
                                 int_total_numparts++;
                                 var partId = int_total_numparts.toString();
                                 additional_row_text += '<tr>\n';
                                 additional_row_text += '<td><span id="p_' + partId + '_partid">' + partId + '</span>'
                                                      + '<input type="hidden" name="p_' + partId + '_partid" value="' + partId + '" /></td>\n';
                                 additional_row_text += '<td><span id="p_' + partId + '_taxid">click-to-edit</span></td>\n';
                                 additional_row_text += '<td><span id="p_' + partId + '_seqbegin">click-to-edit</span>\n';
                                 additional_row_text += '<td><span id="p_' + partId + '_seqend">click-to-edit</span></td>\n';
                                 additional_row_text += '<td><span id="p_' + partId + '_seqtype" data-ief-edittype="select" data-ief-selectvalues=\''
                                                      + selectvalues + '\'>click-to-edit</span></td>\n';
                                 additional_row_text += '</tr>\\n';
                                 tagIdList.push('p_' + partId + '_taxid');
                                 tagIdList.push('p_' + partId + '_seqbegin');
                                 tagIdList.push('p_' + partId + '_seqend');
                                 tagIdList.push('p_' + partId + '_seqtype');
                            }
                            $('#seq_partition_table').append(additional_row_text);

                            for (var i = 0; i < tagIdList.length; ++i) {
                                 $('#' + tagIdList[i]).addClass('ief');
                                 $('#' + tagIdList[i]).addClass('greyedout');
                                 $('#' + tagIdList[i]).ief({
                                      onstart:function(){
                                          if ($(this).hasClass('greyedout')){
                                              $(this).data('placeholder',$(this).html()).empty();
                                          }
                                      },
                                      oncommit:function(){
                                          var id = $(this).attr('id');
                                          var idsplit = id.split('_');
                                          var checkid = '';
                                          if (idsplit[2] == 'seqbegin') checkid = idsplit[0] + '_' + idsplit[1] + '_seqend';
                                          else if (idsplit[2] == 'seqend') checkid = idsplit[0] + '_' + idsplit[1] + '_seqbegin';
                                          if (checkid != '') {
                                              var check_val = $('#' + checkid).text();
                                              var seqtype_id = idsplit[0] + '_' + idsplit[1] + '_seqtype';
                                              if (!$(this).is(":empty") && check_val != '' && check_val != "click-to-edit") {
                                                  UpdateSeqType(seqtype_id, "Biological sequence", true);
                                              } else if ($(this).is(":empty") && ((check_val == '') || (check_val == "click-to-edit"))) {
                                                  UpdateSeqType(seqtype_id, "Biological sequence", false);
                                                  var taxid = idsplit[0] + '_' + idsplit[1] + '_taxid';
                                                  $('#' + taxid).data('placeholder',$('#' + taxid).html()).empty();
                                                  $('#' + taxid).html(placeholderVal).addClass('greyedout');
                                              }
                                          }
                                          // New filtering blank form elements --
                                          if ($.trim($(this).html()).length == 0) {
                                              $(this).data('placeholder',$(this).html()).empty();
                                              $(this).html(placeholderVal).addClass('greyedout');
                                          } else if ($(this).hasClass('greyedout') && !$(this).is(":empty")){
                                              $(this).removeClass('greyedout');
                                          } else if ($(this).hasClass('greyedout')) {
                                              $(this).html($(this).data('placeholder')).addClass('greyedout');
                                          }
                                      },
                                      oncancel:function(){
                                          if ($(this).is(":empty")){
                                              $(this).html($(this).data('placeholder')).addClass('greyedout');
                                          }
                                      }
                                 });
                            }
                            $('#seq_partition_table').show();
                            $('#total_numparts').val(int_total_numparts.toString());
                        });
		    });
		});
		$('.loadentityreview').click(function(){
		    $('#dialogloadnewform').on( "dialogclose", function () {$(".ui-widget-overlay").remove();});
		    var authId=$(this).parent().prev().find('a').attr('id');
		    $.postJSON(loadEntityReview,{"sessionid":sessionID,"groupid":activeGroupID,"auth_id":authId,'selectids':selectIds},function(jsonOBJ){
			$('#dialogloadnewform').dialog({
			    modal : true,
			    resizable: true,
			    buttons: [ { text: "Close window", click: function() { $( this ).dialog( "close" ); } } ]
			});
			$('#dialogloadnewform').html(jsonOBJ.htmlcontent).dialog("open");
			//JDWJDW
			$('.ief').ief({
			    onstart:function(){
				if ($(this).hasClass('greyedout')){
				    $(this).data('placeholder',$(this).html()).empty();
			        }
			    },
			    oncommit:function(){
				// New filtering blank form elements --
				if ($.trim($(this).html()).length == 0) {
				    $(this).data('placeholder',$(this).html()).empty();
				    $(this).html(placeholderVal).addClass('greyedout');
				} else if ($(this).hasClass('greyedout') && !$(this).is(":empty")){
				    $(this).removeClass('greyedout');
				} else if ($(this).hasClass('greyedout')) {
				    $(this).html($(this).data('placeholder')).addClass('greyedout');
				}
			    },
			    oncancel:function(){
				if ($(this).is(":empty")){
				    $(this).html($(this).data('placeholder')).addClass('greyedout');
				}
			    }
			});
			$('.review_ajaxform').ajaxForm({beforeSubmit: function (formData, jqForm, options) {
			    formData.push({name:'auth_id',value:authId});
			    progressStart('Saving Edits ...');
			}, success: function (jsonOBJ) {
			    if (jsonOBJ.statuscode=='ok') {
				//$('#dialogloadnewform').dialog("close");
				progressEnd();
				$('#reload').trigger('click');
			    } else {
				$('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) ).show();
                                progressEnd();
			    }
			}
						       });

		    });
		});

		resetBtns();
		$('#res .refselection').click(function() {
		    doReloadSummary('');
		});
		$('#res .aligneles').click(function() {
		    resetBtns();
		});
		//$('#dbsrch_go, #taxsrch_go').val('Go').attr('disabled', false);

		// $('.errmsg').empty().hide();
		$('.refdiv table').each(function() {
		    $(this).find('tr:gt(1)').hide();
		});
		$('#rerun, #reload, #polymerlinkage').show();
		$('.srchdiv').removeClass('displaynone');
	    });
	} catch(err) {
	    $('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) ).show();
	}
    }


    function getSummaryStatus(jsonOBJ,checkURL) {
	$.ajax({url:checkURL,data:{'semaphore':jsonOBJ.semaphore,'sessionid':sessionID,'delay':2},
		success: function(resOBJ) {
		    if (resOBJ.statuscode=='running') {
			t=setTimeout(function(){getSummaryStatus(resOBJ,checkURL)},15000);
		    } else {
			if (resOBJ.statuscode=='completed') {
			    $('#identifier-sect').html("<b>Data set:</b> " + resOBJ.identifier).removeClass('displaynone');
			    $('title').html("Seq: " + resOBJ.identifier);


			    $('#identifier-sect').show();
			    $.ajax({url:loadSummaryURL,data:{'operation':'load','semaphore':resOBJ.semaphore,'sessionid':sessionID,'selectids': selectIds,'activegroupid': activeGroupID},
				    success: function(sumOBJ) {
				      if (sumOBJ.errorflag) {
					  $('.errmsg').html(errStyle + sumOBJ.errortext).show();
				      } else {
					resetOnLoad(sumOBJ);
					if ($("#loadfrmSAsection").length > 0) {
					    $('#sessionidF').val(sessionID);
					    $('#identifierF').val(resOBJ.identifier);
					    $('#instanceF').val("");
					    $('#sessionid2').val(sessionID);
					    $('#identifier2').val(resOBJ.identifier);
					    $('#instance2').val("");
					    $('#loadfrmSAsection').addClass('displaynone');
					}
					if ($("#loading_message").length > 0) {
					    $('#loading_message').addClass('displaynone');
					}
				      }
				    }
				   });
			} else {
			    progressEnd();
			    $('#go').val('Go').prop('disabled', false);//, #dbsrch_go, #taxsrch_go
			    $('.errmsg').html(errStyle + 'Failed to load your request.' ).show();
			}
			//$('#timer').empty();
			progressEnd();
		    }
		}
	       });
    }
    function checkSummaryStatus(jsonOBJ, checkURL) {
	try {
	    progressStart('');
	    //$('#timer').html('<div id="progressbar"></div>');
	    //$('#progressbar').progressbar({value:false});
	    //$('#timer').html('&nbsp;&nbsp;&nbsp;<img class="loadimg" src="/images/loading.gif" alt="Loading..." />');
	    //$('#progressbar').progressbar({value:false});
	    //
	    getSummaryStatus(jsonOBJ,checkURL);
	} catch(err) {
	    $('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) ).show();
	}
    }

    function download(url,arguments) {
	for(var i=0; i<arguments.length; i++) {
	    var $iframe = $('<iframe style="visibility: collapse;"></iframe>');
	    $('body').append($iframe);
	    var content = $iframe[0].contentDocument;
	    var $form = $('<form action="' + url + '" method="GET"></form>');
	    for (var j=0;j<arguments[i].length;j++) {
		$form.append('<input type="hidden" name="'+arguments[i][j].key+'" value="'+arguments[i][j].val+'" />');
	    }
	    content.write($form.clone().wrap('<div>').parent().html());
	    $('form', content).submit();
	    setTimeout((function(iframe) {
		return function() {
		    iframe.remove();
		}
	    })($iframe), 2000);
	}
    }


function confirmFinish(url) {
    doneFlag=false;
    $("#confirm-dialog").html("Ready to leave this module?");
    $("#confirm-dialog").dialog({
        resizable: false,
        modal: true,
        title: "Confirmation",
        height: 250,
        width: 400,
        buttons: {
            "Done": function () {
		$(window).unbind('beforeunload')
                $(this).dialog('close');
		finishOp(url);
            },
            "Cancel": function () {
                $(this).dialog('close');
            }
        }
    });
}

function finishOp(closeUrl) {
    $('#loadfrm').ajaxSubmit({url: closeUrl, clearForm: false, dataType: 'json',
    			      beforeSubmit: function (formData, jqForm, options) {
				  formData.push({"name": "sessionid", "value": sessionID});
			      },
			      success: function (jsonOBJ, statusText) {
				  if (jsonOBJ.errorflag) {
				      $('.errmsg').html(infoStyle + jsonOBJ.errortext).show();
				  } else {
				      closeWindow();
				  }
			      }
			     });
}

function handleCLoseWindow() {
    var inFormOrLink;
    $('a').on('click', function() { inFormOrLink = true; });
    $('form').on('submit', function() { inFormOrLink = true; });

    $(window).bind('beforeunload', function(eventObject) {
	var returnValue = undefined;
	if (! inFormOrLink) {
	    returnValue = "Do you really want to close?";
	}
	eventObject.returnValue = returnValue;
	return returnValue;
    });
}

$(document).ready(function() {
    //
    // Replacement for jquery.getJSON but uses post
    $.postJSON = function(url, data, func)
    {
	$.post(url, data, func, "json");
    }


    $.ajaxSetup({type:'POST',dataType:'JSON',async:true,timeout:ajaxTimeout,cache:false});

    $('.toggle_summary').click(function() {
        var ele = $(this).find('span.ui-icon');
        if (ele.hasClass('ui-icon-circle-arrow-s')) {
            ele.removeClass('ui-icon-circle-arrow-s');
            ele.addClass('ui-icon-circle-arrow-e');
            $('.summary_display').hide();
        } else {
            ele.removeClass('ui-icon-circle-arrow-e');
            ele.addClass('ui-icon-circle-arrow-s');
            $('.summary_display').show();
        }
        return false;
    });

    $(document)
	.ajaxStart(function() {$('.loading').show()})
	.ajaxComplete(function() {$('.loading').hide()})
	.ajaxError(function (e, x, settings, exception) {
	    try {
		if (x.status == 0) {
		    $('.errmsg').html(errStyle + 'Your request my have timed out or there may be a network problem.').show();
		} else if (x.status == 404) {
		    $('.errmsg').html(errStyle + 'Requested URL "' + settings.url + '" not found.').show();
		} else if (x.status == 500) {
		    $('.errmsg').html(errStyle + 'Internel server error.').show();
		} else if (e == 'parsererror') {
		    $('.errmsg').html(errStyle + 'Error parsing JSON response.').show();
		} else if (e == 'timeout') {
		    $('.errmsg').html(errStyle + 'Request time out expired.').show();
		} else {
		    $('.errmsg').html(errStyle + x.status + ' : ' + exception ).show();
		}
	    } catch (err) {
		$('.loading').hide();
		var errtxt = 'There was an error while processing your request.\n';
		errtxt += 'Error description: ' + err.description + '\n';
		errtxt += 'Click OK to continue.\n';
		alert(errtxt);
	    }
	});
    $.when(
	$.getScript('/assets/js/jquery-11/plugins/jquery.bgiframe.js'),
	$.getScript('/assets/js/jquery-11/plugins/jquery.tablesorter.min.js'),
	$.getScript('/seqmodule/js/json.js'),
	$.getScript('/assets/js/jquery-11/plugins/jquery.paginate.min.js'),
	$.getScript('/assets/js/jquery-11/plugins/jquery.form.js'),
	$.getScript('/assets/js/jquery-11/plugins/jquery.bt.js'),
	$.getScript('/assets/js/jquery-11/plugins/jquery.ief.js')

	  ).done(function(){
		   $('#warningmessage').dialog({bgiframe: true,autoOpen: false,modal: false, height: 300, width: 700, dialogClass: 'warningTitleClass',
                                                position: {my: "center top", at: "center top", of: "#res"},
			close: function (event, ui) {
				$("#warningmessage").empty();
			}
		   });
		   $('#help').bt({positions: ['left', 'bottom'],ajaxPath: '/seqmodule/help.html div#summary',ajaxOpts:{dataType:'html'},trigger: 'click',
				  width: 500,centerPointX: .9,spikeLength: 20,spikeGirth: 10,padding: 15,cornerRadius: 25,fill: '#FFF',
				  strokeStyle: '#ABABAB',strokeWidth: 1});
		   // this is the upload form
		   if ($("#loadfrmSAsection").length > 0) {
		       $("#identifier-sect").hide();
		       $('#example').click(function() {
			   $('#identifier').val('D_1000000000');
		       });

		       $('#loadfrmSA').ajaxForm({url: loadStartSAURL,
						 beforeSubmit: function (formData, jqForm, options) {
						     lRSession();
						     formData.push({name:'sessionid',value:sessionID});
						     $('#sessionid1').val(sessionID);
						     $('#go').val('Loading...').prop('disabled', true);
						     $('#res').empty();
						     $('#saveselect, #savepartial, #closecompleted, #closeunfinished, #viewalign_grp, #viewalignframebutton, #viewalign_ordering, #rerun, #reset, #reload, #polymerlinkage, #downloadlink').hide();
						     $('.srchdiv').addClass('displaynone');
						     progressStart('');
						 }, success: function (jsonOBJ) {
                                                     if (jsonOBJ.statuscode == 'ok') {
							 resetOnLoad(jsonOBJ);
							 $('#sessionidF').val(sessionID);
							 $('#identifierF').val(jsonOBJ.identifier);
							 $('#instanceF').val("");
							 $('#sessionid2').val(sessionID);
							 $('#identifier2').val(jsonOBJ.identifier);
							 $('#instance2').val("");
							 $('#loadfrmSAsection').addClass('displaynone');
							 if ($("#loading_message").length > 0) {
							     $('#loading_message').addClass('displaynone');
							 }
                                                         progressEnd();
                                                     } else checkSummaryStatus(jsonOBJ, loadCheckSAURL);

						 }
						});
		   }  else if ($("#loadfrm").length > 0) {
		       $('#loadfrm').ajaxSubmit({url: loadStartURL,
						 beforeSubmit: function (formData, jqForm, options) {
						     activeGroupID = 1;
						     formData.push({'name': 'sessionid', 'value': sessionID});
						     $('#res').html('');
						     $('#saveselect, #savepartial, #closecompleted, #closeunfinished, #viewalignframebutton, #viewalign_ordering, #rerun, #reset, #reload, #polymerlinkage, #downloadlink').hide();
						     $('.srchdiv').addClass('displaynone');
						     progressStart('');
						 }, success: function (jsonOBJ) {
						     checkSummaryStatus(jsonOBJ, loadCheckURL);
						 }
						});
		   }
	       });

    $('#viewalign_ordering').change(function() {
	$('#viewalign_order').val($('#viewalign_ordering option:selected').val());
	$('#viewalign_orderF').val($('#viewalign_ordering option:selected').val());
    });

    $('#reset').click(function() {
        $('#viewalign_grp').hide();
        $('#viewalignframebutton').hide();
        $('#viewalign_ordering').hide();
        selectIds = '';
        alignIds = '';
        $('#res .aligneles:checked, #res .checkall:checked').each(function() {
            $(this).attr('checked', false);
        });
        $(this).hide();
    });

    $('#rerun').click(function() {
        $('#form_selection').empty();
        var all_entities = '';
        var individual_selection_text = '';
        var checked = '';
        if (entityIdList.length == 1) checked = 'checked';
        for (var i = 0; i < entityIdList.length; i++) {
             individual_selection_text += '<input type="checkbox" name="entity" value="' + entityIdList[i] + '" ' + checked + ' /> Entity '
                                        + entityIdList[i] + ' &nbsp; &nbsp; ';
             if (all_entities != '') all_entities += ',';
             all_entities += entityIdList[i];
        }
        var selection_text = 'Select entity: ';
        if (entityIdList.length > 1) {
             selection_text = 'Select entities: <input type="checkbox" name="entity" value="' + all_entities  + '" checked /> All entities &nbsp; &nbsp; ';
        }
        selection_text += individual_selection_text;
        $('#form_selection').html(selection_text).show();
        $('#rerun_form').show();
        // doReloadSummary('');
    });

    $('#submit_rerun_form').click(function() {
        var slected_entities = '';
        $('#rerun_form').find('input[name="entity"]').each(function() {
            if ($(this).is(':checked')) {
                if (slected_entities != '') slected_entities += ',';
                slected_entities += $(this).attr('value');
            }
        });

        if (slected_entities == '') {
            alert('No entity selected');
            return;
        }

        $.ajax({ url: rerunBlastURL, dataType: 'json', data: { 'identifier': entryIdentifier, 'sessionid' : sessionID, 'entityids' : slected_entities },
             beforeSend: function() {
                  $('#res').html('');
                  $('#saveselect, #savepartial, #closecompleted, #closeunfinished, #viewalignframebutton, #viewalign_ordering, #rerun, #reset, #reload, #polymerlinkage, #downloadlink').hide();
                  $('.srchdiv').addClass('displaynone');
                  $('#rerun_form').hide();
                  progressStart('');
             }, success: function (jsonOBJ) {
                  checkSummaryStatus(jsonOBJ, loadCheckURL);
             }
        });
    });

    $('#reload').click(function() {
	    doReloadSummary('');
    });

    $('#saveselect').click(function() {
        resetBtns();
	$('#loadfrm').ajaxSubmit({url: saveURL, clearForm: false, dataType: 'json',
				  beforeSubmit: function (formData, jqForm, options) {
				      formData.push({"name": "selectids", "value": selectIds}, {"name": "sessionid", "value": sessionID});
				      $('#saveselect').hide();
/*
				      if (groupIdList.length == 1) {
					  $('.errmsg').html(infoStyle + "Entity " + groupIdList.toString() + " has not been visited." ).show();
				      } else if ( groupIdList.length > 1) {
					  $('.errmsg').html(infoStyle + "Entities " + groupIdList.toString() + " have not been visited." ).show();
				      }
*/
			              progressStart('Saving ...');
				  },
				  success: function (jsonOBJ, statusText) {
				      progressEnd();
				      if (jsonOBJ.errorflag) {
					      // $('.errmsg').append('<br />' + infoStyle +  jsonOBJ.errortext).show();
					      $('.errmsg').html( infoStyle +  jsonOBJ.errortext).show();
					      $('#saveselect').show();
				      } else {
					      $('.errmsg').append('<br />' + infoStyle + 'Selection saved.').show();
					      $('#saveselect').hide();
					      $('#downloadlink').show();
                                              $('#closecompleted').attr("disabled", false);
				      }
			              if (jsonOBJ.warningflag) {
				     	      $('#warningmessage').html(jsonOBJ.warningtext).dialog("open");
			              }
			              if (('removepartialassignment' in jsonOBJ) &&  jsonOBJ.removepartialassignment) {
			                     $('#removepartial').hide();
			              }
				  }
				 });
    });

    $('#savepartial').click(function() {
         $('#loadfrm').ajaxSubmit({url: savePartialAssignmentURL, clearForm: false, dataType: 'json',
              beforeSubmit: function (formData, jqForm, options) {
                   formData.push({"name": "selectids", "value": selectIds}, {"name": "sessionid", "value": sessionID});
                   $('#savepartial').hide();
                   progressStart('Saving ...');
              },
              success: function (jsonOBJ, statusText) {
                   progressEnd();
                   if (jsonOBJ.errorflag) {
                        $('.errmsg').append('<br />' + infoStyle +  jsonOBJ.errortext).show();
                        $('#savepartial').show();
                   } else {
                        $('.errmsg').append('<br />' + infoStyle + 'In-progress sequence annotation saved.').show();
                        $('#savepartial, #removepartial').show();
                   }
                   if (jsonOBJ.warningflag) {
                        $('#warningmessage').html(jsonOBJ.warningtext).dialog("open");
                   }
              }
         });
    });

    $('#removepartial').click(function() {
         $('#loadfrm').ajaxSubmit({url: removePartialAssignmentURL, clearForm: false, dataType: 'json',
              beforeSubmit: function (formData, jqForm, options) {
                   formData.push({"name": "sessionid", "value": sessionID});
                   $('#removepartial').hide();
                   progressStart('Removing ...');
              },
              success: function (jsonOBJ, statusText) {
                   progressEnd();
                   $('.errmsg').append('<br />' + infoStyle + 'In-progress sequence annotation removed.').show();
                   $('#removepartial').hide();
              }
         });
    });

    $('#downloadlink').click(function(){
    	download(downloadUrl,
    		 [
    		     [{key:'sessionid',val:sessionID},{key:'type',val:'assignment'}]
    		     ,[{key:'sessionid',val:sessionID},{key:'type',val:'model'}]
    		 ]
    	);
    });

    $('#closecompleted').click(function() {
	confirmFinish(closeCompletedURL);
    });

    $('#closeunfinished').click(function() {
	confirmFinish(closeUnfinishedURL);
    });

    // We attach the #showmore to the mainContent as it will not be present
    // when page loaded initially
    $('#mainContent').on("click", ".showmore", function() {
	if ($(this).data('loaded')) {
	    $('#res ._current .refdiv .tablesorter_ref tbody').each(function() {
		var $trs=$(this).find('tr');
		$trs.each(function(){
		    if (!$(this).find('.saveeles').is(':checked') && !$(this).find('.aligneles').is(':checked')) {
			$(this).hide();
		    }
		});
	    }).trigger("update");
	    $(this).val($(this).data('orig-val')).removeData('loaded');
	} else {
	    $('#res ._current .refdiv .tablesorter_ref tbody').each(function() {
		$(this).find('tr').show();
	    }).trigger("update");
	    $(this).data('loaded',true).data('orig-val',$(this).val()).val('Hide un-checked reference sequences');
	}
    });
    $('#polymerlinkage').click(function(){
	$.ajax({url: polymerURL,async: true,data: {"sessionid": sessionID},
		success: function (jsonOBJ) {
		    try {
			$('#polymertable').html(jsonOBJ.htmlcontent).dialog("open");
			$('#polymerlinkage').attr("disabled", true);
		    } catch(err) {
			$('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) ).show();
		    }
		}
               });
    });

    $('#finish').click(function(){
	$.ajax({url: polymerURL, async: true, data: {"sessionid": sessionID},
		success: function (jsonOBJ) {
		    try {
			$('#polymertable').html("");
		    } catch(err) {
			$('.errmsg').html(errStyle + 'Error: ' + JSON.stringify(jsonOBJ) ).show();
		    }
		}
               });
    });

    // current alignment view option
    $('#viewalignframebutton').click(function() {
        resetBtns();
        $('#alignidsF').val(alignIds);
        $('#selectidsF').val(selectIds);
        $('#activegroupidF').val(activeGroupID);
	$('#viewalign_orderF').val($('#viewalign_ordering option:selected').val());

	$("#container").hide();
        $("#alignview-frame").removeClass("displaynone");
	$("#alignview-frame").height(1200);

        $('#alignform').submit();
	//JDW
	/*
	$('#alignform').ajaxSubmit({url: alignViewURL,
				    target: "alignview-frame",
				    beforeSubmit: function (formData, jqForm, options) {
					formData.push({'name': 'sessionid', 'value': sessionID});
					formData.push({'name': 'activegroupid', 'value': activeGroupID});
					formData.push({'name': 'alignids', 'value': alignIds});
					formData.push({'name': 'selectids', 'value': selectIds});
					formData.push({'name': 'viewalign_order', 'value': $('#viewalign_ordering option:selected').val()  });
				    }
				   });
	*/

    });

    // deprecated view option
    /*
    $('#viewalign').click(function() {
        resetBtns();
        $('#alignids').val(alignIds);
        $('#gofrm').submit();
    });
    */

    handleCLoseWindow();
});

