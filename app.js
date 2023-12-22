/* eslint-disable no-undef */
const process = require('node:process')
const path = require('node:path')
const createError = require('http-errors')
const express = require('express')
const logger = require('morgan')
const mongoose = require('mongoose')
const session = require('express-session')
const SQLiteStore = require('connect-sqlite3')(session)
const passport = require('passport')
const compression = require('compression')
const helmet = require('helmet')
const RateLimit = require('express-rate-limit')

const User = require('./models/user')
const indexRouter = require('./routes/index')
const usersRouter = require('./routes/users')
const catalogRouter = require('./routes/catalog')

const app = express()
// Set up rate limiter: maximum of twenty requests per minute
const limiter = RateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20,
})
// Apply rate limiter to all requests
app.use(limiter)
// Add helmet to the middleware chain.
// Set CSP headers to allow our Bootstrap and Jquery to be served
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            'script-src': ['\'self\'', 'code.jquery.com', 'cdn.jsdelivr.net'],
        },
    }),
)
app.use(compression()) // Compress all routes
// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))
// intercept requests for /favicon.ico and send a 204 No Content response
app.get('/favicon.ico', (req, res) => res.status(204))

// Applications must initialize session support in order to make use of login sessions.
// In an Express app, session support is added by using express-session middleware.
// See: https://github.com/expressjs/session
app.use(session({
    store: new SQLiteStore({ db: 'sessions.sqlite'}),
    secret: '9097CE7DBCC6126C2BF52B56D8EA9E6C', // The secret itself should be not easily parsed by a human and would best be a random set of characters. 
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24*60*60*1000 } // time remaining in milliseconds
}))

// As the user navigates from page to page, the session itself can be authenticated using the built-in session strategy.
// Because an authenticated session is typically needed for the majority of routes in an application, it is common to use this as application-level middleware, after session middleware.
// See: https://www.passportjs.org/concepts/authentication/strategies/
app.use(passport.authenticate('session'))

// Middleware function to print variables that are used or populated by passport. 
// app.use(function(req, res, next) {
//     console.log('<'.padEnd(40,'-') + '>'.padStart(40,'-'))
//     console.log('Session: ' + req.sessionID)
//     console.log('req.session:', JSON.stringify(req.session, null, 2)) 
//     console.log('req.user: ', req.user)
//     console.log('<'.padEnd(40,'-') + '>'.padStart(40,'-'))
//     next()
// }) 

app.use('/', indexRouter)
app.use('/users', usersRouter)
app.use('/catalog', catalogRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404))
})

// error handler
// eslint-disable-next-line no-unused-vars
app.use(function(err, req, res, next) {
    console.error('ERROR:', err)
    // set locals, only providing error in development
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    // render the error page
    res.status(err.status || 500)
    const error = { message: err.message || err, status: err.status || 500, stack: err.stack || null }
    res.render('error', { error })
})

// Set up mongoose connection
const mongoDB = process.env.MONGODB_URI
if (!mongoDB) {
    console.error('Environment variable MONGODB_URI must be set in order to connect to the MongoDB database.')
    process.exit(-1)
}
mongoose.set('strictQuery', false)

async function main () {
    try {
        console.log('Connecting...')
        await mongoose.connect(mongoDB)
        console.log('Connection to MongoDB established.')
        mongoose.connection.on('error', console.error)
        //await User.deleteMany()
        const users = await User.find()
        console.log('Users:', users.map(user => user.name))
    }
    catch(err) {
        console.error('Connection to MongoDB failed: ', err)
        process.exit(-1)
    }
}

main().catch(console.error)

module.exports = app