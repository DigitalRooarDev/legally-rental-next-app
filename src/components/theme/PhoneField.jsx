"use client";

import { Controller, useWatch } from "react-hook-form";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");

/**
 * Country-aware phone field, wired into react-hook-form.
 *
 * The API stores the dial code and the national number **apart**
 * (`country_code: "234"`, `mobile: "8012345678"`), but `react-phone-input-2`
 * works in full numbers (`2348012345678`). This component is the adapter:
 *
 *   read  — recombine code + national so the widget shows the right flag
 *   write — split them back apart before they reach the form state
 *
 * Getting only half of that wrong is why the field previously misread saved
 * numbers: it was handed a bare national number and guessed the country from it.
 *
 * @param {object} props
 * @param {object} props.control                react-hook-form control.
 * @param {string} props.name                   Field holding the national number.
 * @param {string} props.countryCodeName        Field holding the dial code.
 * @param {(name: string, value: string, options?: object) => void} props.setValue
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.defaultCountry='ng']
 */
export default function PhoneField({
  control,
  name,
  countryCodeName,
  setValue,
  label = "Mobile Number",
  error,
  defaultCountry = "ng",
}) {
  const inputId = `phone-${name}`;
  const countryCode = digitsOnly(useWatch({ control, name: countryCodeName }));

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={inputId}>
        {label}
      </label>

      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const national = digitsOnly(field.value);
          // Don't double up when a stored value already carries its dial code.
          const full =
            countryCode && !national.startsWith(countryCode) ? `${countryCode}${national}` : national;

          return (
            <PhoneInput
              country={defaultCountry}
              value={full}
              onChange={(value, data) => {
                const dialCode = digitsOnly(data?.dialCode);
                const nextFull = digitsOnly(value);
                const nextNational =
                  dialCode && nextFull.startsWith(dialCode) ? nextFull.slice(dialCode.length) : nextFull;

                // `shouldDirty` so changing only the phone still enables Save.
                setValue(countryCodeName, dialCode, { shouldDirty: true });
                field.onChange(nextNational);
              }}
              onBlur={field.onBlur}
              enableSearch
              countryCodeEditable={false}
              inputProps={{ id: inputId, name: field.name }}
              containerClass={`phone-field ${error ? "is-invalid" : ""}`}
              inputClass="form-control"
            />
          );
        }}
      />

      {error ? <p className="invalid-feedback d-block">{error}</p> : null}
    </div>
  );
}
