//***********************************************************************************************************************************/
//  LyteBox v3.22 Modification V1.3 by Coyaba
//  includes and extends the modifications from Pavel Kuzub to Lytebox v3.20 (see below), 
//  + geo info, easier hotkey assignment, more options for fade in/out, hidden scrollbars,  
//    info overlay (optionally shown on load), additional file param for Info (in lyteframe), 
//    added 'on_dom_load' event handler, vertically centered tempFrame, catching of imagemap area-tags, 
//    configurable slideshow start options, option to loop slideshow, 
//    changed loader display (now overlaying actual image instead of blank display), 
//    size of initial lytebox (displaying loader) is now always the size defined in css
//   Author: Harald Nast
//  Website: http://www.faszination-china.com/about_imaging_lytebox.php
//     Date: November 19, 2007
//
//  LyteBox v3.20 Modification
//  + EasySave, Click To Close, Resize, Info, Exif, Hint modifications and other changes by Pavel Kuzub
//   Author: Pavel Kuzub
//  Website: http://pavel.kuzub/lytebox
//     Date: Sept 9, 2007
//
//  LyteBox v3.22
//  Original Author: Markus F. Hay
//  Website: http://www.dolem.com/lytebox
//     Date: October 2, 2007
//  License: Creative Commons Attribution 3.0 License (http://creativecommons.org/licenses/by/3.0/)
// Browsers: Tested successfully on WinXP with the following browsers (using no DOCTYPE, Strict DOCTYPE, and Transitional DOCTYPE):
//           * Firefox: 2.0.0.4, 1.5.0.12
//           * Internet Explorer: 7.0, 6.0 SP2, 5.5 SP2
//           * Opera: 9.21
// Releases: For up-to-date and complete release information, visit http://www.dolem.com/forum/showthread.php?tid=62
//
//   Credit: LyteBox was originally derived from the Lightbox class (v2.02) that was written by Lokesh Dhakar. For more
//           information please visit http://huddletogether.com/projects/lightbox2/
//***********************************************************************************************************************************/
Array.prototype.removeDuplicates = function () { for (var i = 1; i < this.length; i++) { if (this[i][0] == this[i-1][0]) { this.splice(i,1); } } };
Array.prototype.removeDuplicatesAssoc = function () { for (var i = 0; i < this.length; i++) { for(var j = this.length-1; j>i; j--){ if (this[i]['href'] == this[j]['href']) { this.splice(j,1); } } } };
Array.prototype.empty = function () { for (var i = 0; i <= this.length; i++) { this.shift(); } };
String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g, ''); };

function LyteBox() {
	/*** Start Global Configuration ***/
		this.theme			= 'grey';	// themes: grey (default), red, green, blue, gold
		this.hideFlash			= true;		// controls whether or not Flash objects should be hidden
		this.outerBorder		= true;		// controls whether to show the outer grey (or theme) border
		this.resizeSpeed		= 10;		// controls the speed of the image resizing (1=slowest and 10=fastest)
		this.maxOpacity			= 85;		// higher opacity = darker overlay, lower opacity = lighter overlay
		this.navType			= 1;		// 1 = "Prev/Next" buttons on top left and left (default), 2 = "<< prev | next >>" links next to image number
		this.autoResize			= true;		// controls whether or not images should be resized if larger than the browser window dimensions
								// 2007-10 coyaba, extended adnimation + fade in/out options
		this.doAnimations		= false;	// controls whether or not to "animate" Lytebox, i.e. resize transition between images, etc.
		this.doFade			= false;	// controls whether or not to use fade in/out effects
		this.doDetailAnimations		= false;	// controls whether or not to use animations for details area
		this.doInfoFade			= true;		// controls whether or not to use fade in/out effects for info overlay
		this.infoMaxOpacity		= 60;		// opacity for info overlay
		this.borderSize			= 12;		// if you adjust the padding in the CSS, you will need to update this variable -- otherwise, leave this alone...
	/*** End Global Configuration ***/
	
	/*** Configure Slideshow Options ***/
		this.slideInterval		= 8000;		// Change value (milliseconds) to increase/decrease the time between "slides" (10000 = 10 seconds)
		this.showNavigation		= true;		// true to display Next/Prev buttons/text during slideshow, false to hide
		this.showClose			= true;		// true to display the Close button, false to hide
		this.showDetails		= true;		// true to display image details (caption, count), false to hide
		this.showPlayPause		= true;		// true to display pause/play buttons next to close button, false to hide
		this.pauseOnNextClick		= true;		// true to pause the slideshow when the "Next" button is clicked
		this.pauseOnPrevClick		= true;		// true to pause the slideshow when the "Prev" button is clicked
								// 2007-10 coyaba, extended slideshow options
		this.slideAutoStart		= 0;		// 0 = always paused, 1 = autostart only on first frame, 2 = autostart always
		this.slideAutoEnd		= false;	// true to automatically close Lytebox after the last image is reached, false to keep open
		this.slideLoop			= true;		// true to continue on first image after the last image is reached
	/*** End Slideshow Configuration ***/
	
	/*** Start Addon Configuration ***/
		this.easySave			= true;		// true to enable Easy Save (To save image - right click and select Save Target As/Save Link As)
		this.clickToClose		= true;		// true to exit Lytebox when clicking on image (if Navigation buttons are not overlapping). navType=1 only.
		this.C2CrightSided		= true;		// true to use right side style close area on groups with single image
		this.showCloseInFrame		= true;		// true to display the Close button in frame mode despite it is swinched off globaly, false to hide.
		this.showHints			= true;		// true to display Hint messages over the buttons. Good to inform user about shortcuts
		this.showSave			= false;	// true to display Save button next to close button, false to hide
		this.showResize			= true;		// true to display Resize button next to close button, false to hide
		this.showInfo			= false;	// true to display info button next to close button, false to hide. Searches Special Parameter for [info]Additional text[/info]
								// 2007-10 coyaba:
							        // if true then the new info overlay is deactivated
						    		// if false an available info will be displayed as overlay in the lower left corner of the image
		this.showExif			= true;		// true to display exif button next to close button, false to hide. Searches Special Parameter for [exif=true]
								// 2007-10 coyaba, geo support
		this.showGeo			= true;		// true to display geo button next to close button, false to hide. Searches Special Parameter for [geo=true]
		this.showBack			= true;		// true to display back button next to close button, false to hide
						    		// 2007-10 coyaba, easier hotkey assignment
		this.hotkeyResize		= 'r';
		this.hotkeyInfo			= 'i';
		this.hotkeyExif			= 'e';
		this.hotkeyGeo			= 'g';
		this.hotkeyPrevious		= 'p';
		this.hotkeyNext			= 'n';
		this.hotkeyClose		= 'c';
	/*** End Addon Configuration ***/
	
	/*** Start Tag Configuration ***/
		this.tagBox			= 'lytebox';	// Catch the following name in Anchor REV parameter for LyteBox 
		this.tagShow			= 'lyteshow';	// Catch the following name in Anchor REV parameter for LyteShow
		this.tagFrame			= 'lyteframe';	// Catch the following name in Anchor REV parameter for LyteFrame
	/*** Start Tag Configuration ***/
	
	/*** Configure Info, Exif and Geo Configuration ***/
		this.specialParam		= 'rev';				// says to Lytebox, which parameter use to get Info and Exif data
		this.linkInfo			= 'lytebox_info.php?info=%1&file=%2';	// This link will be openned in Lyteframe, information string will be added at the end
		this.linkExif			= 'lytebox_exif.php?filename=';
											// 2007-10 coyaba, geo support
		this.linkGeo			= 'geoImg.php?filename=';
		this.LyteframeStyle		= 'width: 400px; height: 400px; scrolling: auto';	// Default style of Lyteframe (Not really style, but form for sure)
		this.TempFrameStyle		= 'width: 572px; height: 424px; scrolling: auto';	// Default style of Temp Frame to show Info and Exif (Same here)
	/*** End Info, Exif and Geo Configuration ***/

	/*** Start String Configuration ***/
		this.hintClose = "Close";			// Shortcut: 'Escape' or 'X' or 'C'
		this.hintPlay = "Continue SlideShow";
		this.hintPause = "Pause SlideShow";
		this.hintNext = "Next Image. \n";		// Shortcut: 'Right Arrow' or 'N'
		this.hintPrev = "Previous Image. \n"; 		// Shortcut: 'Left Arrow' or 'P'
		this.hintSave = "Use this button to get link to current image";
		this.hintResize = "Resize this image to fit your screen size OR back to original size. Shortcut: press 'R' or 'S'"; // Shortcut: 'R' or 'S'
		this.hintInfo = "Show additional information about this image. Shortcut: press 'I'"; // Shortcut: 'I'
		this.hintExif = "Show EXIF information about this image. Shortcut: press 'E'"; // Shortcut: 'E'
		this.hintBack = "Return back to image. Shortcut: press Left Arrow or 'P'"; // Shortcut: 'Left Arrow' or 'P'
		this.hintEasySave = "To save Current image - right click and select Save Target As/Save Link As";
		this.hintClickToClose = "Click to Close. \n";
		this.textImageNum = "Image %1 of %2";		// %1 - current, %2 - total
		this.textPageNum = "Page %1 of %2";		// %1 - current, %2 - total
		this.textNavPrev = "&laquo; Prev";		// &laquo; prev
		this.textNavNext = "Next &raquo;"; 		// next &raquo;
		this.textNavDelim = " - ";			// Separates Prev and Next
	/*** End String Configuration ***/
 	
	if(this.resizeSpeed > 10) { this.resizeSpeed = 10; }
	if(this.resizeSpeed < 1) { resizeSpeed = 1; }
	this.resizeDuration = (11 - this.resizeSpeed) * 0.15;
	this.resizeWTimerArray		= new Array();
	this.resizeWTimerCount		= 0;
	this.resizeHTimerArray		= new Array();
	this.resizeHTimerCount		= 0;
	this.showContentTimerArray	= new Array();
	this.showContentTimerCount	= 0;
	this.overlayTimerArray		= new Array();
	this.overlayTimerCount		= 0;
	this.imageTimerArray		= new Array();
	this.imageTimerCount		= 0;
	// 2007-10 coyaba, fade in/out for info box
	this.infoTimerArray			= new Array();
	this.infoTimerCount			= 0;
	this.timerIDArray			= new Array();
	this.timerIDCount			= 0;
	this.slideshowIDArray		= new Array();
	this.slideshowIDCount		= 0;
	this.imageArray	 = new Array();
	this.activeImage = null;
	this.frameArray	 = new Array();
	this.activeFrame = null;
	this.checkFrame();
	this.isSlideshow = false;
	this.isLyteframe = false;
	this.isShowTempFrame = false;
	this.TempFrame = new Array();
	// 2007-11 coyaba, for vertically centered tempFrame display
	this.lastMainTop = 0;
	this.HasInfo = false;
	this.HasExif = false;
	// 2007-10 coyaba, geo support
	this.HasGeo = false;
	// 2007-10 coyaba, for storage of scroll position
	this.yPos = 0;
	// 2007-11 coyaba, save dimensions of blank lytebox
	this.startWidth = 0;
	this.startHeight = 0;
	/*@cc_on
		/*@if (@_jscript)
			this.ie = (document.all && !window.opera) ? true : false;
		/*@else @*/
			this.ie = false;
		/*@end
	@*/
	this.ie7 = (this.ie && window.XMLHttpRequest);
	this.classAttribute = this.ie ? 'className' : 'class';
	this.initialize();
};

