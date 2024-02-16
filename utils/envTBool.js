// Utility function to convert an environment variable to a boolean
function envToBool(envVar) {
  return envVar?.toLowerCase() === 'true';
}

module.exports = {
    envToBool
};
