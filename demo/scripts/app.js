'use strict';

/**
 * @ngdoc overview
 * @name gitHubApp
 * @description
 * # gitHubApp
 *
 * Main module of the application.
 */
angular
  .module('gitHubApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'ui.bootstrap'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        redirectTo: '/image-filters'
      })
      .when('/image-filters', {
        templateUrl: 'views/image-filters.html',
        controller: 'ImageFiltersCtrl'
      })
      .otherwise({
        redirectTo: '/image-filters'
      });
  });