LyteBox.prototype.initialize = function() {
	this.updateLyteboxItems();
	var objBody = this.doc.getElementsByTagName("body").item(0);	
	if (this.doc.getElementById('lbOverlay')) {
		objBody.removeChild(this.doc.getElementById("lbOverlay"));
		objBody.removeChild(this.doc.getElementById("lbMain"));
	}
	var objOverlay = this.doc.createElement("div");
		objOverlay.setAttribute('id','lbOverlay');
		objOverlay.setAttribute(this.classAttribute, this.theme);
		if ((this.ie && !this.ie7) || (this.ie7 && this.doc.compatMode == 'BackCompat')) {
			objOverlay.style.position = 'absolute';
		}
		objOverlay.style.display = 'none';
		objBody.appendChild(objOverlay);
	var objLytebox = this.doc.createElement("div");
		objLytebox.setAttribute('id','lbMain');
		objLytebox.style.display = 'none';
		objBody.appendChild(objLytebox);
	var objOuterContainer = this.doc.createElement("div");
		objOuterContainer.setAttribute('id','lbOuterContainer');
		objOuterContainer.setAttribute(this.classAttribute, this.theme);
		objLytebox.appendChild(objOuterContainer);
	var objIframeContainer = this.doc.createElement("div");
		objIframeContainer.setAttribute('id','lbIframeContainer');
		objIframeContainer.style.display = 'none';
		objOuterContainer.appendChild(objIframeContainer);
	var objIframe = this.doc.createElement("iframe");
		objIframe.setAttribute('id','lbIframe');
		objIframe.setAttribute('name','lbIframe');
		objIframe.setAttribute('frameBorder','0'); // This is fixing issue with frame border in IE
		objIframe.style.display = 'none';
		objIframeContainer.appendChild(objIframe);
	var objImageContainer = this.doc.createElement("div");
		objImageContainer.setAttribute('id','lbImageContainer');
		objOuterContainer.appendChild(objImageContainer);
	var objLyteboxImage = this.doc.createElement("img");
		objLyteboxImage.setAttribute('id','lbImage');
		objImageContainer.appendChild(objLyteboxImage);
	var objLoading = this.doc.createElement("div");
		objLoading.setAttribute('id','lbLoading');
		objOuterContainer.appendChild(objLoading);
	var objDetailsContainer = this.doc.createElement("div");
		objDetailsContainer.setAttribute('id','lbDetailsContainer');
		objDetailsContainer.setAttribute(this.classAttribute, this.theme);
		objLytebox.appendChild(objDetailsContainer);
	var objDetailsData =this.doc.createElement("div");
		objDetailsData.setAttribute('id','lbDetailsData');
		objDetailsData.setAttribute(this.classAttribute, this.theme);
		objDetailsContainer.appendChild(objDetailsData);
	var objDetails = this.doc.createElement("div");
		objDetails.setAttribute('id','lbDetails');
		objDetailsData.appendChild(objDetails);
	var objCaption = this.doc.createElement("span");
		objCaption.setAttribute('id','lbCaption');
		objDetails.appendChild(objCaption);
	var objHoverNav = this.doc.createElement((this.easySave ? 'a' : 'div')); // Changed element type from DIV to A. Needed to make Quick Save and Click To Close features
		objHoverNav.setAttribute('id','lbHoverNav');
		objHoverNav.setAttribute('title',(this.showHints ? ((this.clickToClose ? this.hintClickToClose : '') + (this.easySave ? this.hintEasySave : '')) : ''));
		objImageContainer.appendChild(objHoverNav);
	// 2007-10 coyaba: container for info overlay
	var objInfoDisplay = this.doc.createElement('div');
		objInfoDisplay.setAttribute('id','lbInfoDisplay');
		objImageContainer.appendChild(objInfoDisplay);
	var objBottomNav = this.doc.createElement("div");
		objBottomNav.setAttribute('id','lbBottomNav');
		objDetailsData.appendChild(objBottomNav);
	var objPrev = this.doc.createElement("a");
		objPrev.setAttribute('id','lbPrev');
		objPrev.setAttribute('title',(this.showHints ? (this.hintPrev + (this.easySave ? this.hintEasySave : '')) : ''));
		objPrev.setAttribute(this.classAttribute, this.theme);
		objPrev.setAttribute('href','#');
		objHoverNav.appendChild(objPrev);
	var objNext = this.doc.createElement("a");
		objNext.setAttribute('id','lbNext');
		objNext.setAttribute('title',(this.showHints ? (this.hintNext + (this.easySave ? this.hintEasySave : '')) : ''));
		objNext.setAttribute(this.classAttribute, this.theme);
		objNext.setAttribute('href','#');
		objHoverNav.appendChild(objNext);
	var objC2Cleft = this.doc.createElement("a");
		objC2Cleft.setAttribute('id','lbC2Cleft'); // We are creating special field used for Click to Close. Left part will appear on first image/slide in group instead of Prev navigation (navType=1)
		objC2Cleft.setAttribute('title',(this.showHints ? ((this.clickToClose ? this.hintClickToClose : '') + (this.easySave ? this.hintEasySave : '')) : ''));
		objC2Cleft.setAttribute(this.classAttribute, this.theme);
		objC2Cleft.setAttribute('href','#'); // In case of single image in image/slide group, either right or left part (depends on settings above) will be used to fill all the natigation area and hide other part.
		objHoverNav.appendChild(objC2Cleft);
	var objC2Cright = this.doc.createElement("a");
		objC2Cright.setAttribute('id','lbC2Cright'); // Right part will appear on last image/slide in group instead of Next navigation (navType=1)
		objC2Cright.setAttribute('title',(this.showHints ? ((this.clickToClose ? this.hintClickToClose : '') + (this.easySave ? this.hintEasySave : '')) : ''));
		objC2Cright.setAttribute(this.classAttribute, this.theme);
		objC2Cright.setAttribute('href','#');
		objHoverNav.appendChild(objC2Cright);
	var objNumberDisplay = this.doc.createElement("span");
		objNumberDisplay.setAttribute('id','lbNumberDisplay');
		objDetails.appendChild(objNumberDisplay);
	var objNavDisplay = this.doc.createElement("span");
		objNavDisplay.setAttribute('id','lbNavDisplay');
		objNavDisplay.style.display = 'none';
		objDetails.appendChild(objNavDisplay);
	var objClose = this.doc.createElement("a");
		objClose.setAttribute('id','lbClose');
		objClose.setAttribute('title',(this.showHints ? this.hintClose : '' ));
		objClose.setAttribute(this.classAttribute, this.theme);
		objClose.setAttribute('href','#');
		objBottomNav.appendChild(objClose);
	var objPause = this.doc.createElement("a");
		objPause.setAttribute('id','lbPause');
		objPause.setAttribute('title',(this.showHints ? this.hintPause : ''));
		objPause.setAttribute(this.classAttribute, this.theme);
		objPause.setAttribute('href','#');
		objPause.style.display = 'none';
		objBottomNav.appendChild(objPause);
	var objPlay = this.doc.createElement("a");
		objPlay.setAttribute('id','lbPlay');
		objPlay.setAttribute('title',(this.showHints ? this.hintPlay : ''));
		objPlay.setAttribute(this.classAttribute, this.theme);
		objPlay.setAttribute('href','#');
		objPlay.style.display = 'none';
		objBottomNav.appendChild(objPlay);
	var objSave = this.doc.createElement("a");
		objSave.setAttribute('id','lbSave');
		objSave.setAttribute('title',(this.showHints ? this.hintSave : ''));
		objSave.setAttribute(this.classAttribute, this.theme);
		objSave.setAttribute('href','#');
		objSave.style.display = 'none';
		objBottomNav.appendChild(objSave);
	var objResize = this.doc.createElement("a");
		objResize.setAttribute('id','lbResize');
		objResize.setAttribute('title',(this.showHints ? this.hintResize : ''));
		objResize.setAttribute(this.classAttribute, this.theme);
		objResize.setAttribute('href','#');
		objResize.style.display = 'none';
		objBottomNav.appendChild(objResize);
	var objInfo = this.doc.createElement("a");
		objInfo.setAttribute('id','lbInfo');
		objInfo.setAttribute('title',(this.showHints ? this.hintInfo : ''));
		objInfo.setAttribute(this.classAttribute, this.theme);
		objInfo.setAttribute('href','#');
		objInfo.style.display = 'none';
		objBottomNav.appendChild(objInfo);
	var objExif = this.doc.createElement("a");
		objExif.setAttribute('id','lbExif');
		objExif.setAttribute('title',(this.showHints ? this.hintExif : ''));
		objExif.setAttribute(this.classAttribute, this.theme);
		objExif.setAttribute('href','#');
		objExif.style.display = 'none';
		objBottomNav.appendChild(objExif);
	var objGeo = this.doc.createElement("a");
		objGeo.setAttribute('id','lbGeo');
		objGeo.setAttribute('title',(this.showHints ? this.hintGeo : ''));
		objGeo.setAttribute(this.classAttribute, this.theme);
		objGeo.setAttribute('href','#');
		objGeo.style.display = 'none';
		objBottomNav.appendChild(objGeo);
	var objBack = this.doc.createElement("a");
		objBack.setAttribute('id','lbBack');
		objBack.setAttribute('title',(this.showHints ? this.hintBack : ''));
		objBack.setAttribute(this.classAttribute, this.theme);
		objBack.setAttribute('href','#');
		objBack.style.display = 'none';
		objBottomNav.appendChild(objBack);
};

