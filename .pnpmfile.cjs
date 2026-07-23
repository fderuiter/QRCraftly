function readPackage(pkg, context) {
  if (pkg.name === 'miniflare') {
    if (pkg.dependencies && pkg.dependencies.sharp) {
      delete pkg.dependencies.sharp;
      context.log('Successfully removed sharp from miniflare dependencies');
    }
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
};
