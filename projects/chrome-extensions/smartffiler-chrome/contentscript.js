/*!
 * jQuery Nearest plugin v1.3.0
 *
 * Finds elements closest to a single point based on screen location and pixel dimensions
 * http://gilmoreorless.github.io/jquery-nearest/
 * Open source under the MIT licence: http://gilmoreorless.mit-license.org/2011/
 *
 * Requires jQuery 1.4 or above
 * Also supports Ben Alman's "each2" plugin for faster looping (if available)
 */

/**
 * Method signatures:
 *
 * $.nearest({x, y}, selector) - find $(selector) closest to point
 * $(elem).nearest(selector) - find $(selector) closest to elem
 * $(elemSet).nearest({x, y}) - filter $(elemSet) and return closest to point
 *
 * Also:
 * $.furthest()
 * $(elem).furthest()
 *
 * $.touching()
 * $(elem).touching()
 */
;(function ($, undefined) {

	/**
	 * Internal method that does the grunt work
	 *
	 * @param mixed selector Any valid jQuery selector providing elements to filter
	 * @param hash options Key/value list of options for matching elements
	 * @param mixed thisObj (optional) Any valid jQuery selector that represents self
	 *                      for the "includeSelf" option
	 * @return array List of matching elements, can be zero length
	 */
	var rPerc = /^([\d.]+)%$/;
	function nearest(selector, options, thisObj) {
		// Normalise selector and dimensions
		selector || (selector = 'div'); // I STRONGLY recommend passing in a selector
		var $container = $(options.container),
			containerOffset = $container.offset() || {left: 0, top: 0},
			containerWH = [
				$container.width() || 0,
				$container.height() || 0
			],
			containerProps = {
				// prop: [min, max]
				x: [containerOffset.left, containerOffset.left + containerWH[0]],
				y: [containerOffset.top, containerOffset.top + containerWH[1]],
				w: [0, containerWH[0]],
				h: [0, containerWH[1]]
			},
			prop, dims, match;
		for (prop in containerProps) if (containerProps.hasOwnProperty(prop)) {
			match = rPerc.exec(options[prop]);
			if (match) {
				dims = containerProps[prop];
				options[prop] = (dims[1] - dims[0]) * match[1] / 100 + dims[0];
			}
		}

		// Deprecated options - remove in 2.0
		if (options.sameX === false && options.checkHoriz === false) {
			options.sameX = !options.checkHoriz;
		}
		if (options.sameY === false && options.checkVert === false) {
			options.sameY = !options.checkVert;
		}

		// Get elements and work out x/y points
		var $all = $container.find(selector),
			cache = [],
			furthest = !!options.furthest,
			checkX = !options.sameX,
			checkY = !options.sameY,
			onlyX  = !!options.onlyX,
			onlyY  = !!options.onlyY,
			compDist = furthest ? 0 : Infinity,
			point1x = parseFloat(options.x) || 0,
			point1y = parseFloat(options.y) || 0,
			point2x = parseFloat(point1x + options.w) || point1x,
			point2y = parseFloat(point1y + options.h) || point1y,
			tolerance = parseFloat(options.tolerance) || 0,
			hasEach2 = !!$.fn.each2,
			// Shortcuts to help with compression
			min = Math.min,
			max = Math.max;

		// Normalise the remaining options
		if (!options.includeSelf && thisObj) {
			$all = $all.not(thisObj);
		}
		if (tolerance < 0) {
			tolerance = 0;
		}
		// Loop through all elements and check their positions
		$all[hasEach2 ? 'each2' : 'each'](function (i, elem) {
			var $this = hasEach2 ? elem : $(this),
				off = $this.offset(),
				x = off.left,
				y = off.top,
				w = $this.outerWidth(),
				h = $this.outerHeight(),
				x2 = x + w,
				y2 = y + h,
				maxX1 = max(x, point1x),
				minX2 = min(x2, point2x),
				maxY1 = max(y, point1y),
				minY2 = min(y2, point2y),
				intersectX = minX2 >= maxX1,
				intersectY = minY2 >= maxY1,
				distX, distY, distT, isValid;
			if (
				// .nearest() / .furthest()
				(checkX && checkY) ||
				// .touching()
				(!checkX && !checkY && intersectX && intersectY) ||
				// .nearest({sameY: true})
				(checkX && intersectY) ||
				// .nearest({sameX: true})
				(checkY && intersectX) ||
				// .nearest({onlyX: true})
				(checkX && onlyX) ||
				// .nearest({onlyY: true})
				(checkY && onlyY)
			) {
				distX = intersectX ? 0 : maxX1 - minX2;
				distY = intersectY ? 0 : maxY1 - minY2;
				if (onlyX || onlyY) {
					distT = onlyX ? distX : distY;
				} else {
					distT = intersectX || intersectY ?
						max(distX, distY) :
						Math.sqrt(distX * distX + distY * distY);
				}
				isValid = furthest ?
					distT >= compDist - tolerance :
					distT <= compDist + tolerance;
				if (isValid) {
					compDist = furthest ?
						max(compDist, distT) :
						min(compDist, distT);
					cache.push({
						node: this,
						dist: distT
					});
				}
			}
		});
		// Make sure all cached items are within tolerance range
		var len = cache.length,
			filtered = [],
			compMin, compMax,
			i, item;
		if (len) {
			if (furthest) {
				compMin = compDist - tolerance;
				compMax = compDist;
			} else {
				compMin = compDist;
				compMax = compDist + tolerance;
			}
			for (i = 0; i < len; i++) {
				item = cache[i];
				if (item.dist >= compMin && item.dist <= compMax) {
					filtered.push(item.node);
				}
			}
		}
		return filtered;
	}

	$.each(['nearest', 'furthest', 'touching'], function (i, name) {

		// Internal default options
		// Not exposed publicly because they're method-dependent and easily overwritten anyway
		var defaults = {
			x: 0, // X position of top left corner of point/region
			y: 0, // Y position of top left corner of point/region
			w: 0, // Width of region
			h: 0, // Height of region
			tolerance:   1, // Distance tolerance in pixels, mainly to handle fractional pixel rounding bugs
			container:   document, // Container of objects for calculating %-based dimensions
			furthest:    name == 'furthest', // Find max distance (true) or min distance (false)
			includeSelf: false, // Include 'this' in search results (t/f) - only applies to $(elem).func(selector) syntax
			sameX: name === 'touching', // Only match for the same X axis values (t/f)
			sameY: name === 'touching', // Only match for the same Y axis values (t/f)
			onlyX: false, // Only check X axis variations (t/f)
			onlyY: false  // Only check Y axis variations (t/f)
		};

		/**
		 * $.nearest() / $.furthest() / $.touching()
		 *
		 * Utility functions for finding elements near a specific point or region on screen
		 *
		 * @param hash point Co-ordinates for the point or region to measure from
		 *                   "x" and "y" keys are required, "w" and "h" keys are optional
		 * @param mixed selector Any valid jQuery selector that provides elements to filter
		 * @param hash options (optional) Extra filtering options
		 *                     Not technically needed as the options could go on the point object,
		 *                     but it's good to have a consistent API
		 * @return jQuery object containing matching elements in selector
		 */
		$[name] = function (point, selector, options) {
			if (!point || point.x === undefined || point.y === undefined) {
				return $([]);
			}
			var opts = $.extend({}, defaults, point, options || {});
			return $(nearest(selector, opts));
		};

		/**
		 * SIGNATURE 1:
		 *   $(elem).nearest(selector) / $(elem).furthest(selector) / $(elem).touching(selector)
		 *
		 *   Finds all elements in selector that are nearest to/furthest from elem
		 *
		 *   @param mixed selector Any valid jQuery selector that provides elements to filter
		 *   @param hash options (optional) Extra filtering options
		 *   @return jQuery object containing matching elements in selector
		 *
		 * SIGNATURE 2:
		 *   $(elemSet).nearest(point) / $(elemSet).furthest(point) / $(elemSet).touching(point)
		 *
		 *   Filters elemSet to return only the elements nearest to/furthest from point
		 *   Effectively a wrapper for $.nearest(point, elemSet) but with the benefits of method chaining
		 *
		 *   @param hash point Co-ordinates for the point or region to measure from
		 *   @return jQuery object containing matching elements in elemSet
		 */
		$.fn[name] = function (selector, options) {
			if (!this.length) {
				return this.pushStack([]);
			}
			var opts;
			if (selector && $.isPlainObject(selector)) {
				opts = $.extend({}, defaults, selector, options || {});
				return this.pushStack(nearest(this, opts));
			}
			var offset = this.offset(),
				dimensions = {
					x: offset.left,
					y: offset.top,
					w: this.outerWidth(),
					h: this.outerHeight()
				};
			opts = $.extend({}, defaults, dimensions, options || {});
			return this.pushStack(nearest(selector, opts, this));
		};
	});
})(jQuery);





