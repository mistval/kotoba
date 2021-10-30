module.exports = {
    "extends": "airbnb-base",
    "parserOptions": {
      "ecmaVersion": 2020,
    },
    "rules": {
      "class-methods-use-this": [2, { "exceptMethods": ['prepareData'] }],
      "no-console": "off",
      "import/extensions": "off",
      "no-else-return": "off",
      "prefer-object-spread": "off",
      "max-classes-per-file": "off",
      "no-underscore-dangle": ["error", { "allow": ["_id"] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
        },
        {
          selector: 'LabeledStatement',
          message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
        },
        {
          selector: 'WithStatement',
          message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
        },
      ],
    }
};
