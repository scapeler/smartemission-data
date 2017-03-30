/*
** Module: smartemission-data
**
**
**
**
*/
// **********************************************************************************
"use strict"; // This is for your code to comply with the ECMAScript 5 standard.

var request = require('request');
var fs 		= require('fs');
var sys 	= require('sys');

var smartemissionUrl, smartemissionFileName, smartemissionLocalPathRoot, fileFolder, tmpFolder;

// **********************************************************************************


module.exports = {

	init: function (options) {
		smartemissionUrl 			= 'http://data.smartemission.nl/sos52n/service'; 
		smartemissionFileName 		= 'smartemission.txt';

		smartemissionLocalPathRoot = options.systemFolderParent + '/smartemission/';
		fileFolder 			= 'smartemission';
		tmpFolder 			= smartemissionLocalPathRoot + fileFolder + "/" + 'tmp/';

		// create subfolders
		try {fs.mkdirSync(tmpFolder );} catch (e) {};//console.log('ERROR: no tmp folder found, batch run aborted.'); return } ;

		// 1 uur reeksen met Smart Emission metingen. Aanvulling elk uur.
	
		this.reqFile (smartemissionUrl, smartemissionFileName,	false, 'smartemissiondata');

		console.log('All retrieve actions are activated.');

	},

	reqFile: function (url, fileName, unzip, desc) {
	
	var _wfsResult=null;
	console.log("Request start: " + desc + " (" + url + ")");


	function StreamBuffer(req) {
  		var self = this

  		var buffer = []
  		var ended  = false
  		var ondata = null
  		var onend  = null

  		self.ondata = function(f) {
    		console.log("self.ondata")
    		for(var i = 0; i < buffer.length; i++ ) {
      			f(buffer[i])
      			console.log(i);
    		}
    		console.log(f);
    		ondata = f
  		}

  		self.onend = function(f) {
    		onend = f
    		if( ended ) {
      			onend()
    		}
  		}

  		req.on('data', function(chunk) {
    		// console.log("req.on data: ");
    		if (_wfsResult) {
      			_wfsResult += chunk;
    		} else {
      			_wfsResult = chunk;
    		}

    		if( ondata ) {
      			ondata(chunk)
    		} else {
      			buffer.push(chunk)
    		}
  		})

  		req.on('end', function() {
    		//console.log("req.on end")
    		ended = true;

    		if( onend ) {
      			onend()
    		}
  		})        
 
  		req.streambuffer = self
	}

	function writeFile(path, fileName, content) {
  		fs.writeFile(path + fileName, content, function(err) {
    		if(err) {
      			console.log(err);
    		} else {
      			console.log("The file is saved! " + tmpFolder + fileName + ' (unzip:' + unzip + ')');
				if (unzip) {
					var exec = require('child_process').exec;
					var puts = function(error, stdout, stderr) { sys.puts(stdout) }
					exec(" cd " + tmpFolder + " ;  unzip -o " + tmpFolder + fileName + " ", puts);
				}
    		}
  		}); 
	}

	var options = {
		uri: url,
		method: 'POST',
		json: {
  "request": "GetObservation",
  "service": "SOS",
  "version": "2.0.0",
  "temporalFilter": [
    {
      "during": {
        "ref": "om:phenomenonTime",
        "value": [
          "2016-12-09T00:00:00+01:00",
          "2099-01-01T00:00:00+01:00"
        ]
      }
    }
  ]
}
	};

	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			//console.log(body.observations[0])
			
			var outFile	= '"foi";"sensor";"latlng";"measureDate";"measureValue";"measureUom"\n'; 
			
			for (var i=0;i<body.observations.length;i++) {
				console.log(i);
				var inRec			= body.observations[i];
				var outRec			= {};
				outRec.foi			= inRec.procedure; // eg. 'station-35'
				outRec.sensor		= inRec.observableProperty; // eg. 'coraw'
				outRec.latlng		= inRec.featureOfInterest.geometry.coordinates;
				outRec.measureDate	= inRec.resultTime;
				outRec.measureValue	= inRec.result.value;
				outRec.measureUom	= inRec.result.uom;	
				
				var csvRec			= '';
				csvRec				+= '"' + outRec.foi + '";';
				csvRec				+= '"' + outRec.sensor + '";';
				csvRec				+= outRec.latlng + ';';
				csvRec				+= '"' + outRec.measureDate + '";';
				csvRec				+= outRec.measureValue + ';';
				csvRec				+= '"' + outRec.measureUom + '"';
				
				outFile				+= csvRec + "\n";
				
			}
			writeFile(tmpFolder, fileName, outFile);
		}
	});
	
/*
  	new StreamBuffer(request( options, function(error, response) {
		console.log("Request completed: " + desc + " " );
		var currDate = new Date();
		var iso8601 = currDate.toISOString();

		writeFile(tmpFolder, fileName, '{"retrievedDate": "' + iso8601 + '", "content":' + 
			_wfsResult + ' }');
		})
  	);
*/

	} // end of reqFile

}  // end of module.exports
