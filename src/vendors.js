// Import vendor libraries and expose globally
import $ from 'jquery';
import 'jquery-ui/dist/jquery-ui.min.js';
import _ from 'underscore';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'backbone';
import SunCalc from 'suncalc';
import Highcharts from 'highcharts';

// Make jQuery, Underscore, SunCalc, and Highcharts available globally
window.$ = window.jQuery = $;
window._ = _;
window.SunCalc = SunCalc;
window.Highcharts = Highcharts;

console.log('✓ All vendor libraries loaded successfully (npm versions)');