// // // Copyright (c) 2012 The Chromium Authors. All rights reserved.
// // // Use of this source code is governed by a BSD-style license that can be
// // // found in the LICENSE file.
// // 
// // /**
// //  * Global variable containing the query we'd like to pass to Flickr. In this
// //  * case, kittens!
// //  *
// //  * @type {string}
// //  */
// // var QUERY = 'kittens';
// // 
// // var kittenGenerator = {
// //   /**
// //    * Flickr URL that will give us lots and lots of whatever we're looking for.
// //    *
// //    * See http://www.flickr.com/services/api/flickr.photos.search.html for
// //    * details about the construction of this URL.
// //    *
// //    * @type {string}
// //    * @private
// //    */
// //   searchOnFlickr_: 'https://secure.flickr.com/services/rest/?' +
// //       'method=flickr.photos.search&' +
// //       'api_key=90485e931f687a9b9c2a66bf58a3861a&' +
// //       'text=' + encodeURIComponent(QUERY) + '&' +
// //       'safe_search=1&' +
// //       'content_type=1&' +
// //       'sort=interestingness-desc&' +
// //       'per_page=20',
// // 
// //   /**
// //    * Sends an XHR GET request to grab photos of lots and lots of kittens. The
// //    * XHR's 'onload' event is hooks up to the 'showPhotos_' method.
// //    *
// //    * @public
// //    */
// //   requestKittens: function() {
// //     var req = new XMLHttpRequest();
// //     req.open("GET", this.searchOnFlickr_, true);
// //     req.onload = this.showPhotos_.bind(this);
// //     req.send(null);
// //   },
// // 
// //   /**
// //    * Handle the 'onload' event of our kitten XHR request, generated in
// //    * 'requestKittens', by generating 'img' elements, and stuffing them into
// //    * the document for display.
// //    *
// //    * @param {ProgressEvent} e The XHR ProgressEvent.
// //    * @private
// //    */ type="text/javascript" 
// //   showPhotos_: function (e) {
// //     var kittens = e.target.responseXML.querySelectorAll('photo');
// //     for (var i = 0; i < kittens.length; i++) {
// //       var img = document.createElement('img');
// //       img.src = this.constructKittenURL_(kittens[i]);
// //       img.setAttribute('alt', kittens[i].getAttribute('title'));
// //       document.body.appendChild(img);
// //     }
// //   },
// // 
// //   /**
// //    * Given a photo, construct a URL using the method outlined at
// //    * http://www.flickr.com/services/api/misc.urlKittenl
// //    *
// //    * @param {DOMElement} A kitten.
// //    * @return {string} The kitten's URL.
// //    * @private
// //    */
// //   constructKittenURL_: function (photo) {
// //     return "http://farm" + photo.getAttribute("farm") +
// //         ".static.flickr.com/" + photo.getAttribute("server") +
// //         "/" + photo.getAttribute("id") +
// //         "_" + photo.getAttribute("secret") +
// //         "_s.jpg";
// //   }
// // };
// // 
// // // Run our kitten generation script as soon as the document's DOM is ready.
// // document.addEventListener('DOMContentLoaded', function () {
// //   kittenGenerator.requestKittens();
// // });
// 
// // Compute the edit distance between the two given strings
// levenshtein = function(a, b){
//   if(a.length == 0) return b.length; 
//   if(b.length == 0) return a.length; 
//  
//   var matrix = [];
//  
//   // increment along the first column of each row
//   var i;
//   for(i = 0; i <= b.length; i++){
//     matrix[i] = [i];
//   }
//  
//   // increment each column in the first row
//   var j;
//   for(j = 0; j <= a.length; j++){
//     matrix[0][j] = j;
//   }
//  
//   // Fill in the rest of the matrix
//   for(i = 1; i <= b.length; i++){
//     for(j = 1; j <= a.length; j++){
//       if(b.charAt(i-1) == a.charAt(j-1)){
//         matrix[i][j] = matrix[i-1][j-1];
//       } else {
//         matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
//                                 Math.min(matrix[i][j-1] + 1, // insertion
//                                          matrix[i-1][j] + 1)); // deletion
//       }
//     }
//   }
//  
//   return matrix[b.length][a.length];
// };
// 
// 
// 
// function fillbtn(){
//   
//     alert("Clicked fill");
//   
//   
// }
// 
// var selectFormEntries = function(){
//  alert(document.title);
// $("input[type!='hidden'][value=''],textarea,select[value='']").each(
//   function(a,b){
//     var key = $("label[for='" + b.id + "']").text();
//     var value;
//     var entry = {};
//     if (key==null){
//       if ((b.type=="checkbox") || (b.type=="radio")){
//         key = $("input[type='checkbox']").next().text();
//       
//       }
//     }
//     value = $(b).val().toString();
//     entry['key'] = key.toString();
//     entry['value'] = value;
//     alert("Key: " + key + " " + "Value: " + value);
//     
//     
//   });
// };
// 
// 
// 
// 
// 
// 
// 
// 
// document.addEventListener('DOMContentLoaded', function () {
//   alert("DOM LOADED!");
//   alert(document.body.innerText);
//   var saveb = document.getElementById("savebtn"); 
//   savebtn.addEventListener('click', function savebtn(){
//     
//     var entries = $("input").each(function(a){
//       alert(a.val());
//       
//     });
//     
//     
//     
//     alert("Save clicked!");
//     
//     
//     
//     
//   });
//   var fillbtn = document.getElementById("fillbtn"); 
//   fillbtn.addEventListener('click', function fillbtn(){
//     alert(document.title);
//     chrome.extension.sendRequest(document.title, function(response) {});
//     //chrome.extension.sendRequest("Hello World",function(response_str){alert(response_str);});
//     //selectFormEntries();
//     
//   });
//   var backupbtn = document.getElementById("backupbtn"); 
//   backupbtn.addEventListener('click', function fillbtn(){
//     alert("Backup clicked!");
//     
//   });
//   var loadbtn = document.getElementById("loadbtn"); 
//   loadbtn.addEventListener('click', function loadbtn(){
//     alert("Load clicked!");
//     
//   });
// 
// 
// 
// 
//   
// });