LyteBox.prototype.getLinks = function() {
	var tagNames = new Array("a", "area");
	var links = new Array();
	for (var i = 0; i<tagNames.length; i++) {
		var tags = (this.isFrame) ? window.parent.frames[window.name].document.getElementsByTagName(tagNames[i]) : document.getElementsByTagName(tagNames[i]);
		for (var j = 0; j < tags.length; j++) {
			links.push(tags[j]);
		}
	}
	return links;
};

LyteBox.prototype.updateLyteboxItems = function() {	
	var links = this.getLinks();
	for (var i = 0; i < links.length; i++) {
		var anchor = links[i];
		var relAttribute = String(anchor.getAttribute('rel'));
		if (anchor.getAttribute('href')) {
			if (relAttribute.toLowerCase().match(this.tagBox)) {
				anchor.onclick = function () { myLytebox.start(this, false, false); return false; }
			} else if (relAttribute.toLowerCase().match(this.tagShow)) {
				anchor.onclick = function () { myLytebox.start(this, true, false); return false; }
			} else if (relAttribute.toLowerCase().match(this.tagFrame)) {
				anchor.onclick = function () { myLytebox.start(this, false, true); return false; }
			}
		}
	}
};

LyteBox.prototype.start = function(imageLink, doSlide, doFrame) {
	// 2007-10 coyaba, store scroll position
	this.yPos = this.getPageScroll();
	// 2007-10 coyaba, hide selects in ie and scrollbars
	this.toggleElements('hide');
	if (this.hideFlash) { this.toggleFlash('hide'); }
	this.isLyteframe = (doFrame ? true : false);
	this.isShowTempFrame = false;
	var pageSize	= this.getPageSize();
	var objOverlay	= this.doc.getElementById('lbOverlay');
	var objBody		= this.doc.getElementsByTagName("body").item(0);
	objOverlay.style.height = pageSize[1] + "px";
	objOverlay.style.display = '';
	this.appear('lbOverlay', (this.doFade ? 0 : this.maxOpacity));
	var links = this.getLinks();
	if (this.isLyteframe) {
		this.frameArray = [];
		this.frameNum = 0;
		if ((imageLink.getAttribute('rel') == this.tagFrame)) {
			var rev = imageLink.getAttribute('rev');
			this.frameArray.push(new Array(imageLink.getAttribute('href'), imageLink.getAttribute('title'), (rev == null || rev == '' ? this.LyteframeStyle : rev)));
		} else {
			if (imageLink.getAttribute('rel').indexOf(this.tagFrame) != -1) {
				for (var i = 0; i < links.length; i++) {
					var anchor = links[i];
					if (anchor.getAttribute('href') && (anchor.getAttribute('rel') == imageLink.getAttribute('rel'))) {
						var rev = anchor.getAttribute('rev');
						this.frameArray.push(new Array(anchor.getAttribute('href'), anchor.getAttribute('title'), (rev == null || rev == '' ? this.LyteframeStyle : rev)));
					}
				}
				this.frameArray.removeDuplicates();
				while(this.frameArray[this.frameNum][0] != imageLink.getAttribute('href')) { this.frameNum++; }
			}
		}
	} else {
		this.imageArray = [];
		this.imageNum = 0;
		if ( imageLink.getAttribute('rel').indexOf(this.tagBox) != -1 || imageLink.getAttribute('rel').indexOf(this.tagShow) != -1 ) {
			for (var i = 0; i < links.length; i++) {
				var anchor = links[i];
				if (anchor.getAttribute('href') && (anchor.getAttribute('rel') == imageLink.getAttribute('rel'))) {
					var imgObj = new Object();                                                                  // old array indexes in Lytebox 3.22:
					imgObj['href']			= anchor.getAttribute('href');										// 0
					imgObj['title']			= anchor.getAttribute('title');										// 1
					imgObj['infoString']	= this.getInfoString(anchor.getAttribute(this.specialParam));		// 2
					imgObj['showExif']		= this.getShowExif(anchor.getAttribute(this.specialParam));			// 3
					imgObj['hasGeo']		= this.getShowGeo(anchor.getAttribute(this.specialParam));			// 4
					imgObj['onLoadInfo']	= this.getOnLoadInfo(anchor.getAttribute(this.specialParam));		// 5
					imgObj['noTitleInfo']	= this.getNoTitleInfo(anchor.getAttribute(this.specialParam));		// 6
					imgObj['exifLoaded']	= false;															// 7
					this.imageArray.push(imgObj);
				}
			}
			this.imageArray.removeDuplicatesAssoc();
			while(this.imageArray[this.imageNum]['href'] != imageLink.getAttribute('href')) {
				this.imageNum++;
			}
		}
	}
	var object = this.doc.getElementById('lbMain');
	object.style.top = (this.getPageScroll() + (pageSize[3] / 15)) + "px";
	// 2007-11 coyaba, for vertically centered tempFrame display: save last (top) position of Lytebox main DIV
	this.lastMainTop = object.style.top;
	object.style.display = '';
	if (!this.outerBorder) {
		this.doc.getElementById('lbOuterContainer').style.border	= 'none';
		this.doc.getElementById('lbDetailsContainer').style.border	= 'none';
	} else {
		this.doc.getElementById('lbOuterContainer').style.borderBottom = '';
		this.doc.getElementById('lbOuterContainer').setAttribute(this.classAttribute, this.theme);
	}
    // 2007-11 coyaba, reset size of lytebox
    if ( this.startWidth!=0 && this.startHeight!=0 ) {
        this.doc.getElementById('lbOuterContainer').style.width = this.startWidth + "px";
        this.doc.getElementById('lbOuterContainer').style.height = this.startHeight + "px"; 
    }
	this.doc.getElementById('lbOverlay').onclick = function() { myLytebox.end(); return false; };
	this.doc.getElementById('lbMain').onclick = function(e) {
		var e = e;
		if (!e) {
			if (window.parent.frames[window.name] && (parent.document.getElementsByTagName('frameset').length <= 0)) {
				e = window.parent.window.event;
			} else {
				e = window.event;
			}
		}
		var id = (e.target ? e.target.id : e.srcElement.id);
		if (id == 'lbMain') { myLytebox.end(); return false; }
	};
	
	this.doc.getElementById('lbHoverNav').onclick	= function() { return false; };
	this.doc.getElementById('lbC2Cleft').onclick	= function() { myLytebox.end(); return false; };
	this.doc.getElementById('lbC2Cright').onclick	= function() { myLytebox.end(); return false; };
	this.doc.getElementById('lbClose').onclick		= function() { myLytebox.end(); return false; };
	this.doc.getElementById('lbPause').onclick		= function() { myLytebox.togglePlayPause("lbPause", "lbPlay"); return false; };
	this.doc.getElementById('lbPlay').onclick		= function() { myLytebox.togglePlayPause("lbPlay", "lbPause"); return false; };
	this.doc.getElementById('lbSave').onclick		= function() { return false; };
	this.doc.getElementById('lbResize').onclick		= function() { myLytebox.resize(); return false; };
	this.doc.getElementById('lbInfo').onclick		= function() { myLytebox.info(); return false; };
	this.doc.getElementById('lbExif').onclick		= function() { myLytebox.exif(); return false; };
	// 2007-10 coyaba, geo support
	this.doc.getElementById('lbGeo').onclick		= function() { myLytebox.geo(); return false; };
	this.doc.getElementById('lbBack').onclick		= function() { myLytebox.back(); return false; };
	// Below code is removing selection border when clicking on buttons. EXPERIMENTAL. Can't use just blur() because of issue with shortcuts being inactive then.
	this.doc.getElementById('lbHoverNav').onfocus	= function() { (!this.ie ? objBody.focus() : blur()); };
	this.doc.getElementById('lbC2Cleft').onfocus	= function() { (!this.ie ? objBody.focus() : blur()); };
	this.doc.getElementById('lbC2Cright').onfocus	= function() { (!this.ie ? objBody.focus() : blur()); };
	this.doc.getElementById('lbNext').onfocus		= function() { (!this.ie ? objBody.focus() : blur()); };
	this.doc.getElementById('lbPrev').onfocus		= function() { (!this.ie ? objBody.focus() : blur()); };
	this.doc.getElementById('lbClose').onfocus		= function() { (!this.ie ? objBody.focus() : blur()); };
	this.doc.getElementById('lbPause').onfocus		= function() { (!this.ie ? objBody.focus() : blur()); };
	this.doc.getElementById('lbPlay').onfocus		= function() { (!this.ie ? objBody.focus() : blur()); };
	this.doc.getElementById('lbSave').onfocus		= function() { (!this.ie ? objBody.focus() : blur()); };
	this.doc.getElementById('lbResize').onfocus		= function() { (!this.ie ? objBody.focus() : blur()); };
	this.doc.getElementById('lbInfo').onfocus		= function() { (!this.ie ? objBody.focus() : blur()); };
	this.doc.getElementById('lbExif').onfocus		= function() { (!this.ie ? objBody.focus() : blur()); };
	// 2007-10 coyaba, geo support
	this.doc.getElementById('lbGeo').onfocus		= function() { (!this.ie ? objBody.focus() : blur()); };
	this.doc.getElementById('lbBack').onfocus		= function() { (!this.ie ? objBody.focus() : blur()); };
	
	this.isSlideshow = doSlide;
	// 2007-11 coyaba, configurable slideshow start
	if ( this.isSlideshow ) {
		if ( this.slideAutoStart==0 ) this.isPaused = true;
		else if ( this.slideAutoStart==1 && this.slideNum!=0 ) this.isPaused = true;
		else this.isPaused = false;
	}
	if (this.isSlideshow && this.showPlayPause && this.isPaused) {
		this.doc.getElementById('lbPlay').style.display = '';
		this.doc.getElementById('lbPause').style.display = 'none';
	}
	if (this.isLyteframe) {
		this.changeContent(this.frameNum);
	} else {
		this.changeContent(this.imageNum);
	}
};

