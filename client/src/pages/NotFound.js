// client/src/pages/NotFound.js
import React from 'react';
import { styled } from '@mui/material/styles';
import { 
  Typography, 
  Button, 
  Paper, 
  Container,
  Box
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HomeIcon from '@mui/icons-material/Home';
import { Link } from 'react-router-dom';

// Using styled from @mui/material/styles
const NotFoundPaper = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(6),
  textAlign: 'center',
  borderRadius: theme.spacing(2),
  maxWidth: 600,
  margin: '0 auto',
  boxShadow: theme.shadows[8],
}));

const ErrorCode = styled(Typography)(({ theme }) => ({
  fontSize: '8rem',
  fontWeight: 'bold',
  marginBottom: theme.spacing(1),
  backgroundImage: 'linear-gradient(45deg, #FF5370, #ff8a65)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
  textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
}));

const ErrorMessage = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 500,
  marginBottom: theme.spacing(3),
  color: theme.palette.text.primary,
}));

const ActionButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(3),
  padding: theme.spacing(1, 3),
  borderRadius: theme.shape.borderRadius,
  fontWeight: 500,
  textTransform: 'none',
  fontSize: '1rem',
}));

const NotFound = () => {
  return (
    <Container sx={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      py: 4
    }}>
      <NotFoundPaper elevation={8}>
        <ErrorOutlineIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
        
        <ErrorCode variant="h1">
          404
        </ErrorCode>
        
        <ErrorMessage variant="h4">
          Page Not Found
        </ErrorMessage>
        
        <Typography variant="body1" sx={{ mb: 1, maxWidth: 450 }}>
          The page you are looking for might have been removed, had its name changed, 
          or is temporarily unavailable.
        </Typography>
        
        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <ActionButton
            component={Link}
            to="/dashboard"
            variant="contained"
            color="primary"
            startIcon={<HomeIcon />}
          >
            Back to Dashboard
          </ActionButton>
          
          <ActionButton
            component="a"
            href="/"
            variant="outlined"
            color="primary"
          >
            Go to Home
          </ActionButton>
        </Box>
      </NotFoundPaper>
    </Container>
  );
};

export default NotFound;