var searchInputLabel = function(node){
  if ((node.text()!='') && (node.text()!=null) && (node.text()!=undefined)){
    console.log("I found the label: " + node.text());
    return node.text();
    
  } else {
    if (node.prev()!=null){
      console.log("prev");
      searchInputLabel(node.prev());
    } else {
      console.log("parent");
      searchInputLabel(node.parent());
    }
  
  }
  
}

jQuery.fn.justtext = function() {
   
    return $(this)  .clone()
            .children()
            .remove()
            .end()
            .text();
 
};



function normalize_key(str){
 return  str.replace(/\s/g,'').replace(/\n/g,'').replace(/\t/g,'');
}



var selectFormEntries = function(){
var entries = [];
console.log(document.title + " from selectFormEntries");
$("input[type!='hidden'],textarea").each(
  function(a,b){
    var key = $("label[for='" + b.id + "']").text();
    var value;
    var entry = {};
    if ((key==null) || (key=='') || (key==undefined)){
      if ((b.type=="checkbox") || (b.type=="radio")){
	console.log("Im searching label for a radio button, i could not find it as a label tag.");
        key = $("input[type='checkbox'],input[type='radio']").next().text();
      
      } else {
	console.log("I cant find label tag as itself going to searchInputLabel as normal text");
	//key = searchInputLabel($(b));
	var elems = $("*").filter(function(){
	                            return ($(this).justtext().length > 0)
	                          });
        //console.log("NEAREST of " + $(b).attr("id") + ": " + ($(b).nearest(elems)).justtext());
      //console.log("NEAREST of " + $(b).attr("id") + ": " + key.attr("id"));
	key = $(b).attr("id");
	value = $(b).attr("value");
	
      }
    }
    if (key!=undefined){
      value = $(b).val().toString();
      entry['key'] = $(b).attr("id") + "__" + normalize_key(key.toString());
      entry['value'] = value;
      entry['id'] = $(b).attr("id");
      entries.push(entry);      
      console.log("Key: " + key + " " + "Value: " + value + " Id: " + entry["id"]);
      
    }
    
  });

   return entries;

};


 
 
 
 
     chrome.extension.onRequest.addListener(
       function(request, sender, sendResponse) {
         var req = JSON.parse(request);
	 if (req.type=="retrieve_entries"){
	   var formEntries = selectFormEntries();
           sendResponse(JSON.stringify(formEntries));
	 } else {
	   if (req.type=="fillform"){
	     var fillwiths = req.entries;
	     for (var i=0;i<fillwiths.length;i++){
	       $("#" + fillwiths[i].fill).val(fillwiths[i].with.value);
	       alert("Filled " + fillwiths[i].fill + " with " + fillwiths[i].with.value );
	       
	     }
	   }
	  }
	}
       
     );


   $(document).ready(function(){
     
     $("form").submit(function(){
        alert("Is the form data OK?");
	//chrome.extension.sendRequest(document.title,
        /*
	chrome.extension.sendRequest({"save": formEntries } ,
          function(response){
	    //while (response==undefined){};
            alert("From contentscript save form data" + JSON.stringify(response));  
  
          }); */
      }
       
     );  
     


     
  

     /*
  chrome.extension.sendRequest({ "tofill": formEntries } ,
    //chrome.extension.sendRequest(document.title ,
     function(response){
       //while (response==undefined){};
       alert("From contentscript tofill got response: " + JSON.stringify(response));
       if (response!=undefined){ 
         tofill = JSON.parse(response);
         for (var i=0;i<tofill.tofill.length;i++){
           var entry = tofill.tofill[i];
	   $("#" + entry.id).val(entry.value);
	 }
         console.log("autofill run successfully");
       }
     }
   );

     */
   });

     
