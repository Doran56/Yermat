"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _configPlugins = require("@expo/config-plugins");
//@ts-ignore

const pkg = require('../../../package.json');
const withCompressor = config => config;
var _default = exports.default = (0, _configPlugins.createRunOncePlugin)(withCompressor, pkg.name, pkg.version);
//# sourceMappingURL=compressor.js.map