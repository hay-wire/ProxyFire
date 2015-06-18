"use strict";

var countrycode = 'in';
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var debugerr = require('debug')('proxyfire:err');
var debugok = require('debug')('proxyfire:ok');
var fs = require('fs');
var debuginfo = require('debug')('proxyfire:info');


async.waterfall([

		function(cb) {
			debugok("1");
			request({url: "http://www.proxynova.com/proxy-server-list/country-"+countrycode }, 
				function (error, response, body) { 
					if(!error && response.statusCode == 200) {
						var S = cheerio.load(body);
						cb(null, S);
					}
					else {
						cb(error || 'error in loading proxynova');
					}
				});
		},

		// fetch recently alive proxies
		function(S, cb) {
			debugok("2");
			var $ = S;
			var rows = $("#bla tr");

			if(!rows || !rows.length) {
				cb('Invalid proxynova page');
				return;
			}

			debuginfo("rows length: ", rows.length);
			var validProxies = rows.map(function(i, row){  
					var ip = $(row).find(".row_proxy_ip").text();
		        	var port = $(row).find("td:nth-child(2)").text().replace(/([^0-9]+)/g, "" ); 
		        	
		        	(ip && ip.length) ? ip = ip.trim() : null;
		        	(port && port.length) ? port = port.trim() : null;

		        	if(ip && ip.length && port && port.length)
			    	    return { ip: ip, port: port };

			 //    var lastcheck = $(row).find(".timeago").text();
				// if(lastcheck.match(/sec|min|hour/)) {
			 //    	debuginfo("lastcheck: ", lastcheck);
				// 	debuginfo("ip : ", $(row).find(".row_proxy_ip").text());
				// 	debuginfo("");
			 //        return { 
			 //        	ip :$(row).find(".row_proxy_ip").text(), 
			 //        	port: $(row).find("td:nth-child(2)").text().replace(/([^0-9]+)/g, "" ) 
			 //        };
			 //    }
			 //    else {
			 //    	debugerr("lastcheck: ", lastcheck);
				// 	debugerr("ip : ", $(row).find(".row_proxy_ip").text());
				// 	debugerr("");
			 //    }
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
			debugok("3");
			debugok("validProxies #", validProxies.length);
			var aliveProxies = [];

			async.map(validProxies, function(proxy, mapCB) {
				var options = {
						url: 'http://wtfismyip/',
						proxy: 'http://'+proxy.ip + ":" + proxy.port,
						method: 'GET',
						tunnel: false
					};

					debuginfo(options);
					
					request(options, function (error, response, body) {
						if (!error && response && response.statusCode && (response.statusCode == 200 || response.statusCode == 302 ) ) {
							debugok("response ok: ", response.statusCode);
							aliveProxies.push(proxy);
							mapCB(null);
						}
						else {
							debugerr("response error: ", error, response && response.statusCode);
							mapCB(null);
						}
				    }).pipe(fs.createWriteStream('log.log'));
				}, function(err,results) {
					if(err)
						cb('Error in checking alive status of proxies');
					else
						cb(null, aliveProxies);	
				});
		}, 

		// got alive proxies. can do ur job now.
		function(aliveProxies, cb){
			debugok("4");
			debugok("Alive Proxies List: ", aliveProxies.length, aliveProxies);
			cb(null, null);
		}

	], function(err, results) {

		if(err) {
			debugerr("Final Error: ", err);
		}
	}
);

