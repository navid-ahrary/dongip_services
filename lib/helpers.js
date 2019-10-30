'use strict';

let decorate = function (decorators, target, key, desc) {
  let c = arguments.length;
  let r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc;
  let d;
  if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function') {
    r = Reflect.decorate(decorators, target, key, desc);
  } else {
    for (let i = decorators.length - 1; i >= 0; i--) {
      if (d = decorators[i]) {
        r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      }
    }
  }
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};

let metadata = function (k, v) {
  if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function') return Reflect.metadata(k, v);
};

let param = function (paramIndex, decorator) {
  return function (target, key) {
    decorator(target, key, paramIndex);
  }
};

exports.decorate = decorate;
exports.metadata = metadata;
exports.param = param;
