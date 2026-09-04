export const validateEnrollment = (value) => {
  if (!value || value.trim() === '') {
    return 'Enrollment Number is required';
  }
  if (value.length < 5 || value.length > 20) {
    return 'Enrollment Number should be between 5 and 20 characters';
  }
  if (!/^[a-zA-Z0-9-]+$/.test(value)) {
    return 'Only alphanumeric characters and hyphens allowed';
  }
  return null;
};

export const validateName = (value) => {
  if (!value || value.trim() === '') {
    return 'Student Name is required';
  }
  if (value.length < 2 || value.length > 50) {
    return 'Name should be between 2 and 50 characters';
  }
  return null;
};

export const validateSelect = (value, fieldName) => {
  if (!value || value === '') {
    return `Please select a ${fieldName}`;
  }
  return null;
};

export const validateEmail = (value) => {
  if (!value || value.trim() === '') {
    return 'Email ID is required';
  }
  // Standard Email Regex
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Enter a valid email address';
  }
  return null;
};
