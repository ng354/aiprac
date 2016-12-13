'use strict';

/**
 * @ngdoc function
 * @name gitHubApp.controller:ImageFiltersCtrl
 * @description
 * # ImageFiltersCtrl
 * Controller of the gitHubApp
 */
angular.module('gitHubApp')
  .controller('ImageFiltersCtrl', function ($scope, $rootScope, $timeout, $location) {
    $rootScope.navbarActive = "demos";

    $scope.filter = "Grayscale";
    $scope.url = "images/cat_grayscale.png";
    $scope.disableTrain = false;
    $scope.setFilter = function(filter){
    	$scope.filter = filter;

    	if ($scope.filter == "Vignette") {
    		$scope.url = "images/cat_vignette" + Math.floor(Math.random() * 5) + ".png";
    		// $scope.url = "images/cat_vignette" + ".png";
    	}
    	else {
    		$scope.url = "images/cat_" + filter.toLowerCase().split(' ').join('_') + ".png";
    	}

    	$scope.disableTrain = false;
    }

    var perceptron = null;
    var liquidstate = null;
    var hopfield = null;
    var vignetteColor = null;
	var index = 0;
	var color_data = null;
	var filtered_data = null;
	var original_data = null;
	var canvas = null;
	var context = null;
	var size = 125 * 125;
	var trial = 0;
	var px = null;
	var vHopPat0 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	var vHopPat1 = [1,1,1,1,1,1,1,0,0,1,1,0,0,0,0,1,0,0,0,0,1,1,0,0,1];
	var vHopPat2 = [1,1,1,1,1,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0];
	var rHopPat = [];
	var bHopPat = [];
	var gHopPat = [];

	canvas = canvas || document.getElementById('canvas-demo3');
    context = context || canvas.getContext('2d');

	var getData = function(imageObj){

		canvas = canvas || document.getElementById('canvas-demo3');
        context = context || canvas.getContext('2d');

        context.drawImage(imageObj, 0, 0);

        var imageData = context.getImageData(0, 0, 125, 125);
        return imageData.data;
	}

	var train = $scope.train = function(){

		$scope.disableTrain = true;

		trial = 0;

		perceptron = new Architect.Perceptron(27,8, 4, 3);
		liquidstate = new Architect.Liquid(27, 8, 3, 4, 4);
        color_data = getData(document.getElementById('input'));
        filtered_data = getData(document.getElementById('output'));
		original_data = getData(document.getElementById('original'));


		if ($scope.filter == "Vignette") {
			vignetteColor = null;
			hopfield = new Architect.Hopfield(25);
			var vpx = [];
			var rpx = [];
			var bpx = [];
			var gpx = [];

			// Pixels in top row
			for (index = 0; index < 125; index++) {
				vpx = pixel(filtered_data, 0, 0);
				rpx = rpx.concat(vpx[0]);
				bpx = bpx.concat(vpx[1]);
				gpx = gpx.concat(vpx[2]);
			}
			// Pixels in right column
			for (index = 125; index < size - 125; index += 125) {
				vpx = pixel(filtered_data, 0, 0);
				rpx = rpx.concat(vpx[0]);
				bpx = bpx.concat(vpx[1]);
				gpx = gpx.concat(vpx[2]);
			}
			// Pixels in left column
			for (index = 125+1; index < size - 2*125 + 1; index += 125) {
				vpx = pixel(filtered_data, 0, 0);
				rpx = rpx.concat(vpx[0]);
				bpx = bpx.concat(vpx[1]);
				gpx = gpx.concat(vpx[2]);
			}
			// Pixels in bottom row
			for (index = size - 125+1; index < size; index++) {
				vpx = pixel(filtered_data, 0, 0);
				rpx = rpx.concat(vpx[0]);
				bpx = bpx.concat(vpx[1]);
				gpx = gpx.concat(vpx[2]);
			}

			// Get average vignette color by reducing the Red, Blue, and Green pixel arrays
			vignetteColor = [
			 	(rpx.reduce(function(acc, cur){ return acc + cur; }, 0)) / rpx.length ,
				(bpx.reduce(function(acc, cur){ return acc + cur; }, 0)) / bpx.length ,
				(gpx.reduce(function(acc, cur){ return acc + cur; }, 0)) / gpx.length
			]

			// // If vignetteColor is mostly black, make it pure black
			// if ((vignetteColor[0] < 0.15) && (vignetteColor[1] < 0.15) && (vignetteColor[2] < 0.15)) {
			// 	vignetteColor = [0,0,0];
			// }

			console.log(vignetteColor);
		}

		if (!$scope.trainingStarted)
		{
			$scope.trainingStarted = true;
			iteration();
		}
	}

	
	var iteration = function(){
		trial++;

		if (trial == 1 && ($scope.filter == "Vignette")) {

			// Build the Red, Blue, and Green hopfield pattern profiles of the vignette
			// Test if the current pixel is close to vignetteColor, if so push 1, else 0
			// Build the profile by testing 5 pixels per row, accross every 10th row
			var testpx = []
			var offset = 0;
			for (index = 0; index < size; index += 25) {
				testpx.push(index);
				var ipx = pixel(filtered_data, 0, 0);
				rHopPat.push((Math.abs(vignetteColor[0] - ipx[0]) <= 0.2)? 1 : 0);
				bHopPat.push((Math.abs(vignetteColor[0] - ipx[0]) <= 0.2)? 1 : 0);
				gHopPat.push((Math.abs(vignetteColor[0] - ipx[0]) <= 0.2)? 1 : 0);

				// If we're on the last test pixel in the row,
				// advance the index so that we skip to the next 5-th row
				if (((index % 125) + 25) >= 125) {
					offset++;
					// Subtract 25 because the for loop will add that in for us!
					index = 125 * 25 * offset - 25;
				}
			}

			hopfield.learn([vHopPat0, vHopPat1, vHopPat2]);
			var hresult = hopfield.feed(rHopPat);

			var isVignetteProfile0 = true;
			var isVignetteProfile1 = true;
			var isVignetteProfile2 = true;
			for (var i = 0; i < hresult.length; i++) {
				if (hresult[i] != vHopPat0[i]) { isVignetteProfile0 = false; }
				if (hresult[i] != vHopPat1[i]) { isVignetteProfile1 = false; }
				if (hresult[i] != vHopPat2[i]) { isVignetteProfile2 = false; }
			}


			console.log("rHopPat:");
			console.log(rHopPat);
			// console.log("[" + rHopPat + "]");
			console.log("hresult:")
			console.log(hresult);

			// Add the vignette to the output!!!
			var vignetteColorRGBA = "rgba(" + vignetteColor[0] * 255 + "," + vignetteColor[1] * 255 + "," + vignetteColor[2] * 255 + ", 1)";
			$('.thumbnail').css("position", "relative");
			$('#vignette').css("position", "absolute")
				.css("top", "4px")
				.css("left", "4px")
				.css("width", "125px")
				.css("height", "125px");

			if (isVignetteProfile1) {
				console.log("v1");
				$('#vignette').css("background", "radial-gradient(ellipse at center, rgba(255,255,255,0) 0%, " + vignetteColorRGBA + " 100%)");
			}
			else if (isVignetteProfile2) {
				console.log("v2");
				$('#vignette').css("box-shadow", "inset 0px 0px 10px 5px " + vignetteColorRGBA);
			}
			else {
				console.log("v0");
				$('#vignette').css("background", "rgba(193, 66, 66, 0.75)");
			}
			console.log("done rendering!");
		}

		else {
			for (index = 0; index < size; index+=2)
			{
				px = pixel(color_data, 0, 0);
				px = px.concat(pixel(color_data, -1, -1));
				px = px.concat(pixel(color_data, 0, -1));
				px = px.concat(pixel(color_data, 1, -1));
				px = px.concat(pixel(color_data, -1, 0));
				px = px.concat(pixel(color_data, 1, 0));
				px = px.concat(pixel(color_data, -1, 1));
				px = px.concat(pixel(color_data, 0, 1));
				px = px.concat(pixel(color_data, 1, 1));

				if ($scope.filter == "Liquid") {
					liquidstate.activate(px);
					liquidstate.propagate(.12, pixel(filtered_data, 0, 0));
				}
				else {
					perceptron.activate(px);
					perceptron.propagate(.12, pixel(filtered_data,0,0));
				}
			}

			$('#vignette').css("background", "transparent").css("box-shadow", "none");
			preview();
		}
	}

	var pixel = function(data, ox, oy){
		var y = index / 125 | 0;
		var x = index % 125;

		if (ox && (x + ox) > 0 && (x + ox) < 125)
			x += ox;
		if (oy && (y + oy) > 0 && (y + oy) < 125)
			y += oy;

		var red = data[((125 * y) + x) * 4];
        var green = data[((125 * y) + x) * 4 + 1];
        var blue = data[((125 * y) + x) * 4 + 2];

        return [red / 255, green / 255, blue / 255];
	}

	var preview = function(){
		$('#iterations').text(trial);
		
		var imageData = context.getImageData(0, 0, 125, 125);
		for (index = 0; index < size; index++)
		{
			var px = pixel(original_data, 0, 0);
			px = px.concat(pixel(original_data, -1, -1));
			px = px.concat(pixel(original_data, 0, -1));
			px = px.concat(pixel(original_data, 1, -1));
			px = px.concat(pixel(original_data, -1, 0));
			px = px.concat(pixel(original_data, 1, 0));
			px = px.concat(pixel(original_data, -1, 1));
			px = px.concat(pixel(original_data, 0, 1));
			px = px.concat(pixel(original_data, 1, 1));

			var rgb = null;

			if ($scope.filter == "Liquid") {
				rgb = liquidstate.activate(px);
			}
			else {
				rgb = perceptron.activate(px);
			}
			imageData.data[index * 4] = (rgb[0] )* 255;
			imageData.data[index * 4 + 1] = (rgb[1] ) * 255;
			imageData.data[index * 4 + 2] = (rgb[2] ) * 255;
		}
		context.putImageData(imageData,0,0);
		
		if ($location.$$path == '/image-filters')
			setTimeout(iteration, 100);
	}
  });
