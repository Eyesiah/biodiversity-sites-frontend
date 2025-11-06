"use client"

import Select from "react-select";

export default function SearchableDropdown({ name, options, defaultValue, onChange }) {
  const selectOptions = options.map(o => ({ value: o, label: o }));
  const defaultOption = defaultValue ? { value: defaultValue, label: defaultValue } : null;

  const customStyles = {
    container: (provided) => ({
      ...provided,
      minWidth: '500px',
      width: 'auto'
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
      value={defaultOption}
      onChange={handleChange}
      styles={customStyles}
    />
  );
}
