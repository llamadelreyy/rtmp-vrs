// client/src/pages/Profile.js
import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Snackbar,
  Box,
  Card,
  CardContent,
  Avatar,
  Chip,
  Container
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BadgeIcon from '@mui/icons-material/Badge';
import SaveIcon from '@mui/icons-material/Save';

import useAuth from '../hooks/useAuth';
import { updateProfile, changePassword } from '../api/users';

// Styled components
const StyledContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginBottom: theme.spacing(3),
  borderRadius: theme.spacing(1),
  boxShadow: theme.shadows[3],
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[6],
    transform: 'translateY(-4px)',
  },
}));

const HeaderTypography = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  fontWeight: 600,
  position: 'relative',
  '&:after': {
    content: '""',
    position: 'absolute',
    bottom: '-8px',
    left: 0,
    width: '40px',
    height: '4px',
    backgroundColor: theme.palette.primary.main,
    borderRadius: '2px',
  },
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(3),
  fontWeight: 500,
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(3, 0),
}));

const UserInfoItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1.5),
  color: theme.palette.text.secondary,
}));

const SubmitButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(1, 3),
}));

const UserAvatar = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  backgroundColor: theme.palette.primary.main,
  marginBottom: theme.spacing(2),
}));

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// Validation schema for profile update
const ProfileSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, 'Username must be at least 3 characters')
    .required('Username is required'),
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required')
});

// Validation schema for password change
const PasswordSchema = Yup.object().shape({
  currentPassword: Yup.string()
    .required('Current password is required'),
  newPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword'), null], 'Passwords must match')
    .required('Confirm password is required')
});

const Profile = () => {
  const { currentUser, loginUser } = useAuth();
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  
  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle profile update submission
  const handleProfileUpdate = async (values, { setSubmitting }) => {
    try {
      const updatedUser = await updateProfile({
        username: values.username,
        email: values.email
      });
      
      // Update auth context with new user data
      await loginUser({
        username: updatedUser.username,
        password: values.currentPassword
      });
      
      setNotification({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      });
    } catch (err) {
      setNotification({
        open: true,
        message: `Error: ${err.message || 'Failed to update profile'}`,
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle password change submission
  const handlePasswordChange = async (values, { setSubmitting, resetForm }) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      
      resetForm();
      
      setNotification({
        open: true,
        message: 'Password changed successfully',
        severity: 'success'
      });
    } catch (err) {
      setNotification({
        open: true,
        message: `Error: ${err.message || 'Failed to change password'}`,
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle notification close
  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };
  
  if (!currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <StyledContainer maxWidth="lg">
      <HeaderTypography variant="h4" component="h1">
        My Profile
      </HeaderTypography>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <StyledPaper>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <UserAvatar>
                {currentUser.username?.charAt(0).toUpperCase() || 'U'}
              </UserAvatar>
              <Chip
                label={currentUser.role?.toUpperCase() || 'USER'}
                color="primary"
                size="small"
              />
            </Box>
            
            <SectionTitle variant="h6">
              <PersonIcon color="primary" /> Profile Information
            </SectionTitle>
            
            <Box sx={{ mb: 3 }}>
              <UserInfoItem>
                <BadgeIcon fontSize="small" />
                <Typography variant="body2">
                  Role: {currentUser.role}
                </Typography>
              </UserInfoItem>
              <UserInfoItem>
                <CalendarTodayIcon fontSize="small" />
                <Typography variant="body2">
                  Member since: {formatDate(currentUser.createdAt)}
                </Typography>
              </UserInfoItem>
              {currentUser.lastLogin && (
                <UserInfoItem>
                  <AccessTimeIcon fontSize="small" />
                  <Typography variant="body2">
                    Last login: {formatDate(currentUser.lastLogin)}
                  </Typography>
                </UserInfoItem>
              )}
            </Box>
            
            <StyledDivider />
            
            <Formik
              initialValues={{
                username: currentUser.username || '',
                email: currentUser.email || '',
                currentPassword: ''
              }}
              validationSchema={ProfileSchema}
              onSubmit={handleProfileUpdate}
            >
              {({ errors, touched, isSubmitting }) => (
                <Form>
                  <Field name="username">
                    {({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Username"
                        variant="outlined"
                        margin="normal"
                        error={touched.username && Boolean(errors.username)}
                        helperText={touched.username && errors.username}
                      />
                    )}
                  </Field>
                  
                  <Field name="email">
                    {({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Email"
                        type="email"
                        variant="outlined"
                        margin="normal"
                        error={touched.email && Boolean(errors.email)}
                        helperText={touched.email && errors.email}
                      />
                    )}
                  </Field>
                  
                  <Field name="currentPassword">
                    {({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Current Password (required to save changes)"
                        type="password"
                        variant="outlined"
                        margin="normal"
                        error={touched.currentPassword && Boolean(errors.currentPassword)}
                        helperText={touched.currentPassword && errors.currentPassword}
                      />
                    )}
                  </Field>
                  
                  <SubmitButton
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Profile'}
                  </SubmitButton>
                </Form>
              )}
            </Formik>
          </StyledPaper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <StyledPaper>
            <SectionTitle variant="h6">
              <LockIcon color="primary" /> Change Password
            </SectionTitle>
            
            <Formik
              initialValues={{
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
              }}
              validationSchema={PasswordSchema}
              onSubmit={handlePasswordChange}
            >
              {({ errors, touched, isSubmitting }) => (
                <Form>
                  <Field name="currentPassword">
                    {({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Current Password"
                        type="password"
                        variant="outlined"
                        margin="normal"
                        error={touched.currentPassword && Boolean(errors.currentPassword)}
                        helperText={touched.currentPassword && errors.currentPassword}
                      />
                    )}
                  </Field>
                  
                  <Field name="newPassword">
                    {({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="New Password"
                        type="password"
                        variant="outlined"
                        margin="normal"
                        error={touched.newPassword && Boolean(errors.newPassword)}
                        helperText={touched.newPassword && errors.newPassword}
                      />
                    )}
                  </Field>
                  
                  <Field name="confirmPassword">
                    {({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Confirm New Password"
                        type="password"
                        variant="outlined"
                        margin="normal"
                        error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                        helperText={touched.confirmPassword && errors.confirmPassword}
                      />
                    )}
                  </Field>
                  
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="textSecondary">
                      Password must be at least 8 characters and include uppercase, lowercase, 
                      number, and special character.
                    </Typography>
                  </Box>
                  
                  <SubmitButton
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : <LockIcon />}
                  >
                    {isSubmitting ? 'Updating...' : 'Change Password'}
                  </SubmitButton>
                </Form>
              )}
            </Formik>
          </StyledPaper>
        </Grid>
      </Grid>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </StyledContainer>
  );
};

export default Profile;