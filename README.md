# passport-unilogin
[![David](https://img.shields.io/david/DBCDK/passport-unilogin.svg?style=flat-square)](https://david-dm.org/DBCDK/passport-unilogin#info=dependencies)
[![David](https://img.shields.io/david/dev/DBCDK/passport-unilogin.svg?style=flat-square)](https://david-dm.org/DBCDK/passport-unilogin#info=devDependencies)

## Install

```bash
  $ npm install passport-unilogin --save
```

## Usage

#### Create an Application

Before using `passport-unilogin`, you must register an application with UNI-Login.

#### Configure Strategy
The following paramteres are mandatory when configuring the UniloginStrategy:  
- id  
The application `id` as agreed with UNI-Login when registrering the application.  
- secret  
The application `secret` as agreed with UNI-Login when registrering the application.  
- uniloginBasePath  
The base path for the UNI-Login submission form. Typically it will be `https://sso.emu.dk/unilogin/login.cgi`

Optional parameters:
- maxTicketAge  
If `maxTicketAge` is set to or above `1` the age of the ticket returned from UNI-Login will be asured that the age of ticket is not higer than the given amount in seconds.  
I.e. if `maxTicketAge: 30` the error object returned to the application from `passport-unilogin` will contain an error.   

The strategy also requires a `verify` callback, which receives any errors, the ticket and the `req`object.
The `verify` callback must call `done` providing a user to complete authentication.

#### Verify callback
The verify callback is passed as second parameter to the constructor when instantiating the strategy.  
The verify callback should be a function accepting four parameters:  
1. error  
An error object. If no errors the `null` is returned.  
2. req  
The req object passed from express  
3. ticket  
The ticket returned from UNI-Login structured a as below:  
```js
  {
    auth: 'some hash token',
    timestamp: 'YYYYMMDDHHmmss',
    user: 'UNI-Login username'
  }
```  
4. done callback  
Callback to passport to inform passport whether the authentification is valid or not.

#### Implementation

```js
    passport.use('unilogin', new UniloginStrategy({
        id: UNILOGIN_APPLICATION_ID,
        secret: UNILOGIN_APPLICATION_SECRET,
        uniloginBasePath: "https://sso.emu.dk/unilogin/login.cgi",
        maxTicketAge: 60
      },
      (error, req, ticket, done) => {
        
        if(error) { 
          return done(null, false, 'Some error message');
        }
        
        return done(null, {unilogin: ticket.user});
      }
    ));
```

#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'unilogin'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:
```js
  app.get('/login', passport.authenticate('unilogin'),
    (req, res) => {
      res.redirect('/');
     }
  );
```

For an actually example of usage see https://github.com/DBCDK/biblo/tree/master/src/server/PassportStrategies
 
#### Building
The source code in `src/` is written in ES6 and transpiled using babel to ES5 and placed in `dist/` which is the code exposed to the application.
Therefore, if not installed using `$ npm run install passport-unilogin` bu i.e. cloned from GitHub remember to execute `$ npm run build` before using the `passport-unilogin`module.
See the `scripts` clause in `package.json` for more handy scripts.

#### Tests

The test suite is located in the `src/__tests__/` directory.  All new features are
expected to have corresponding test cases.  Ensure that the complete test suite
passes by executing:

```bash
  $ npm run test
```

