const mongoose = require('mongoose')
const Schema = mongoose.Schema
const crypto = require('crypto')

const UserSchema = new Schema({
    name: { type: String, required: true },
    salt: { type: String, required: true },
    hash: { type: String, required: true }
})

// Instance method for hashing user-typed password.
UserSchema.methods.setPassword = function(password) {
    // Create a salt for the user.
    this.salt = crypto.randomBytes(16).toString('hex')
    // Use salt to create hashed password.
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 128, 'sha512').toString('hex')
}

// Instance method for comparing user-typed password against hashed-password on db.
UserSchema.methods.validatePassword = function(password) {
    const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 128, 'sha512').toString('hex')
    return this.hash === hash
}

module.exports = mongoose.model('User', UserSchema)
