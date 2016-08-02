var peliasQuery = require('pelias-query'),
    defaults = require('./search_defaults'),
    textParser = require('./text_parser'),
    check = require('check-types'),
    geolib = require('geolib');
// var placeTypes = require('../helper/placeTypes');

// region_a is also an admin field. addressit tries to detect
// region_a, in which case we use a match query specifically for it.
// but address it doesn't know about all of them so it helps to search
// against this with the other admin parts as a fallback
// var adminFields = placeTypes.concat(['region_a']);

//------------------------------
// general-purpose search query
//------------------------------
var fallbackQuery = new peliasQuery.layout.FallbackQuery();
fallbackQuery.score( peliasQuery.view.popularity( peliasQuery.view.phrase ) );
fallbackQuery.score( peliasQuery.view.population( peliasQuery.view.phrase ) );

var geodisambiguationQuery = new peliasQuery.layout.GeodisambiguationQuery();
geodisambiguationQuery.score( peliasQuery.view.popularity( peliasQuery.view.phrase ) );
geodisambiguationQuery.score( peliasQuery.view.population( peliasQuery.view.phrase ) );

// mandatory matches
// query.score( peliasQuery.view.boundary_country, 'must' );
// query.score( peliasQuery.view.ngrams, 'must' );

// scoring boost
// query.score( peliasQuery.view.phrase );
// query.score( peliasQuery.view.focus( peliasQuery.view.phrase ) );
// query.score( peliasQuery.view.popularity( peliasQuery.view.phrase ) );
// query.score( peliasQuery.view.population( peliasQuery.view.phrase ) );

// address components
// query.score( peliasQuery.view.address('housenumber'), 'must' );
// query.score( peliasQuery.view.address('street'), 'must' );
// query.score( peliasQuery.view.address('postcode'), 'must' );

// admin components
// country_a and region_a are left as matches here because the text-analyzer
// can sometimes detect them, in which case a query more specific than a
// multi_match is appropriate.
// query.score( peliasQuery.view.admin('country_a'), 'must' );
// query.score( peliasQuery.view.admin('region_a'), 'must' );
// query.score( peliasQuery.view.admin('locality'), 'must' );
// query.score( peliasQuery.view.admin_multi_match(adminFields, 'peliasAdmin') );

// non-scoring hard filters
// query.filter( peliasQuery.view.boundary_circle );
// query.filter( peliasQuery.view.boundary_rect );
// query.filter( peliasQuery.view.sources );
// --------------------------------

/**
  map request variables to query variables for all inputs
  provided by this HTTP request.
**/
function generateQuery( clean ){

  var vs = new peliasQuery.Vars( defaults );

  // input text
  vs.var( 'input:name', clean.text );

  // sources
  vs.var( 'sources', clean.sources);

  // layers
  vs.var( 'layers', clean.layers);

  // size
  if( clean.querySize ) {
    vs.var( 'size', clean.querySize );
  }

  // focus point
  if( check.number(clean['focus.point.lat']) &&
      check.number(clean['focus.point.lon']) ){
    vs.set({
      'focus:point:lat': clean['focus.point.lat'],
      'focus:point:lon': clean['focus.point.lon']
    });
  }

  // focus viewport
  if( check.number(clean['focus.viewport.min_lat']) &&
      check.number(clean['focus.viewport.max_lat']) &&
      check.number(clean['focus.viewport.min_lon']) &&
      check.number(clean['focus.viewport.max_lon']) ) {
    // calculate the centroid from the viewport box
    vs.set({
      'focus:point:lat': clean['focus.viewport.min_lat'] + ( clean['focus.viewport.max_lat'] - clean['focus.viewport.min_lat'] ) / 2,
      'focus:point:lon': clean['focus.viewport.min_lon'] + ( clean['focus.viewport.max_lon'] - clean['focus.viewport.min_lon'] ) / 2
      //, 'focus:scale': calculateDiagonalDistance(clean) + 'km'
    });
  }

  // boundary rect
  if( check.number(clean['boundary.rect.min_lat']) &&
      check.number(clean['boundary.rect.max_lat']) &&
      check.number(clean['boundary.rect.min_lon']) &&
      check.number(clean['boundary.rect.max_lon']) ){
    vs.set({
      'boundary:rect:top': clean['boundary.rect.max_lat'],
      'boundary:rect:right': clean['boundary.rect.max_lon'],
      'boundary:rect:bottom': clean['boundary.rect.min_lat'],
      'boundary:rect:left': clean['boundary.rect.min_lon']
    });
  }

  // boundary circle
  // @todo: change these to the correct request variable names
  if( check.number(clean['boundary.circle.lat']) &&
      check.number(clean['boundary.circle.lon']) ){
    vs.set({
      'boundary:circle:lat': clean['boundary.circle.lat'],
      'boundary:circle:lon': clean['boundary.circle.lon']
    });

    if( check.number(clean['boundary.circle.radius']) ){
      vs.set({
        'boundary:circle:radius': Math.round( clean['boundary.circle.radius'] ) + 'km'
      });
    }
  }

  // boundary country
  if( check.string(clean['boundary.country']) ){
    vs.set({
      'boundary:country': clean['boundary.country']
    });
  }

  // run the address parser
  if( clean.parsed_text ){
    textParser( clean.parsed_text, vs );
  }

  var q = getQuery(vs);

  console.log(JSON.stringify(q, null, 2));

  return q;
}

// return diagonal distance in km, with min=1
function calculateDiagonalDistance(clean) {
  var diagonalDistance = geolib.getDistance(
    { latitude: clean['focus.viewport.min_lat'], longitude: clean['focus.viewport.min_lon'] },
    { latitude: clean['focus.viewport.max_lat'], longitude: clean['focus.viewport.max_lon'] },
    1000
  ) / 1000;

  return Math.max(diagonalDistance, 1);

}

function getQuery(vs) {
  if (isSingleFieldGeoambiguity(vs) && !hasQueryOrAddress(vs)) {
    return geodisambiguationQuery.render(vs);
  } else {
    return fallbackQuery.render(vs);
  }

}

function isSingleFieldGeoambiguity(vs) {
  return ['neighbourhood', 'borough', 'locality', 'county', 'region', 'country'].filter(function(layer) {
    return vs.isset('input:' + layer);
  }).length === 1;
}

function hasQueryOrAddress(vs) {
  return ['housenumber', 'street', 'query', 'category'].filter(function(layer) {
    return vs.isset('input:' + layer);
  }).length > 0;
}

module.exports = generateQuery;