LyteBox.prototype.changeContent = function(imageNum) {
	this.clearFrame();
	if (this.isSlideshow) {
		for (var i = 0; i < this.slideshowIDCount; i++) {
			window.clearTimeout(this.slideshowIDArray[i]);
		}
	}
	this.activeImage = this.activeFrame = imageNum;
	if (!this.outerBorder) {
		this.doc.getElementById('lbOuterContainer').style.border	= 'none';
		this.doc.getElementById('lbDetailsContainer').style.border	= 'none';
	} else {
		this.doc.getElementById('lbOuterContainer').style.borderBottom = '';
		this.doc.getElementById('lbOuterContainer').setAttribute(this.classAttribute, this.theme);
	};
	
	this.doc.getElementById('lbLoading').style.display			= '';
	//this.doc.getElementById('lbImage').style.display			= 'none';
	this.doc.getElementById('lbIframe').style.display			= 'none';
	this.doc.getElementById('lbPrev').style.display				= 'none';
	this.doc.getElementById('lbNext').style.display				= 'none';
	// 2007-10 coyaba: container for info overlay
	this.doc.getElementById('lbInfoDisplay').style.display		= 'none';
	this.doc.getElementById('lbC2Cleft').style.display			= 'none';
	this.doc.getElementById('lbC2Cright').style.display			= 'none';
	this.doc.getElementById('lbC2Cleft').style.width			= '49.9%';
	this.doc.getElementById('lbC2Cright').style.width			= '49.9%';
	this.doc.getElementById('lbIframeContainer').style.display	= 'none';
	this.doc.getElementById('lbDetailsContainer').style.display	= 'none';
	this.doc.getElementById('lbNumberDisplay').style.display	= 'none';
	
	if (this.navType == 2 || this.isLyteframe) {
		object = this.doc.getElementById('lbNavDisplay');
		object.innerHTML = '&nbsp;&nbsp;&nbsp;<span id="lbPrev2_Off" style="display: none;" class="' + this.theme + '">' + this.textNavPrev + '</span>' + 
						   '<a href="#" id="lbPrev2" class="' + this.theme + '" style="display: none;">' + this.textNavPrev + '</a> ' + 
						   '<b id="lbSpacer" class="' + this.theme + '">' + this.textNavDelim + '</b> ' + 
						   '<span id="lbNext2_Off" style="display: none;" class="' + this.theme + '">' + this.textNavNext + '</span>' + 
						   '<a href="#" id="lbNext2" class="' + this.theme + '" style="display: none;">' + this.textNavNext + '</a>';
		object.style.display = 'none';
	};
	
	if (this.isLyteframe || this.isShowTempFrame) {
		var iframe = myLytebox.doc.getElementById('lbIframe');
		var styles = (this.isShowTempFrame ? this.TempFrameStyle : this.frameArray[this.activeFrame][2]);
		var aStyles = styles.split(';');
		for (var i = 0; i < aStyles.length; i++) {
			if (aStyles[i].indexOf('width:') >= 0) {
				var w = aStyles[i].replace('width:', '');
				iframe.width = w.trim();
			} else if (aStyles[i].indexOf('height:') >= 0) {
				var h = aStyles[i].replace('height:', '');
				iframe.height = h.trim();
			} else if (aStyles[i].indexOf('scrolling:') >= 0) {
				var s = aStyles[i].replace('scrolling:', '');
				iframe.scrolling = s.trim();
			} else if (aStyles[i].indexOf('border:') >= 0) {
				// Not implemented yet, as there are cross-platform issues with setting the border (from a GUI standpoint)
				// var b = aStyles[i].replace('border:', '');
				// iframe.style.border = b.trim();
			}
		}
		this.clearFrame();
		iframe.src = (this.isShowTempFrame ? this.TempFrame[0] : this.frameArray[this.activeFrame][0]);
		this.resizeContainer(parseInt(iframe.width), parseInt(iframe.height));
		// 2007-11 coyaba, for vertically centered tempFrame display: save last (top) position of Lytebox main DIV
		this.lastMainTop = this.doc.getElementById('lbMain').style.top;
		// 2007-11 coyaba, center tempFrame vertically on screen
		this.doc.getElementById('lbMain').style.top = this.getPageScroll() + ((this.getPageSize()[3] - this.doc.getElementById('lbOuterContainer').offsetHeight - this.doc.getElementById('lbDetailsContainer').offsetHeight)/2) + "px";
	} else {
		// 2007-11 coyaba, for vertically centered tempFrame display: reset main top position to saved value
		this.doc.getElementById('lbMain').style.top = this.lastMainTop;
		this.loadImage(this.imageArray[this.activeImage]['href']);
	}
};

LyteBox.prototype.loadImage = function(str_link) {
	imgPreloader = new Image();
	imgPreloader.onload = function() {
		var imageWidth = imgPreloader.width;
		var imageHeight = imgPreloader.height;
		if ( myLytebox.autoResize ) {
			var pagesize = myLytebox.getPageSize();
			var x = pagesize[2] - 150;
			var y = pagesize[3] - 150;
			if (imageWidth > x) {
				imageHeight = Math.round(imageHeight * (x / imageWidth));
				imageWidth = x; 
				if (imageHeight > y) { 
					imageWidth = Math.round(imageWidth * (y / imageHeight));
					imageHeight = y; 
				}
			} else if (imageHeight > y) { 
				imageWidth = Math.round(imageWidth * (y / imageHeight));
				imageHeight = y; 
				if (imageWidth > x) {
					imageHeight = Math.round(imageHeight * (x / imageWidth));
					imageWidth = x;
				}
			}
		}
		
		myLytebox.doc.getElementById('lbLoading').style.display = 'none';
		
		var lbImage = myLytebox.doc.getElementById('lbImage');
		lbImage.src = str_link;
		lbImage.width = imageWidth;
		lbImage.height = imageHeight;
		myLytebox.doc.getElementById('lbImage').style.display = 'none';
		myLytebox.resizeContainer(imageWidth, imageHeight);
		imgPreloader.onload = function() {};
	};
	myLytebox.doc.getElementById('lbLoading').style.display = '';
	imgPreloader.src = str_link;
};

