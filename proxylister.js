var countrycode = 'in';
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');


async.series([

		function(cb) {
			request({url: "http://www.proxynova.com/proxy-server-list/country-"+countrycode }, 
				function (error, response, body) { 
					if(!err && response.statusCode == 200) {
						var $ = cheerio.load(body);
						cb(null, $);
					}
					else {
						cb(err || 'error in loading proxynova');
					}
				});
		},

		// fetch recently alive proxies
		function($, cb) {
			var rows = $("#bla tr");
			var validProxies = rows.map(function(i, row){  
			    var lastcheck = $(row).find(".timeago").text();
			    if(lastcheck.indexOf("min") > 0 || lastcheck.indexOf("hour") > 0) {
			        return { ip :$(row).find(".row_proxy_ip").text(), port: $(row).find("td:nth-child(2)").text().replace(/([^0-9]+)/g, "" ) };
			    }
			});
			if(validProxies.length) {
				cb(null, validProxies);
			}
			else {
				cb('No healthy proxies found. Try again with a different country');
			}
		},

		// check if these proxies are alive in realtime.
		function(validProxies, cb) {
			
			var aliveProxies = [];

			async.map(validProxies, function(i, proxy) {
				var options = {
						url: 'http://www.reddit.com/',
						proxy: proxy.ip + ":" + proxy.port
					};
					request(options, function (error, response, body) {
						if (!error && response && response.statusCode && (response.statusCode == 200 || response.statusCode == 302 ) ) {
							debugok("response ok: ", response.statusCode, url);
							aliveProxies.push(proxy);
						}
						else {
							debugerr("response error: ", error, response && response.statusCode, url);
						}
				    });
				}, function(err,results) {
					if(err)
						cb('Error in checking alive status of proxies');
					else
						cb(null, aliveProxies);	
				});
		}, 

		// got alive proxies. can do ur job now.
		function(aliveProxies, cb){
			debugok("Alive Proxies List: ", aliveProxies.length, aliveProxies);
		}

	], function(err, results) {

		if(err) {
			debugerr("Final Error: ", err);
		}
		debugok("Results: ", results);
	}
);

