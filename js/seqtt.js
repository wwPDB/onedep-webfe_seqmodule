/**********************************************************************
File:		seqtt.js
Author:		rshah (rshah@rcsb.rutgers.edu)
Date:		04-May-2010
Version:	0.0.8

This file loads the tooltips on every single residue in the alignment.

11-Nov-2011 RPS: URL to jquery.bt.min.js updated to reflect consolidated deployment of all common tool front-end modules.
22-Dec-2011 RPS: More URL updates to reflect consolidated deployment of all common tool front-end modules.
25-May-2014 jdw: JQuery 11.1.1
            jdw: make this a GET request -
*********************************************************************/
var toolTipConfig = {fill: '#FFF', cornerRadius: 10, strokeWidth: 0, shadow: true, shadowOffsetX: 3,
	                 shadowOffsetY: 3, shadowBlur: 8, shadowColor: 'rgba(0,0,0,.9)', shadowOverlap: false,
	                 noShadowOpts: {strokeStyle: '#999', strokeWidth: 2}, positions: ['top','left']};
$.ajax({ type: 'GET', dataType: "script", async: false, url: "/assets/js/jquery-11/plugins/jquery.bt.min.js"});
$('.bt').each(function(i) {
	var idArr = $(this).attr('id').split("_");
	if (idArr[5]!='' && idArr[4]!='') {
	    if (idArr.length > 10 && idArr[10]!='') {
		    $(this).bt('Residue: '+idArr[4]+'<br />Position: '+idArr[5]+'<br />Heterogeneity: '+idArr[10], toolTipConfig);
	    } else {
		    $(this).bt('Residue: '+idArr[4]+'<br />Position: '+idArr[5],toolTipConfig);
        }
	}
    
});