LyteBox.prototype.resizeContainer = function(imgWidth, imgHeight) {
	this.wCur = this.doc.getElementById('lbOuterContainer').offsetWidth;
	this.hCur = this.doc.getElementById('lbOuterContainer').offsetHeight;
    if ( this.startWidth==0 || this.startHeight==0 ) {
        this.startWidth  = this.wCur;
        this.startHeight = this.hCur;
    }
	this.xScale = ((imgWidth + (this.borderSize * 2)) / this.wCur) * 100;
	this.yScale = ((imgHeight + (this.borderSize * 2)) / this.hCur) * 100;
	var wDiff = (this.wCur - this.borderSize * 2) - imgWidth;
	var hDiff = (this.hCur - this.borderSize * 2) - imgHeight;
	if (!(hDiff == 0)) {
		this.hDone = false;
		this.resizeH('lbOuterContainer', this.hCur, imgHeight + this.borderSize*2, this.getPixelRate(this.hCur, imgHeight));
	} else {
		this.hDone = true;
	}
	if (!(wDiff == 0)) {
		this.wDone = false;
		this.resizeW('lbOuterContainer', this.wCur, imgWidth + this.borderSize*2, this.getPixelRate(this.wCur, imgWidth));
	} else {
		this.wDone = true;
	}
	if ((hDiff == 0) && (wDiff == 0)) {
		if (this.ie){ this.pause(250); } else { this.pause(100); } 
	}
	this.doc.getElementById('lbPrev').style.height = imgHeight + "px";
	this.doc.getElementById('lbNext').style.height = imgHeight + "px";
	this.doc.getElementById('lbDetailsContainer').style.width = (imgWidth + (this.borderSize * 2) + (this.ie && this.doc.compatMode == "BackCompat" && this.outerBorder ? 2 : 0)) + "px";
	this.showContent();
};

LyteBox.prototype.showContent = function() {
	if (this.wDone && this.hDone) {
		for (var i = 0; i < this.showContentTimerCount; i++) {
			window.clearTimeout(this.showContentTimerArray[i]);
		}
		if (this.outerBorder) {
			this.doc.getElementById('lbOuterContainer').style.borderBottom = 'none';
		}
		if ( this.isShowTempFrame || this.isLyteframe) {
			this.doc.getElementById('lbLoading').style.display = 'none';
		}
		
		this.HasInfo = false;
		this.HasExif = false;
		this.HasGeo  = false;	// 2007-10 coyaba, geo support
		
		if (this.isShowTempFrame) {
			this.doc.getElementById('lbIframe').style.display = '';
			this.appear('lbIframe', (this.doFade ? 0 : 100));
			this.doc.getElementById('lbHoverNav').style.display		= 'none';
			this.doc.getElementById('lbClose').style.display		= (this.showCloseInFrame ? '' : 'none');
			this.doc.getElementById('lbPause').style.display		= 'none';
			this.doc.getElementById('lbPlay').style.display			= 'none';
			this.doc.getElementById('lbSave').style.display			= 'none';
			this.doc.getElementById('lbResize').style.display		= 'none';
			this.doc.getElementById('lbNavDisplay').style.display	= 'none';
			this.doc.getElementById('lbInfo').style.display			= 'none';
			this.doc.getElementById('lbExif').style.display			= 'none';
			this.doc.getElementById('lbGeo').style.display			= 'none';
			this.doc.getElementById('lbBack').style.display			= (this.showBack ? '' : 'none');
		} else {
			if (this.isLyteframe) {
				this.doc.getElementById('lbIframe').style.display = '';
				this.appear('lbIframe', (this.doFade ? 0 : 100));
				this.doc.getElementById('lbHoverNav').style.display		= 'none';
				this.doc.getElementById('lbNavDisplay').style.display	= (this.frameArray.length > 1 ? '' : 'none');
				this.doc.getElementById('lbClose').style.display		= (this.showCloseInFrame ? '' : 'none');
				this.doc.getElementById('lbPause').style.display		= 'none';
				this.doc.getElementById('lbPlay').style.display			= 'none';
				this.doc.getElementById('lbSave').style.display			= 'none';
				this.doc.getElementById('lbResize').style.display		= 'none';
			} else {
				this.doc.getElementById('lbImage').style.display = '';
				this.appear('lbImage', (this.doFade ? 0 : 100));
				this.preloadNeighborImages();
				this.HasInfo = (this.imageArray[this.activeImage]['infoString']!='' ? true : false);
				this.HasExif = (this.imageArray[this.activeImage]['showExif'] ? true : false);
				this.HasGeo = (this.imageArray[this.activeImage]['hasGeo'] ? true : false);
				if ( this.isSlideshow ) {
					if ( this.activeImage == (this.imageArray.length - 1) ) {
						if ( this.slideLoop ) {
							this.slideshowIDArray[this.slideshowIDCount++] = setTimeout("myLytebox.changeContent(0)", this.slideInterval);
						} else if ( this.slideAutoEnd ) {
							this.slideshowIDArray[this.slideshowIDCount++] = setTimeout("myLytebox.end('slideshow')", this.slideInterval);
						}
					} else if ( !this.isPaused ) {
						this.slideshowIDArray[this.slideshowIDCount++] = setTimeout("myLytebox.changeContent("+(this.activeImage+1)+")", this.slideInterval);
					}
					this.doc.getElementById('lbHoverNav').style.display		= (this.showNavigation && this.navType == 1 ? '' : 'none');
					this.doc.getElementById('lbNavDisplay').style.display	= (this.showNavigation && this.navType == 2 ? '' : 'none');
					this.doc.getElementById('lbPause').style.display		= (this.showPlayPause && !this.isPaused ? '' : 'none');
					this.doc.getElementById('lbPlay').style.display			= (this.showPlayPause && !this.isPaused ? 'none' : '');
				} else {
					this.doc.getElementById('lbHoverNav').style.display		= (this.navType == 1 ? '' : 'none');
					this.doc.getElementById('lbNavDisplay').style.display	= (this.navType == 2 && this.imageArray.length > 1 ? '' : 'none');
					this.doc.getElementById('lbPause').style.display		= 'none';
					this.doc.getElementById('lbPlay').style.display			= 'none';
				}
				this.doc.getElementById('lbResize').style.display		= (this.showResize && this.canResize ? '' : 'none');
				this.doc.getElementById('lbClose').style.display		= (this.showClose ? '' : 'none');
				this.doc.getElementById('lbSave').style.display			= (this.showSave ? '' : 'none');
				if (this.showSave) {
					this.doc.getElementById('lbSave').href		= this.imageArray[this.activeImage]['href'];
				}
				if (this.easySave) {
					this.doc.getElementById('lbHoverNav').href	= this.imageArray[this.activeImage]['href'];
					this.doc.getElementById('lbPrev').href		= this.imageArray[this.activeImage]['href'];
					this.doc.getElementById('lbNext').href		= this.imageArray[this.activeImage]['href'];
					this.doc.getElementById('lbC2Cleft').href	= this.imageArray[this.activeImage]['href'];
					this.doc.getElementById('lbC2Cright').href	= this.imageArray[this.activeImage]['href'];
				}
			}
			this.doc.getElementById('lbInfo').style.display		= (this.HasInfo && this.showInfo ? '' : 'none');
			this.doc.getElementById('lbExif').style.display		= (this.HasExif && this.showExif ? '' : 'none');
			this.doc.getElementById('lbGeo').style.display		= (this.HasGeo && this.showGeo ? '' : 'none');
			this.doc.getElementById('lbBack').style.display		= 'none';
		}
		this.doc.getElementById('lbDetails').style.display			= (this.showDetails ? '' : 'none');
		this.doc.getElementById('lbImageContainer').style.display	= (this.isLyteframe || this.isShowTempFrame ? 'none' : '');
		this.doc.getElementById('lbIframeContainer').style.display	= (this.isLyteframe || this.isShowTempFrame ? '' : 'none');
		// 2007-11 coyaba: I don't have an idea what the next lines were for; since they caused problems on special circumstances I deactivated them
		/*try {
			this.doc.getElementById('lbIframe').src = this.frameArray[this.activeFrame][0];
		} catch(e) { }*/
	} else {
		this.showContentTimerArray[this.showContentTimerCount++] = setTimeout("myLytebox.showContent()", 200);
	}
	
	var lbWidth  = this.doc.getElementById('lbOuterContainer').offsetWidth;
	//var lbHeight = this.doc.getElementById('lbOuterContainer').offsetHeight + this.doc.getElementById('lbDetailsContainer').offsetHeight;
    var lbHeight = this.doc.getElementById('lbOuterContainer').offsetHeight;
	//alert(lbWidth + "/" + lbHeight);
};

