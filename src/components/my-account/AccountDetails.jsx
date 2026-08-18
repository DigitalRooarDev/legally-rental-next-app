'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useToast } from '@/context/toastContext';
import { updateProfile } from '@/actions/updateProfile';
import { updateProfileImage } from '@/actions/updateProfileImage';
import dayjs from 'dayjs';
import { useAuth } from '@/context/authContext';
import PhoneField from '@/components/theme/PhoneField';
import DateField from '@/components/theme/DateField';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { formatPrice } from '@/utils/formats';

const AVATAR_FALLBACK = '/images/logo.svg';

/** Kept in step with the same limits enforced in `updateProfileImage`. */
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const schema = yup.object().shape({
  first_name: yup.string().trim().required('First name is required.'),
  last_name: yup.string().trim().required('Last name is required.'),
  email: yup.string().trim().required('Email is required.').email('Enter a valid email address.'),
  country_code: yup.string().trim().default(''),
  mobile: yup
    .string()
    .trim()
    .required('Mobile number is required.')
    .matches(/^[0-9]{6,15}$/, 'Enter digits only (6-15).'),
  dob: yup.string().trim().default(''),
  gender: yup.string().trim().default(''),
});

/**
 * Editable profile form backed by `POST {API_V2_URL}/updateProfile`.
 *
 * Uses native `date`/`tel` inputs rather than the reference's antd DatePicker and
 * react-phone-input-2, which keeps three dependencies out of the bundle for the
 * same fields. Swap them in if the design calls for those exact widgets.
 */
export default function AccountDetails() {
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Revoke the object URL when it is replaced or the tab unmounts, or the blob leaks.
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), mode: 'onTouched' });

  useEffect(() => {
    if (!user) return;

    reset({
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      email: user.email ?? '',
      // The API stores these with a leading "+" that it will not accept back.
      country_code: String(user.country_code ?? '').replace(/^\+/, ''),
      mobile: String(user.mobile ?? '').replace(/^\+/, ''),
      dob: user.dob ?? '',
      gender: user.gender ?? '',
    });
  }, [user, reset]);

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    // Reset the input so re-picking the same file still fires a change event.
    event.target.value = '';
    if (!file) return;

    // Checked here as well as in the action: an oversized file would otherwise be
    // rejected by the server-action body limit as an opaque network error, long
    // before our own validation could produce a useful message.
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Use a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(
        `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please choose one under 5 MB.`,
      );
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);

    try {
      const res = await updateProfileImage(file);

      if (!res?.status) {
        toast.error(res?.message || 'Could not upload that image.');
        setPreviewUrl('');
        return;
      }

      toast.success(res.message || 'Profile picture updated.');
      // Refresh so the header avatar updates too, then drop the local preview.
      await refreshUser();
      setPreviewUrl('');
    } catch (error) {
      console.error('AVATAR upload failed', error);
      toast.error('Something went wrong while uploading.');
      setPreviewUrl('');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values) => {
    try {
      const res = await updateProfile(values);

      if (!res?.status) {
        toast.error(res?.message || 'Unable to save your details.');
        return;
      }

      toast.success(res.message || 'Profile updated.');
      await refreshUser();
    } catch (error) {
      console.error('UPDATE PROFILE failed', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="my-account-panel">
      <div className="my-account-panel-head">
        <h2 className="my-account-panel-title">Account details</h2>
      </div>
      <div className="account-profile">
        <div className="account-avatar">
          {/* A blob: preview cannot go through next/image's optimiser. */}
          {previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- local object URL */
            <img
              className="account-profile-avatar"
              src={previewUrl}
              alt=""
              width={80}
              height={80}
            />
          ) : (
            <Image
              className="account-profile-avatar"
              src={user?.profileImage || user?.profile_image || AVATAR_FALLBACK}
              alt={user?.first_name ? `${user.first_name}'s avatar` : 'Profile'}
              width={80}
              height={80}
            />
          )}
          {isUploading ? (
            <span className="account-avatar-busy" role="status">
              <span className="spinner-border spinner-border-sm" aria-hidden="true" />
              <span className="visually-hidden">Uploading…</span>
            </span>
          ) : null}
        </div>

        <div>
          <button
            type="button"
            className="btn btn-outline btn-sm account-avatar-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <i className="icon icon-upload" aria-hidden="true" />
            {isUploading ? 'Uploading…' : 'Change photo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="visually-hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            aria-label="Upload a profile picture"
          />
          <p className="account-avatar-hint">JPG, PNG or WebP · up to 5 MB</p>
        </div>
      </div>

      {user?.wallet !== undefined ? (
        <div className="account-wallet">
          <i className="icon icon-wallet" aria-hidden="true" />
          <div>
            <span className="account-wallet-amount">
              {CURRENCY_SYMBOL} {formatPrice(user.wallet).formatted}
            </span>
            <p>Available balance</p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="row">
          <div className="col-sm-6">
            <div className="form-group">
              <label className="form-label" htmlFor="first_name">
                First Name
              </label>
              <input
                id="first_name"
                className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                placeholder="Enter first name"
                {...register('first_name')}
              />
              {errors.first_name ? (
                <p className="invalid-feedback d-block">{errors.first_name.message}</p>
              ) : null}
            </div>
          </div>

          <div className="col-sm-6">
            <div className="form-group">
              <label className="form-label" htmlFor="last_name">
                Last Name
              </label>
              <input
                id="last_name"
                className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                placeholder="Enter last name"
                {...register('last_name')}
              />
              {errors.last_name ? (
                <p className="invalid-feedback d-block">{errors.last_name.message}</p>
              ) : null}
            </div>
          </div>

          <div className="col-sm-6">
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                placeholder="Enter email address"
                {...register('email')}
              />
              {errors.email ? (
                <p className="invalid-feedback d-block">{errors.email.message}</p>
              ) : null}
            </div>
          </div>

          <div className="col-sm-6">
            <PhoneField
              control={control}
              name="mobile"
              countryCodeName="country_code"
              setValue={setValue}
              label="Mobile Number"
              error={errors.mobile?.message}
            />
          </div>

          <div className="col-sm-6">
            <DateField
              control={control}
              name="dob"
              label="Date of Birth"
              placeholder="Select date of birth"
              error={errors.dob?.message}
              // A birth date in the future is always a mistake.
              disabledDate={(current) => current && current.isAfter(dayjs(), "day")}
            />
          </div>

          <div className="col-sm-6">
            <div className="form-group">
              <span className="form-label">Gender</span>
              <div className="account-details-gender">
                {['Male', 'Female'].map((option) => (
                  <div className="form-check" key={option}>
                    <input
                      className="form-check-input"
                      type="radio"
                      id={`gender-${option}`}
                      value={option}
                      {...register('gender')}
                    />
                    <label className="form-check-label" htmlFor={`gender-${option}`}>
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="submit-btn">
          {/* Only gated on the in-flight request. A `!isDirty` guard used to sit
              here too, but it left the button dead whenever a change came from a
              controlled widget that didn't mark the form dirty. */}
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
