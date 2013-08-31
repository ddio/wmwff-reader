'use strict'

var USER_NAME = 'wmwff',
	DB_BASE = 'data/',
	PIX_URI = 'emma.pixnet.cc',
	PIX_RES = '/blog/articles';

var http = require('http'),
	fs = require('fs'),
	async = require('async'),
	exec = require('child_process').exec,
	_ = require('underscore');

function makeQuery( opts ) {

	var query = [];

	_.defaults( opts, { 
		user: USER_NAME, 
		format: 'json'
	});

	_.each( opts, function( val, para ) {
		query.push( para + '=' + val );
	});

	return query.join('&');
}

function updateCat( catId, catName, callback ) {

	async.waterfall( [
		function( cb ) { 
			fs.exists( DB_BASE + catId, function( isExisted ) {
				cb( null, isExisted );
			});
		},
		function( isExisted, cb ) {

			var indexFile = DB_BASE + catId + '/index.json';

			if( !isExisted ) {

				fs.mkdirSync( DB_BASE + catId, 7*8*8 | 5*8 | 5 );

				var path = PIX_RES + '?'+ makeQuery( { category_id: catId } ),
					data = '',
					opts = {
						host: PIX_URI,
						port: 80,
						path: path
					};
	
				console.log( '[GET] cat: ' + path );
	
				http.get( opts, function( res ) {
					res.on( 'data', function( chunk ) {
						data += chunk;
					});
					res.on( 'end', function() {
						fs.writeFile( indexFile, data );
						cb( null, JSON.parse( data ) );
					});
				});
			} else {
				fs.readFile( indexFile, function(err, data) {
					cb( null, JSON.parse( data ) );
				});
			}
		},
		function( catInfo ) {
			_.each( catInfo.articles, function( art ) {
				var artPath = DB_BASE + catId + '/' + art.id + '.json',
					bodyPath = DB_BASE + catId + '/' + art.id + '.html',
					txtPath = DB_BASE + catId + '/' + art.id + '.md';

				if( !fs.existsSync( artPath ) ) {

					var path = PIX_RES + '/' + art.id + '?' + makeQuery({}),
						data = '',
						opts = {
							host: PIX_URI,
							port: 80,
							path: path
						};

					http.get( opts, function( res ) {
						res.on( 'data', function( chunk ) {
							data += chunk;
						});
						res.on( 'end', function() {

							var artBody = JSON.parse( data ).article.body;

							console.log( '[DONE] art: ' + art.title );
							fs.writeFile( artPath, data );
							fs.writeFileSync( bodyPath, artBody );
//							console.log( 'python html2text.py ' + bodyPath + ' > ' + txtPath);
							
							exec( 'python html2text.py ' + bodyPath + ' > ' + txtPath, function() {
								fs.unlink( bodyPath );
							});
							

						});
					});

				}
			});
		}
	]);
}

fs.readFile( 'initConfig.json', function( err, data ) {

	data = JSON.parse( data );

	if( 'categories' in data ) {
		_.each( data.categories, updateCat );
	}
});