LyteBox.prototype.updateDetails = function() {
	var object;
	var sTitle = (this.isShowTempFrame ? this.TempFrame[1] : (!this.isLyteframe ? this.imageArray[this.activeImage]['title'] : this.frameArray[this.activeFrame][1]));
	// 2007-10 coyaba, info overlay: info text present?
	if ( !this.showInfo && sTitle!=null && !this.isShowTempFrame && !this.isLyteframe && this.imageArray[this.activeImage]['infoString']!='' ) {
		if ( this.imageArray[this.activeImage]['onLoadInfo'] ) {
			// 2007-10 coyaba, if onLoadInfo is set show info overlay at once
			myLytebox.inlineInfo(1);
		} else {
			// 2007-10 coyaba, add info marker to caption if info text is present
			sTitle = sTitle + '<span id="lbInfoDisplayTrigger">(Info...)</span>';
		}
	}
	object = this.doc.getElementById('lbCaption');
	object.innerHTML = (sTitle == null ? '' : sTitle);
	object.style.display = '';
	
	// 2007-10 coyaba, add event handler for info marker if it has been defined
	object = this.doc.getElementById('lbInfoDisplayTrigger');
	if ( object!=undefined ) {
		this.doc.getElementById('lbInfoDisplayTrigger').onmouseover		= function() { myLytebox.inlineInfo(1); return false; };
		this.doc.getElementById('lbInfoDisplayTrigger').onmouseout		= function() { myLytebox.inlineInfo(0); return false; };
	}
	
	this.updateNav();
	this.doc.getElementById('lbDetailsContainer').style.display = '';
	object = this.doc.getElementById('lbNumberDisplay');
	if (this.isShowTempFrame){
		this.doc.getElementById('lbNavDisplay').style.display = 'none';
	} else if (this.isSlideshow && this.imageArray.length > 1) {
		object.style.display = '';
		object.innerHTML = this.compileSpecialString(this.textImageNum, eval(this.activeImage + 1), this.imageArray.length);
		this.doc.getElementById('lbNavDisplay').style.display = (this.navType == 2 && this.showNavigation ? '' : 'none');
	} else if (this.imageArray.length > 1 && !this.isLyteframe) {
		object.style.display = '';
		object.innerHTML = this.compileSpecialString(this.textImageNum, eval(this.activeImage + 1), this.imageArray.length);
		this.doc.getElementById('lbNavDisplay').style.display = (this.navType == 2 ? '' : 'none');
	} else if (this.frameArray.length > 1 && this.isLyteframe) {
		object.style.display = '';
		object.innerHTML = this.compileSpecialString(this.textPageNum, eval(this.activeFrame + 1), this.frameArray.length);
		this.doc.getElementById('lbNavDisplay').style.display = '';
	} else {
		this.doc.getElementById('lbNavDisplay').style.display = 'none';
	}
	this.appear('lbDetailsContainer', (this.doDetailAnimations ? 0 : 100));
};

LyteBox.prototype.updateNav = function() {
	if (this.isLyteframe) {
		if(this.activeFrame != 0) {
			var object = this.doc.getElementById('lbPrev2');
				object.style.display = '';
				object.onclick = function() {
					myLytebox.changeContent(myLytebox.activeFrame - 1); return false;
				};
		} else {
			this.doc.getElementById('lbPrev2_Off').style.display = '';
		}
		if(this.activeFrame != (this.frameArray.length - 1)) {
			var object = this.doc.getElementById('lbNext2');
				object.style.display = '';
				object.onclick = function() {
					myLytebox.changeContent(myLytebox.activeFrame + 1); return false;
				};
		} else {
			this.doc.getElementById('lbNext2_Off').style.display = '';
		}
	} else {
		if (this.activeImage != 0) { // Displays PREV if it is NOT a First slide
			var object = (this.navType == 2 ? this.doc.getElementById('lbPrev2') : this.doc.getElementById('lbPrev'));
				object.style.display = '';
				object.onclick = function() {
					if (myLytebox.isSlideshow && myLytebox.pauseOnPrevClick) { myLytebox.togglePlayPause("lbPause", "lbPlay"); }
					myLytebox.changeContent(myLytebox.activeImage - 1); return false;
				};
		} else { // Don't show PREV in navType = 1 if it IS a First slide
			if (this.clickToClose){
				if (this.imageArray.length == 1){
					this.doc.getElementById('lbC2Cleft').style.width	= (this.C2CrightSided ? '' : '100%');
					this.doc.getElementById('lbC2Cleft').style.display	= (this.C2CrightSided ? 'none' : '');
				} else {
				this.doc.getElementById('lbC2Cleft').style.display	= '';
				}
			}
			if (this.navType == 2) { this.doc.getElementById('lbPrev2_Off').style.display = ''; }
		}
		if (this.activeImage != (this.imageArray.length - 1)) { // Displays NEXT if it is NOT a Last slide
			var object = (this.navType == 2 ? this.doc.getElementById('lbNext2') : this.doc.getElementById('lbNext'));
				object.style.display = '';
				object.onclick = function() {
					if (myLytebox.isSlideshow && myLytebox.pauseOnNextClick) { myLytebox.togglePlayPause("lbPause", "lbPlay"); }
					myLytebox.changeContent(myLytebox.activeImage + 1); return false;
				};
		} else { // Don't show NEXT in navType = 1 if it IS a Last slide
			if (this.clickToClose){
				if (this.imageArray.length == 1){
					this.doc.getElementById('lbC2Cright').style.width	= (this.C2CrightSided ? '100%' : '');
					this.doc.getElementById('lbC2Cright').style.display	= (this.C2CrightSided ? '' : 'none');
				} else {
					this.doc.getElementById('lbC2Cright').style.display	= '';
				}
			}
			if (this.navType == 2) { this.doc.getElementById('lbNext2_Off').style.display = ''; }
		}
	}
	this.enableKeyboardNav();
};

LyteBox.prototype.enableKeyboardNav = function() {
	document.onkeydown = this.keyboardAction;
};

LyteBox.prototype.disableKeyboardNav = function() {
	document.onkeydown = '';
};

LyteBox.prototype.keyboardAction = function(e) {
	var keycode = key = escape = null;
	keycode	= (e == null) ? event.keyCode : e.which;
	key		= String.fromCharCode(keycode).toLowerCase();
	escape = (e == null) ? 27 : e.DOM_VK_ESCAPE;
	if ((key == 'x') || (key == myLytebox.hotkeyClose) || (keycode == escape)) {
		myLytebox.end();
	} else if ((key == myLytebox.hotkeyPrevious) || (keycode == 37)) {
		if (myLytebox.isShowTempFrame) {
				myLytebox.back();
		} else if (myLytebox.isLyteframe) {
			if(myLytebox.activeFrame != 0) {
				myLytebox.disableKeyboardNav();
				myLytebox.changeContent(myLytebox.activeFrame - 1);
			}
		} else {
			if(myLytebox.activeImage != 0) {
				myLytebox.disableKeyboardNav();
				myLytebox.changeContent(myLytebox.activeImage - 1);
			}
		}
	} else if ((key == myLytebox.hotkeyNext) || (keycode == 39)) {
		if (myLytebox.isShowTempFrame) {
			// ignore
		} else if (myLytebox.isLyteframe) {
			if(myLytebox.activeFrame != (myLytebox.frameArray.length - 1)) {
				myLytebox.disableKeyboardNav();
				myLytebox.changeContent(myLytebox.activeFrame + 1);
			}
		} else {
			if(myLytebox.activeImage != (myLytebox.imageArray.length - 1)) {
				myLytebox.disableKeyboardNav();
				myLytebox.changeContent(myLytebox.activeImage + 1);
			}
		}
	} else if (key == myLytebox.hotkeyResize) {
		if (!myLytebox.isShowTempFrame && !myLytebox.isLyteframe && myLytebox.canResize && myLytebox.showResize) {
			myLytebox.disableKeyboardNav();
			myLytebox.resize();
		}
	} else if (key == myLytebox.hotkeyInfo) {
		if (!myLytebox.isShowTempFrame && !myLytebox.isLyteframe && myLytebox.HasInfo && myLytebox.showInfo) {
			myLytebox.disableKeyboardNav();
			myLytebox.info();
		}
	} else if (key == myLytebox.hotkeyExif) {
		if (!myLytebox.isShowTempFrame && !myLytebox.isLyteframe && myLytebox.HasExif && myLytebox.showExif) {
			myLytebox.disableKeyboardNav();
			myLytebox.exif();
		}
	} else if (key == myLytebox.hotkeyGeo) {
		if (!myLytebox.isShowTempFrame && !myLytebox.isLyteframe && myLytebox.HasGeo && myLytebox.showGeo) {
			myLytebox.disableKeyboardNav();
			myLytebox.geo();
		}
	}
};

LyteBox.prototype.preloadNeighborImages = function() {
	if ( this.activeImage == (this.imageArray.length - 1) ) {
		var preloadNextImage = new Image();
		preloadNextImage.src = this.imageArray[0]['href'];
	} else if ( this.activeImage < (this.imageArray.length - 1) ) {
		var preloadNextImage = new Image();
		preloadNextImage.src = this.imageArray[this.activeImage + 1]['href'];
	}
	if( this.activeImage > 0 ) {
		var preloadPrevImage = new Image();
		preloadPrevImage.src = this.imageArray[this.activeImage - 1]['href'];
	}
};

LyteBox.prototype.togglePlayPause = function(hideID, showID) {
	if (this.isSlideshow && hideID == "lbPause") {
		for (var i = 0; i < this.slideshowIDCount; i++) { window.clearTimeout(this.slideshowIDArray[i]); }
	}
	this.doc.getElementById(hideID).style.display = 'none';
	this.doc.getElementById(showID).style.display = '';
	if (hideID == "lbPlay") {
		this.isPaused = false;
		if (this.activeImage == (this.imageArray.length - 1)) {
			this.end();
		} else {
			this.changeContent(this.activeImage + 1);
		}
	} else {
		this.isPaused = true;
	}
};

LyteBox.prototype.resize = function() {
	if (this.canResize) {
		if (this.autoResize) {
			this.autoResize	= false;
		} else {
			this.autoResize	= true;
		}
		this.changeContent(myLytebox.activeImage);
	}
	this.enableKeyboardNav();
};

