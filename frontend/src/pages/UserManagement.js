// client/src/pages/UserManagement.js
import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Chip,
  Tooltip
} from '@mui/material';
import Alert from '@mui/material/Alert';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

import { getUsers, createUser, updateUser, deleteUser } from '../api/users';

// Styled components using @emotion/styled through MUI's styled
const Root = styled('div')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(2),
}));

const Header = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

const ActionButtons = styled('div')({
  display: 'flex',
});

const FormField = styled('div')(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const RoleChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0, 0.5),
}));

const LoadingContainer = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '200px',
});

// Validation schema for user form
const UserSchema = Yup.object().shape({
  username: Yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters'),
  email: Yup.string()
    .required('Email is required')
    .email('Invalid email format'),
  password: Yup.string()
    .when('_id', {
      is: (val) => !val, // only required for new users
      then: Yup.string()
        .required('Password is required')
        .min(6, 'Password must be at least 6 characters'),
      otherwise: Yup.string()
        .min(6, 'Password must be at least 6 characters')
    }),
  role: Yup.string()
    .required('Role is required')
    .oneOf(['admin', 'operator', 'viewer'], 'Invalid role')
});

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  
  // Initial values for user form
  const initialValues = {
    username: '',
    email: '',
    password: '',
    role: 'viewer'
  };
  
  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);
  
  // Handle dialog open for adding a user
  const handleAddUser = () => {
    setCurrentUser(null);
    setDialogMode('add');
    setOpenDialog(true);
  };
  
  // Handle dialog open for editing a user
  const handleEditUser = (user) => {
    // Clone user and remove password (it's not returned from the API)
    const userToEdit = { ...user, password: '' };
    setCurrentUser(userToEdit);
    setDialogMode('edit');
    setOpenDialog(true);
  };
  
  // Handle dialog close
  const handleDialogClose = () => {
    setOpenDialog(false);
    setCurrentUser(null);
  };
  
  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      if (dialogMode === 'add') {
        const newUser = await createUser(values);
        setUsers([...users, newUser]);
        resetForm();
        setNotification({
          open: true,
          message: 'User added successfully',
          severity: 'success'
        });
      } else {
        // If password is empty, remove it from the request
        const updateData = { ...values };
        if (!updateData.password) {
          delete updateData.password;
        }
        
        const updatedUser = await updateUser(currentUser._id, updateData);
        setUsers(users.map(user => user._id === updatedUser._id ? updatedUser : user));
        setNotification({
          open: true,
          message: 'User updated successfully',
          severity: 'success'
        });
      }
      handleDialogClose();
    } catch (err) {
      setNotification({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle user deletion
  const handleDeleteUser = async (userId) => {
    try {
      await deleteUser(userId);
      setUsers(users.filter(user => user._id !== userId));
      setDeleteConfirm(null);
      setNotification({
        open: true,
        message: 'User deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      setNotification({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };
  
  // Get role color
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error'; // secondary in v4 -> error in v5
      case 'operator':
        return 'primary';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  };
  
  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress />
        <Typography variant="body1" sx={{ marginLeft: 2 }}>
          Loading users...
        </Typography>
      </LoadingContainer>
    );
  }
  
  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" color="error">
          Error: {error}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={fetchUsers}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Paper>
    );
  }

  return (
    <Root>
      <Header>
        <Typography variant="h5" component="h1">
          User Management
        </Typography>
        <div>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={fetchUsers}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddUser}
          >
            Add User
          </Button>
        </div>
      </Header>
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <RoleChip
                      label={user.role}
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <ActionButtons>
                      <Tooltip title="Edit User">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleEditUser(user)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete User">
                        <IconButton 
                          size="small" 
                          color="error" // changed from secondary to error
                          onClick={() => setDeleteConfirm(user._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </ActionButtons>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Add/Edit User Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New User' : 'Edit User'}
        </DialogTitle>
        
        <Formik
          initialValues={currentUser || initialValues}
          validationSchema={UserSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, isSubmitting }) => (
            <Form>
              <DialogContent>
                <Field
                  as={TextField}
                  sx={{ mb: 2 }}
                  fullWidth
                  label="Username"
                  name="username"
                  variant="outlined"
                  error={touched.username && Boolean(errors.username)}
                  helperText={touched.username && errors.username}
                />
                
                <Field
                  as={TextField}
                  sx={{ mb: 2 }}
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  variant="outlined"
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                />
                
                <Field
                  as={TextField}
                  sx={{ mb: 2 }}
                  fullWidth
                  label={dialogMode === 'add' ? 'Password' : 'Password (leave empty to keep current)'}
                  name="password"
                  type="password"
                  variant="outlined"
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                />
                
                <FormControl variant="outlined" fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="role-label">Role</InputLabel>
                  <Field
                    as={Select}
                    labelId="role-label"
                    label="Role"
                    name="role"
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="operator">Operator</MenuItem>
                    <MenuItem value="viewer">Viewer</MenuItem>
                  </Field>
                </FormControl>
              </DialogContent>
              
              <DialogActions>
                <Button onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  color="primary" 
                  variant="contained"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <CircularProgress size={24} /> : dialogMode === 'add' ? 'Add User' : 'Update User'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this user? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={() => handleDeleteUser(deleteConfirm)} 
            color="error" // changed from secondary to error
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Root>
  );
};

export default UserManagement;