const express = require('express')
const router = express.Router()

// Redirect to catalog
router.get('/', function (req, res) {
    res.redirect(req.isAuthenticated() ? '/catalog' : '/users/login')
})

module.exports = router
