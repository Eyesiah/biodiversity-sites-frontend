"use client"

import Select from "react-select";

export default function SearchableDropdown({ name, options, value, onChange }) {
  const selectOptions = options.map(o => ({ value: o, label: o }));
  const selectedOption = value ? { value: value, label: value } : null;

  const customStyles = {
    container: (provided) => ({
      ...provided,
      minWidth: '500px',
      width: 'auto'
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999
    })
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
