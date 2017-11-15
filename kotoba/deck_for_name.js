// This file is a hack to get around a bug or at least limitation in the reload module.
// After reloading a module, anything referenced statically in that module does not appear to be collected by the GC.
// That leads to leaked memory.
// So this file, which should not be reloaded, is used to store the quiz decks, since their memory footprint is significant.
module.exports = {};
