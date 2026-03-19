// Local dev pass-through — delegates to the Netlify function handler.
const handler = require('../netlify/functions/apply');
module.exports = handler;
