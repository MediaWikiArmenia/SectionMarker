/** ՀՍՀ Գործիքսներ, SAE Tools v 1.0.1 (161016)
 / Set of tools to simplify proofreading of SAE articles.
 / Written by User:Xelgen, Aleksey Chalabyan, licensed under GPL
 / Please report errors, and share you feature suggestions.
 / Script will work only on SAE pages, some modules may be useful on other Wikisource pages
 / And may become separate users scripts in future.
**/

var originalHyphenCount, originalSectionCount, originalNewLineCount;
var pagesInVolumes=[0,720,720,720,720,720,720,719,720,720,736,720,756,688];
var SAEfileNameBeginning='Էջ:Հայկական_Սովետական_Հանրագիտարան_(Soviet_Armenian_Encyclopedia)_';
var pageTitle = mw.config.get('wgPageName');
var pageNum = parseInt(pageTitle.substring(pageTitle.search("/") + 1));
var volumeNum = parseInt(pageTitle.substring(pageTitle.search(/pedia\)_/) + 7, pageTitle.search(".djvu")));
var autoHintPos=0;
var isSafeToSaveNoDups = false;

// We have to wait for WP QUality to load, otherwise we can't know in which status page is (Not Profread, Profread, etc..)
$( '#wpTextbox1' ).on( 'wikiEditor-toolbar-doneInitialSections', function () {
    	addSAEToolsButtons(); // Add buttons only after WikiEditor completed loading
		SAEInitialize();
	} );
	
importStylesheet( 'User:Xelgen/SAETools.css' );

//To-Do this noPageMessage pages will produce wrong edit URLs on first and last pages of volumes. 
//Taken chances I don't think it's really worth bothering though
var Messages = {
				'prev':{
					'type': 'Նախորդ',
					'firstOrLast': 'վերջին',
					'arrow':'↓',
					'modifier':-1,
					'noPageMessage':'Խորհուրդ է տրվում սրբագրել հերթականությամբ և նախ <a href="/w/index.php?title='
							+ SAEfileNameBeginning +  volumeNum + '.djvu/'+ (pageNum-1) + '&action=edit&redlink=1">'
							+'ստեղծել նախորդ էջը</a>:'},
				'next':{
					'type': 'Հաջորդ',
					'firstOrLast': 'առաջին',
					'arrow':'↑',
					'modifier':1,					
					'noPageMessage':'<a href="/w/index.php?title=' + SAEfileNameBeginning
						+ volumeNum + '.djvu/'+ (pageNum+1) + '&action=edit&redlink=1" target="_blank">Ստեղծել հաջորդ էջը</a>:'},
					'please-wait':"Խնդրում ենք սպասել",
					'thanks-for-contribs':'Շնորհակալությո՛ւն Ձեր ներդրումների համար։',
					'see-error-details':'Սխալների մանրամասներ',
					'error-details':'Գտնված սխալների մանրամասները և դրանք վերացնելու հուշումները կգտնեք'
										+' խմբագրման պատուհանից վերև։',
					'errors-found':'Հայտնաբերվել են սխալներ',
					'following-errors-found':'Հայտնաբերվել են հետևյալ սխալներ՝',
					'make-no-dups':'Անհրաժեշտ է փոփոխել բաժինների անունները այնպես, որ ամեն հոդված ունենա ' 
						+ 'միայն իրեն հատուկ բաժնի անուն։<br/>'
						+ '<span style="font-size:0.8em; line-height:1.1em">Եթե անունները նույն են, ներառեք'
						+ ' այլ տեղեկություններ, օրինակ ազգանունից բացի ներառեք անձի անունը «## Պողոսյան Պողոս ## ' 
						+ "'''ՊՈՂՈՍՅԱՆ'''" +' Պողոս, գրող…» կամ «## Մասիս (գյուղ) ##», «## Մասիս (թերթ) ##», և այլն։'
						+' Եթե հոդվածը շարունակվում է հաջորդ էջին, էջի ամենասկզբում նույնությամբ կրկնեք այդ ' 
						+ 'բաժնի անունը։ Համընկնումները վերացնելուց  հետո ստուգեք օգտվելով ձախից գտնվող' 
						+ ' «Վերստուգել» կոճակից։</span>'
				};
				

var SAEConf = {
				'wideTextTolerance':0.7,
				'teaserLength':90,
				'AJAXRequireNeighborPages':5,
				'sectsToShow':4,
				'textareaRowsforPrevNextpage':4
				};

				
function generateEditLink(volume,page,text,target) {
	if (typeof volume == 'undefined') {
		volume = volumeNum;
	}

	if (typeof page == 'undefined') {
		page = pageNum +1;
	}

	if (typeof text == 'undefined') {
		text = 'խմբագրել';
	}

	if (typeof target == 'undefined') {
		target = '_blank';
	}

	var html = '<a href="index.php?title=' + SAEfileNameBeginning + volume + '.djvu/' + page 
				+'&action=edit" target="' + target + '">' + text + '</a>';

	return html;
}
				
function PrevNextPagesHTML (prevOrNext)
{
	if (prevOrNext!=='prev' && prevOrNext!=='next'){
		return false;
	}
	// To-Do move CSS to separate CSS file, and import it on this script run
	htmlResult='<div id="pn-glob-wrapper">'
				+ '<div class="neighbor-pages-loader">'
				+ '<img height="16px" src="//upload.wikimedia.org/wikipedia/commons/7/78/24px-spinner-0645ad.gif"/>'
				+ ' Բեռնվում են ' + Messages[prevOrNext]['type'].toLowerCase() + ' էջերը</div>'
				+ '<span id="'+ prevOrNext + 'pageToggle" hidden="hidden">'
				/*+ 'Թաքցնել/ցուցադրել ' + Messages[prevOrNext]['type'].toLowerCase() + ' էջը և բաժինները</span>'*/
				+ Messages[prevOrNext]['type'] + ' էջը և բաժինները</span>'
				/*+ '<a href="#" onclick="reCheckForDups();return false" title="Թարմացնել տեղեկությունները">'
				+ '<img height="16px" src="//upload.wikimedia.org/wikipedia/commons/thumb/f/fc/View-refresh.svg/16px-View-refresh.svg.png"/></a>'*/				
				+ '<div class="' + prevOrNext + 'pages-collapsible pn-wrapper" hidden="hidden">'
				+ '<button id="btn-refresh-' + prevOrNext + '" aria-disabled="false" role="button" onclick="reCheckForDups();return false"'
				+ 'title="Թարմացնել տեղեկությունները"'
				+ 'class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only btn-refresh">'
				+ '<span class="ui-button-text-modified" style="padding: 2px;">'
				+ '<img height="16px" title="Թարմացնել տեղեկությունները" style="margin-top: -2px; margin-right: 2px;" '
				+ 'src="//upload.wikimedia.org/wikipedia/commons/thumb/f/fc/View-refresh.svg/16px-View-refresh.svg.png">'				
				+ 'Թարմացնել</span></button><div align="left" class="pn-index" id="' + prevOrNext + 'IndexErrors" hidden="hidden">' 
				+ Messages[prevOrNext]['type'] + ' ' + SAEConf['AJAXRequireNeighborPages'] 
				+ ' էջերում բաժինները նշված չեն։</div>'
				+ '<div align="left" class="pn-index" id="' + prevOrNext + 'IndexesWrapper" hidden="hidden">' 
				+ Messages[prevOrNext]['type'] + /*' '+ SAEConf['sectsToShow'] + */' բաժիններ`'
				+ '<div id="' + prevOrNext + 'Indexes" class="pn-indexes"></div></div>'
				+ '<div id="'+ prevOrNext + 'PageError" hidden="hidden">' + Messages[prevOrNext]['type'] 
				+ ' էջը դեռ ստեղծված չէ։ '+ Messages[prevOrNext]['noPageMessage'] + '</div>'
				+ '<div id="'+ prevOrNext + 'PageContent" class="pn-textarea-wrapper" hidden="hidden"><label>'
				+ Messages[prevOrNext]['type'] +' էջի ' + Messages[prevOrNext]['firstOrLast'] + ' տողեր՝ </label>'
				+ generateEditLink(volumeNum, (pageNum + Messages[prevOrNext]['modifier']), '[ խմբագրել ' 
				+ Messages[prevOrNext]['type'].toLowerCase() + ' էջը ]')
				+ '<br/> <textarea id="' + prevOrNext + 'PageTxt" readonly="readonly" rows="'
				+ SAEConf['textareaRowsforPrevNextpage'] + '">'
				+ '</textarea></div></div></div>';
	
	//To-Do this needs to be moved to corresponding sep place.
	if (prevOrNext==='prev') {
		htmlResult = '<div id="dupErrorsWrapper" hidden="hidden">'
				+'<div style="float:left; text-align:center;" id="dupErrorLeft">'
				+'<img height="72px" align="middle" src="//upload.wikimedia.org/wikipedia/commons/thumb/6/6c/RedondoExclama%C3%A7%C3%A3o.png/96px-RedondoExclama%C3%A7%C3%A3o.png" style="padding: 8px;"><br/>'
				+'<button id="btn-error-recheck" onclick="reCheckForDups();return false;"style="margin: 0em; padding:3px 7px" aria-disabled="false" role="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only">'
				+'<span class="ui-button-text&ndash;modified" style="font-size:1em">'
				+'<img height="16px" src="//upload.wikimedia.org/wikipedia/commons/thumb/f/fc/View-refresh.svg/16px-View-refresh.svg.png">'
				+' Վերստուգել</span></button></div>'
				+'<div id="dupErrors"></div></div>'
				+'<div id="sect-check-dialog-message" hidden="hidden" title="' + Messages['please-wait'] +'"></div>'
				+  htmlResult;
	}

	return htmlResult;
}

