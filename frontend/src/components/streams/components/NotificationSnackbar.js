import React from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationSnackbar = ({ notification, closeNotification }) => {
  return (
    <Snackbar
      open={notification.open}
      autoHideDuration={6000}
      onClose={closeNotification}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={closeNotification} severity={notification.severity}>
        {notification.message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationSnackbar;