LyteBox.prototype.info = function() {
	var back	= this.activeImage;
	var title	= this.imageArray[this.activeImage]['title'];
	var info	= this.imageArray[this.activeImage]['infoString'];
	// 2007-10 coyaba, additional file param
	var file	= this.imageArray[this.activeImage]['href'];
	this.isShowTempFrame = true;
	// 2007-10 coyaba, additional file param
	this.TempFrame[0] = this.compileSpecialString(this.linkInfo, info, file);
	this.TempFrame[1] = title;
	this.TempFrame[2] = back;
	this.changeContent();
};

LyteBox.prototype.exif = function() {
	var back	= this.activeImage;
	var title	= this.imageArray[this.activeImage]['title'];
	var file	= this.imageArray[this.activeImage]['href'];
	this.isShowTempFrame = true;
	this.TempFrame[0] = this.linkExif + file;
	this.TempFrame[1] = title;
	this.TempFrame[2] = back;
	this.changeContent();
};

// 2007-10 coyaba, geo support
LyteBox.prototype.geo = function() {
	var back	= this.activeImage;
	var title	= this.imageArray[this.activeImage]['title'];
	var file	= this.imageArray[this.activeImage]['href'];
	this.isShowTempFrame = true;
	this.TempFrame[0] = this.linkGeo + file;
	this.TempFrame[1] = title;
	this.TempFrame[2] = back;
	this.changeContent();
};

LyteBox.prototype.back = function() {
	this.isShowTempFrame = false;
	this.changeContent(this.TempFrame[2]);
};

LyteBox.prototype.clearFrame = function() {
	var iframe = myLytebox.doc.getElementById('lbIframe');
	//if (iframe.src != null && iframe.src != '' && iframe.src != 'about:blank') {
		iframe.src = 'about:blank';
	//}
};

LyteBox.prototype.end = function(caller) {
	var closeClick = (caller == 'slideshow' ? false : true);
	this.disableKeyboardNav();
	this.doc.getElementById('lbMain').style.display = 'none';
	this.doc.getElementById('lbImage').style.display = 'none';
	this.clearFrame();
	if (this.isSlideshow && this.isPaused && !closeClick) {
		return;
	}
	this.fade('lbOverlay', (this.doFade ? this.maxOpacity : 0));
	// 2007-10 coyaba, show selects in ie and scrollbars
	this.toggleElements('visible');
	// 2007-10 coyaba, scroll back to last view position
	this.setScroll(0, this.yPos);
	if (this.hideFlash) { this.toggleFlash('visible'); }
	if (this.isSlideshow) {
		for (var i = 0; i < this.slideshowIDCount; i++) { window.clearTimeout(this.slideshowIDArray[i]); }
	}
};

LyteBox.prototype.checkFrame = function() {
	if (window.parent.frames[window.name] && (parent.document.getElementsByTagName('frameset').length <= 0)) {
		this.isFrame = true;
		this.lytebox = "window.parent." + window.name + ".myLytebox";
		this.doc = parent.document;
	} else {
		this.isFrame = false;
		this.lytebox = "myLytebox";
		this.doc = document;
	}
};

LyteBox.prototype.getPixelRate = function(cur, img) {
	var diff = (img > cur) ? img - cur : cur - img;
	if (diff >= 0 && diff <= 100) { return 10; }
	if (diff > 100 && diff <= 200) { return 15; }
	if (diff > 200 && diff <= 300) { return 20; }
	if (diff > 300 && diff <= 400) { return 25; }
	if (diff > 400 && diff <= 500) { return 30; }
	if (diff > 500 && diff <= 600) { return 35; }
	if (diff > 600 && diff <= 700) { return 40; }
	if (diff > 700) { return 45; }
};

LyteBox.prototype.appear = function(id, opacity) {
	var object = this.doc.getElementById(id).style;
	object.opacity = (opacity / 100);
	object.MozOpacity = (opacity / 100);
	object.KhtmlOpacity = (opacity / 100);
	object.filter = "alpha(opacity=" + (opacity + 10) + ")";
	if (opacity == 100 && (id == 'lbImage' || id == 'lbIframe')) {
		try { object.removeAttribute("filter"); } catch(e) {}	/* Fix added for IE Alpha Opacity Filter bug. */
		this.updateDetails();
	} else if (opacity >= this.maxOpacity && id == 'lbOverlay') {
		for (var i = 0; i < this.overlayTimerCount; i++) { window.clearTimeout(this.overlayTimerArray[i]); }
		return;
	} else if (opacity >= 100 && id == 'lbDetailsContainer') {
		try { object.removeAttribute("filter"); } catch(e) {}	/* Fix added for IE Alpha Opacity Filter bug. */
		for (var i = 0; i < this.imageTimerCount; i++) { window.clearTimeout(this.imageTimerArray[i]); }
		this.doc.getElementById('lbOverlay').style.height = this.getPageSize()[1] + "px";
	} else {
		if (id == 'lbOverlay') {
			this.overlayTimerArray[this.overlayTimerCount++] = setTimeout("myLytebox.appear('" + id + "', " + (opacity+20) + ")", 1);
		} else if ( id == 'lbInfoDisplay' ) {
			object.filter = "alpha(opacity=" + (opacity - 10) + ")";
			if ( opacity>0 ) {
				object.display = '';
			}
			this.infoTimerArray[this.infoTimerCount++] = setTimeout("myLytebox.appear('" + id + "', " + (opacity+10) + ")", 1);
			if ( opacity >= 80 ) {
				for (var i = 0; i < this.infoTimerCount; i++) {
					window.clearTimeout(this.infoTimerArray[i]);
				}
				return;
			}
		} else {
			this.imageTimerArray[this.imageTimerCount++] = setTimeout("myLytebox.appear('" + id + "', " + (opacity+10) + ")", 1);
		}
	}
};

LyteBox.prototype.fade = function(id, opacity) {
	var object = this.doc.getElementById(id).style;
	object.opacity = (opacity / 100);
	object.MozOpacity = (opacity / 100);
	object.KhtmlOpacity = (opacity / 100);
	object.filter = "alpha(opacity=" + opacity + ")";
	if (opacity <= 0) {
		try {
			object.display = 'none';
		} catch(err) { }
	} else if (id == 'lbOverlay') {
		this.overlayTimerArray[this.overlayTimerCount++] = setTimeout("myLytebox.fade('" + id + "', " + (opacity-20) + ")", 1);
	} else {
		this.timerIDArray[this.timerIDCount++] = setTimeout("myLytebox.fade('" + id + "', " + (opacity-10) + ")", 1);
	}
};

LyteBox.prototype.resizeW = function(id, curW, maxW, pixelrate, speed) {
	if (!this.hDone) {
		this.resizeWTimerArray[this.resizeWTimerCount++] = setTimeout("myLytebox.resizeW('" + id + "', " + curW + ", " + maxW + ", " + pixelrate + ")", 100);
		return;
	}
	var object = this.doc.getElementById(id);
	var timer = speed ? speed : (this.resizeDuration/2);
	var newW = (this.doAnimations ? curW : maxW);
	object.style.width = (newW) + "px";
	if (newW < maxW) {
		newW += (newW + pixelrate >= maxW) ? (maxW - newW) : pixelrate;
	} else if (newW > maxW) {
		newW -= (newW - pixelrate <= maxW) ? (newW - maxW) : pixelrate;
	}
	this.resizeWTimerArray[this.resizeWTimerCount++] = setTimeout("myLytebox.resizeW('" + id + "', " + newW + ", " + maxW + ", " + pixelrate + ", " + (timer+0.02) + ")", timer+0.02);
	if (parseInt(object.style.width) == maxW) {
		this.wDone = true;
		for (var i = 0; i < this.resizeWTimerCount; i++) { window.clearTimeout(this.resizeWTimerArray[i]); }
	}
};

LyteBox.prototype.resizeH = function(id, curH, maxH, pixelrate, speed) {
	var timer = speed ? speed : (this.resizeDuration/2);
	var object = this.doc.getElementById(id);
	var newH = (this.doAnimations ? curH : maxH);
	object.style.height = (newH) + "px";
	if (newH < maxH) {
		newH += (newH + pixelrate >= maxH) ? (maxH - newH) : pixelrate;
	} else if (newH > maxH) {
		newH -= (newH - pixelrate <= maxH) ? (newH - maxH) : pixelrate;
	}
	this.resizeHTimerArray[this.resizeHTimerCount++] = setTimeout("myLytebox.resizeH('" + id + "', " + newH + ", " + maxH + ", " + pixelrate + ", " + (timer+.02) + ")", timer+.02);
	if (parseInt(object.style.height) == maxH) {
		this.hDone = true;
		for (var i = 0; i < this.resizeHTimerCount; i++) { window.clearTimeout(this.resizeHTimerArray[i]); }
	}
};

LyteBox.prototype.getPageScroll = function() {
	if (self.pageYOffset) {
		return this.isFrame ? parent.pageYOffset : self.pageYOffset;
	} else if (this.doc.documentElement && this.doc.documentElement.scrollTop){
		return this.doc.documentElement.scrollTop;
	} else if (document.body) {
		return this.doc.body.scrollTop;
	}
};