function PrevNextSectionsHTML(prevOrNext)
{
	if (prevOrNext=="next")	{
		direction = 1;
	}
	else {
		direction = -1;
	}

	sects = getSectionList(direction,SAEConf["sectsToShow"]);
	
	if (sects.length>0)
	{
		sectHTML = '<ul class="pn-indexlist">';
		for ( i=1;i<sects.length;i++ )
		{
			if (typeof sects[i] !== 'undefined' ) {
				sectHTML = sectHTML + '\n<li><span class="sect-with-teaser" title="' + sects[i]['teaser'].replace(/\n/g,'') + '"><strong>' + sects[i]['name'] + '</strong></span> (էջ '+sects[i]['page'] + ') <a href="#" onclick="insertTags(\'\\n## '+ sects[i]['name'] + ' ##\\n\',\'\',\'\');return false">' + Messages[prevOrNext]['arrow']+ ' (ավելացնել)</a></li>';
			}
		}
		sectHTML=sectHTML+"</ul>";
	}
	return sectHTML;
}

function SAEUpdateSummary()
{
	var textarea = document.getElementById("wpTextbox1")
	RemovedHyphenCount = originalHyphenCount-textarea.value.split("–\n").length;
	textarea.value = textarea.value.replace(/-տողադարձեր/, '-տողադարձեր (' + RemovedHyphenCount +')');
}

String.prototype.IsWideArmText = function(tolerance)
{
	text = this;
	if (typeof tolerance === 'undefined') {
		tolerance=1; //no tolerance if it's not set
	}

	numberofUs=0;
	numberofSpaces = text.trim().split(" ").length-1;
	if (text.search('ու')!==-1) {numberofUs = text.trim().match(/ու/g).length;} //number of ու digraphs
	numberofLetters = text.trim().length-numberofSpaces-numberofUs;
	//*tolerance <1 for some% tolerance, in case spaces are missing between some of the letters
	if (numberofSpaces>=(numberofLetters-1)*tolerance) {
		return true;
	}
	else {
		return false;
	}
}

function doOnloadCleanup() {
	if (parseInt($('input[name = wpQuality]:checked').val())<4) //checking if page is not Profread and not Confirmed
	{
		var text = document.getElementById("wpTextbox1").value;
		//Add one more line before article names to separate articles from each other
		text = text.replace(/(.)\n{1,2}(?:«)?([Ա-Ֆ]{5,})/g, "$1\n\n$2"); 
		//there are way to many different symbols used for dash, changing everything to n dash
		text = text.replace(/[¬֊—]/g, '–'); 
		//there are way to many different symbols used for dash, changing everything to n dash
		text = text.replace(/([Ա-և])[\-]/g, "$1–");
		//somehow there's often latin t instead of space in some volumes, changing it to t
		text = text.replace(/([^a-z\s\(«<])(t)([^a-z\s\)»>])/ig, "$1 $3");
		//more then 3 new lines in a row, is something to clean
		text = text.replace(/\n{4,}/g, "\n\n\n");
		//and more then one space too
		text = text.replace(/ {2,}/g, ' ');
		//space after new line
		text = text.replace(/\n /g, '\n');		
		//after degree sign Շ, Ծ, Օ or zero or latin O, or cyrilic О and С 
		text = text.replace(/°[ՇԾՕ0OОС] /g, '°C');
		
		document.getElementById("wpTextbox1").value = text;
	}
}

