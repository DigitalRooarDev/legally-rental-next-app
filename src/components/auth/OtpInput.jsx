"use client";

import { useRef } from "react";

/**
 * The six-box verification code input.
 *
 * Focus moves through a ref array rather than `document.getElementById`: two of
 * these on one page would otherwise fight over the same ids, and reading the DOM
 * by id defeats React's ownership of it.
 *
 * Each box carries a single-space placeholder — `app.css` inverts a filled box
 * with `:not(:placeholder-shown)`, and that selector never fires against an empty
 * `placeholder=""`.
 *
 * @param {object} props
 * @param {string} props.value              The code so far, e.g. `"04"`.
 * @param {(next: string) => void} props.onChange
 * @param {number} [props.numInputs=6]
 * @param {boolean} [props.isInvalid]       Paints every box as invalid.
 * @param {boolean} [props.disabled]
 * @param {() => void} [props.onSubmit]     Fired on Enter once the code is full.
 * @param {string} [props.idPrefix="otp"]
 */
export default function OtpInput({
  value = "",
  onChange,
  numInputs = 6,
  className = "",
  isInvalid = false,
  disabled = false,
  onSubmit,
  idPrefix = "otp",
}) {
  const inputsRef = useRef([]);

  const focusBox = (index) => {
    const box = inputsRef.current[index];
    if (box) {
      box.focus();
      box.select();
    }
  };

  /** Right-pads so writing box 4 of an empty code doesn't collapse to one digit. */
  const writeAt = (index, digit) => {
    const chars = value.padEnd(numInputs, " ").split("");
    chars[index] = digit || " ";
    onChange(chars.join("").trimEnd());
  };

  const handleChange = (event, index) => {
    const typed = event.target.value;
    if (!/^\d*$/.test(typed)) return;

    // A digit typed into a filled box arrives as two characters; keep the new one.
    const digit = typed.slice(-1);
    writeAt(index, digit);

    if (digit && index < numInputs - 1) focusBox(index + 1);
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace") {
      if (value[index]) return; // Let the box clear itself first.
      event.preventDefault();
      if (index > 0) {
        writeAt(index - 1, "");
        focusBox(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusBox(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < numInputs - 1) {
      event.preventDefault();
      focusBox(index + 1);
      return;
    }

    if (event.key === "Enter" && value.trim().length === numInputs) {
      event.preventDefault();
      onSubmit?.();
    }
  };

  /** Autofill and "copy the code from the email" both land here. */
  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;

    event.preventDefault();
    const digits = pasted.slice(0, numInputs);
    onChange(digits);
    focusBox(Math.min(digits.length, numInputs - 1));
  };

  return (
    <div className="otp-verification-form" onPaste={handlePaste}>
      <div className={`row ${className}`}>
        {Array.from({ length: numInputs }).map((_, index) => (
          <div className="col" key={index}>
            <div className="form-group">
              <input
                ref={(node) => {
                  inputsRef.current[index] = node;
                }}
                id={`${idPrefix}-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={value[index]?.trim() || ""}
                className={`form-control otp-input ${isInvalid ? "is-invalid" : ""}`}
                onChange={(event) => handleChange(event, index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onFocus={(event) => event.target.select()}
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${index + 1} of ${numInputs}`}
                aria-invalid={isInvalid}
                disabled={disabled}
                placeholder=" "
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
