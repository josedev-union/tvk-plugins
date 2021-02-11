const User = require('../src/models/database/User.js').User
const user = new User({
  id: 'anuserid',
  email: 'anuserid@fgmail.com',
  company: 'NoCandy4You',
  fullName: 'Dr. Nocandy',
  country: 'Waterland',
  phone: '21999328876'
})
user.save().then(u => console.log("Saved", u))
