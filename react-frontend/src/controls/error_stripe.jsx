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
  }
}

function ErrorStripe(props) {
  const containerStyles = { ...styles.containerBase };
  if (!props.show) {
    Object.assign(containerStyles, styles.containerNotVisible);
  }

  return (
    <aside style={containerStyles} className="d-flex align-items-center bg-danger text-white p-1 pl-2">
      <span><i class="material-icons mr-2">error_outline</i> {props.message}</span>
      <button type="button" className="btn btn-primary bmd-btn-icon" style={styles.closeButton} onClick={props.onClose}>
        <i class="material-icons">close</i>
      </button>
    </aside>
  );
}


export default ErrorStripe;
