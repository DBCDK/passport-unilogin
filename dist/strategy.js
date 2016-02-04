'use strict';

/**
 * @file
 * UNI-login authentication strategy for Passport and Node.js
 * Based on the work done by Jared Hanson in passport-locale -- https://github.com/jaredhanson/passport-local
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _passportStrategy = require('passport-strategy');

var _passportStrategy2 = _interopRequireDefault(_passportStrategy);

var _lodash = require('lodash');

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Strategy = function (_passport$Strategy) {
  _inherits(Strategy, _passport$Strategy);

  /**
   * @param {{id: String, secret: String, uniloginBasePath: String, maxTicketAge: Number}} options Object with the necessary parmaters for using UNI-Login
   * @param callback
   */

  function Strategy(options, callback) {
    _classCallCheck(this, Strategy);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Strategy).call(this));

    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (!callback) {
      throw new TypeError('UniloginStrategy requires a verify callback');
    }
    if (!options.id) {
      throw new TypeError('UniloginStrategy requires a \'id\' parameter in the options object. I.e. {id: \'some_id\'}');
    }
    if (!options.secret) {
      throw new TypeError('UniloginStrategy requires a \'secret\' parameter in the options object. I.e. {secret: \'sssshh\'}');
    }
    if (!options.uniloginBasePath) {
      throw new TypeError('UniloginStrategy requires a \'uniloginBasePath\' parameter in the options object. I.e. {uniloginBasePath: \'https://sso.emu.dk/unilogin/login.cgi\'}');
    }
    if ((0, _lodash.has)(options, 'maxTicketAge') && typeof options.maxTicketAge !== 'number') {
      throw new TypeError('Only numbers are accepted in maxTicketAge. I.e. {maxTicketAge: 30} Minimum value is 1. If 0 0r below is given the check will be ignored.');
    }

    _this.id = options.id;
    _this.secret = options.secret;
    _this.uniloginBasePath = options.uniloginBasePath;
    _this.maxTicketAge = options.maxTicketAge || 0;

    _passportStrategy2.default.Strategy.call(_this);
    _this.name = 'unilogin';
    _this.callback = callback;
    return _this;
  }

  /**
   * Handling UNI-Login requests.
   * If the req.query object is empty the request is considered user initiated
   * login-request and the browser is redirected to UNI-Login where the user
   * will login.
   *
   * Otherwise, if the req.query object is not empty and contains the expected
   * keys, the request is considered a redirect back from UNI-Login after a
   * successful user submission and the ticket is validated.
   *
   * @param {Object} req
   * @param {{returURL: 'String'}} options Optional parameter
   * @api protected
   */

  _createClass(Strategy, [{
    key: 'authenticate',
    value: function authenticate(req, options) {
      if ((0, _lodash.isEmpty)(req.query)) {
        this.requestNewUniLoginSession(req, options);
      } else if (!(0, _lodash.isEmpty)(req.query) && (0, _lodash.has)(req.query, 'auth') && (0, _lodash.has)(req.query, 'timestamp') && (0, _lodash.has)(req.query, 'user')) {
        this.authenticateUniloginCallback(req);
      } else {
        return this.fail({ message: 'Bad request' }, 400);
      }
    }

    /**
     * Constructs the URL to redirect to at UNI-Login and request Passport to
     * perform the actual redirect.
     *
     * An optional returURL can be given in the options object. If set it will be
     * used as the address UNI-Login should redirect back to after successful
     * authentication.
     * If not set an URL pointing to the current location in the browser will be
     * used as redirect URL.
     *
     * @param {Object} req
     * @param {Object} options If returURL is present in the options object the
     * value will be used as the url UNI-Login should redirect back to when
     * authentication is complete.
     */

  }, {
    key: 'requestNewUniLoginSession',
    value: function requestNewUniLoginSession(req, options) {
      var returURL = options.returURL || req.protocol + '://' + req.get('host') + req.path;
      var path = encodeURIComponent(new Buffer(returURL).toString('base64'));
      var auth = this.md5(returURL + this.secret);
      var redirectUrl = this.uniloginBasePath + '?id=' + this.id + '&returURL=' + returURL + '&path=' + path + '&auth=' + auth;

      this.redirect(redirectUrl);
    }

    /**
     * Method to authenticate the callback from UNI-Login after successful form
     * submission at UNI-Login.
     *
     * By default the auth paramter will be verfied.
     * If maxTicketAge is set to or above 1 the timestamp will also be verified to
     * not be older than the given value.
     *
     * No matter the result of ther verfications a callback back to the appliction
     * will be made, where actual tests on the error object should be made before
     * considering it a successful login.
     *
     * @param {Object} req
     */

  }, {
    key: 'authenticateUniloginCallback',
    value: function authenticateUniloginCallback(req) {
      var auth = req.query.auth;
      var timestamp = req.query.timestamp;
      var user = req.query.user;

      var authVerified = this.verifyTicket({ auth: auth, timestamp: timestamp, user: user });
      var timestampVerified = this.maxTicketAge >= 1 ? this.validateAgeOfTicket({ auth: auth, timestamp: timestamp, user: user }) : { error: false, message: null };

      var errorObject = !authVerified.error && !timestampVerified.error ? null : { auth: authVerified, timestamp: timestampVerified };

      this.callback(errorObject, req, { auth: auth, timestamp: timestamp, user: user, ltoken: req.query.ltoken }, this.verified.bind(this));
    }

    /**
     * Verify that the auth value in the ticket equals the expected md5
     * calculation.
     *
     * If the configurable maxTicketAge is set to or above 0 the age of the ticket
     * will be calculated and verified against the value given in maxTicketAge.
     *
     * @param {{auth: String, user: String, timestamp: Number }} ticket
     * @return {{error: boolean, message: String}}
     */

  }, {
    key: 'verifyTicket',
    value: function verifyTicket(ticket) {
      var verification = {
        error: false,
        message: null
      };

      var auth = ticket.auth;
      var token = this.md5(ticket.timestamp + this.secret + ticket.user);

      if (auth !== token) {
        verification.error = true;
        verification.message = 'Auth/token calculation mismatch';
      }

      return verification;
    }

    /**
     * Validate the age of the ticket against the configured maxTicketAge.
     *
     * @param {{auth: String, user: String, timestamp: Number }} ticket
     * @return {{error: boolean, message: String}}
     */

  }, {
    key: 'validateAgeOfTicket',
    value: function validateAgeOfTicket(ticket) {
      var timestamp = _moment2.default.utc(ticket.timestamp, 'YYYYMMDDHHmmss').format('X');
      var now = (0, _moment2.default)().utc().format('X');

      var verification = {
        error: false,
        message: null
      };

      if (parseInt(now, 10) - parseInt(timestamp, 10) >= this.maxTicketAge) {
        verification.error = true;
        verification.message = 'Ticket timestamp has exceeded the value defined in maxTicketAge (' + this.maxTicketAge + ')';
      }

      return verification;
    }

    /**
     * The verified callback that will be passed to to the application where it
     * should appropriately invoked depending on whether the application considers
     * the login attempt a success or not.
     *
     * @param {*} err
     * @param {*} user
     * @param {String} info
     * @return {*}
     */

  }, {
    key: 'verified',
    value: function verified(err, user, info) {
      if (err) {
        return this.error(err);
      }
      if (!user) {
        return this.fail(info);
      }
      this.success(user, info);
    }

    /**
     * Hashes the given string using the md5 algorithm
     *
     * @param string The string that shouldbe hashed.
     * @return {String}
     */

  }, {
    key: 'md5',
    value: function md5(string) {
      return _crypto2.default.createHash('md5').update(string).digest('hex');
    }
  }]);

  return Strategy;
}(_passportStrategy2.default.Strategy);

exports.default = Strategy;