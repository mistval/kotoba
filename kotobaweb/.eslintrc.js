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
      "react/prop-types": [2, { ignore: ['history', 'formikArgs'] }], // History comes from React (withRouter), formikArgs comes from formik
    },
};
