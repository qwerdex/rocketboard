var vehcio = angular.module('vehcioDashboard', ['ngResource', 'ngCookies', 'ngSanitize', 'ui.router','ui.bootstrap','nvd3ChartDirectives','angularMoment','uiGmapgoogle-maps']);

vehcio.config(function($resourceProvider) {
  $resourceProvider.defaults.stripTrailingSlashes = false;
});

vehcio.config(function($stateProvider, $urlRouterProvider) {

	$urlRouterProvider.otherwise('/');

	$stateProvider
        
        
        .state('locations', {
            url: '/locations',
            templateUrl: 'vtemplates/Locations.html'
        })
        
        
        .state('locations.dashboard', {
        	url: '/:locationName',
        	templateUrl:'vtemplates/LocationDashboard.html'
            // we'll get to this in a bit       
        })

        .state('locations.dashboard.laserCountDetail', {
        	url: '/laser-count-detail',
        	templateUrl:'vtemplates/LaserCountDetail.html'
            // we'll get to this in a bit       
        })

        .state('locations.dashboard.detectionsDetail', {
        	url: '/detections-detail',
        	templateUrl:'vtemplates/DetectionsDetail.html'
            // we'll get to this in a bit       
        })

        .state('unauthorized', {
        	url:'/unauthorized',
        	templateUrl:'vtemplates/AuthenticationError.html'
        })

        ;

});

vehcio.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyD9zepDQy9lKOC5nfxmxJsy07mguh1g1_o',
        v: '3.17',
        libraries: 'weather,geometry,visualization'
	    });
	});

var controllers = {};

controllers.apiKeyController = function($scope, $state, $cookies, apiKeyService) {

		var apiKeyCookie = $cookies.get('api_key');

		if (apiKeyCookie) {

			$scope.apiKey = apiKeyCookie;
			apiKeyService.setKey($scope.apiKey);

		};

		$scope.setKey = function() {
				console.log($scope.apiKey);
				apiKeyService.setKey($scope.apiKey);

				var now = new Date();
				var exp = new Date(now.getFullYear(), now.getMonth()+6, now.getDate());

				$cookies.put('api_key', $scope.apiKey, {expires: exp});
				$state.go('locations',{});
		};

		};

controllers.locationsController =  function($scope, $http, $state, apiKeyService,locations,uiGmapGoogleMapApi) {

	/* $scope.$watch(function() {return apiKeyService.getKey();},
		function (keyValue){
			$scope.apiKey = keyValue;
			$scope.getLocations();
		});  */

	$scope.getLocations = function() {
			availableLocations = locations.list(apiKeyService.getHeader()).get();

			console.log(availableLocations);

			availableLocations.$promise.then( function() {
				$scope.loc = availableLocations;
				$scope.locError = null;
				$scope.state = $state;
				//$state.go('locations', {});

				

				//console.log($state);


			}, function	(reason) {
				$scope.loc = null;
				$scope.locError = reason;
				$state.go('unauthorized', {});

			}
			);

			
		};

		$scope.getLocations();

	uiGmapGoogleMapApi.then(function(maps) {
		$scope.map = { center: { latitude: -25.799891, longitude: 133.894501 }, zoom: 4 };
   		});
		

	};

controllers.dashboardController = function($scope, $http, $state, apiKeyService,locations,GoogleMapWindowOptionsService) {

	$scope.state = $state;
	$scope.windowOptions = {
		visible: false,
		content: 'SOME TEXT TO DISPLAY'
	};

	$scope.onClick = function() {
		$scope.windowOptions.visible = !$scope.windowOptions.visible;
	};

	$scope.closeClick = function() {
		$scope.windowOptions.visible = false;
	};

	currentLocation = locations.location(apiKeyService.getHeader(), $state.params.locationName).get();

	currentLocation.$promise.then(function() {
		var mapcenter = {}
		mapcenter.latitude = currentLocation.geoLocation.latitude;
		mapcenter.longitude = currentLocation.geoLocation.longitude;
		$scope.mapcenter = mapcenter;
		$scope.location = currentLocation;
		$scope.maperror = null;

		$scope.windowOptions = GoogleMapWindowOptionsService.getOptions(currentLocation)

	}, function (reason) {
		$scope.maperror = reason;
	}
	);

	

};

