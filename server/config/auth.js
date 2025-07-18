// server/config/auth.js
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');
const { JWT_SECRET } = require('./env');

exports.configureJWT = (passport) => {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET
  };

  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        // Find the user by ID from the payload
        const user = await User.findById(jwt_payload.id);

        if (user) {
          return done(null, user);
        }
        
        return done(null, false);
      } catch (err) {
        return done(err, false);
      }
    })
  );
};