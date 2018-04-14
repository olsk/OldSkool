/*!
 * rofo-sample
 * Copyright(c) 2016-2018 Rosano Coutinho
 * MIT Licensed
 */

var expressPackage = require('express');
var pathPackage = require('path');
var fsPackage = require('fs');
var filesystemLibrary = require('./libraries/ROCOFilesystem/main');
var environmentLibrary = require('./libraries/ROCOEnvironment/main');

var expressApp = expressPackage();

//# ROCOStartCookies

(function ROCOStartCookies() {
	var cookieParserPackage = require('cookie-parser');

	expressApp.use(cookieParserPackage());
})();

//# ROCOStartSessions

(function ROCOStartSessions() {
	var expressSessionPackage = require('express-session');

	expressApp.use(expressSessionPackage({
		secret: 'clarinet-gulf-clencher',
		resave: false,
		saveUninitialized: true
	}));
})();

//# ROCOStartBodyParsing

(function ROCOStartBodyParsing() {
	var bodyParserPackage = require('body-parser');

	expressApp.use(bodyParserPackage.json());
	expressApp.use(bodyParserPackage.urlencoded({
		extended: true
	}));
})();

//# ROCOStartControllers

var ROCOStartControllersArray = [];

(function ROCOStartControllers() {
	var controllersPath = pathPackage.join(filesystemLibrary.ROCOFilesystemAppDirectoryName(), filesystemLibrary.ROCOFilesystemAppControllersDirectoryName());
	fsPackage.readdirSync(pathPackage.join(filesystemLibrary.ROCOFilesystemRootDirectoryAbsolutePath(), controllersPath)).forEach(function(dirItem, index) {
		var itemPath = pathPackage.join(controllersPath, dirItem, 'controller.js');
		if (!filesystemLibrary.ROCOFilesystemInputDataIsRealFilePath(pathPackage.join(filesystemLibrary.ROCOFilesystemRootDirectoryAbsolutePath(), itemPath))) {
			return;
		}

		ROCOStartControllersArray.push(require('../' + itemPath));
	});
})();

//# ROCOStartPublicDirectory

(function ROCOStartPublicDirectory() {
	expressApp.use(expressPackage.static(pathPackage.join(filesystemLibrary.ROCOFilesystemRootDirectoryAbsolutePath(), filesystemLibrary.ROCOFilesystemPublicDirectoryName()), {
		extensions:['html'],
	}));
})();

//# ROCOStartInternationalization

var ROCOStartInternationalizationTranslations = {};

(function ROCOStartInternationalization() {
	var internationalLibrary = require('./libraries/ROCOInternational/main');
	var underscorePackage = require('underscore');
	var jsYAMLPackage = require('js-yaml');

	var kDefaultLocale = 'en';

	// Aggregate unique locales specified in controller routes

	underscorePackage.uniq(underscorePackage.flatten(ROCOStartControllersArray.map(function (e) {
		return underscorePackage.pluck(Object.values(e.ROCOControllerRoutes()), 'ROCORouteLocales');
	}))).forEach(function (e) {
		ROCOStartInternationalizationTranslations[e] = {};
	});

	// Skip internationalization code if there are no locales

	if (!Object.keys(ROCOStartInternationalizationTranslations).length) {
		return;
	};

	// Set ROCOInternationalCurrentLocale to default value

	expressApp.use(function(req, res, next) {
		if (Object.keys(ROCOStartInternationalizationTranslations).indexOf(kDefaultLocale) !== -1) {
			req.ROCOInternationalCurrentLocale = kDefaultLocale;
		};

		if (!req.ROCOInternationalCurrentLocale) {
			req.ROCOInternationalCurrentLocale = Object.keys(ROCOStartInternationalizationTranslations)[0];
		};

		next();
	});

	// Set ROCOInternationalRequestLocale if possible

	expressApp.use(function(req, res, next) {
		var pathSegments = req.url.split('/');
		var firstElement = pathSegments.splice(1, 1).pop();
		
		if (Object.keys(ROCOStartInternationalizationTranslations).indexOf(firstElement) === -1) {
			next();
			return;
		};

		req.ROCOInternationalRequestLocale = firstElement;
		req.url = pathSegments.length <= 1 ? '/' : pathSegments.join('/');

		next();
	});

	// Load translation strings into ROCOStartInternationalizationTranslations

	var controllersPath = pathPackage.join(filesystemLibrary.ROCOFilesystemAppDirectoryName(), filesystemLibrary.ROCOFilesystemAppControllersDirectoryName());
	underscorePackage.chain(fsPackage.readdirSync(pathPackage.join(filesystemLibrary.ROCOFilesystemRootDirectoryAbsolutePath(), controllersPath)))
		.map(function(e) {
			return pathPackage.join(controllersPath, e);
		})
		.filter(function(e) {
			return filesystemLibrary.ROCOFilesystemInputDataIsRealDirectoryPath(pathPackage.join(filesystemLibrary.ROCOFilesystemRootDirectoryAbsolutePath(), e))
		})
		.each(function(dirPath) {
			underscorePackage.chain(fsPackage.readdirSync(pathPackage.join(filesystemLibrary.ROCOFilesystemRootDirectoryAbsolutePath(), dirPath)))
				.filter(internationalLibrary.ROCOInternationalInputDataIsTranslationFilename)
				.each(function(e) {
					ROCOStartInternationalizationTranslations[internationalLibrary.ROCOInternationalLocaleForTranslationFilename(e)] = Object.assign(
						ROCOStartInternationalizationTranslations[internationalLibrary.ROCOInternationalLocaleForTranslationFilename(e)],
						jsYAMLPackage.safeLoad(fsPackage.readFileSync(pathPackage.join(filesystemLibrary.ROCOFilesystemRootDirectoryAbsolutePath(), pathPackage.join(dirPath, e)), filesystemLibrary.ROCOFilesystemDefaultTextEncoding()))
						);
				});
		});

	// Create translation string macro

	expressApp.use(function(req, res, next) {
		res.locals.ROCOTranslate = function (translationConstant, optionalParams) {
			return ROCOStartInternationalizationTranslations[req.ROCOInternationalCurrentLocale][translationConstant];
		};

		next();
	});
})();

