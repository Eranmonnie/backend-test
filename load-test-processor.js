/**
 * Artillery load test processor
 * Generates dynamic data for load testing scenarios using faker
 */

const { faker } = require('@faker-js/faker');

module.exports = {
  // Generate random user data for registration
  generateUserData: function(context, events, done) {
    context.vars.email = faker.internet.email();
    context.vars.firstName = faker.person.firstName();
    context.vars.lastName = faker.person.lastName();
    context.vars.password = 'TestPass123!';
    context.vars.pin = faker.string.numeric(4);
    
    return done();
  },

  // Generate login data
  generateLoginData: function(context, events, done) {
    context.vars.email = faker.internet.email();
    context.vars.firstName = faker.person.firstName();
    context.vars.lastName = faker.person.lastName();
    context.vars.password = 'TestPass123!';
    context.vars.pin = faker.string.numeric(4);
    
    return done();
  },

  // Generate donor data
  generateDonorData: function(context, events, done) {
    context.vars.donorEmail = faker.internet.email();
    context.vars.donorFirstName = faker.person.firstName();
    context.vars.donorLastName = faker.person.lastName();
    context.vars.donorPassword = 'TestPass123!';
    context.vars.donorPin = faker.string.numeric(4);
    
    return done();
  },

  // Generate beneficiary data
  generateBeneficiaryData: function(context, events, done) {
    context.vars.beneficiaryEmail = faker.internet.email();
    context.vars.beneficiaryFirstName = faker.person.firstName();
    context.vars.beneficiaryLastName = faker.person.lastName();
    context.vars.beneficiaryPassword = 'TestPass123!';
    context.vars.beneficiaryPin = faker.string.numeric(4);
    
    return done();
  },

  // Generate valid donation amount (between ₦500 and ₦10,000)
  generateDonationAmount: function(context, events, done) {
    context.vars.donationAmount = faker.number.int({ min: 500, max: 10000 });
    return done();
  }
};
