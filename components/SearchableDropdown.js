"use client"

import Select from "react-select";

export default function SearchableDropdown({ name, options, defaultValue }) {
  const selectOptions = options.map(o => ({ value: o, label: o }));
  const defaultOption = { value: defaultValue, label: defaultValue };

  const customStyles = {
    container: (provided) => ({
      ...provided,
      minWidth: '500px',
      width: 'auto'
    })
  };

  return (
    <Select
      name={name}
      options={selectOptions}
      defaultValue={defaultOption}
      styles={customStyles}
    />
  );
}