function SAEInitialize() {
	//Assigning values to globals used thorughout the script	
	originalHyphenCount = document.getElementById("wpTextbox1").value.split(/[¬֊-\—-–]\n/g).length-1; //Let's calculate HyphenCount on page open, and calculate it at save, showing number of removed hyphens in Edit summar
	originalSectionCount = (document.getElementById("wpTextbox1").value.split(/##/g).length-1)/2; //Same feautre for Sections
	originalNewLineCount = document.getElementById("wpTextbox1").value.split(/\n{1}/g).length-1; //And same for New Line count
	
	doOnloadCleanup();
	
	var sections = getSectionsAJAX(generatePageList(SAEConf['AJAXRequireNeighborPages'],SAEConf['AJAXRequireNeighborPages'],pageNum), 'onload');
	
	
	$("#wikiPreview").after(PrevNextPagesHTML ("prev"));
	$("div.editOptions").after(PrevNextPagesHTML ("next"));

	$(document).keyup(function(evt)
	{
		if (evt.altKey && !(evt.ctrlKey)) //Left Alt under Win, Alt & no Ctrl under Lin/OS X
		{
			evt.stopPropagation();

			switch(evt.keyCode)
			{
			case 50: //Alt + 2
			  removeHyphens();
			  break;
			case 51: //Alt + 3
			  removeNewLines();
			  break;
			case 52: //Alt + 4
			  fixArmPunctuation();
			  break;
			case 53: //Alt + 5
			  italizer();
			  break;
			case 65: //Alt + A
			  removeHyphens();
			  removeNewLines();
			  fixArmPunctuation();
			  italizer();
			  break;
			case 72: //Alt + H
			  SAEAuthor();
			  break;
			case 76: //Alt + L
			  widenText();
			  break;
			case 80: //Alt + P
			  $( "img[rel='addpageimage']" ).click();
			  break;աւտ
			}

			return false;
		}
	});
	
	//There is another resore_lst() function bound to Save, Preview, Diff button
	//Keeping that function in anon function, and recalling it if everythign is OK, seems like best dev/UX compromise
	var oldOnClick = $("#wpPreview").get(0).onclick;	
	document.getElementById("wpPreview").onclick = '';	
	$("#wpPreview").click(function( event ) {
		if ( isSafeToSaveNoDups === false ) 
		{			
			event.stopImmediatePropagation();
			event.preventDefault();
			
			initiatePreSaveAJAXCheck();		
			return false;
		}
		else {
			// Calling Wikibase.js function
			SAEUpdateSummary();
			oldOnClick.call(this, event); 
		}
	});
}

function makeNeighborPagePreivewCollapsible() {
	// Dirty copy-paste from https://gerrit.wikimedia.org/r/p/mediawiki/core.gitmaster, via
	// http://code.ohloh.net/file?fid = rsK7XgzS7iQ9kUerZlmYlN15Vpo&cid = gvCXqzMs6wg&s=&fp=306442&mp=&projSelected = true#L0
	// Good written and has everything we need. No bike inventions for script which will work 10-15K times, by 5 people.
	var collapsibleLists, i, handleOne;

	// Collapsible lists of categories and templates
	collapsibleLists = [
		{
			$list: $( '.prevpages-collapsible' ),
			$toggler: $( '#prevpageToggle' ),
			cookieName: 'prev-pages-preview'
		},
		{
			$list: $( '.nextpages-collapsible' ),
			$toggler: $( '#nextpageToggle' ),
			cookieName: 'next-pages-preview'
		}
	];

	handleOne = function ( $list, $toggler, cookieName ) {
		var isCollapsed = $.cookie( cookieName ) !== 'expanded';

		// Style the toggler with an arrow icon and add a tabIndex and a role for accessibility
		$toggler.addClass( 'mw-editfooter-toggler' ).prop( 'tabIndex', 0 ).attr( 'role', 'button' );
		$list.addClass( 'mw-editfooter-list' );

		$list.makeCollapsible( {
			$customTogglers: $toggler,
			linksPassthru: true,
			plainMode: true,
			collapsed: isCollapsed
		} );

		$toggler.addClass( isCollapsed ? 'mw-icon-arrow-collapsed' : 'mw-icon-arrow-expanded' );

		$list.on( 'beforeExpand.mw-collapsible', function () {
			$toggler.removeClass( 'mw-icon-arrow-collapsed' ).addClass( 'mw-icon-arrow-expanded' );
			$.cookie( cookieName, 'expanded' );
		} );

		$list.on( 'beforeCollapse.mw-collapsible', function () {
			$toggler.removeClass( 'mw-icon-arrow-expanded' ).addClass( 'mw-icon-arrow-collapsed' );
			$.cookie( cookieName, 'collapsed' );
		} );
	};

	for ( i = 0; i < collapsibleLists.length; i++ ) {
		// Pass to a function for iteration-local variables
		handleOne( collapsibleLists[i].$list, collapsibleLists[i].$toggler, collapsibleLists[i].cookieName );
	}

}

//We're adding button here
function addSAEToolsButtons () {
$( '#wpTextbox1' ).wikiEditor( 'addToToolbar', {
		'section': 'main',
		'groups': {
			'SAE': { 'label': 'ՀՍՀ' }
		}
} );

$( '#wpTextbox1' ).wikiEditor( 'addToToolbar', {
		'section': 'main',
		'group': 'SAE',
		'tools': {
			'Wide': {
				label: 'Լայն տեքստ (Alt+L)',
				type: 'button',
				icon: '//upload.wikimedia.org/wikipedia/commons/3/3b/Toolbaricon_regular_a_to_b.png',
				action: {
							type: 'callback',
								execute: function(context){
									widenText();
						}
				}
			}
		}
} );

$( '#wpTextbox1' ).wikiEditor( 'addToToolbar', {
	'section': 'main',
	'group': 'SAE',
	'tools': {
		'addauthortemplate': {
			label: 'ՀՍՀ հոդվածի հեղինակ (Alt+H)',
			type: 'button',
			icon: '//upload.wikimedia.org/wikipedia/commons/thumb/5/52/Crystal_Clear_kdm_user_female_vcentered.png/22px-Crystal_Clear_kdm_user_female_vcentered.png',
			action: {
						type: 'callback',
							execute: function(context){
								SAEAuthor();
					}
			}
		}
	}
} );

$( '#wpTextbox1' ).wikiEditor( 'addToToolbar', {
	'section': 'main',
	'group': 'SAE',
	'tools': {
		'addpageimage': {
			label: 'Ավելացնել տեսածրված էջը որպես պատկեր (Alt+P)',
			type: 'button',
			icon: '//upload.wikimedia.org/wikipedia/commons/5/54/Vector_toolbar_insert_image_button_grayscale.png',
			action: {
				type: 'encapsulate',
				options: {
					pre: "[[Պատկեր:" + mw.config.get("wgTitle").replace("/","|page=") + "|right|thumb|",
					post: "]]",
					ownline:true
				}
			}
		}
	}
} );

$( '#wpTextbox1' ).wikiEditor( 'addToToolbar', {
	'section': 'main',
	'group': 'SAE',
	'tools': {
			'AddSAEsection': {
					label: 'Բաժին ընտրված բառից (Alt + երկկտոց բառի վրա, կամ Alt + բառերի ընտրություն, եթե հավելյալ պահել Ctrl կոճակը բաժնի ամեն բառը կսկվի մեծատառով)', // or use labelMsg for a localized label, see above
					type: 'button',
					icon: '//upload.wikimedia.org/wikipedia/commons/thumb/0/02/Oxygen480-actions-irc-join-channel.svg/22px-Oxygen480-actions-irc-join-channel.svg.png',
					action: {
						type: 'callback',
							execute: function(context){
								addSAESection();
						}
					}
			}
	}
} );

$( '#wpTextbox1' ).wikiEditor( 'addToToolbar', {
	'section': 'main',
	'group': 'SAE',
	'tools': {
			'AddPrevSection': {
					label: 'Ավելացնել նախորդ էջի վերջին բաժինը',
					type: 'button',
					icon: '//upload.wikimedia.org/wikipedia/commons/thumb/5/57/WS-Previos-Section.svg/22px-WS-Previos-Section.svg.png',
					action: {
						type: 'callback',
							execute: function(context){
								insertTags("\n## " + sections['pagelist'][pageNum-1][sections['pagelist'][pageNum-1].length-1]['name']+ " ##\n","","");
						}
					}
			}
	}
} );

$("img[rel='AddPrevSection']").attr('hidden', true);

$( '#wpTextbox1' ).wikiEditor( 'addToToolbar', {
	'section': 'main',
	'group': 'SAE',
	'tools': {
			'AddNextSection': {
					label: 'Ավելացնել հաջորդ էջի առաջին բաժինը',
					type: 'button',
					icon: '//upload.wikimedia.org/wikipedia/commons/thumb/9/9b/WS-Next-Section.svg/22px-WS-Next-Section.svg.png',
					action: {
						type: 'callback',
							execute: function(context){
								insertTags("\n## " + sections['pagelist'][pageNum+1][0]['name']+ " ##\n","","");
						}
					}
			}
	}
} );

$("img[rel='AddNextSection']").attr('hidden', true);

$( '#wpTextbox1' ).wikiEditor( 'addToToolbar', {
	'section': 'main',
	'group': 'SAE',
	'tools': {
			'RmHyphnes': {
					label: 'Հեռացնել տողադարձերը (Alt+2)',
					type: 'button',
					icon: '//upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Crystal_Clear_action_edit_remove.png/22px-Crystal_Clear_action_edit_remove.png',
					action: {
						type: 'callback',
							execute: function(context){
								removeHyphens();
						}
					}
			}
	}
} );

$( '#wpTextbox1' ).wikiEditor( 'addToToolbar', {
	'section': 'main',
	'group': 'SAE',
	'tools': {
			'RmNewLines': {
					label: 'Հեռացնել նոր տողերը և ավելորդ բացատները (Alt+3)',
					type: 'button',
					icon: '//upload.wikimedia.org/wikipedia/commons/a/a8/Toolbaricon_definition_list.png',
					action: {
						type: 'callback',
							execute: function(context){
								removeNewLines();
						}
					}
			}
	}
} );

$( '#wpTextbox1' ).wikiEditor( 'addToToolbar', {
	'section': 'main',
	'group': 'SAE',
	'tools': {
			'RmHyphnes': {
					label: 'Լատիներեն կետադրական նշանները փոխել հայերեն նշաններով (Alt+4)',
					type: 'button',
					icon: '//upload.wikimedia.org/wikipedia/commons/b/b9/Toolbaricon_ellipsis.png',
					action: {
						type: 'callback',
							execute: function(context){
								fixArmPunctuation();
						}
					}
			}
	}
} );

$( '#wpTextbox1' ).wikiEditor( 'addToToolbar', {
	'section': 'main',
	'group': 'SAE',
	'tools': {
			'italizer': {
					label: 'Չափման միավորները և Գրկ․ շեղատառ (Alt+5)',
					type: 'button',
					icon: '//upload.wikimedia.org/wikipedia/commons/a/a0/Toolbaricon_italic_կմ.png',
					action: {
						type: 'callback',
							execute: function(context){
								italizer();
						}
					}
			}
	}
} );


$(".group.group-insert").css("border-right","1px solid #DDDDDD"); //spent an hour to show this separator line, after insert group

}

jQuery( function () {
$('#wpTextbox1')
	.mouseup(function(e) {
		var textarea = document.getElementById( "wpTextbox1" );
		var start = textarea.selectionStart;
		var end = textarea.selectionEnd;
		var sel = textarea.value.substring(start, end);

		//We don't check for Edit action, as event is binded to Edit textarea.
		//This will currently work only for properly titled SAE pages,
		//you can take out second condition, or add ORs if needed for other books in future
		if (start!==end && e.altKey && mw.config.get( 'wgPageName' ).substr(0,66) === SAEfileNameBeginning)
		{
			//if it's only newlines then exit without asking, nothing to do
			if (sel.length<=2 || sel.search(/[^\n]/)==-1) {
				return false;
			}
			//trick goes here: if it's wide text or all lowcase, then let's put template լայն 
			//and exit instead of adding section
			//default tolerance 0.7 for 30% tolerance, in case spaces miss between some of the letters (~30% of letters)
			if (sel.length>3 && (sel.IsWideArmText(SAEConf['wideTextTolerance']) || sel.search(/[Ա-Ֆ]/)==-1)) {
				widenText();
				return false;
			}

			addSAESection(e.ctrlKey);
		}
    });
});

function searchInWpTextBox( text ) {
	//Without this fancy animation it may be unclear to user what's happening
	$('html, body').animate({
        scrollTop: $("div.wikiEditor-ui").offset().top
    }, 500, function() {
		$( "a[rel='replace']" ).click();
		$( "input#wikieditor-toolbar-replace-search").val(text);
		$( "input#wikieditor-toolbar-replace-replace").val(''); //This may be overkill but who knows
		$( "div.ui-dialog-buttonset button:first-child").click();
		$( "div.wikiEditor-toolbar-dialog" ).animate({left: "+=100"},100);	
		}
	);
}

function getSectionsAJAX(pageNames, usage)
{
	pageList = Array();
	sections = Array();
	sections['indexlist'] = Array();
	sections['pagelist'] = Array();
	pages=Array();
	uniqueSects = {};
	sectNextPageStarts = 0;
	
	if ( usage === 'onsave') {		
		$( ".last-check-loader" ).toggle();
	}
	else {
		$( ".neighbor-pages-loader" ).toggle();
	}
	
	$.getJSON("/w/api.php?action=query&format=json&callback=?",
			{titles:pageNames, prop: "revisions", rvprop:"content"}, function(data)
	{

			var prevPagesContent='';
			var sectCount=0;
			var totalSectCount=0;
			var sectcontinuesTill = false;
			var sectNextPageStartFound = false;

			$.each(data.query.pages, function (revid, values) {
				curPageNum = values.title.substring(values.title.search('/')+1);

				if (typeof values.revisions !== "undefined" && values.revisions.missing!=="") {
					pageContent = values.revisions[0]['*'];
					//Getting prev and next pages
					if ( Math.abs(curPageNum-pageNum) == 1)	{
						pages[curPageNum] = ({'content':pageContent});
					}
				}
				else {
					pageContent = ''; //We want to have all the page num objects, so if there's no page we use empty string
				}
				pageList[curPageNum] = pageContent;
			})

			pageList.sort;

			$.each(pageList, function (curPageNum, content) {
				pageContentLeftover = content;
				if (typeof content !== 'undefined') {
					sections['pagelist'][curPageNum] = [];
					
					gonnaBeFirstSectOnPage = true;

					for (i = totalSectCount;pageContentLeftover.search('<section begin="')!==-1;i++) {
						teaserLength = SAEConf['teaserLength'];
						
						//To-Do: Tired, Bruteforce coding here. Needs refactoring
						sectFirstOnPage = false; //and if it's last, we'll set it after this cycle						
						if (gonnaBeFirstSectOnPage === true ) {							
							gonnaBeFirstSectOnPage = false;
							sectFirstOnPage = true;
						}						

						sectBeginStart = pageContentLeftover.search('<section begin="');
						pageContentLeftover = pageContentLeftover.substring(sectBeginStart+16);

						sectBeginEnd = pageContentLeftover.search('"/>');
						sectName = pageContentLeftover.substring(0,sectBeginEnd);
						pageContentLeftover = pageContentLeftover.substring(sectBeginEnd);
						sectEndStart = pageContentLeftover.search('<section end=');

						if (sectEndStart<teaserLength) {
							teaserLength = sectEndStart;
						}
						
						if ( pageContentLeftover.substring(3,12)=='[[Պատկեր:' ) {
							imgEnd = pageContentLeftover.search("]]") +2 ;							
							sectTeaser = pageContentLeftover.substring(imgEnd, imgEnd + teaserLength) + '…';;
						}
						else {
							sectTeaser = pageContentLeftover.substring( 3, teaserLength+3 ) + '…';
						}						

						if (sectNextPageStartFound === false && curPageNum>pageNum
									&&	typeof sections['indexlist'][i-1] !=='undefined'
									&& sections['indexlist'][i-1]['page']<pageNum) 
						{
							sectNextPageStarts = i;
							sectNextPageStartFound = true;
						}

						sections['indexlist'][i] = {'page':curPageNum, 
													'name':sectName,
													'startsOn':curPageNum,
													'continuesTill':false,													
													'isFirstOnPage':sectFirstOnPage,
													'isLastOnPage':false,
													'teaser':sectTeaser};
						sections['pagelist'][curPageNum][sections['pagelist'][curPageNum].length] = 
													{'name':sectName, 
													'teaser':sectTeaser};
													
						if ( i>0 && sections['indexlist'][i-1]['name'] == sectName
								&& curPageNum-sections['indexlist'][i-1]['page'] == 1 )
						{
							sections['indexlist'][i]['startsOn'] = sections['indexlist'][i-1]['startsOn'];
							k = i;
							lastPage = curPageNum;
							while ( k >= 0 && sections['indexlist'][k]['name']==sectName ) 
							{								
								sections['indexlist'][k]['continuesTill'] = curPageNum;
								lastPage = sections['indexlist'][k]['page'];
								k = k - 1;
							}							
						}					
					
					}
					
					if (i > 0) {
						sections['indexlist'][i-1]['isLastOnPage'] = true;					
					}
					
					totalSectCount = i;
					prevPagesContent = prevPagesContent + content; //Do we need this?
				}
			});

			if ( sectNextPageStarts === 0 
					&& (typeof sections['indexlist'][(sections['indexlist'].length)-1] !== 'undefined' && sections['indexlist'][(sections['indexlist'].length)-1]['page'] < pageNum ))
			{
				sectNextPageStarts = sections['indexlist'].length;
			}

			if ( usage === 'onsave') {
				$( ".last-check-loader" ).toggle()
				processPreSaveAJAXCheck();				
			}
			else {
				$( ".neighbor-pages-loader" ).toggle();
				
			}
			updateUIAfterSectionLoad(); //We want to update prev/next page preview and errors in any case
	});

	return sections;
}

function updateUIAfterSectionLoad()
{
	//Check for current errors and show error message if there are issues
	var curDups = checkForDupsAndReturnErrorHTML();
	if ( curDups !== false ) {
		curDups = '<h4>' + Messages['following-errors-found'] + '</h4>' + curDups + 
					'<p>'+ Messages['make-no-dups'] + '</p>';
		$( "#dupErrors" ).html(curDups);
		$( "#dupErrorsWrapper" ).attr('hidden', false);
	}
	else {
		if ( typeof $( "#dupErrorsWrapper" ).attr( 'hidden' ) == 'undefined' ) {
			mw.notify( 'Բաժինների անունների հետ կապված սխալները վերացված են։' );			
		}
		$( "#dupErrorsWrapper" ).attr('hidden', true);		
	}
	
	//Check for next and previos pages presense (page content not section presense in pages)
	if (pages[pageNum-1] !== undefined)	{
		$( "#prevPageContent" ).attr('hidden', false);
		$( "#prevPageTxt" ).text(pages[pageNum-1]['content']);

		//only if there is a section in previos page it's safe to add button
		if (sections['pagelist'][pageNum-1].length>0) {
			$( "img[rel='AddPrevSection']" ).attr('hidden', false);
			$( "img[rel='AddPrevSection']" ).attr('title', $("img[rel='AddPrevSection']").attr('title') + "` «" + sections['pagelist'][pageNum-1][sections['pagelist'][pageNum-1].length-1]['name'] + '»');
		}
	}
	else {
		$( "#prevPageError" ).attr('hidden', false);
	}

	if ( pages[pageNum+1] !== undefined )	{
		$( "#nextPageContent" ).attr('hidden', false);
		$( "#nextPageTxt" ).text(pages[pageNum+1]['content']);

		if (sections['pagelist'][pageNum+1].length>0) {
			$( "img[rel='AddNextSection']" ).attr('hidden', false);
			$( "img[rel='AddNextSection']" ).attr('title', $("img[rel='AddNextSection']").attr('title') + "` «" + sections['pagelist'][pageNum+1][0]['name'] + '»');
		}
	}
	else {
		$( "#nextPageError" ).attr('hidden', false);
	}

	//Checking for previous section presence, special case is when ther is prev page and ther is at least one section there
	if (getSectionList(-1, SAEConf["sectsToShow"]).length!==0) {
		$( "#prevIndexes" ).html(PrevNextSectionsHTML("prev"));
		$( "#prevIndexesWrapper" ).attr('hidden', false);
	}
	else {
		$( "#prevIndexesWrapper" ).attr('hidden', true);
		$( "#prevIndexErrors" ).attr('hidden', false);
	}

	if (getSectionList( 1, SAEConf["sectsToShow"]).length !== 0 ) {
		$( "#nextIndexes" ).html(PrevNextSectionsHTML("next"));
		$( "#nextIndexesWrapper" ).attr('hidden', false);
	}
	else {
		$( "#nextIndexesWrapper" ).attr('hidden', true);
		$( "#nextIndexErrors" ).attr('hidden', false);
	}

	$(".prevpages-collapsible, .nextpages-collapsible, #prevpageToggle, #nextpageToggle ").attr('hidden', false);
	makeNeighborPagePreivewCollapsible();
	$(".btn-refresh").css( "display", "inline-block");
	$("#prevPageTxt").animate({scrollTop:$("#prevPageTxt")[0].scrollHeight - $("#prevPageTxt").height()},800);
}

function generatePageList(rangeBefore, rangeAfter, currentPage)
{
	if (typeof rangeBefore == "undefined" || typeof rangeBefore !== "number") {
		return false;
	}

	if (typeof rangeAfter == "undefined" || typeof rangeAfter !== "number") {
		rangeAfter = rangeBefore;
	}

	if (typeof currentPage == "undefined" || typeof currentPage !== "number") {
		currentPage = pageNum;
	}

	prePage = currentPage - rangeBefore;
	if (prePage<1) {
		prePage = pageNum;
	}

	postPage = currentPage+rangeAfter;
	if ( postPage>pagesInVolumes[volumeNum] ) {
		postPage = pagesInVolumes[volumeNum]-pageNum;
	}

	pageNames='';
	sep='';

	for (i = prePage;i<=postPage;i++) {
		if ( i !== pageNum ) {
			pageNames = pageNames + sep + SAEfileNameBeginning + volumeNum + '.djvu/' + i;
			sep="|";
		}
	}
	return pageNames;
}

function getSectionList( direction, limit ) {
	var j;

	if ( direction === -1 ) {
		startfrom = sectNextPageStarts + (limit * direction);
	}
	else if ( direction === 1 ) {
		startfrom = sectNextPageStarts;
	}
	else {
		return false;
	}
	sectList=Array();
	j = 1;

	for ( i = startfrom; j<=limit; i++) {
		if (sections['indexlist'][i]!==undefined) {
			sectList[j]=sections['indexlist'][i];
		}
		j++;
	}	
	return sectList;
}

function checkForDupsAndReturnErrorHTML() {
	var localSectDups = checkForDuplicateSectNamesInPage();
	var neighborSectDups = checkForDuplicateSectNamesInNeighbors();
	var sectPageRange;
	if (localSectDups !== false || neighborSectDups !== false) {				
		var errorHTML='<ol>';
		
		if ( localSectDups !== false ) {		
			$.each(localSectDups, function( index, value ) {
				errorHTML = errorHTML + '<li>«' + index 
				+ '» անվամբ բաժին այս էջում հանդիպում է ' + (value +1) + ' անգամ '
				+ '<span id="error-fix-links"><a href="#" onclick="searchInWpTextBox(\''+ index +'\');return false">(որոնել) </a></span>'
				+ '</li>'; //we store numbers of dups, not total numbers so we +1
			});			
		}		
		if ( neighborSectDups !== false ) {
			for (i = 0; i<neighborSectDups.length; i++ ) {
				sectPageRange = '';
				if ( neighborSectDups[i]['startsOn'] !== false && neighborSectDups[i]['continuesTill'] !== false ) {
					sectPageRange = ' (' + neighborSectDups[i]['startsOn'] + '-ից մինչ ' + neighborSectDups[i]['continuesTill'] + ') ';
				}
				errorHTML = errorHTML + '<li><span class="sect-with-teaser" title="'+ neighborSectDups[i]['teaser'] + '">«' + neighborSectDups[i]['name'] + 
					'»</span> անվամբ բաժին արդեն առկա է ' + neighborSectDups[i]['page'] + '–րդ էջում<span id="error-fix-links">'
					+ sectPageRange
					+ ' (<a href="#" onclick="searchInWpTextBox(\''+ neighborSectDups[i]['name'] +'\');return false">որոնել այստեղ</a> | '
					+ generateEditLink(volumeNum,neighborSectDups[i]['page'] , 'խմբագրել ' + neighborSectDups[i]['page'] 
					+ '–րդ էջը') + ')</span>։</li>';			
			}
		}
		errorHTML = errorHTML + '</ol>';
		
		return errorHTML;
	}
	else {
		//No dups found
		return false;
	}
}

function reCheckForDups() {
	$( ".neighbor-pages-loader" ).attr('hidden', false);
	var pgNo = SAEConf['AJAXRequireNeighborPages']; //Just for sake of readibility
	sections = getSectionsAJAX(generatePageList(pgNo,pgNo,pageNum), 'recheck');
}

function initiatePreSaveAJAXCheck() {
	$( "#sect-check-dialog-message" ).dialog({
			modal: true,
			dialogClass: "no-close",
			draggable: true,
			resizable: false,
			width:'600px',			
			closeOnEscape: false,			
			}
		);
	$( "#sect-check-dialog-message" ).dialog('option', 'title', Messages['please-wait']);
	$( "#sect-check-dialog-message" ).html('<p><span class="last-check-loader" hidden="hidden" >'
							+ '<img height="16px" src="//upload.wikimedia.org/wikipedia/commons/2/2a/Loading_Key.gif"/> Ստուգվում է կրկնօրինակ բաժնի անունների առկայությունը։<span/></p>'
							+'<p>Հաղորդագությունը կփակվի և էջը կպահպանվի, եթե ոչ մի խնդիր չհայտնաբերվեց։</p>'
							+'<p>' + Messages['thanks-for-contribs'] + '</p>'); 
	sections = getSectionsAJAX(generatePageList(SAEConf['AJAXRequireNeighborPages'],SAEConf['AJAXRequireNeighborPages'],pageNum), 'onsave');	
}

function processPreSaveAJAXCheck() {

	var curDups = checkForDupsAndReturnErrorHTML();	
	if ( curDups === false ) {

		$( "#sect-check-dialog-message" ).dialog( "close");		
		//Continue saving pages
		isSafeToSaveNoDups = true;
		$("#wpPreview").click();
	}
	else {
	
		$( "#sect-check-dialog-message" ).dialog({ title: Messages['errors-found'] }) ;		
		$( "#sect-check-dialog-message" ).html( '<p><strong>' + Messages['following-errors-found'] 
													+ '</strong></p>' + curDups + '<p>' 
													+ Messages['error-details'] + '</p>') ;		
		$( "#sect-check-dialog-message" ).dialog( "option", 
					{ buttons: [ { text: Messages['see-error-details'], 
									click: function() { $( this ).dialog( "close" ); } 
									} ] } );	
		$( "#sect-check-dialog-message" ).dialog("option", 
											{close: function( event, ui ) {			
													$('html, body').animate({
														scrollTop: $("#dupErrorsWrapper").offset().top}, 500);			
													}});													
	}
	return false;
}

function checkForDuplicateSectNamesInPage() {
	var text = document.getElementById("wpTextbox1").value;
	currentPageSections = text.match(/(?:##)(.{1,})(?:##)/g);
	
	if (currentPageSections === null) {
		return false;
	}
	var dups = {};
	currentPageSectionsUCase = [];
	currentPageSectionsLCase = [];
	currentPageSectionsUCaseArm = [];
	currentPageSectionsLCaseArm = [];
	dupsFound = false;
	//To-Do this is SO not DRY, we better rewrite dup check logic
	for (i = 0; i<currentPageSections.length;i++) {
		currentPageSections[i] = currentPageSections[i].substring(2,currentPageSections[i].length-2).trim();
		currentPageSectionsUCase[i] = currentPageSections[i].toUpperCase();
		currentPageSectionsLCase[i] = currentPageSections[i].toLowerCase();
		currentPageSectionsUCaseArm[i] = toUpperCaseArm( currentPageSections[i] );
		currentPageSectionsLCaseArm[i] = toLowerCaseArm( currentPageSections[i] );
	}
	
	for (i = 0; i<currentPageSections.length;i++) {
		
		indexOnPage = currentPageSections.indexOf( currentPageSections[i] );
		indexOnPageUCase = currentPageSectionsUCase.indexOf( currentPageSectionsUCase[i] );
		indexOnPageLCase = currentPageSectionsLCase.indexOf( currentPageSectionsLCase[i] );
		indexOnPageUCaseArm = currentPageSectionsUCaseArm.indexOf( currentPageSectionsUCaseArm[i] );
		indexOnPageLCaseArm = currentPageSectionsLCaseArm.indexOf( currentPageSectionsLCaseArm[i] );
	
		if ( indexOnPage != i 
				|| indexOnPageUCase != i
				|| indexOnPageLCase != i
				|| indexOnPageUCaseArm != i
				|| indexOnPageLCaseArm != i ) {
			
			if ( typeof dups[currentPageSections[i]] == 'undefined') {
				dups[currentPageSections[i]] = 1;
			}
			else {
				dups[currentPageSections[i]] += 1;
			}
			dupsFound=true;
		}
	}
	
	if ( !dupsFound ) {
		return false;
	}
	else
	{
		return dups;
	}	
}


function checkForDuplicateSectNamesInNeighbors( currentSectName ) {

	var duplicateList=[];

	var text = document.getElementById("wpTextbox1").value;
	currentPageSections = text.match(/(?:##)(.{1,})(?:##)/g);
	var currentPageSectionsUCase = [];
	var currentPageSectionsLCase = [];
	var currentPageSectionsUCaseArm = [];
	var currentPageSectionsLCaseArm = [];

	if (currentPageSections !== null){
		currentPageSectionCount = currentPageSections.length;
		for ( i=0; i<currentPageSectionCount; i++ ) {
			currentPageSections[i] = currentPageSections[i].substring(2,currentPageSections[i].length-2).trim();
			currentPageSectionsUCase[i] = currentPageSections[i].toUpperCase();
			currentPageSectionsLCase[i] = currentPageSections[i].toLowerCase();
			currentPageSectionsUCaseArm[i] = toUpperCaseArm(currentPageSections[i]);
			currentPageSectionsLCaseArm[i] = toLowerCaseArm(currentPageSections[i]);
		}
	}
	else
	{
		return false;
	}

	var j = 0;	
	var sIndxLst = sections['indexlist'];
	for ( i=0; i<sections['indexlist'].length; i++ ) {
		indexOnPage = currentPageSections.indexOf( sections['indexlist'][i]['name'] );
		indexOnPageUCase = currentPageSectionsUCase.indexOf( sections['indexlist'][i]['name'].toUpperCase() );
		indexOnPageLCase = currentPageSectionsLCase.indexOf( sections['indexlist'][i]['name'].toLowerCase() );
		indexOnPageUCaseArm = currentPageSectionsUCaseArm.indexOf( toUpperCaseArm( sections['indexlist'][i]['name'] ));
		indexOnPageLCaseArm = currentPageSectionsLCaseArm.indexOf( toLowerCaseArm( sections['indexlist'][i]['name'] ));

		//There is such section name in prev/next page and it isn't last section of prev page or first section of next page
		if (indexOnPage !== -1 || indexOnPageLCase !== -1 || indexOnPageUCase !== -1 
				|| indexOnPageLCaseArm !==-1 || indexOnPageUCaseArm !== -1 ){

			/** We have actual duplicate if: this is NOT (first section on current page and (dup element is last on it's page and that page is prev page OR it continuesTill prev page)
			 /  And not (last section on current page and (dup element is first on it's page and page is next one OR it startsOn next page(s))
			**/			
		
			
			if (!(indexOnPage==0 && ((sIndxLst[i]['isLastOnPage'] === true && pageNum - sIndxLst[i]['page'] == 1)|| sIndxLst[i]['continuesTill'] === pageNum - 1))
				&&
				!(indexOnPage + 1 == currentPageSections.length && (( sIndxLst[i]['isFirstOnPage'] == true && sIndxLst[i]['page'] - pageNum == 1 )|| sIndxLst[i]['startsOn'] == pageNum + 1))) 
			{			
				if (typeof currentSectName==='undefined'){					
					//Cloning object with JQuery
					duplicateList[j]=jQuery.extend(true, {}, sections['indexlist'][i]);
					j++;
				}
				else if (currentSectName==sections['indexlist'][i]['name'] || currentSectName.toUpperCase()==sections['indexlist'][i]['name'] || currentSectName.toLowerCase()==sections['indexlist'][i]['name'])
				{
					//Cloning object with JQuery
					duplicateList[j]=jQuery.extend(true, {}, sections['indexlist'][i]);
					j++;
				}
			}

		}
	}

	if (typeof duplicateList[0] !=='undefined'){
		return duplicateList;
	}
	else {
		return false;
	}
}


var removeHyphens = function()  {

	// [Ա-և] բոլոր հայերեն տառերը
	// [Ա-ԷԹ-Ֆա-էթ-և] բոոլոր տառեը բացի ը և Ը
	// [ա-էթ-և] բոլոր փոքրատառը բացի ը-ից

	var text = document.getElementById("wpTextbox1").value;
	var origHyphenCount = text.split("–\n").length;

	//removing new lines between numbers, leaving dash intact
	text = text.replace(/([0-9])[-–]\n([0-9])/g, "$1–$2");
	//Regexp for not touching hidden Y is too complex to mantain,
	//so instead of making it skip e-/nv we're making a dirty trick here
	text = text.replace(/ե–\nվ/g, "եTMP\nվ");

	//Remove (we're very careful taking max 6 letter long words, not to brake dashed phrases)
	text = text.replace(/([\s«\(])(([Ա-և](?!ը)){2,6})[-–]\n([ա-էթ-և]{1,5}[ա-և]|ը$)([\s,:։․՝»\)])/g, "$1$2$4$5");
    //Remove (if part after hyphen is max 3 letters, then it can't be compound issues with Ev unsolved &
	//we're very careful taking max 6 letter long words, not to brake dashed phrases)
	text = text.replace(/([\s«\(])(([Ա-և](?!ը)){2,})[-–]\n([ա-էթ-և]{1,2}[ա-և]|ը$)([\s,:։․՝»\)])/g, "$1$2$4$5");
    text = text.replace(/([\s«\(])([Ա-և][ա-էթ-և]|[Ա-և]{1}ու|ու[ա-թի–և]{1})[–-]\n([ա-էթ-և]{1,}[ա-և])([\s,:։՝»\)])/g, "$1$2$3$4"); //if first part has just 2 letters, it's not a dashed word, ու is basically one letter, so 2 special caes for that, and we're taking out ուժ as it can be compound word

	text = text.replace(/([Ա-ԷԹ-Ֆա-էթ-և]{3,})[–]\n([ա-և]{0,3}թյուն(?:ը|ն|ներ|ների|ներից|ները|ներն|ներում)?|[ա-և]{0,3}թյամբ|[ա-և]{0,3}թյան(?:ը|ն|ներ|ների|ները|ներն|ներում)?|[ա-և]{0,2}յինը?|[ա-և]ում|յան|[ա-և]{0,2}կանը?|ներ[ա-և]{0,2})([\s,:։․՝»])/g, "$1$2$3"); //after being so careful, not to brake dashes where they should be, we need to take most common suffixes, and try to do some more work

	//We're removing what we've done in dirty e-/nv trick here. Sorry for this.
	text = text.replace(/եTMP\nվ/g, "ե–\nվ");

	document.getElementById("wpTextbox1").value = text;
	removedHyphenCount = origHyphenCount-text.split("–\n").length;
	if (removedHyphenCount>0)
	{
		insertSummary('-տողադարձեր ');
	}
	mw.notify('Հեռացվեց ' + removedHyphenCount + ' տողադարձ ' + origHyphenCount + '-ից');
};




/* Check if view is in edit mode and that the required modules are available. Then, customize the toolbar */
/* Commented out, as currently check is done in users' common.js. May need to reenable this initalization call, in Gadgets.
if ( $.inArray( mw.config.get( 'wgAction' ), ['edit', 'submit'] ) !== -1 && mw.config.get( 'wgPageName' ).substr(0,66) == SAEfileNameBeginning) {
        mw.loader.using( 'user.options', function () {
                if ( mw.user.options.get('usebetatoolbar') ) {
                        mw.loader.using( 'ext.wikiEditor.toolbar', function () {
                                $(window).load( SAEInitialize );
                        } );
                }
        } );
}
*/
var fixArmPunctuation = function() {
	var text = document.getElementById("wpTextbox1").value;

	// Verjaket issue. Only after Arm letters, and outside of [] brackets
	text = text.replace(/([Ա-և]([»\)])?):(?!([^\[]+)?])/g, "$1։");
	// Verjaket issue. Only before Arm letters (with optional space or NL) and outside of [] brackets
	text = text.replace(/:([\s\n])(([«])?[Ա-և])(?!([^\[]+)?])/g, "։$1$2");

	// Mijaket issue. Only after Arm letters, and outside of [] brackets
	text = text.replace(/([Ա-և]([»\)])?)\.(?!([^\[]+)?])/g, "$1․");
	// Verjaket issue. Only before Arm letters (with optional space or NL) and outside of [] brackets
	text = text.replace(/\.([\s\n])(([«])?[Ա-և])(?!([^\[]+)?])/g, "․$1$2");

	document.getElementById("wpTextbox1").value = text;
	insertSummary('+հայ․ կետ․ ');

	mw.notify('Կետ․ նշանները փոխարինվեցին ճիշտ նշաններով։');
}

var removeNewLines = function () {
	var text = document.getElementById("wpTextbox1").value;
	origNewLineCount = text.split("\n").length;
	text = text.replace(/[ ]{2,}/g, ' ');
	text = text.replace(/([ա-և»\),՝])\n([\(«ա-և0-9])/g, "$1 $2"); //remove new lines

	document.getElementById("wpTextbox1").value = text;
	removedNewLineCount = origNewLineCount-text.split("\n").length;
	mw.notify("Հեռացվեց " + removedNewLineCount + " նոր տող " + origNewLineCount + "-ից");
	if (removedNewLineCount>0) {
		insertSummary('-նոր տողեր ');
	}
}

function italizer() {
	var text = document.getElementById("wpTextbox1").value;
	text = text.replace(/([0-9])(\s)(մմ|սմ|մ|կմ)(2|\s2)/g, "$1$2''$3''<sup>2</sup>"); //square meters, etc..
	text = text.replace(/([0-9])(\s)(մմ|սմ|մ|կմ)(3|\s3)/g, "$1$2''$3''<sup>3</sup>"); //cubic meters, etc..
	text = text.replace(/([0-9])(\s)(մմ|սմ|մ|կմ|մմ\/վ|սմ\/վ|մ\/վ|կմ\/վ|մմ\/ժ|սմ\/ժ|մ\/ժ|կմ\/ժ|կգ|գ|Վտ|կՎտ|մՎտ|Հց|կՀց|ՄՀց|Գհց|կգ\/մ)([\s։:,\)–])/g, "$1$2''$3''$4"); //make SI units italic
	text = text.replace(/(\n){1,}(Գրկ[.․]|Երկ[.․])/g, "\n\n''$2''"); //Literature list with a new line

	document.getElementById("wpTextbox1").value = text;

	insertSummary('+ձևավորում ');
}

function SAEAuthor()
{
	var textarea = document.getElementById("wpTextbox1");
	var start = textarea.selectionStart;
	var end = textarea.selectionEnd;
	var sel = textarea.value.substring(start, end);

	if (sel.search("''")!==-1) {
		oldSel = sel;
		sel = sel.replace(/\'\'/g,"");
		lenDiff = end-start-sel.length;
		newText = textarea.value.substring(0,start) + sel + textarea.value.substring(end);
		end = end-lenDiff;
		textarea.value = newText;
		textarea.selectionStart = start;
		textarea.selectionEnd = end;
	}

	insertTags('{{ՀՍՀ հեղ|','}}','');

	insertSummary('+ձևավորում ');
}

function widenText() {
	var textarea = document.getElementById("wpTextbox1");
	var start = textarea.selectionStart;
	var end = textarea.selectionEnd;
	var sel = textarea.value.substring(start, end);
	var len = sel.length;
	var spaceBeforeWide="";
	var spaceAfterWide="";

	if ( sel.substring(0,1) === " " ) {
		spaceBeforeWide=" ";
	}

	if ( sel.substring( len-1, len ) === " ") {
		spaceAfterWide=" ";
	}

	if (sel.IsWideArmText(0.75)) {
		sel = sel.replace(/\s/g, "");
	}

	curtext = textarea.value;
	newtext = curtext.substring(0,start) + spaceBeforeWide + "{{լայն|" + sel.trim() + "}}" + spaceAfterWide + curtext.substring(end);
	document.getElementById("wpTextbox1").value = newtext;
}


function toProperCase(s) {
  return s.toLowerCase().replace(/^(.)|[\s—–](.)/g,
        function($1) { return $1.toUpperCase(); });
}

function toUpperCaseArm(s) {
	s = s.replace('և', 'ԵՎ');
	s = s.replace('եւ', 'ԵՎ');
	s = s.toUpperCase();
	return s;
}

function toLowerCaseArm(s) {
	s = s.replace('ԵՎ', 'և');
	s = s.replace('ԵՒ', 'և');
	s = s.toLowerCase();
	return s;
}

function addSAESection(ProperCaseWanted)
{
	var textarea = document.getElementById("wpTextbox1");
	var start = textarea.selectionStart;
	var end = textarea.selectionEnd;
	var sel = textarea.value.substring(start, end);
	var TitleOnly = true;
	var selPartAfterUppercase='';
	var selPartAfterUppercaseIndex=0;

	//if it's only newlines or empty then exit without asking, nothing to do
	if (sel.length=0 || sel.search(/[^\n]/)==-1) {
		return false;
	}

	// In case user selects already formatted section name and article title, he probably wants to fix it
	if (sel.substring(0,2)==='##' && sel.substring(2).search('##')!==-1 && sel.substring(6).search("'''")!==-1)	{		
		sectEnd = sel.substring(2).search('##')+2;
		boldStart = sel.substring(4).search("'''")+4;
		boldEnd = sel.substring(boldStart+3).search("'''") + boldStart + 3;
		clearedText = textarea.value.substring(0,start) + textarea.value.substring(start+boldStart+3, start+boldEnd) + textarea.value.substring(start+boldEnd+3);
		textarea.value = clearedText;
		textarea.selectionStart = start;
		textarea.selectionEnd = end - (sectEnd + 2 + 1 + 3*2);//End equals prev value minus sectEnd + ## + new line + 2 '''
		end = textarea.selectionEnd;
		sel = textarea.value.substring(start, end);
	}

	/**If selection looks like user mistake, we need additional confirmation
	It's fishy if
	1) previous symbols is not new line, while at the same time it's not in very begining of text, and new line is not first character of text
	2) containt anything but Armenian letters, spaces, or following symbols ,«»()
	3) Doesn't start with at least two Armenian capital letters (yes are 39 articles about armenian letters, but in rest 99.9% it's user mistake)
	**/
	if (!(start===0 || textarea.value.charAt(start-1)==="\n" || textarea.value.charAt(start)==="\n" || textarea.value.substring(start-3, start).search("'''")==0)|| sel.search(/[^Ա-և\s–«»,\(\)IVX]/)!==-1 || sel.search(/[«\nԱ-Ֆ]{2,}/)!==0) {
		res = confirm ("Դուք նշել եք «" + sel + "» որպես հոդվածանուն։\nՍա փոքր ինչ կասկածելի է թվում։ Համոզվա՞ծ եք որ ուզում եք շարունակել և ստեղծել նման բաժնի անուն։");
		if (res==false) return false;
	}

	if (sel.search(/[\/\:#<>\[\]|{}_\"]/)!==-1)	{
		alert('Բաժնի անունը չի կարող պարունակել, հետևյալ նշաններից որևէ մեկը՝ / ։ # < > [ ] | { } _ "');
		return false;
	}

	// If user moves cursor up, he may also select new line, without realising it causing new line before ''', we're fixing this silently
	NewLinePosInSel = sel.search(/\n/);
	if (NewLinePosInSel!==-1 && NewLinePosInSel<sel.search(/[Ա-և]/)) {
		start = start+sel.search(/[Ա-և]/);
		textarea.selectionStart = start;
		sel = sel.substring(NewLinePosInSel);
	}

	//Trim whitespaces, we don't modify start and end here as we use InsertTags which produces valid results
	sel = sel.trim();
	//there should be no new lines in section name. We don't do it in previous block, not to remove new lines in beginig, if there were some
	sel = sel.replace(/\n/g,"");

	//Quoted word case is more complicated then it seemed. No simple and nice solution if title is in quotes and contains something else.
	if (sel.substr(0,1)==='«' && sel.substr(sel.length-1, sel.length)==='»') {
		sel = sel.substr(1,sel.length-1);
		start = start + 1;
		end = end - 1;
		textarea.selectionStart = start;
		textarea.selectionEnd = end;
	}

	//Trying to understand if selection contains not only Article name but other words e.g. Name, Middle name in proper case
	if (sel!==sel.toLocaleUpperCase()) {
		TitleOnly = false;
	}

	if (!TitleOnly)	{
		selPartAfterUppercase='';
		selPartAfterUppercaseIndex = sel.search(/[\s,»][Ա-և][^Ա-Ֆ]/); //Trying to find where UPPERCASES end

		if (selPartAfterUppercaseIndex>0) //it shouldn't be -1 not found, or 0 very start of string, but just to be safe
		{
			selPartAfterUppercase = sel.substring(selPartAfterUppercaseIndex);
			sel = sel.substring(0,selPartAfterUppercaseIndex);
			//If selection containt not only uppercase words, then make bold only part till proper/lower case word
			end = start+selPartAfterUppercaseIndex
			textarea.selectionEnd = end;
		}
	}

	//This should solve Ev issue, with few problems
	sel = sel.replace(/ԵՎ(?!Ր(Ո|Ա))/, "և");

	//if user accidentaly selects title with comma, we silently remove comma from selection
	if (textarea.value.charAt(end-1)==',') {
		end = end-1;
		textarea.selectionEnd = end;
		sel = sel.substring(0,sel.length-1);
	}

	if (ProperCaseWanted) {
		sectname = toProperCase(sel) + selPartAfterUppercase;
	}
	else {
		sectname = sel.substring(0,1) + sel.substr(1).toLocaleLowerCase() + selPartAfterUppercase;
	}

	tRegExp="##(\\s)?"+sectname+"(\\s)?##";
	duplicateCheckRegEx = new RegExp(tRegExp, "i");
	if (duplicateCheckRegEx.test(textarea.value)==true)	{
		res = window.confirm ("Ուշադրություն:\n«" + sectname + "» անվամբ բաժին արդե՛ն առկա է էջում։\nԽնդրում ենք փոփոխե՛լ այս բաժնի անունը, դարձնելով այն ունիկալ։\nՊարզապես բաժնի անունից հետո ավելացրեք հստակեցնող բառ, օր․ անձի դեպքում անուն ազգանունից հետո, երևույթի դեպքում ոլորտը (Դիմադրություն (հոգեբանություն)), տեղանվան դեպքում երկիրը, կամ տեսակը (գետ/լիճ/գյուղ Հայաստանում)։");

		if (res==false) return false;
	}

	//If word is in quotes, let's make quotes bold aswell
	if (textarea.value.substring(start-1, start)=="«" && textarea.value.substring(end, end+1)=="»")
	{
		textarea.selectionStart = textarea.selectionStart-1;
		textarea.selectionEnd = textarea.selectionEnd+1;
	}


	//Checking for duplicates here.
	//This may look as not so straightforward solution, but if not this way we'll have
	//to write something very unDRY, with a lot of guessing
	//So we first preserve all textfield value, add section name,
	//perform duplicate check where we are able understand new section position on page
	//And if dup foung ask user to confirm, or cancel change.

	oldTextValue = textarea.value;

	//If word is already bold, let's make sure, we don't make it double bold
	if (textarea.value.substring(start-3, start)=="'''" && textarea.value.substring(end, end+3)=="'''") {
		textarea.selectionStart = textarea.selectionStart-3;
		textarea.selectionEnd = textarea.selectionEnd+3;
		insertTags("## " + sectname + " ##\r\n",'');
	}
	else {
		insertTags("## " + sectname + " ##\r\n'''","'''",'');
	}

	curSectNameDup=checkForDuplicateSectNamesInNeighbors(sectname);
	if (curSectNameDup!==false)	{
		res = window.confirm ("Սխալ՝ «" + curSectNameDup[0]['name'] + "» անվամբ բաժինը արդեն գոյություն ունի էջ " + curSectNameDup[0]['page'] +"–ում։\nՇարունակել այդպես և ձեռքով ուղղել նոր բաժինը, թե՞ չեղարկել։");
		if (res==false) {
			textarea.value = oldTextValue
			return false;
		}
	}

	insertSummary("+բաժիններ");
};
// Taken from MediaWiki base JS files.
function insertSummary( text ) {
	var sum = $('#wpSummary'), vv = sum.val()
	if (vv.indexOf(text) !== -1) return
	if (/[^,; \/]$/.test(vv)) vv += ','
	if (/[^ ]$/.test(vv)) vv += ' '
	sum.val(vv + text);
}