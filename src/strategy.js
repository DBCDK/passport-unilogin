'use strict';

/**
 * @file
 * UNI-login authentication strategy for Passport and Node.js
 * Based on the work done by Jared Hanson in passport-locale -- https://github.com/jaredhanson/passport-local
 */

/**
 * Module dependencies.
 */
import crypto from 'crypto';
import passport from 'passport-strategy';
import {isEmpty, has} from 'lodash';
import moment from 'moment';

export default class Strategy extends passport.Strategy {
  /**
   * @param {{id: String, secret: String, uniloginBasePath: String, maxTicketAge: Number}} options Object with the necessary parmaters for using UNI-Login
   * @param callback
   */
  constructor(options, callback) {
    super();

    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (!callback) {
      throw new TypeError('UniloginStrategy requires a verify callback');
    }
    if (!options.id) {
      throw new TypeError(`UniloginStrategy requires a 'id' parameter in the options object. I.e. {id: 'some_id'}`);
    }
    if (!options.secret) {
      throw new TypeError(`UniloginStrategy requires a 'secret' parameter in the options object. I.e. {secret: 'sssshh'}`);
    }
    if (!options.uniloginBasePath) {
      throw new TypeError(`UniloginStrategy requires a 'uniloginBasePath' parameter in the options object. I.e. {uniloginBasePath: 'https://sso.emu.dk/unilogin/login.cgi'}`);
    }
    if (has(options, 'maxTicketAge') && typeof options.maxTicketAge !== 'number') {
      console.log('if');
      throw new TypeError(`Only numbers are accepted in maxTicketAge. I.e. {maxTicketAge: 30} Minimum value is 1. If 0 0r below is given the check will be ignored.`);
    }

    this.id = options.id;
    this.secret = options.secret;
    this.uniloginBasePath = options.uniloginBasePath;
    this.maxTicketAge = options.maxTicketAge || 0;

    passport.Strategy.call(this);
    this.name = 'unilogin';
    this.callback = callback;
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
  authenticate(req, options) {
    if (isEmpty(req.query)) {
      this.requestNewUniLoginSession(req, options)
    }
    else if (!isEmpty(req.query) && has(req.query, 'auth') && has(req.query, 'timestamp') && has(req.query, 'user')) {
      return this.authenticateUniloginCallback(req);
    }
    else {
      return this.fail({message: 'Bad request'}, 400);
    }
  }

  requestNewUniLoginSession(req, options) {
    const returURL = options.returURL || `${req.protocol}://${req.get('host')}${req.path}`;
    const path = encodeURIComponent(new Buffer(returURL).toString('base64'));
    const auth = this.md5(returURL + this.secret);
    const redirectUrl = `${this.uniloginBasePath}?id=${this.id}&returURL=${returURL}&path=${path}&auth=${auth}`;

    this.redirect(redirectUrl);
  }

  authenticateUniloginCallback(req) {
    const auth = req.query.auth;
    const timestamp = req.query.timestamp;
    const user = req.query.user;

    const authVerified = this.verifyTicket({auth: auth, timestamp: timestamp, user: user});
    const timestampVerified = this.maxTicketAge >= 1 ? this.validateAgeOfTicket({auth: auth, timestamp: timestamp, user: user}) : {error: false, message: null};;

    const errorObject = {auth: authVerified, timestamp: timestampVerified};

    this.callback(errorObject, req, {auth: auth, timestamp: timestamp, user: user, ltoken: req.query.ltoken}, this.verified.bind(this));
  }

  /**
   * Verify that the auth value in the ticket equals the expected md5
   * calculation.
   *
   * If the configurable maxTicketAge is set to or above 0 the age of the ticket
   * will be calculated and verified against the value given in maxTicketAge.
   *
   * @param {{auth: String, user: String, timestamp: String }} ticket
   * @return {{error: boolean, message: String}}
   */
  verifyTicket(ticket) {
    let verification = {
      error: false,
      message: null
    };

    const auth = ticket.auth;
    const token = this.md5(ticket.timestamp + this.secret + ticket.user);

    if(auth !== token) {
      verification.error = true;
      verification.message = 'Auth/token calculation mismatch';
    }

    return verification;
  }

  /**
   * Validate the age of the ticket against the configured maxTicketAge.
   *
   * @param {{auth: String, user: String, timestamp: String }} ticket
   * @return {{error: boolean, message: String}}
   */
  validateAgeOfTicket(ticket) {
    console.log('validateAgeOfTicket');
    const timestamp = moment.utc(ticket.timestamp, 'YYYYMMDDHHmmss').format('X');
    const now = moment().utc().format('X');

    let verification = {
      error: false,
      message: null
    };

    if(parseInt(now) - parseInt(timestamp) >= this.maxTicketAge) {
      verification.error = true;
      verification.message = `Ticket timestamp has exceeded the value defined in maxTicketAge (${this.maxTicketAge})`;
    }

    return verification;
  }

  verified(err, user, info) {
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
  md5(string) {
    return crypto
      .createHash('md5')
      .update(string)
      .digest('hex');
  }
}