LyteBox.prototype.getPageSize = function() {	
	var xScroll, yScroll, windowWidth, windowHeight;
	if (window.innerHeight && window.scrollMaxY) {
		xScroll = this.doc.scrollWidth;
		yScroll = (this.isFrame ? parent.innerHeight : self.innerHeight) + (this.isFrame ? parent.scrollMaxY : self.scrollMaxY);
	} else if (this.doc.body.scrollHeight > this.doc.body.offsetHeight){
		xScroll = this.doc.body.scrollWidth;
		yScroll = this.doc.body.scrollHeight;
	} else {
		xScroll = this.doc.getElementsByTagName("html").item(0).offsetWidth;
		yScroll = this.doc.getElementsByTagName("html").item(0).offsetHeight;
		xScroll = (xScroll < this.doc.body.offsetWidth) ? this.doc.body.offsetWidth : xScroll;
		yScroll = (yScroll < this.doc.body.offsetHeight) ? this.doc.body.offsetHeight : yScroll;
	}
	if (self.innerHeight) {
		windowWidth = (this.isFrame) ? parent.innerWidth : self.innerWidth;
		windowHeight = (this.isFrame) ? parent.innerHeight : self.innerHeight;
	} else if (document.documentElement && document.documentElement.clientHeight) {
		windowWidth = this.doc.documentElement.clientWidth;
		windowHeight = this.doc.documentElement.clientHeight;
	} else if (document.body) {
		windowWidth = this.doc.getElementsByTagName("html").item(0).clientWidth;
		windowHeight = this.doc.getElementsByTagName("html").item(0).clientHeight;
		windowWidth = (windowWidth == 0) ? this.doc.body.clientWidth : windowWidth;
		windowHeight = (windowHeight == 0) ? this.doc.body.clientHeight : windowHeight;
	}
	var pageHeight = (yScroll < windowHeight) ? windowHeight : yScroll;
	var pageWidth = (xScroll < windowWidth) ? windowWidth : xScroll;
	return new Array(pageWidth, pageHeight, windowWidth, windowHeight);
};

LyteBox.prototype.toggleFlash = function(state) {
	var objects = this.doc.getElementsByTagName("object");
	for (var i = 0; i < objects.length; i++) {
		objects[i].style.visibility = (state == "hide") ? 'hidden' : 'visible';
	}
	var embeds = this.doc.getElementsByTagName("embed");
	for (var i = 0; i < embeds.length; i++) {
		embeds[i].style.visibility = (state == "hide") ? 'hidden' : 'visible';
	}
	if (this.isFrame) {
		for (var i = 0; i < parent.frames.length; i++) {
			try {
				objects = parent.frames[i].window.document.getElementsByTagName("object");
				for (var j = 0; j < objects.length; j++) {
					objects[j].style.visibility = (state == "hide") ? 'hidden' : 'visible';
				}
			} catch(e) { }
			try {
				embeds = parent.frames[i].window.document.getElementsByTagName("embed");
				for (var j = 0; j < embeds.length; j++) {
					embeds[j].style.visibility = (state == "hide") ? 'hidden' : 'visible';
				}
			} catch(e) { }
		}
	}
};

// 2007-10 coyaba, show/hide select boxes (ie 6 and below only) and show/hide scrollbars
LyteBox.prototype.toggleElements = function(state) {
	// show/hide select boxes
	if (this.ie && !this.ie7) {	
		var selects = this.doc.getElementsByTagName("select");
		for (var i = 0; i < selects.length; i++ ) {
			selects[i].style.visibility = (state == "hide") ? 'hidden' : 'visible';
		}
		if (this.isFrame) {
			for (var i = 0; i < parent.frames.length; i++) {
				try {
					selects = parent.frames[i].window.document.getElementsByTagName("select");
					for (var j = 0; j < selects.length; j++) {
						selects[j].style.visibility = (state == "hide") ? 'hidden' : 'visible';
					}
				} catch(e) { }
			}
		}
	}
	
	// disable/enable page scrolling
	var desObj;
	if (this.isFrame) {
		if (this.ie && this.doc.compatMode != 'BackCompat') { // IE6 and above in standards mode
			desObj = parent.document.getElementsByTagName('html')[0];
		} else {
			desObj = parent.document.body;
		}		
	} else {
		if (this.ie && this.doc.compatMode != 'BackCompat') { // IE6 and above in standards mode
			desObj = document.getElementsByTagName('html')[0];
		} else {
			desObj = document.body;
		}		
	}
	desObj.style.overflow = (state == "hide") ? "hidden" : '';
};

// 2007-10 coyaba
LyteBox.prototype.setScroll = function(x, y){
	window.scrollTo(x, y); 
};

LyteBox.prototype.pause = function(numberMillis) {
	var now = new Date();
	var exitTime = now.getTime() + numberMillis;
	while (true) {
		now = new Date();
		if (now.getTime() > exitTime) { return; }
	}
};

LyteBox.prototype.getInfoString = function(string){
	if (string == null || string == '') return '';
	var string = string.replace(/\r\n/g,"<br/>");
	var string = string.replace(/\n/g,"<br/>");
	var string = string.replace(/\r/g,"<br/>");
	var info = /\[info\](.*?)\[\/info\]/i.exec(string);
	if (info!=null)
		return info[1];
	else
		return '';
};

LyteBox.prototype.getShowExif = function(string){
	if (string == null || string == '') return false;
	var exif = /\[exif=true\]/i.exec(string);
	if (exif!=null)
		return true;
	else
		return false;
};

// 2007-10 coyaba, geo support
LyteBox.prototype.getShowGeo = function(string){
	if (string == null || string == '') return false;
	var geo = /\[geo=true\]/i.exec(string);
	if (geo!=null)
		return true;
	else
		return false;
};

// 2007-10 coyaba, show info overlay on startup?
LyteBox.prototype.getOnLoadInfo = function(string){
	if (string == null || string == '') return false;
	var onLoadInfo = /\[onLoadInfo=true\]/i.exec(string);
	if (onLoadInfo!=null)
		return true;
	else
		return false;
};

// 2007-10 coyaba, hide title from info overlay?
LyteBox.prototype.getNoTitleInfo = function(string){
	if (string == null || string == '') return false;
	var noTitleInfo = /\[noTitleInfo=true\]/i.exec(string);
	if (noTitleInfo!=null)
		return true;
	else
		return false;
};

LyteBox.prototype.compileSpecialString = function() {
	if (arguments.length==0){
		return false;
	} else if (arguments.length==1){
		return arguments[0];
	} else {
		var items = arguments.length;
		var str = arguments[0];
			for (i = 1;i < items;i++){
			str = str.replace('%' + i,arguments[i]);
			}
		return str;
	}
};

// 2007-10 coyaba, handler for info overlay
LyteBox.prototype.inlineInfo = function(int_onoff) {
	var object = this.doc.getElementById('lbInfoDisplay');
	if ( !this.isShowTempFrame && !this.isLyteframe ) {
		var str_info = '';
		if ( this.imageArray[this.activeImage]['infoString']!='' ) {
			str_info = this.imageArray[this.activeImage]['infoString'];
			if ( !this.imageArray[this.activeImage]['noTitleInfo'] ) {
				str_info = '<b>' + this.imageArray[this.activeImage]['title'] + '</b><br />' + str_info;
			}
			if ( int_onoff==1 ) {
				object.innerHTML = str_info;
				this.appear("lbInfoDisplay", (this.doInfoFade ? 0 : this.infoMaxOpacity));
			} else {
				this.fade("lbInfoDisplay", (this.doInfoFade ? this.infoMaxOpacity : 0));
			}
		}
	}
};

// 2007-10 coyaba, replaces onload handler by 'on_dom_load'
addDOMLoadEvent(function() {
	myLytebox = new LyteBox();
	if ( typeof(lyteboxNavType)!="undefined" && (lyteboxNavType==1 || lyteboxNavType==2) ) {
		myLytebox.navType = lyteboxNavType;
	}
});

/*
 * (c)2006 Dean Edwards/Matthias Miller/John Resig
 * Special thanks to Dan Webb's domready.js Prototype extension
 * and Simon Willison's addLoadEvent
 * For more info, see:
 * http://dean.edwards.name/weblog/2006/06/again/
 * http://www.vivabit.com/bollocks/2006/06/21/a-dom-ready-extension-for-prototype
 * http://simon.incutio.com/archive/2004/05/26/addLoadEvent
 * Thrown together by Jesse Skinner (http://www.thefutureoftheweb.com/)
 */
function addDOMLoadEvent(func) {
	if (!window.__load_events) {
		var init = function () {
			if (arguments.callee.done) return;
			arguments.callee.done = true;
			if (window.__load_timer) {
				clearInterval(window.__load_timer);
				window.__load_timer = null;
			}
			for (var i=0;i < window.__load_events.length;i++) {
				window.__load_events[i]();
			}
			window.__load_events = null;
		};
		if (document.addEventListener) {
			document.addEventListener("DOMContentLoaded", init, false);
		}
		/*@cc_on @*/
		/*@if (@_win32)
			document.write("<scr"+"ipt id=__ie_onload defer src=//0><\/scr"+"ipt>");
			var script = document.getElementById("__ie_onload");
			script.onreadystatechange = function() {
				if (this.readyState == "complete") {
					init();
				}
			};
		/*@end @*/
		if (/WebKit/i.test(navigator.userAgent)) {
			window.__load_timer = setInterval(function() {
				if (/loaded|complete/.test(document.readyState)) {
					init();
				}
			}, 10);
		}
		window.onload = init;
		window.__load_events = [];
	}
	window.__load_events.push(func);
};
