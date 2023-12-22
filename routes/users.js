const express = require('express')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const { nextTick } = require('node:process') // https://nodejs.org/docs/latest/api/process.html#processnexttickcallback-args
const User = require('../models/user')
const router = express.Router()

/*
See: https://www.passportjs.org/concepts/authentication/strategies/

The LocalStrategy constructor takes a function as an argument. This function is known as a verify function, and is a common pattern in many strategies. 
When authenticating a request, a strategy parses the credential contained in the request. 
A verify function is then called, which is responsible for determining the user to which that credential belongs.
This allows data access to be delegated to the application.
*/
passport.use(new LocalStrategy(async function(username, password, cb) {
    console.log(`Authenticate user with username=${username} and password=${password}`)
    let user = await User.findOne({ name: username})
    // create guest account if it doesn't exits
    if (user == null && username == 'guest') {
        user = new User({ name: 'guest'})
        user.setPassword('letmein')
        await user.save()
    }
    if (user != null && user.validatePassword(password)) {
        cb(null, user)
    } else {
        cb(null, false, { message: 'Incorrect username or password.'})
    }
}))

/*
To maintain a login session, Passport serializes and deserializes user information to and from the session. 
The information that is stored is determined by the application, which supplies a serializeUser and a deserializeUser function.
*/

// A login session is established upon a user successfully authenticating using a credential.
// If successfully verified, Passport will call the serializeUser function.
passport.serializeUser(function(user, cb) {
    nextTick(function() {
        const session_data = { id: user.id }
        //console.log(`passport.serializeUser: ${JSON.stringify(user, null, 2)} => ${JSON.stringify(session_data, null, 2)}`)
        return cb(null, session_data)
    })
})

// When the session is authenticated, Passport will call the deserializeUser function.
// The req.user property is then set to the yielded information.
passport.deserializeUser(function(session_data, cb) {
    nextTick(async function() {
        const user = await User.findById(session_data.id)
        const user_data = { username: user.name, role: 'editor' }
        //console.log(`passport.deserializeUser: ${JSON.stringify(session_data, null, 2)} => ${JSON.stringify(user_data, null, 2)}`)
        return cb(null, user_data)
    })
})

router.get('/logout', function(req, res, next) {
    // see: https://www.passportjs.org/concepts/authentication/logout/
    req.logout(function(err) {
        if (err) next(err)
        else {
            console.log('User has logged out')
            res.redirect('/users/login')
        }
    })
})

// Don't show login page if user is already logged in.
router.all('*', function(req, res, next) {
    if (req.isAuthenticated()) res.redirect('/catalog'); else next()
})

router.get('/login', function(req, res) {
    let message = null
    if (req.session.messages) message = req.session.messages.pop()
    res.render('signin', { title: 'Sign in', message })
})

// Once registered, the strategy can be employed to authenticate a request by passing the name of the strategy as the first argument to passport.authenticate() middleware
router.post('/login', passport.authenticate('local', {
    successRedirect: '/catalog',
    failureRedirect: '/users/login',
    failureMessage: true
}))

router.get('/signup', function(req, res) {
    res.render('signup', { title: 'Sign up' })
})

router.post('/signup', async function(req, res) {
    const username = req.body.username
    const password = req.body.password
    const password_confirmed = req.body.password_confirmed
    let user = await User.findOne({ name: username })
    if (user != null) {
        res.render('signup', { title: 'Sign up', message: `Username "${username}" already exits. Choose another one.` })
    } else if (password !== password_confirmed) {
        res.render('signup', { title: 'Sign up', message: 'Passwords do not match. Please try again.' })
    } else {
        user = new User({ name: username })
        user.setPassword(password)
        await user.save()
        req.session.messages = ['Please sign in with your new account.']
        res.redirect('/users/login')
    }
})

module.exports = router
