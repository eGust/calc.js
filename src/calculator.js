import Decimal from 'decimal.js';
import { every, isString } from 'lodash';

import { parse } from './parser';

/* eslint no-bitwise: 0 */

function validate(valid, err) {
  if (!valid) throw Error(err);
}

function makeValidator(validation, error) {
  return (...values) => validate(validation(values), error);
}

const ERROR_ARG_NUMBER = 'Required Number argument';
const ERROR_ARG_STR_NUM = 'Required all String or all Number arguments';

const validateNumber = makeValidator(
  values => every(values, v => v instanceof Decimal),
  ERROR_ARG_NUMBER,
);

const validateNumOrStr = makeValidator(
  values => every(values, isString) || every(values, v => v instanceof Decimal),
  ERROR_ARG_STR_NUM,
);

class Calculator {
  variables = {}
  functions = {
    $conditional: (args) => {
      const condition = this.calc(args[0]);
      validateNumber(condition);
      return condition.toNumber() ? this.calc(args[1]) : this.calc(args[2]);
    },
    $logicAnd: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return new Decimal(val1.toNumber() && val2.toNumber());
    },
    $logicOr: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return new Decimal(val1.toNumber() || val2.toNumber());
    },
    $relationEqual: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return new Decimal(val1.eq(val2) | 0);
    },
    $relationNotEqual: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return new Decimal(!val1.eq(val2) | 0);
    },
    $relationGE: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return new Decimal(val1.gte(val2) | 0);
    },
    $relationLE: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return new Decimal(val1.lte(val2) | 0);
    },
    $relationGreater: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return new Decimal(val1.gt(val2) | 0);
    },
    $relationLess: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return new Decimal(val1.lt(val2) | 0);
    },
    $bitAnd: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return new Decimal(val1.toNumber() & val2.toNumber());
    },
    $bitOr: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return new Decimal(val1.toNumber() | val2.toNumber());
    },
    $bitXor: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return new Decimal(val1.toNumber() ^ val2.toNumber());
    },
    $add: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumOrStr(val1, val2);
      return val1 instanceof Decimal ? val1.add(val2) : val1 + val2;
    },
    $minus: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return val1.sub(val2);
    },
    $multiply: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return val1.mul(val2);
    },
    $divide: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return val1.div(val2);
    },
    $intDivide: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return val1.divToInt(val2);
    },
    $module: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return val1.mod(val2);
    },
    $power: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return val1.pow(val2);
    },
    $root: (args) => {
      const [val1, val2] = this.calc(...args);
      validateNumber(val1, val2);
      return val1.pow(Decimal.div(1, val2));
    },
    $logicNot: (args) => {
      const [val1] = this.calc(...args);
      validateNumber(val1);
      return new Decimal(!val1.toNumber() | 0);
    },
    $bitNot: (args) => {
      const val1 = this.calc(...args);
      validateNumber(val1);
      return new Decimal(~val1.toNumber());
    },
    $negative: (args) => {
      const val1 = this.calc(...args);
      validateNumber(val1);
      return val1.neg();
    },

    $parseBinary: args => new Decimal(parseInt(args[0].replace(/_/g, ''), 2)),
    $parseNumber: args => new Decimal(args[0].replace(/_/g, '')),
    $parseDQString: args => JSON.parse(args[0]),
    $parseSQString: (args) => {
      const s = args[0];
      const len = s.length - 1;
      let r = '"';
      let i = 1;
      while (i < len) {
        if (s[i] === '\\' && s[i + 1] === "'") {
          r += "'";
          i += 2;
        } else {
          r += s[i];
          i += 1;
        }
      }
      r += '"';
      return JSON.parse(r);
    },
    $getVariable: args => this.variables[args[0]] || null,
    $setVariable: (args) => {
      const r = this.calc(args[1]);
      this.variables[args[0]] = r;
      return r;
    },
    // $temp: (args) => {
    //   //
    // },
  }

  calc(...exprs) {
    const r = exprs.map((item) => {
      if (item === null) throw Error('Unknown value');
      const { func, args } = item;
      return this.functions[func](args);
    });

    return r.length > 1 ? r : r[0];
  }

  execute(expression) {
    const ast = parse(expression);
    console.log(JSON.stringify(ast, null, ' '));
    const r = this.calc(ast);
    return r;
  }
}

export const calculator = new Calculator();

export default Calculator;
