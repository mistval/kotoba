import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

class ListPicker extends PureComponent {
  toggle = (ev, item) => {
    ev.preventDefault();
    const { selectedItems, selectionUpdated } = this.props;

    const itemIndex = selectedItems.indexOf(item);
    const addItem = itemIndex === -1;
    const newSelectedItems = selectedItems.slice();

    if (addItem) {
      newSelectedItems.push(item);
    } else {
      newSelectedItems.splice(itemIndex, 1);
    }

    selectionUpdated(newSelectedItems);
  }

  render() {
    const { selectedItems, maxHeight, items } = this.props;

    const listPickerBoxStyles = {
      overflowY: 'scroll',
      maxHeight,
    };

    return (
      <div>
        <div className="list-group" style={listPickerBoxStyles}>
          {items.map(item => (
            <a
              href="#"
              className={`list-group-item list-group-item-action${selectedItems.indexOf(item) !== -1 ? ' active' : ''}`}
              onClick={ev => this.toggle(ev, item)}
              key={item.key}
            >
              {item.value}
            </a>
          ))}
        </div>
        <div className="pt-1">
          { selectedItems[0]
            && <hr />
          }
          {selectedItems.map(item => (
            <button type="button" className="btn btn-outline-primary mr-2" onClick={ev => this.toggle(ev, item)} key={item.key}>
              {item.value}
              {' '}
              <span aria-hidden="true">&times;</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
}

ListPicker.propTypes = {
  selectedItems: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.string,
    }),
  ).isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.string,
    }),
  ).isRequired,
  maxHeight: PropTypes.string.isRequired,
  selectionUpdated: PropTypes.func.isRequired,
};

export default ListPicker;
