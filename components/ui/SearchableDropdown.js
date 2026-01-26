"use client"

import Select from "react-select";
import { useColorModeValue } from "@/components/styles/color-mode";

export default function SearchableDropdown({ name, options, value, onChange }) {
  const selectOptions = options.map(o => ({ value: o, label: o }));
  const selectedOption = value ? { value: value, label: value } : null;

  // Theme-aware colors - all hooks called at component level
  const bgColor = useColorModeValue("#ffffff", "#2a2a2a"); // cardBg
  const textColor = useColorModeValue("#000000", "#f0f0f0"); // fg
  const borderColor = useColorModeValue("#bdc3c7", "#ecf0f1"); // border
  const hoverBgColor = useColorModeValue("#ecf0f1", "#3a3a3a"); // subtle background variation
  const placeholderColor = useColorModeValue("#666", "#ccc");
  const selectedBgColor = useColorModeValue("#2ecc71", "#27ae60"); // brand colors
  const selectedActiveBgColor = useColorModeValue("#27ae60", "#1f8c4e");

  const customStyles = {
    container: (provided) => ({
      ...provided,
      minWidth: '500px',
      width: 'auto'
    }),
    control: (provided, state) => ({
      ...provided,
      backgroundColor: bgColor,
      borderColor: state.isFocused ? borderColor : borderColor,
      color: textColor,
      boxShadow: state.isFocused ? `0 0 0 1px ${borderColor}` : 'none',
      '&:hover': {
        borderColor: borderColor,
      },
      minHeight: '40px',
      fontSize: '14px'
    }),
    input: (provided) => ({
      ...provided,
      color: textColor,
    }),
    placeholder: (provided) => ({
      ...provided,
      color: placeholderColor,
    }),
    singleValue: (provided) => ({
      ...provided,
      color: textColor,
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '4px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      zIndex: 9999
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? selectedBgColor
        : state.isFocused
        ? hoverBgColor
        : bgColor,
      color: state.isSelected
        ? '#ffffff'
        : textColor,
      cursor: 'pointer',
      '&:active': {
        backgroundColor: selectedActiveBgColor,
      },
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: borderColor,
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: textColor,
      '&:hover': {
        color: textColor,
      },
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: textColor,
      '&:hover': {
        color: textColor,
      },
    }),
  };

  const handleChange = (selectedOption) => {
    if (onChange) {
      onChange(selectedOption ? selectedOption.value : null);
    }
  };

  return (
    <Select
      name={name}
      options={selectOptions}
      value={selectedOption}
      onChange={handleChange}
      styles={customStyles}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
    />
  );
}
