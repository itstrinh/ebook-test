'use strict';

import path from 'path';
import plugins from 'gulp-load-plugins';
import yargs from 'yargs';
import browser from 'browser-sync';
import gulp from 'gulp';
import eslint from 'gulp-eslint';
import panini from 'panini';
import rimraf from 'rimraf';
import yaml from 'js-yaml';
import fs from 'fs';
import webpackStream from 'webpack-stream';
import webpack4 from 'webpack';
import named from 'vinyl-named';
import scaleImages from 'gulp-scale-images';
import flatMap from 'flat-map';

// Load all Gulp plugins into one variable
const $ = plugins();

// Check for --production flag
const PRODUCTION = !!yargs.argv.production;

// Load settings from settings.yml
const { COMPATIBILITY, PORT, PATHS } = loadConfig();

function loadConfig() {
	let ymlFile = fs.readFileSync('config.yml', 'utf8');
	return yaml.load(ymlFile);
}

// Build the "dist" folder by running all of the below tasks
gulp.task('build', gulp.series(cleanTmp, clean, gulp.parallel(pages, javascript, images, svgs, copy, sass)));

// Build the site, run the server, and watch for file changes
gulp.task('default', gulp.series('build', server, svgs, watch));

// Delete the "dist" folder
// This happens every time a build starts
function clean(done) {
	rimraf(PATHS.dist, done);
}

function cleanTmp(done) {
	rimraf('tmp', done);
}

// Copy files out of the assets folder
// This task skips over the "img", "js", and "scss" folders, which are parsed separately
function copy() {
	return gulp.src(PATHS.assets).pipe(gulp.dest(PATHS.dist + '/assets'));
}

// Copy page templates into finished HTML files
function pages() {
	return gulp
		.src('src/pages/**/*.{html,hbs,handlebars}')
		.pipe(
			panini({
				root: 'src/pages/',
				layouts: 'src/layouts/',
				partials: 'src/partials/',
				data: 'src/data/',
				helpers: 'src/helpers/'
			})
		)
		.pipe(gulp.dest(PATHS.dist));
}

// Load updated HTML templates and partials into Panini
function resetPages(done) {
	panini.refresh();
	done();
}

// Compile Sass into CSS
// In production, the CSS is compressed
function sass() {
	return (
		gulp
			.src('src/assets/scss/app.scss')
			.pipe($.sourcemaps.init())
			.pipe(
				$.sass({
					includePaths: PATHS.sass
				}).on('error', $.sass.logError)
			)
			.pipe(
				$.autoprefixer({
					browsers: COMPATIBILITY
				})
			)
			.pipe($.if(PRODUCTION, $.cleanCss(
				{debug: true}, (details) => {
					console.log(`${details.name}: ${details.stats.originalSize}`);
					console.log(`${details.name}: ${details.stats.minifiedSize}`);
				})
			))
			.pipe($.if(!PRODUCTION, $.sourcemaps.write()))
			.pipe(gulp.dest(PATHS.dist + '/assets/css'))
			.pipe(browser.reload({ stream: true }))
	);
}

let webpackConfig = {
	mode: PRODUCTION ? 'production' : 'development',
	module: {
		rules: [
			{
				test: /.js$/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							['@babel/preset-env']
						]
					}
				}
			}
		]
	}
};
// Combine JavaScript into one file
// In production, the file is minified
function javascript() {
	return (
		gulp
			.src(PATHS.entries)
			.pipe(named())
			.pipe(eslint())
			// eslint.format() outputs the lint results to the console.
			// Alternatively use eslint.formatEach() (see Docs).
			.pipe(eslint.format())
			// To have the process exit with an error code (1) on
			// lint error, return the stream and pipe to failAfterError last.
			.pipe(eslint.failAfterError())
			.pipe($.sourcemaps.init())
			.pipe(webpackStream(webpackConfig, webpack4))
			.pipe(
				$.if(
					PRODUCTION,
					$.uglify().on('error', (e) => {
						console.log(e);
					})
				)
			)
			.pipe($.if(!PRODUCTION, $.sourcemaps.write()))
			.pipe(gulp.dest(PATHS.dist + '/assets/js'))
	);
}

function images() {
	return gulp
		.src(['src/assets/img/**/*', '!src/assets/img/**/*.svg'])
		.pipe($.responsive({
			'*': [
				{
					width: 320,
					rename: {
						suffix: '-320w',
						extname: '.jpg'
					}
				}, {
					width: 640,
					rename: {
						suffix: '-640w',
						extname: '.jpg'
					}
				}, {
					width: 800,
					rename: {
						suffix: '-800w',
						extname: '.jpg'
					}
				}, {
					width: 1024,
					rename: {
						suffix: '-1024w',
						extname: '.jpg'
					}
				}, {
					width: 1920,
					rename: {
						extname: '.jpg'
					}
				}, {
					width: 3000,
					rename: {
						suffix: '-3000w',
						extname: '.jpg'
					}
				}
			]
		}, {
			quality: 75,
			progressive: true,
			withMetadata: false,
			errorOnEnlargement: false
		}))
		.pipe(gulp.dest('tmp/assets/img'))
		.pipe(gulp.dest(PATHS.dist + '/assets/img'));
}

function svgs() {
	return gulp
		.src('src/assets/img/**/*.svg').pipe(
			$.if(
				PRODUCTION,
				$.imagemin({
					progressive: true
				})
			)
		)
		.pipe(gulp.dest('tmp/assets/img'))
		.pipe(gulp.dest(PATHS.dist + '/assets/img'));
}

// Start a server with BrowserSync to preview the site in
function server(done) {
	browser.init(
		{
			server: PATHS.dist,
			port: PORT,
			serveStatic: [{
				route: '/assets',
				dir: 'tmp'
			}]
		},
		done
	);
}

// Reload the browser with BrowserSync
function reload(done) {
	browser.reload();
	done();
}

// Watch for changes to static assets, pages, Sass, and JavaScript
function watch() {
	gulp.watch(PATHS.assets, copy);
	gulp.watch('src/pages/**/*.html').on('all', gulp.series(pages, browser.reload));
	gulp.watch('src/{layouts,partials}/**/*.html').on(
		'all',
		gulp.series(resetPages, pages, browser.reload)
	);
	gulp.watch('src/assets/scss/**/*.scss').on('all', sass);
	gulp.watch('src/assets/js/**/*.js').on(
		'all',
		gulp.series(javascript, browser.reload)
	);
	gulp.watch('src/assets/img/**/*').on('all', gulp.series(images, browser.reload));
}
