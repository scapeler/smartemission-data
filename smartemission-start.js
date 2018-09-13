
"use strict"; // This is for your code to comply with the ECMAScript 5 standard.

var moduleSmartEmissionPath = require('path').resolve(__dirname, 'node_modules/scape-smartemission/../..');

var apriConfig 		= require(moduleSmartEmissionPath + '/apri-config');

var main_module		= process.argv[2];
var argvStations	= process.argv[3];

module.exports = {

	start: function (options) {
		if (main_module == undefined) {
			console.log('Error: main modulename missing!');
			return -1;
		}

		if ( apriConfig.init(main_module) ) {
			console.log('smartemission-start.js: '+ main_module);
			//console.log('systemfolderparent: '+ apriConfig.getSystemFolderParent());
			var apriModule = require(moduleSmartEmissionPath + '/' + main_module);
			var options = {
				systemFolderParent: apriConfig.getSystemFolderParent(),
				configParameter: apriConfig.getConfigParameter(),
				systemCode: apriConfig.getSystemCode(),
				argvStations: argvStations 
			};
			apriModule.init(options);
		}
	}
}
