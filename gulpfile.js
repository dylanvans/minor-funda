// ========================================================
// GULP VARIABLES
// ========================================================
var gulp = require('gulp'),
    sass = require('gulp-sass'),
    livereload = require('gulp-livereload');



// ========================================================
// SET PATHS
// ========================================================
var sass_path = 'static/css/',
    css_path = 'static/css/';



// ========================================================
// DEFAULT TASKS
// ========================================================
gulp.task('sass', function () {
    gulp.src(sass_path + '*.scss')
        .pipe(sass())
        .pipe(gulp.dest(css_path))
        .pipe(livereload());
});

// Watch CSS & JS file during developemt
gulp.task('default', function () {
    livereload.listen();
    gulp.watch( sass_path + '*.scss', ['sass']);
});