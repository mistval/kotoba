const assert = require('assert');

function Button(label, action, { style = 1, disabled = false } = {}) {
  assert(label, 'Label is required');

  return {
    type: 2,
    style,
    label,
    action,
    disabled,
  };
}

function ComponentGroup(rowsArg) {
  const rows = Array.isArray(rowsArg[0]) ? rowsArg : [rowsArg];

  return rows.map((row, i) => row.length > 0 && ({
    type: 1,
    components: row.map((component, j) => ({
      ...component,
      custom_id: `${i}-${j}`,
    })),
  })).filter(Boolean);
}

module.exports = {
  Button,
  ComponentGroup,
};
