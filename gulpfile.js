/* jshint esversion: 8 */

// Load environment variables from .env file
require('dotenv').config();

const gulp = require('gulp');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const nodemon = require('gulp-nodemon');
const todo = require('gulp-todo');
const webpack = require('webpack-stream');
const Mocha = require('mocha');
const fs = require("fs");
const path = require("path");
const PluginError = require('plugin-error');

function getWebpackConfig() {
    return require('./webpack.config.js')(!process.env.IS_DEV)
}

function runServer(done) {
    nodemon({
        delay: 10,
        script: './bin/server/server.js',
        ignore: ['bin/'],
        ext: 'js html css',
        done,
        tasks: [process.env.IS_DEV ? 'dev' : 'build']
    })
}

function buildServer() {
    let task = gulp.src(['src/server/**/*.*', 'src/server/**/*.js', '!src/server/db/**']);
    if (!process.env.IS_DEV) {
        task = task.pipe(babel())
    }
    return task.pipe(gulp.dest('bin/server/'));
}

function copyClientResources() {
    return gulp.src(['src/client/**/*.*', '!src/client/**/*.js'])
        .pipe(gulp.dest('./bin/client/'));
}

function buildClientJS() {
    return gulp.src(['src/client/js/app.js', 'src/client/js/game-config.js', 'src/client/js/landing.js'])
        .pipe(webpack(getWebpackConfig()))
        .pipe(gulp.dest('bin/client/js/'));
}

function buildPrivyAuth() {
    return gulp.src(['src/client/components/auth/privy-auth.jsx'])
        .pipe(webpack(require('./webpack.privy.config.js')))
        .pipe(gulp.dest('bin/client/auth/'));
}

function copyClientJS() {
    return gulp.src(['src/client/js/game-config.js', 'src/client/js/landing.js'])
        .pipe(gulp.dest('bin/client/js/'));
}

function setDev(done) {
    process.env.IS_DEV = 'true';
    done();
}

function mocha(done) {
    const mochaInstance = new Mocha()
    const files = fs
        .readdirSync('test/', {recursive: true})
        .filter(x => x.endsWith('.js')).map(x => path.resolve('test/' + x));
    for (const file of files) {
        mochaInstance.addFile(file);
    }
    mochaInstance.run(failures => failures ? done(new PluginError('mocha', `${failures} test(s) failed`)) : done());
}

gulp.task('lint', () => {
    return gulp.src(['**/*.js', '!node_modules/**/*.js', '!bin/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
});

gulp.task('test', gulp.series('lint', mocha));

gulp.task('todo', gulp.series('lint', () => {
    return gulp.src('src/**/*.js')
        .pipe(todo())
        .pipe(gulp.dest('./'));
}));

gulp.task('build', gulp.series('lint', gulp.parallel(copyClientResources, copyClientJS, buildServer)));

gulp.task('dev', gulp.parallel(copyClientResources, buildClientJS, buildPrivyAuth, copyClientJS, buildServer));

gulp.task('run', gulp.series('build', runServer));

gulp.task('watch', gulp.series(setDev, 'dev', runServer));

gulp.task('default', gulp.series('run'));