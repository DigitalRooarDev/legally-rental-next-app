'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useToast } from '@/context/toastContext';
import { changePassword } from '@/actions/changePassword';
import { useAuth } from '@/context/authContext';

const PASSWORD_FIELDS = [
  { name: 'currentPassword', label: 'Current Password', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'New Password', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Confirm New Password', autoComplete: 'new-password' },
];

const passwordRule = (message) =>
  yup
    .string()
    .required(message)
    .min(6, 'Password must be at least 6 characters.')
    .max(20, 'Password must be 20 characters or fewer.');

const schema = yup.object().shape({
  currentPassword: passwordRule('Please enter your current password.'),
  newPassword: passwordRule('Please enter a new password.').notOneOf(
    [yup.ref('currentPassword')],
    'The new password must differ from the current one.',
  ),
  confirmPassword: yup
    .string()
    .required('Please confirm your new password.')
    .oneOf([yup.ref('newPassword')], 'Passwords do not match.'),
});

export default function ChangePassword() {
  const toast = useToast();
  const { logout } = useAuth();
  const [visibleFields, setVisibleFields] = useState({});

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), mode: 'onTouched' });

  const toggleVisibility = (name) =>
    setVisibleFields((current) => ({ ...current, [name]: !current[name] }));

  const onSubmit = async (values) => {
    try {
      const res = await changePassword({
        old_password: values.currentPassword,
        new_password: values.newPassword,
        confirm_password: values.confirmPassword,
      });

      if (!res?.status) {
        toast.error(res?.message || 'Unable to update your password.');
        return;
      }

      toast.success(res.message || 'Password updated. Please sign in again.');
      // Any other session still holds a token issued against the old password.
      await logout();
    } catch (error) {
      console.error('CHANGE PASSWORD failed', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="my-account-panel">
      <div className="my-account-panel-head">
        <h2 className="my-account-panel-title">Change password</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {PASSWORD_FIELDS.map(({ name, label, autoComplete }) => (
          <div className="form-group" key={name}>
            <label className="form-label" htmlFor={name}>
              {label}
            </label>
            <div className="input-group">
              <input
                id={name}
                type={visibleFields[name] ? 'text' : 'password'}
                autoComplete={autoComplete}
                className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
                placeholder={label}
                aria-invalid={Boolean(errors[name])}
                {...register(name)}
              />
              <button
                type="button"
                className="input-group-text"
                onClick={() => toggleVisibility(name)}
                aria-label={visibleFields[name] ? `Hide ${label}` : `Show ${label}`}
              >
                <i
                  className={`icon ${visibleFields[name] ? 'icon-show' : 'icon-hide'}`}
                  aria-hidden="true"
                />
              </button>
            </div>
            {errors[name] ? (
              <p className="invalid-feedback d-block">{errors[name].message}</p>
            ) : null}
          </div>
        ))}

        <div className="submit-btn">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}
