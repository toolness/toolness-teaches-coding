var url = require('url');
var request = require('request');
var cheerio = require('cheerio');
var parseCSS = require('css-parse');

var CSS_URL = /url\(([^)]+)\)/;

function code(str) {
  return '`' + str + '`';
}

function isRelativeURL(str) {
  return url.parse(str).protocol === null;
}

function parseRelativeURLValue(str) {
  var match = (str || '').match(CSS_URL);

  if (!match) return null;

  var value = match[1].trim();

  if (/^'.*'$/.test(value) || /^".*"$/.test(value))
    value = value.slice(1, value.length-1);
  if (!value || !isRelativeURL(value)) return null;

  return value;
}

function processCSS(baseURL, cssURL) {
  request(url.resolve(baseURL, cssURL), function(err, res, body) {
    if (err) throw err;

    var css = parseCSS(body);
    var count = 0;

    if (!(css && css.stylesheet && css.stylesheet.rules)) return;
    console.log("## Relative URLs in", code(cssURL), "\n");

    css.stylesheet.rules.forEach(function(rule) {
      if (!(rule && rule.declarations)) return;
      rule.declarations.forEach(function(decl) {
        var valueURL = parseRelativeURLValue(decl.value);

        if (!valueURL) return;
        console.log('* url:', code(valueURL));
        count++;
      });
    });
    if (!count) console.log("None.");
    console.log();
  });
}

function processHTML(htmlURL) {
  request(htmlURL, function(err, res, body) {
    if (err) throw err;

    var $ = cheerio.load(body);

    console.log("## Relative URLs in", code(htmlURL), "\n");

    $('link[rel][href]').each(function() {
      var href = this.attr('href');

      if (!isRelativeURL(href)) return;
      console.log('*', code(this.attr('rel')), 'link:', code(href));
      if (this.attr('rel').toLowerCase() == 'stylesheet')
        processCSS(htmlURL, href);
    });

    $('a[href]').each(function() {
      if (!isRelativeURL(this.attr('href'))) return;
      console.log('* hyperlink:', code(this.attr('href')));
    });

    $('script[src]').each(function() {
      if (!isRelativeURL(this.attr('src'))) return;
      console.log('* script:', code(this.attr('src')));
    });
    console.log();
  });
}

if (!process.argv[2]) {
  console.log("usage: find-relative-urls.js <URL>");
  process.exit(1);
}

processHTML(process.argv[2]);