controllers.camerasController = function($scope, $http, $state, apiKeyService,locations) {

		console.log($state);

		Cameras = locations.cameras(apiKeyService.getHeader(), $state.params.locationName).get();

		Cameras.$promise.then(function() {
			$scope.Cameras = Cameras;
			$scope.CamerasError = null;
			console.log(Cameras);

		}, function (reason) {
			$scope.Cameras = null;
			$scope.CamerasError = reason;

		} 

		);

};

controllers.countersController = function($scope, $http, $state, $interval, apiKeyService,locations,moment) {

		$scope.chartData = [];

		$scope.xAxisTickFormat_Time_Format = function(){
		return function(d){
			return d3.time.format('%d/%m %H:%M')(new Date(d)); 
			}
		};		

		$scope.yAxisTickFormatFunction = function(){
			return function(d){
			return d3.format('d')(d);
			}
		}

		function getLaserCounts() {

			console.log('getLaserCOunts CALLED');

			var queryParams = {};

		LaserCounts = locations.lasercounts(apiKeyService.getHeader(), $state.params.locationName, queryParams).get();

		LaserCounts.$promise.then(function() {
			$scope.LaserCounts = LaserCounts;
			$scope.LaserCountsError = null;

			// generate chart data series
			chartValuesLaser = [];
			for (var i=LaserCounts.length - 1; i>=0; i--) {

				//console.log(LaserCounts.results[i]["count_total"]);
				//console.log(moment(LaserCounts.results[i]["period_end"],"YYYY-MM-DDTHH:mm:ssZ").valueOf());

				chartValuesLaser.push([ moment(LaserCounts[i]["period_end"],"YYYY-MM-DDTHH:mm:ssZ").valueOf(), LaserCounts[i]["count_total"]])
			};

			//console.log(chartValues);

			var updated = false;

			for (var i=0; i<$scope.chartData.length; i++) {
				if ($scope.chartData[i]["key"]=="Laser Count") {

					if (chartValuesLaser.length != 0) {
						$scope.chartData[i] = {
												"key":"Laser Count",
												"values":chartValuesLaser
											};
									}
					else {
						$scope.chartData.splice(i,1);
					}

					updated = true;
				}
			}

			if (!updated) {

				if (chartValuesLaser.length != 0) {

					$scope.chartData.push(
									{
										"key":"Laser Count",
										"values":chartValuesLaser
									}
								);
				}

		}



			console.log(LaserCounts);

		}, function (reason) {
			$scope.chartData[0] = null;
			$scope.LaserCounts = null;
			$scope.LaserCountsError = reason;

		} 

		);

		};

		function getIVACounts() {
			IVACounts1 = locations.ivacounts(apiKeyService.getHeader(), $state.params.locationName).get();

			IVACounts1.$promise.then(function() {
				$scope.IVACounts = IVACounts1;
				$scope.IVACountsError = null;

				// generate chart data series
				chartValuesIVA = [];
				for (var i=IVACounts1.length - 1; i>=0; i--) {

					//console.log(IVACounts[i]["totalCars"]);

					chartValuesIVA.push([ moment(IVACounts1[i]["endTime"],"YYYY-MM-DDTHH:mm:ssZ").valueOf(), IVACounts1[i]["totalCars"]])

				};

				//console.log(chartValuesIVA);

			var updated = false;

			for (var i=0; i<$scope.chartData.length; i++) {
				if ($scope.chartData[i]["key"]=="IVA Count") {
					$scope.chartData[i] = {
											"key":"IVA Count",
											"values":chartValuesIVA
										};

					updated = true;
				}
			}

			if (!updated) {

				if (chartValuesIVA.length != 0) {

				$scope.chartData.push(
										{
											"key":"IVA Count",
											"values":chartValuesIVA
										}
								);
			}
			}

				console.log(IVACounts1);

			}, function (reason) {
				$scope.chartData[1] = null;
				$scope.IVACounts = null;
				$scope.IVACountsError = reason;

			} 

		);
		};


		

		function refreshData() {
			console.log('refresh data called');
			getLaserCounts();
			getIVACounts();

			console.log('Chart Data');
			console.log($scope.chartData);
		};

		refreshData();

	
		console.log('Creating Interval');

		var refreshLaser = $interval(refreshData, 300000);

};

