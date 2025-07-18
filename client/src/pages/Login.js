// client/src/pages/Login.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Link,
  Paper,
  Box,
  Avatar,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Alert,
  Snackbar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import useAuth from '../hooks/useAuth';

// Styled components using emotion
const StyledPaper = styled(Paper)(({ theme }) => ({
  marginTop: theme.spacing(8),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(4),
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  margin: theme.spacing(1),
  backgroundColor: theme.palette.primary.main,
  width: theme.spacing(6),
  height: theme.spacing(6)
}));

const FormContainer = styled('div')(({ theme }) => ({
  width: '100%',
  marginTop: theme.spacing(2)
}));

const SubmitButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(3, 0, 2),
  padding: theme.spacing(1.5),
  borderRadius: 8,
  fontWeight: 600
}));

// Validation schema using Yup
const LoginSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, 'Username must be at least 3 characters')
    .required('Username is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser, loading, error, clearAuthError } = useAuth();
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  


  // Get the redirect path from location state, or default to dashboard
  const from = location.state?.from?.pathname || '/dashboard';



  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleRememberMe = (event) => {
    setRememberMe(event.target.checked);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await loginUser({
        username: values.username,
        password: values.password,
        rememberMe
      });
      
      // Navigate to the page they were trying to access, or dashboard
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Login failed. Please try again.');
      setOpenSnackbar(true);
      setSubmitting(false);
    }
  };

  // Clear auth errors when the component mounts
  useEffect(() => {
    clearAuthError();
    setFormError('');
  }, [clearAuthError]);


  return (
    <Container component="main" maxWidth="xs">
      <StyledPaper elevation={6}>
        <StyledAvatar>
          <LockOutlinedIcon fontSize="large" />
        </StyledAvatar>
        <Typography component="h1" variant="h5" fontWeight="bold" gutterBottom>
          Sign in
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" marginBottom={2}>
          Enter your credentials to access the RTSP Stream Management System
        </Typography>
        
        {/* Display error message if login fails */}
        {(formError || error) && (
          <Alert severity="error" sx={{ width: '100%', marginBottom: 2 }}>
            {formError || error}
          </Alert>
        )}
        
        <Formik
          initialValues={{ username: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, isSubmitting }) => (
            <Form style={{ width: '100%' }}>
              <FormContainer>
                <Field
                  as={TextField}
                  variant="outlined"
                  margin="normal"
                  fullWidth
                  id="username"
                  label="Username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  error={touched.username && Boolean(errors.username)}
                  helperText={touched.username && errors.username}
                  sx={{ mb: 2 }}
                />
                <Field
                  as={TextField}
                  variant="outlined"
                  margin="normal"
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      value="remember"
                      color="primary"
                      checked={rememberMe}
                      onChange={handleRememberMe}
                    />
                  }
                  label="Remember me"
                  sx={{ mt: 1 }}
                />
                <SubmitButton
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting || loading}
                >
                  {(isSubmitting || loading) ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Sign In'
                  )}
                </SubmitButton>
                
                <Box mt={3} mb={2}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Forgot your password? Contact your administrator
                  </Typography>
                </Box>
              </FormContainer>
            </Form>
          )}
        </Formik>
      </StyledPaper>
      <Box mt={2}>
        <Typography variant="body2" color="text.secondary" align="center">
          © {new Date().getFullYear()} Intelligent Surveillance System
        </Typography>
      </Box>
      
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {formError || error || 'An error occurred. Please try again.'}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Login;