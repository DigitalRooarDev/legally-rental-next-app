"use client";

import { DatePicker } from "antd";
import dayjs from "dayjs";
import { Controller } from "react-hook-form";

/** The API exchanges dates in this format; the picker only ever *displays* another. */
export const API_DATE_FORMAT = "YYYY-MM-DD";
const DISPLAY_FORMAT = "DD MMM YYYY";

/** `""` / null / an unparseable string all mean "no date", not "today". */
export const toDayjs = (value) => {
  if (!value) return null;
  const parsed = dayjs(value, API_DATE_FORMAT);
  return parsed.isValid() ? parsed : null;
};

/**
 * antd `<DatePicker>` bound to react-hook-form.
 *
 * The form always holds a plain `YYYY-MM-DD` string, never a dayjs object, so
 * values can go straight to the API and survive `reset()` without conversion.
 *
 * @param {object} props
 * @param {object} props.control      react-hook-form control.
 * @param {string} props.name
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.placeholder]
 * @param {(current: import('dayjs').Dayjs) => boolean} [props.disabledDate]
 */
export default function DateField({
  control,
  name,
  label,
  error,
  placeholder = "Select date",
  disabledDate,
}) {
  const inputId = `date-${name}`;

  return (
    <div className="form-group">
      {label ? (
        <label className="form-label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <DatePicker
            id={inputId}
            value={toDayjs(field.value)}
            onChange={(date) => field.onChange(date ? date.format(API_DATE_FORMAT) : "")}
            onBlur={field.onBlur}
            format={DISPLAY_FORMAT}
            placeholder={placeholder}
            disabledDate={disabledDate}
            allowClear
            className={`date-field ${error ? "is-invalid" : ""}`}
            suffixIcon={<i className="icon icon-calendar" aria-hidden="true" />}
          />
        )}
      />

      {error ? <p className="invalid-feedback d-block">{error}</p> : null}
    </div>
  );
}