controllers.alertsController = function($scope, $http, $state, apiKeyService,locations) {

		$scope.getAlerts = function() {

		Alerts = locations.alerts(apiKeyService.getHeader(), $state.params.locationName).get();

		Alerts.$promise.then(function() {
			$scope.Alerts = Alerts;
			$scope.AlertsError = null;

			console.log(Alerts);

		}, function (reason) {
			$scope.Alerts = null;
			$scope.AlertsError = reason;

		} 

		);

	};

		$scope.getAlerts();


		$scope.getImageSrc = function(imageURL) {

			console.log(imageURL);


			//$('#myLightbox').lightbox({show: true});

			$scope.image = imageURL;

			$scope.hideLightBox = false;

			//locations.image(apiKeyService.getHeader(), imageURL).get();


		}


};

controllers.detectionsController = function($scope, $http, $state, apiKeyService,locations) {

	Detections = locations.detections(apiKeyService.getHeader(), $state.params.locationName).get()

	Detections.$promise.then(function() {
			$scope.Detections = Detections;
			$scope.DetectionsError = null;

			console.log(Detections);

		}, function (reason) {
			$scope.Detections = null;
			$scope.DetectionsError = reason;

		} 

	);

	$scope.getImageSrc = function(imageURL) {

		console.log(imageURL);

		$scope.image = imageURL;

	}

};

controllers.ivacountController = function($scope, $http, $state, apiKeyService,locations,moment) {



		var IVACounts = locations.ivacounts(apiKeyService.getHeader(), $state.params.locationName).get();

		IVACounts.$promise.then(function() {
			$scope.IVACounts = IVACounts;
			$scope.IVACountsError = null;

			// generate chart data series
			chartValues = [];
			for (var i=IVACounts.length - 1; i>=0; i--) {

				//console.log(IVACounts[i]["totalCars"]);

				chartValues.push([ moment(IVACounts[i]["endTime"],"YYYY-MM-DDTHH:mm:ssZ").valueOf(), IVACounts[i]["totalCars"]])

			};

			//console.log(chartValues);

			$scope.IVAchartData = [
			{
				"key":"5 min Count",
				"values":chartValues
			}
			];			

			$scope.xAxisTickFormat_Time_Format = function(){
					return function(d){
				    	return d3.time.format('%d/%m %H:%M')(new Date(d)); 
				    }
				};	

			$scope.yAxisTickFormatFunction = function(){
                return function(d){
                    return d3.format('d')(d);
                }
            }	

			//console.log(IVACounts);

		}, function (reason) {
			$scope.IVACounts = null;
			$scope.IVACountsError = reason;

		} 

		);

	$scope.toolTipContentFunction = function(){
	return function(key, x, y, e, graph) {
		console.log('toolTipFunction');
    	return  'Super New Tooltip' +
        	'<h1>' + key + '</h1>' +
            '<p>' +  y + ' at ' + x + '</p>'
			}
		}


};


