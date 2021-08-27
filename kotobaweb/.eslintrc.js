module.exports = {
    'extends': 'airbnb',
    'parser': 'babel-eslint',
    'env': {
      'browser': true,
      'node': true
    },
    'rules': {
      'jsx-a11y/no-autofocus': 0,
      'jsx-a11y/label-has-for': 0, // This rule has a bug, see https://github.com/evcohen/eslint-plugin-jsx-a11y/issues/455
      'jsx-a11y/label-has-associated-control': 0, // Nesting the input within the label seems to break the input with MD boostrap.
      'jsx-a11y/click-events-have-key-events': 0,
      'react/prop-types': 'off',
      'react/destructuring-assignment': 'off',
      'max-len': 'off',
      'react/no-unescaped-entities': 'off',
      'react/sort-comp': 'off',
      'react/jsx-filename-extension': 'off',
      'jsx-a11y/anchor-is-valid': 'off',
      'no-underscore-dangle': ['error', { allow: ['_id'] }],
      'import/prefer-default-export': 'off',
    },
};