//# ROCOStartRouting

(function ROCOStartRouting() {
	var routingLibrary = require('./libraries/ROCORouting/main');
	var expressRouter = require('express').Router();

	var allRoutes = {};

	// Aggregate all routes specified in controllers

	ROCOStartControllersArray.forEach(function (e) {
		if (typeof e.ROCOControllerRoutes !== 'function') {
			return;
		};

		allRoutes = Object.assign(allRoutes, e.ROCOControllerRoutes());
	});

	// Create canonical link macros

	expressApp.use(function(req, res, next) {
		res.locals.ROCOCanonicalFor = function (routeConstant, optionalParams) {
			return routingLibrary.ROCORoutingCanonicalPathWithRouteObjectAndOptionalParams(allRoutes[routeConstant], optionalParams);
		};

		if (req.ROCOInternationalCurrentLocale) {
			res.locals.ROCOCanonicalLocalizedFor = function (routeConstant, optionalParams) {
				return res.locals.ROCOCanonicalFor(routeConstant, Object.assign({
					ROCORoutingLocale: req.ROCOInternationalCurrentLocale,
				}, optionalParams));
			};
		};

		next();
	});

	// Create routing middleware

	Object.keys(allRoutes).forEach(function (key) {
		var e = allRoutes[key];

		return expressRouter[e.ROCORouteMethods](e.ROCORoutePath, e.ROCORouteRedirect ? function (req, res) {
			return res.redirect(e.ROCORouteRedirect);
		} : function (req, res, next) {
			res.locals.ROCOSharedActiveRouteConstant = key;

			return e.ROCORouteFunction(req, res, next);
		});
	});

	expressApp.use('/', expressRouter);
})();

//# ROCOStartTemplatingEngine

(function ROCOStartTemplatingEngine() {
	expressApp.set('view engine', 'ejs');
	expressApp.set('views', [
		pathPackage.join(pathPackage.join(filesystemLibrary.ROCOFilesystemRootDirectoryAbsolutePath(), filesystemLibrary.ROCOFilesystemAppDirectoryName(), filesystemLibrary.ROCOFilesystemAppControllersDirectoryName())),
	]);
})();

//# ROCOStartServer

(function ROCOStartServer() {
	var serverLibrary = require('./libraries/ROCOServer/main');
	var httpPackage = require('http');
	var serverModule = require('./modules/server');
	var debugObject = require('debug')('rofo-sample-app:server');

	var portValue = serverLibrary.ROCOServerNormalizePort(process.env.PORT || '3000');
	var serverObject = httpPackage.createServer(expressApp);
	expressApp.set('port', portValue);
	serverObject.listen(portValue);
	serverObject.on('error', serverModule.ROCOServerErrorCallback());
	serverObject.on('listening', serverModule.ROCOServerListeningCallback(serverObject, debugObject));
})();

//# ROCOStartErrorHandling

(function ROCOStartErrorHandling() {
	expressApp.use(function(req, res, next){
		res.status(404);

		if (!environmentLibrary.ROCOEnvironmentIsProductionForNODE_ENV(process.env.NODE_ENV)) {
			return res.type('txt').send('Not found'); // #localize
		};

		if (req.accepts('html')) {
			return res.render('public-error/404', {
				// url: req.url,
			});
		};

		if (req.accepts('json')) {
			return res.send({
				error: 'Not found', // #localize
			});
		};
	});

	expressApp.use(function(err, req, res, next){
		res.status(err.status || 500);

		if (!environmentLibrary.ROCOEnvironmentIsProductionForNODE_ENV(process.env.NODE_ENV)) {
			return res.send('<pre>' + JSON.stringify({error: err}, null, 4) + '</pre><pre>' + err.stack + '</pre>');
		};

		if (req.accepts('html')) {
			return res.render('public-error/500', {
				// url: req.url,
			});
		};

		if (req.accepts('json')) {
			return res.send({
				error: 'System error', // #localize
			});
		};

		return res.type('txt').send('System error'); // #localize
	});

	if (!environmentLibrary.ROCOEnvironmentIsProductionForNODE_ENV(process.env.NODE_ENV)) {
		var loggingPackage = require('morgan');
		expressApp.use(loggingPackage('dev'));
	};
})();
