import { cloneDeep, isEqual } from 'lodash';

import storage from '../storage';

let cache = null;

const settings = {
  load() {
    if (!cache) {
      cache = storage.get('options') || {};
    }
    return cloneDeep(cache);
  },

  save(value) {
    const options = cloneDeep(value);
    if (!isEqual(options, cache)) {
      cache = options;
      storage.set('options', options);
    }
  },
};

export default settings;
