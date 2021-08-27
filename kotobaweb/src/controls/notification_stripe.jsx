import React from 'react';

const styles = {
  containerBase: {
    position: 'fixed',
    bottom: '0px',
    left: '0px',
    right: '0px',
    transform: 'translateY(0%)',
    transition: 'transform .2s ease-in-out',
  },
  containerNotVisible: {
    transform: 'translateY(100%)',
    transition: 'transform .2s ease-in-out',
  },
  closeButton: {
    marginLeft: 'auto',
  },
};

function getIconTitle(isError) {
  return isError ? 'error_outline' : 'done';
}

function getBgClass(isError) {
  return isError ? 'bg-danger' : 'bg-success';
}

function NotificationStripe(props) {
  const containerStyles = { ...styles.containerBase };
  if (!props.show) {
    Object.assign(containerStyles, styles.containerNotVisible);
  }

  return (
    <aside style={containerStyles} className={`d-flex align-items-center text-white p-1 pl-2 ${getBgClass(props.isError)}`}>
      <div className="d-flex">
        <i className="material-icons mr-2">{getIconTitle(props.isError)}</i>
        {' '}
        {props.message}
      </div>
      <button type="button" className="btn btn-primary bmd-btn-icon" style={styles.closeButton} onClick={props.onClose}>
        <i className="material-icons">close</i>
      </button>
    </aside>
  );
}


export default NotificationStripe;
