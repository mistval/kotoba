const REQUEST_SECRET_HEADER = 'Deck-Permissions-Secret';
const RESPONSE_PERMISSIONS_HEADER = 'Deck-Permissions';
const RESPONSE_READONLY_SECRET_HEADER = 'Deck-Read-Only-Secret';
const RESPONSE_READWRITE_SECRET_HEADER = 'Deck-Read-Write-Secret';

const DeckPermissions = {
  OWNER: 'owner',
  READWRITE: 'readwrite',
  READONLY: 'readonly',
  NONE: 'none',
};

module.exports = {
  DeckPermissions,
  REQUEST_SECRET_HEADER,
  RESPONSE_PERMISSIONS_HEADER,
  RESPONSE_READONLY_SECRET_HEADER,
  RESPONSE_READWRITE_SECRET_HEADER,
};