controllers.lasercountDetailController = function($scope, $http, $state, $interval, apiKeyService,locations,moment) {

		$scope.open = function($event,noun) {
			$event.preventDefault();
			$event.stopPropagation();

			if (noun=='start'){
				$scope.openedStart = true;

			}
			else if (noun=='end') {
				$scope.openedEnd = true;

			}
			
		};

		$scope.tmStart = new Date();
		$scope.tmStart.setHours(0);
		$scope.tmStart.setMinutes(0);
		$scope.tmStart.setSeconds(0);
		$scope.tmStart.setMilliseconds(0);

		$scope.tmEnd = new Date();
		$scope.tmEnd.setHours(0);
		$scope.tmEnd.setMinutes(0);
		$scope.tmEnd.setSeconds(0);
		$scope.tmEnd.setMilliseconds(0);

		$scope.formats = ['yyyy-MM-dd', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
  		$scope.format = $scope.formats[0];

		$scope.hstep = 1;
		$scope.mstep = 5;

		$scope.$watchGroup(['dtStart','tmStart'], function() {
			$scope.dtStart.setHours($scope.tmStart.getHours());
			$scope.dtStart.setMinutes($scope.tmStart.getMinutes());

	       console.log($scope.dtStart.toISOString());
	   	});

	   	 $scope.$watchGroup(['dtEnd','tmEnd'], function() {
			$scope.dtEnd.setHours($scope.tmEnd.getHours());
			$scope.dtEnd.setMinutes($scope.tmEnd.getMinutes());
		    console.log($scope.dtEnd.toISOString());
		});


		function getLaserCounts() {

			console.log('getLaserCOunts CALLED');

			var queryParams = {};

			LaserCountsRaw = locations.lasercounts(apiKeyService.getHeader(), $state.params.locationName, queryParams).get();

			LaserCountsRaw.$promise.then(function() {
				$scope.LaserCountsRaw = LaserCountsRaw;
				$scope.LaserCountsRawError = null;

				// generate chart data series
				chartValues = [];
				for (var i=LaserCounts.length - 1; i>=0; i--) {

					//console.log(LaserCounts.results[i]["count_total"]);
					//console.log(moment(LaserCounts.results[i]["period_end"],"YYYY-MM-DDTHH:mm:ssZ").valueOf());

					chartValues.push([ moment(LaserCountsRaw[i]["period_end"],"YYYY-MM-DDTHH:mm:ssZ").valueOf(), LaserCountsRaw[i]["count_total"]])
				};

			//console.log(chartValues);

				$scope.chartDataRaw = [
				{
					"key":"5 min Count",
					"values":chartValues
				}
				];

				$scope.xAxisTickFormat_Time_Format = function(){
						return function(d){
					    	return d3.time.format('%d/%m %H:%M')(new Date(d)); 
					    }
					};		
					
	            $scope.yAxisTickFormatFunction = function(){
	                return function(d){
	                    return d3.format('d')(d);
	                }
	            }

				console.log(LaserCounts);

			}, function (reason) {
				$scope.LaserCountsRaw = null;
				$scope.LaserCountsRawError = reason;

			} 

			);

		}

		function getLaserCounts10DayHourly() {

			console.log('getLaserCOunts CALLED');

			var queryParams = {};
			queryParams.resolution = 'hour';

			LaserCountsHour = locations.lasercounts(apiKeyService.getHeader(), $state.params.locationName,queryParams).get();

			LaserCountsHour.$promise.then(function() {
				$scope.LaserCountsHour = LaserCountsHour;
				$scope.LaserCountsHourError = null;

				// generate chart data series
				chartValuesHour = [];
				for (var i=LaserCountsHour.length - 1; i>=0; i--) {

					//console.log(LaserCounts.results[i]["count_total"]);
					//console.log(moment(LaserCounts.results[i]["period_end"],"YYYY-MM-DDTHH:mm:ssZ").valueOf());

					chartValuesHour.push([ moment(LaserCountsHour[i]["period_start"],"YYYY-MM-DDTHH:mm:ssZ").valueOf(), LaserCountsHour[i]["count_total"]])
				};

				//console.log(chartValues);

				$scope.chartDataHour = [
				{
					"key":"Hourly Total",
					"values":chartValuesHour
				}
				];

				$scope.xAxisTickFormat_Time_Format_Hour = function(){
						return function(d){
					    	return d3.time.format('%d/%m %H:00')(new Date(d)); 
					    }
					};		
					
	            $scope.yAxisTickFormatFunction = function(){
	                return function(d){
	                    return d3.format('d')(d);
	                }
	            }

				console.log(LaserCountsHour);

			}, function (reason) {
				$scope.LaserCountsHour = null;
				$scope.LaserCountsHourError = reason;

			} 

			);

		}


		function getLaserCounts30DayDaily() {

			console.log('getLaserCOunts CALLED');

			var queryParams = {};
			queryParams.resolution = 'day';

			LaserCountsDay = locations.lasercounts(apiKeyService.getHeader(), $state.params.locationName, queryParams).get();

			LaserCountsDay.$promise.then(function() {
				$scope.LaserCountsDay = LaserCountsDay;
				$scope.LaserCountsDayError = null;

				// generate chart data series
				chartValuesDay = [];
				for (var i=LaserCountsDay.length - 1; i>=0; i--) {

					//console.log(LaserCounts.results[i]["count_total"]);
					//console.log(moment(LaserCounts.results[i]["period_end"],"YYYY-MM-DDTHH:mm:ssZ").valueOf());

					chartValuesDay.push([ moment(LaserCountsDay[i]["period_start"],"YYYY-MM-DDTHH:mm:ssZ").valueOf(), LaserCountsDay[i]["count_total"]])
				};

				//console.log(chartValues);

				$scope.chartDataDay = [
				{
					"key":"Daily Total",
					"values":chartValuesDay
				}
				];

				$scope.xAxisTickFormat_Time_Format_Day = function(){
						return function(d){
					    	return d3.time.format('%a %d %b')(new Date(d)); 
					    }
					};		
					
	            $scope.yAxisTickFormatFunction = function(){
	                return function(d){
	                    return d3.format('d')(d);
	                }
	            }

				console.log(LaserCounts);

			}, function (reason) {
				$scope.LaserCounts = null;
				$scope.LaserCountsError = reason;

			} 

			);

		}

		$scope.getHeatMapData = function() {

			console.log('getHeatMapData called');

			var queryParams = {};
			queryParams.resolution = 'hour';
			queryParams.dtStart = $scope.dtStart.toISOString();
			queryParams.dtEnd = $scope.dtEnd.toISOString();

			heatMapData = locations.lasercounts(apiKeyService.getHeader(), $state.params.locationName,queryParams).get();

			heatMapData.$promise.then(function() {

				console.log(heatMapData);

				var displayData = { 0:[],
									1:[],
									2:[],
									3:[],
									4:[],
									5:[],
									6:[],
									7:[],
									8:[],
									9:[],
									10:[],
									11:[],
									12:[],
									13:[],
									14:[],
									15:[],
									16:[],
									17:[],
									18:[],
									19:[],
									20:[],
									21:[],
									22:[],
									23:[]
								};

				for (var i=heatMapData.length-1; i>=0; i--) {
					var startDate = new Date(heatMapData[i]['period_start']);

					//console.log(startDate.getHours());

					displayData[startDate.getHours()].push(heatMapData[i]);
					

				}

				// work with data for display

				console.log(displayData);





			}, function (reason) {
				console.log(heatMapData);
			})



		}


		getLaserCounts30DayDaily();
		getLaserCounts();
		getLaserCounts10DayHourly();
		

		console.log('Creating Interval');

	
		var refresh = $interval(getLaserCounts, 300000);


};

controllers.detectionsDetailController =  function($scope, $http, $state, $interval, apiKeyService,locations,moment) {


};

controllers.reportsController = function($scope, $http, $state, $interval, apiKeyService,locations,moment) {

	var reports = locations.reports(apiKeyService.getHeader(), $state.params.locationName).get();

	reports.$promise.then(function() {

		$scope.reports = reports;
		$scope.reportsError = null;




	}, function (reason) {
			$scope.reports = null;
			$scope.reportsError = reason;

	}

)};


vehcio.controller(controllers);


vehcio.service('apiKeyService', function() {
  this.apiKey = '';

  this.setKey = function(apiKeyString) {
      this.apiKey = apiKeyString;
  }

  this.getKey = function(){
      return this.apiKey;
  }

this.getHeader = function() {

	return 'Token ' + this.apiKey;
}


});


vehcio.service('GoogleMapWindowOptionsService', function() {
	this.getOptions = function(location) {

		var newOptions = {};
		newOptions.visible = false;


		newOptions.content = '<div style="width:200px;">';
		newOptions.content += '<h4>' + location.name + '</h4>';
		newOptions.content += '<p>Site ID: ' + location.SiteID + '</p>';
		newOptions.content += '<p>Site Number: ' + location.SiteNumber + '</p>';
		newOptions.content += '<p>Site Type: ' + location.SiteType + '</p>';
		newOptions.content += '</div>';

		return newOptions;



	}
})


vehcio.factory("locations", function($resource, apiKeyService) {
	return {
		list : function(token) {

		console.log(token);

		return $resource('http://168.1.67.71/api/v1/locations/', {}, {
			get: {
				method: 'GET',
				headers: {'Authorization':token},
				isArray: true,
			}
		});
		},

		location : function(token,location) {

			console.log(token);

		return $resource('http://168.1.67.71/api/v1/locations/'+location+'/', {}, {
			get: {
				method: 'GET',
				headers: {'Authorization':token},

			}
		});

		},

		lasercounts : function(token,location,queryParams) {

		console.log(location);
		console.log(token);

		// build query string
		var queryString = '';

		for (x in queryParams) {
			if (queryString.length == 0)
				{
					queryString += '?'
				}
			else 
				{ 
					queryString += '&'
				}

			queryString += x + '=' + queryParams[x];
		}

		console.log(queryString);

		


		return $resource('http://168.1.67.71/api/v1/locations/' + location + '/lasercounts/' + queryString, {}, {
			get: {
				method: 'GET',
				headers: {'Authorization':token},
				isArray: true,
			}
		});
		},

		cameras : function(token,location) {

		console.log(location);
		console.log(token);

		return $resource('http://168.1.67.71/api/v1/locations/' + location + '/cameras/', {}, {
			get: {
				method: 'GET',
				headers: {'Authorization':token},
				isArray: true,
			}
		});
		},

		reports : function(token,location) {

		console.log(location);
		console.log(token);

		return $resource('http://168.1.67.71/api/v1/locations/' + location + '/reports/', {}, {
			get: {
				method: 'GET',
				headers: {'Authorization':token},
				isArray: true,
			}
		});
		},

		alerts : function(token,location) {

		console.log(location);
		console.log(token);

		return $resource('http://168.1.67.71/api/v1/locations/' + location + '/alerts/', {}, {
			get: {
				method: 'GET',
				headers: {'Authorization':token},
				isArray: true,
			}
		});
		},

		detections : function(token,location) {

		console.log(location);
		console.log(token);

		return $resource('http://168.1.67.71/api/v1/locations/' + location + '/detections/', {}, {
			get: {
				method: 'GET',
				headers: {'Authorization':token},
				isArray: true,
			}
		});
		},

		ivacounts : function(token,location) {

		console.log(location);
		console.log(token);

		return $resource('http://168.1.67.71/api/v1/locations/' + location + '/IVACounts/', {}, {
			get: {
				method: 'GET',
				headers: {'Authorization':token},
				isArray: true,
			}
		});
		},


		image : function(token, imageURL) {

		console.log(imageURL);
		console.log(token);

		return $resource(imageURL, {}, {
			get: {
				method: 'GET',
				headers: {'Authorization':token},
			}
		});
		},

	};
});


