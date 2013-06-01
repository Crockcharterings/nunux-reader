
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , passport = require('passport')
  , GoogleStrategy = require('passport-google').Strategy
  , User = require('./lib/user');

var app = module.exports = express();

app.configure(function(){
  app.set('port', process.env.APP_PORT || 3000);
  app.set('realm', process.env.APP_REALM || 'http://localhost:' + app.get('port'));
  app.set('views', __dirname + '/views');
  app.set('view engine', 'hjs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.cookieParser());
  app.use(express.cookieSession({secret: 'NuNUXReAdR_'}));
  app.use(express.bodyParser());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function() {
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(errorHandler);
});

app.configure('production', function() {
  app.use(express.static(path.join(__dirname, 'public-build')));
  app.use(errorHandler);
});

function errorHandler(err, req, res, next) {
  if ('test' != app.get('env')) console.error(err.stack || err);
  res.status(err.status || 500);
  res.format({
    html: function(){
      res.render('error', {error: err});
    },
    text: function(){
      res.type('txt').send('error: ' + err + '\n');
    },
    json: function(){
      res.json({error: err});
    }
  });
}

passport.serializeUser(function(user, done) {
  done(null, user.uid);
});

passport.deserializeUser(function(id, done) {
  User.find(id, done);
});

passport.use(new GoogleStrategy({
    returnURL: app.get('realm') + '/auth/google/return',
    realm: app.get('realm') + '/'
  },
  function(identifier, profile, done) {
    var user = {
      uid: profile.emails[0].value,
      username: profile.displayName,
      identifier: identifier
    }
    User.findOrCreate(user, done); 
  })
);

app.get('/auth/google', passport.authenticate('google'));
app.get('/auth/google/return',
        passport.authenticate('google', {
          successRedirect: '/',
          failureRedirect: '/' }));

app.ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.send(403);
}

// Register routes...
require('./routes/index')(app);
require('./routes/timeline')(app);
require('./routes/subscription')(app);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
