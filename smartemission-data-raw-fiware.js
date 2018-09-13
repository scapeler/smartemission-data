/*
** Module: smartemission-data-raw-fiware
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
var _options	= {};
var smartemissionUrl, smartemissionFileName, smartemissionLocalPathRoot, fileFolder, tmpFolder;
var secureSite;
var siteProtocol;
var openiodUrl;
var loopTimeMax;


// **********************************************************************************


module.exports = {

	init: function (options) {
		_options					= options;

		secureSite 			= true;
		siteProtocol 		= secureSite?'https://':'http://';
		//openiodUrl			= siteProtocol + 'openiod.org/' + _options.systemCode; //SCAPE604';
		openiodUrl			= siteProtocol + 'openiod.org/fiware/v2/entities?options=keyValues' ;
		loopTimeMax			= 60000; //ms, 60000=60 sec

		smartemissionUrl 			= 'http://whale.citygis.nl/sensorviewer2/devices/42/last';
		smartemissionFileName 		= 'smartemission.txt';

		smartemissionLocalPathRoot = options.systemFolderParent + '/smartemission/';
		fileFolder 			= 'smartemission';
		tmpFolder 			= smartemissionLocalPathRoot + fileFolder + "/" + 'tmp/';

		// create subfolders
		try {fs.mkdirSync(tmpFolder );} catch (e) {};//console.log('ERROR: no tmp folder found, batch run aborted.'); return } ;

//		// 1 uur reeksen met Smart Emission metingen. Aanvulling elk uur.

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

	// send data to SOS service via OpenIoD REST service
	var sendData = function(data) {
	// oud //		http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=transform_observation&inputformat=insertom&objectid=humansensor&format=xml
	// oud //			&region=EHV		&lat=50.1		&lng=4.0		&category=airquality		&value=1

	//http://localhost:4000/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=transform_observation&action=insertom&sensorsystem=scapeler_shinyei&offering=offering_0439_initial&verbose=true&commit=true&observation=scapeler_shinyei:12.345&neighborhoodcode=BU04390402
	//https://openiod.org/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=transform_observation&action=insertom&sensorsystem=scapeler_shinyei&offering=offering_0439_initial&verbose=true&commit=true&observation=scapeler_shinyei:12.345&neighborhoodcode=BU04390402

		var _url = openiodUrl;
		//_url = _url + '&region=0439' + '&neighborhoodcode=' + data.neighborhoodCode + '&citycode=' + data.cityCode + '&observation=' + data.observation ;

		console.log(data);
		var json_obj = JSON.stringify(data);
		console.log(_url);
		console.log(json_obj)

		request.post({
    		headers: {'content-type': 'application/json'},
    		url: _url,
    		body: json_obj, //form: json_obj
			}, function(error, response, body){
  			console.log(body)
			}
		);
/*
		request.post(_url)
			.on('response', function(response) {
				console.log(response.statusCode) // 200
				console.log(response.headers['content-type']) // 'image/png'
  			})
			.on('error', function(err) {
				console.log(err)
			})
		;
*/

	};


	var milliKelvinToCelsius = function(n){return Math.round((n/1e3-273.15)*100)/100};


	var options = {
		uri: url,
		method: 'GET'
	};

	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			//console.log(body.observations[0])
			var inRecord	= JSON.parse(body);
/*
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
*/
			var data				= {};
			data.id="SmartEmission-"+inRecord.id+"-"+inRecord.time;
			data.type="AirQualityObserved";
			data.sensorSystem="SmartEmission";
			data.dateObserved=inRecord.time;
			data.relativeHumidity=inRecord.s_humidity/1000;
			data.temperature=milliKelvinToCelsius(inRecord.s_temperatureambient);
			data.CO2=inRecord.s_co2/1000;
			data.lightTop=inRecord.s_lightsensortop;
			data.pressure=inRecord.s_barometer/100;

			sendData(data);


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
