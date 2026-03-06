import React, { useId } from "react";
import "./sky-toggle.css";

interface SkyToggleProps {
  checked: boolean;
  onChange: () => void;
}

const SkyToggle: React.FC<SkyToggleProps> = ({ checked, onChange }) => {
  const id = useId();

  return (
    <label className="theme-switch" htmlFor={id}>
      <input
        type="checkbox"
        id={id}
        className="theme-switch__checkbox"
        checked={checked}
        onChange={onChange}
      />
      <div className="theme-switch__container">
        <div className="theme-switch__circle-container">
          <div className="theme-switch__sun-moon-container">
            <div className="theme-switch__moon">
              <div className="theme-switch__spot" />
              <div className="theme-switch__spot" />
              <div className="theme-switch__spot" />
            </div>
          </div>
        </div>
        <div className="theme-switch__clouds" />
        <div className="theme-switch__stars-container">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.70206C136.607 6.54545 136.996 7.55472 137 8.45538C136.996 7.55472 136.607 6.54545 135.831 5.70206Z" fill="currentColor" />
            <path fillRule="evenodd" clipRule="evenodd" d="M31 37.3545C29.8893 37.4095 28.9449 37.8587 28.169 38.7021C27.3931 39.5455 26.9956 40.5765 27 41.4554C26.9956 40.5765 27.3931 39.5455 28.169 38.7021C28.9449 37.8587 29.8893 37.4095 31 37.3545Z" fill="currentColor" />
            <path fillRule="evenodd" clipRule="evenodd" d="M51 25.3545C49.8893 25.4095 48.9449 25.8587 48.169 26.7021C47.3931 27.5455 46.9956 28.5765 47 29.4554C46.9956 28.5765 47.3931 27.5455 48.169 26.7021C48.9449 25.8587 49.8893 25.4095 51 25.3545Z" fill="currentColor" />
            <path d="M89 17.5C89.5523 17.5 90 17.0523 90 16.5C90 15.9477 89.5523 15.5 89 15.5C88.4477 15.5 88 15.9477 88 16.5C88 17.0523 88.4477 17.5 89 17.5Z" fill="currentColor" />
            <path d="M120 45.5C120.552 45.5 121 45.0523 121 44.5C121 43.9477 120.552 43.5 120 43.5C119.448 43.5 119 43.9477 119 44.5C119 45.0523 119.448 45.5 120 45.5Z" fill="currentColor" />
            <path d="M64 8.5C64.5523 8.5 65 8.05228 65 7.5C65 6.94772 64.5523 6.5 64 6.5C63.4477 6.5 63 6.94772 63 7.5C63 8.05228 63.4477 8.5 64 8.5Z" fill="currentColor" />
            <path d="M107 36.5C107.552 36.5 108 36.0523 108 35.5C108 34.9477 107.552 34.5 107 34.5C106.448 34.5 106 34.9477 106 35.5C106 36.0523 106.448 36.5 107 36.5Z" fill="currentColor" />
          </svg>
        </div>
      </div>
    </label>
  );
};

export default SkyToggle;
